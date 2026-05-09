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

    const userPrompt = `Negocio: ${nombre || '-'} | Sector: ${sector} | Zona: ${zona || '-'} | ${descripcion || ''}

Da 6 sinergias de negocio: 3 convencionales + 3 disruptivas.
Responde SOLO en JSON válido sin markdown ni backticks:
{"suggestions":[{"type":"convencional","businessType":"tipo de negocio","text":"descripcion de la sinergia"},{"type":"disruptiva","businessType":"tipo de negocio","text":"descripcion de la sinergia"}]}`

    const systemPrompt = 'Eres un experto en estrategias de negocio para autónomos en España. Genera ideas creativas y prácticas de colaboración. Responde SOLO JSON, sin markdown ni backticks.'

    try {
      const response = await fetch(PR_LABS_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-rapidapi-key': RAPID_API_KEY,
          'x-rapidapi-host': 'chatgpt-42.p.rapidapi.com',
        },
        body: JSON.stringify({
          messages: [{ role: 'user', content: userPrompt }],
          system_prompt: systemPrompt,
          temperature: 0.8,
          max_tokens: 600,
        }),
      })

      if (!response.ok) {
        const errBody = await response.text()
        console.error('AI syn error:', response.status, errBody.substring(0, 300))
        return NextResponse.json({ errorFriendly: 'Error de IA. Prueba de nuevo.', suggestions: null })
      }

      const data = await response.json()
      const content = data?.result || data?.response || data?.message || ''
      const textContent = typeof content === 'string' ? content : JSON.stringify(content)

      // Extraer JSON de la respuesta
      try {
        const match = textContent.match(/\{[\s\S]*\}/)
        if (match) {
          const parsed = JSON.parse(match[0])
          if (parsed.suggestions && Array.isArray(parsed.suggestions)) {
            return NextResponse.json({ suggestions: parsed.suggestions })
          }
        }
      } catch { /* fallback below */ }

      // Fallback: parsear el texto si no devuelve JSON válido
      const lines = textContent.split('\n').filter((l: string) => l.trim().length > 0).slice(0, 6)
      return NextResponse.json({
        suggestions: lines.map((line: string, i: number) => ({
          type: i < 3 ? 'convencional' : 'disruptiva',
          businessType: '',
          text: line.replace(/^[-*\d.)\s]+/, '').trim(),
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
