import { NextRequest, NextResponse } from 'next/server'
import ZAI from 'z-ai-web-dev-sdk'

export async function POST(req: NextRequest) {
  try {
    const { nombre, sector, zona, descripcion } = await req.json()

    if (!sector) {
      return NextResponse.json({ error: 'Por favor, indica tu sector.' }, { status: 400 })
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
      const zai = await ZAI.create()
      const completion = await zai.chat.completions.create({
        messages: [
          { role: 'system', content: 'Eres un experto en estrategias de negocio para autonomos en Espana. Responde siempre en JSON valido, sin texto adicional.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.8,
        max_tokens: 600,
      })

      const rawText = completion.choices[0]?.message?.content || ''

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
