import { NextRequest, NextResponse } from 'next/server'

const PR_LABS_URL = 'https://chatgpt-42.p.rapidapi.com/gpt4o'
const RAPID_API_KEY = process.env.RAPIDAPI_KEY

export async function POST(req: NextRequest) {
  try {
    const { nombre, sector, zona, descripcion } = await req.json()

    if (!sector) {
      return NextResponse.json({ error: 'Por favor, indica tu sector.' }, { status: 400 })
    }

    if (!RAPID_API_KEY) {
      return NextResponse.json({
        errorFriendly: 'La IA no está configurada todavía.',
        suggestions: null,
      })
    }

    const userMessage = `Negocio: ${nombre || '-'} | Sector: ${sector} | Zona: ${zona || '-'} ${descripcion ? '| Notas: ' + descripcion : ''}`

    const systemPrompt = `Eres un experto en estrategias de negocio para autonomos en Espana.
IMPORTANTE: Responde EXCLUSIVAMENTE con un objeto JSON, sin ningun texto adicional antes ni despues. No uses markdown ni backticks.
El JSON debe tener exactamente esta estructura con 6 sugerencias (3 convencionales + 3 disruptivas):
{"suggestions":[{"type":"convencional","businessType":"tipo de negocio","text":"descripcion breve de la sinergia"},{"type":"convencional","businessType":"tipo de negocio","text":"descripcion breve"},{"type":"convencional","businessType":"tipo de negocio","text":"descripcion breve"},{"type":"disruptiva","businessType":"tipo de negocio","text":"descripcion breve"},{"type":"disruptiva","businessType":"tipo de negocio","text":"descripcion breve"},{"type":"disruptiva","businessType":"tipo de negocio","text":"descripcion breve"}]}`

    try {
      const response = await fetch(PR_LABS_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-rapidapi-key': RAPID_API_KEY,
          'x-rapidapi-host': 'chatgpt-42.p.rapidapi.com',
        },
        body: JSON.stringify({
          messages: [{ role: 'user', content: userMessage }],
          system_prompt: systemPrompt,
          temperature: 0.7,
          max_tokens: 500,
        }),
      })

      if (!response.ok) {
        console.error('AI syn error:', response.status)
        return NextResponse.json({ errorFriendly: 'Error de IA. Prueba de nuevo.', suggestions: null })
      }

      const data = await response.json()
      const raw = data?.result || ''
      const textContent = typeof raw === 'string' ? raw : JSON.stringify(raw)

      // Extraer JSON de la respuesta
      try {
        const match = textContent.match(/\{[\s\S]*\}/)
        if (match) {
          const parsed = JSON.parse(match[0])
          if (parsed.suggestions && Array.isArray(parsed.suggestions)) {
            const cleaned = parsed.suggestions.map((s: any) => ({
              type: s.type || (parsed.suggestions.indexOf(s) < 3 ? 'convencional' : 'disruptiva'),
              businessType: String(s.businessType || ''),
              text: String(s.text || '').substring(0, 200),
            }))
            return NextResponse.json({ suggestions: cleaned.slice(0, 6) })
          }
        }
      } catch { /* fallback below */ }

      // Fallback: parsear el texto línea por línea
      const lines = textContent.split('\n').filter((l: string) => l.trim().length > 10).slice(0, 6)
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
