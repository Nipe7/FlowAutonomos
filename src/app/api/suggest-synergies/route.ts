import { NextRequest, NextResponse } from 'next/server'

const GEMINI_MODEL = 'gemini-2.0-flash-lite'
const GEMINI_BASE = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`
const GEMINI_KEY = process.env.GEMINI_API_KEY

export async function POST(req: NextRequest) {
  try {
    const { nombre, sector, zona, descripcion } = await req.json()

    if (!sector) {
      return NextResponse.json({ error: 'Por favor, indica tu sector.' }, { status: 400 })
    }

    if (!GEMINI_KEY) {
      return NextResponse.json({
        errorFriendly: 'La IA no está configurada todavía.',
        suggestions: null,
      })
    }

    const prompt = `Eres un experto en estrategias de negocio para autonomos en Espana.
Genera 6 sinergias de negocio para este negocio:
- Nombre: ${nombre || '-'}
- Sector: ${sector}
- Zona: ${zona || '-'}
${descripcion ? '- Notas: ' + descripcion : ''}

3 convencionales + 3 disruptivas. Responde SOLO en JSON valido:
{"suggestions":[{"type":"convencional","businessType":"tipo de negocio","text":"descripcion breve de la sinergia"},{"type":"convencional","businessType":"tipo de negocio","text":"descripcion breve"},{"type":"convencional","businessType":"tipo de negocio","text":"descripcion breve"},{"type":"disruptiva","businessType":"tipo de negocio","text":"descripcion breve"},{"type":"disruptiva","businessType":"tipo de negocio","text":"descripcion breve"},{"type":"disruptiva","businessType":"tipo de negocio","text":"descripcion breve"}]}

No incluyas ningun texto fuera del JSON.`

    try {
      const response = await fetch(`${GEMINI_BASE}?key=${GEMINI_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.8,
            maxOutputTokens: 600,
            responseMimeType: 'application/json',
          },
        }),
      })

      if (!response.ok) {
        const errBody = await response.text()
        console.error('Gemini syn error:', response.status, errBody.substring(0, 200))
        if (response.status === 429) return NextResponse.json({ errorFriendly: 'IA ocupada. Prueba en unos segundos.', suggestions: null })
        return NextResponse.json({ errorFriendly: 'Error de IA. Prueba de nuevo.', suggestions: null })
      }

      const data = await response.json()
      const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text || ''

      // Extraer JSON de la respuesta
      try {
        const match = rawText.match(/\{[\s\S]*\}/)
        if (match) {
          const parsed = JSON.parse(match[0])
          if (parsed.suggestions && Array.isArray(parsed.suggestions)) {
            const cleaned = parsed.suggestions.map((s: any) => ({
              type: s.type || 'convencional',
              businessType: String(s.businessType || ''),
              text: String(s.text || '').substring(0, 200),
            }))
            return NextResponse.json({ suggestions: cleaned.slice(0, 6) })
          }
        }
      } catch { /* fallback below */ }

      // Fallback: parsear texto
      const lines = rawText.split('\n').filter((l: string) => l.trim().length > 10).slice(0, 6)
      return NextResponse.json({
        suggestions: lines.map((line: string, i: number) => ({
          type: i < 3 ? 'convencional' : 'disruptiva',
          businessType: '',
          text: line.replace(/^[-*\d.)\s]+/, '').trim().substring(0, 200),
        }))
      })

    } catch (err: any) {
      console.error('Synergies error:', err.message)
      return NextResponse.json({ errorFriendly: 'La IA tardó demasiado. Prueba de nuevo.', suggestions: null })
    }
  } catch (err: any) {
    console.error('Synergies error:', err.message)
    return NextResponse.json({ errorFriendly: 'Error inesperado. Prueba de nuevo.', suggestions: null })
  }
}
