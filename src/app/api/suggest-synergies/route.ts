import { NextRequest, NextResponse } from 'next/server'

const PR_LABS_URL = 'https://chatgpt-42.p.rapidapi.com/matag2'
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
Da 6 sinergias: 3 convencionales + 3 disruptivas.
Responde SOLO JSON: {"suggestions":[{"type":"convencional","businessType":"floristeria","text":"Colabora con..."},...]}`

    const systemPrompt = 'Eres un experto en estrategias de negocio para autónomos en España. Responde SOLO JSON sin markdown ni backticks. Breve.'

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 15000)

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
          max_tokens: 500,
        }),
        signal: controller.signal,
      })
      clearTimeout(timeoutId)

      if (!response.ok) {
        const errBody = await response.text()
        console.error('PR Labs syn error:', response.status, errBody.substring(0, 300))
        return NextResponse.json({ errorFriendly: 'Error de IA. Prueba de nuevo.', suggestions: null })
      }

      const data = await response.json()
      const content = data?.chat_response || data?.response || data?.message || data?.choices?.[0]?.message?.content || ''
      const textContent = typeof content === 'string' ? content : JSON.stringify(content)

      try {
        const match = textContent.match(/\{[\s\S]*\}/)
        if (match) {
          const parsed = JSON.parse(match[0])
          if (parsed.suggestions) return NextResponse.json({ suggestions: parsed.suggestions })
        }
      } catch { /* fallback below */ }

      const lines = textContent.split('\n').filter((l: string) => l.trim().length > 0).slice(0, 6)
      return NextResponse.json({
        suggestions: lines.map((line: string, i: number) => ({
          type: i < 3 ? 'convencional' : 'disruptiva',
          businessType: '',
          text: line.replace(/^[-*\d.)\s]+/, '').trim(),
        }))
      })

    } catch (err: any) {
      clearTimeout(timeoutId)
      console.error('Synergies timeout:', err.message)
      return NextResponse.json({ errorFriendly: 'La IA tardó demasiado. Prueba de nuevo.', suggestions: null })
    }
  } catch (err: any) {
    console.error('Synergies error:', err.message)
    return NextResponse.json({ errorFriendly: 'Error inesperado. Prueba de nuevo.', suggestions: null })
  }
}
