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

    const userMessage = text || '(solo imagen)'

    const systemPrompt = `Eres Analista Flow, experta en Social Media para autonomos en Espana. ${pNote}
IMPORTANTE: Responde EXCLUSIVAMENTE con un objeto JSON, sin ningun texto adicional antes ni despues. No uses markdown ni backticks.
El JSON debe tener exactamente esta estructura:
{"summary":"diagnostico breve en maximo 2 frases","keyPoints":["punto clave 1","punto clave 2","punto clave 3"],"recommendations":["recomendacion 1","recomendacion 2","recomendacion 3"]}`

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
          temperature: 0.3,
          max_tokens: 300,
        }),
      })

      if (!response.ok) {
        console.error('AI error:', response.status)
        return NextResponse.json({ errorFriendly: 'Error de IA. Prueba de nuevo.' })
      }

      const data = await response.json()
      const raw = data?.result || ''
      const textContent = typeof raw === 'string' ? raw : JSON.stringify(raw)

      // Extraer JSON de la respuesta
      let parsed: any = null
      try {
        const match = textContent.match(/\{[\s\S]*\}/)
        if (match) parsed = JSON.parse(match[0])
      } catch { parsed = null }

      if (!parsed || !parsed.summary || !Array.isArray(parsed.keyPoints)) {
        // Fallback: construir resultado desde el texto
        const sentences = textContent.split(/[.!?]\s*/).filter((s: string) => s.trim().length > 10)
        parsed = {
          summary: sentences.slice(0, 2).join('. ').substring(0, 200),
          keyPoints: sentences.slice(2, 5).map((s: string) => s.trim().substring(0, 100)).filter(Boolean),
          recommendations: [
            'Incluye una llamada a la acción clara',
            'Añade hashtags relevantes para mayor alcance',
            'Publica en horarios de mayor audiencia'
          ]
        }
      }

      // Limpiar: asegurar que los valores son strings cortos
      return NextResponse.json({
        summary: String(parsed.summary || '').substring(0, 300),
        keyPoints: Array.isArray(parsed.keyPoints) ? parsed.keyPoints.map(String).slice(0, 5) : [],
        recommendations: Array.isArray(parsed.recommendations) ? parsed.recommendations.map(String).slice(0, 5) : [],
      })

    } catch (err: any) {
      console.error('Analyze error:', err.message)
      return NextResponse.json({ errorFriendly: 'La IA tardó demasiado. Prueba de nuevo.' })
    }
  } catch (err: any) {
    console.error('Analyze error:', err.message)
    return NextResponse.json({ errorFriendly: 'Error inesperado. Prueba de nuevo.' })
  }
}
