import { NextRequest, NextResponse } from 'next/server'

const PR_LABS_URL = 'https://chatgpt-42.p.rapidapi.com/gpt4o'
const RAPID_API_KEY = process.env.RAPIDAPI_KEY

export async function POST(req: NextRequest) {
  try {
    const { text, image, platform } = await req.json()

    if (!text && !image) {
      return NextResponse.json({ error: 'Proporciona texto o una imagen.' }, { status: 400 })
    }

    if (!RAPID_API_KEY) {
      return NextResponse.json({ errorFriendly: 'La IA no está configurada todavía.' })
    }

    const platformInfo: Record<string, string> = {
      instagram: 'Instagram', tiktok: 'TikTok', facebook: 'Facebook',
      linkedin: 'LinkedIn', x: 'X/Twitter'
    }
    const pNote = platform && platformInfo[platform] ? `Plataforma: ${platformInfo[platform]}.` : ''

    const systemPrompt = `Eres Analista Flow, experta en Social Media para autónomos en España. ${pNote}
Responde SOLO en JSON válido sin markdown ni backticks:
{"summary":"diagnostico en 2 frases","keyPoints":["punto1","punto2","punto3"],"recommendations":["recomendacion1","recomendacion2","recomendacion3"]}`

    const userMessage = `Analiza este post de redes sociales:
"${text || '(solo imagen)'}"

Proporciona un análisis breve y útil.`

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
        const errBody = await response.text()
        console.error('AI error:', response.status, errBody.substring(0, 300))
        return NextResponse.json({ errorFriendly: 'Error de IA. Prueba de nuevo.' })
      }

      const data = await response.json()
      const content = data?.result || data?.response || data?.message || ''
      const textContent = typeof content === 'string' ? content : JSON.stringify(content)

      // Extraer JSON de la respuesta
      let parsed: any = null
      try {
        const match = textContent.match(/\{[\s\S]*\}/)
        if (match) parsed = JSON.parse(match[0])
      } catch { parsed = null }

      if (!parsed || !parsed.summary) {
        // Si no devuelve JSON válido, crear un análisis a partir del texto
        const lines = textContent.split('\n').filter((l: string) => l.trim().length > 0)
        parsed = {
          summary: textContent.substring(0, 200),
          keyPoints: lines.slice(0, 3).map((l: string) => l.replace(/^[-*\d.)\s]+/, '').trim()).filter(Boolean),
          recommendations: lines.slice(3, 6).map((l: string) => l.replace(/^[-*\d.)\s]+/, '').trim()).filter(Boolean).length > 0
            ? lines.slice(3, 6).map((l: string) => l.replace(/^[-*\d.)\s]+/, '').trim())
            : ['Añade más detalles sobre tu producto o servicio', 'Incluye una llamada a la acción clara', 'Usa hashtags relevantes para mayor alcance']
        }
      }
      return NextResponse.json(parsed)

    } catch (err: any) {
      console.error('Analyze error:', err.message)
      return NextResponse.json({ errorFriendly: 'La IA tardó demasiado. Prueba de nuevo.' })
    }
  } catch (err: any) {
    console.error('Analyze error:', err.message)
    return NextResponse.json({ errorFriendly: 'Error inesperado. Prueba de nuevo.' })
  }
}
