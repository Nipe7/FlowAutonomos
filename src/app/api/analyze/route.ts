import { NextRequest, NextResponse } from 'next/server'

const PR_LABS_URL = 'https://chatgpt-42.p.rapidapi.com/matag2'
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

    const systemPrompt = `Eres Analista Flow, experta en Social Media. ${pNote}Responde SOLO JSON sin markdown:
{"summary":"diagnostico en 2 frases","keyPoints":["punto1","punto2","punto3"],"recommendations":["recomendacion1","recomendacion2","recomendacion3"]}`

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 15000)

    try {
      const userMessage = image
        ? `Analiza este post (con imagen adjunta): ${text || '(solo imagen)'}`
        : `Analiza este post: ${text}`

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
          max_tokens: 400,
        }),
        signal: controller.signal,
      })
      clearTimeout(timeoutId)

      if (!response.ok) {
        const errBody = await response.text()
        console.error('PR Labs error:', response.status, errBody.substring(0, 300))
        return NextResponse.json({ errorFriendly: 'Error de IA. Prueba de nuevo.' })
      }

      const data = await response.json()
      const content = data?.chat_response || data?.response || data?.message || data?.choices?.[0]?.message?.content || ''
      const textContent = typeof content === 'string' ? content : JSON.stringify(content)

      let parsed: any = null
      try {
        const match = textContent.match(/\{[\s\S]*\}/)
        parsed = match ? JSON.parse(match[0]) : null
      } catch { parsed = null }

      if (!parsed || !parsed.summary) {
        parsed = {
          summary: textContent.substring(0, 200),
          keyPoints: ['Análisis completado'],
          recommendations: ['Revisa el resumen']
        }
      }
      return NextResponse.json(parsed)

    } catch (err: any) {
      clearTimeout(timeoutId)
      console.error('Analyze timeout:', err.message)
      return NextResponse.json({ errorFriendly: 'La IA tardó demasiado. Prueba con texto más corto.' })
    }
  } catch (err: any) {
    console.error('Analyze error:', err.message)
    return NextResponse.json({ errorFriendly: 'Error inesperado. Prueba de nuevo.' })
  }
}
