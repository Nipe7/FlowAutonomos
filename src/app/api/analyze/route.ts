import { NextRequest, NextResponse } from 'next/server'

const GEMINI_MODEL = 'gemini-2.0-flash-lite'
const GEMINI_BASE = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`
const GEMINI_KEY = process.env.GEMINI_API_KEY

export async function POST(req: NextRequest) {
  try {
    const { text, image, platform } = await req.json()

    if (!text && !image) {
      return NextResponse.json({ error: 'Proporciona texto o una imagen.' }, { status: 400 })
    }

    if (!GEMINI_KEY) {
      return NextResponse.json({ errorFriendly: 'La IA no está configurada todavía.' })
    }

    const platformInfo: Record<string, string> = {
      instagram: 'Instagram', tiktok: 'TikTok', facebook: 'Facebook',
      linkedin: 'LinkedIn', x: 'X/Twitter'
    }
    const pNote = platform && platformInfo[platform] ? `Plataforma: ${platformInfo[platform]}.` : ''

    const prompt = `${pNote}Analiza este post de redes sociales y responde SOLO en JSON valido con esta estructura exacta:
{"summary":"diagnostico breve en maximo 2 frases","keyPoints":["punto clave 1","punto clave 2","punto clave 3"],"recommendations":["recomendacion 1","recomendacion 2","recomendacion 3"]}

Post a analizar:
"${text || '(solo imagen)'}"

No incluyas ningun texto fuera del JSON.`

    try {
      const response = await fetch(`${GEMINI_BASE}?key=${GEMINI_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.4,
            maxOutputTokens: 400,
            responseMimeType: 'application/json',
          },
        }),
      })

      if (!response.ok) {
        const errBody = await response.text()
        console.error('Gemini error:', response.status, errBody.substring(0, 200))
        if (response.status === 429) return NextResponse.json({ errorFriendly: 'IA ocupada. Prueba en unos segundos.' })
        return NextResponse.json({ errorFriendly: 'Error de IA. Prueba de nuevo.' })
      }

      const data = await response.json()
      const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text || ''

      // Extraer JSON de la respuesta
      let parsed: any = null
      try {
        const match = rawText.match(/\{[\s\S]*\}/)
        if (match) parsed = JSON.parse(match[0])
      } catch { parsed = null }

      if (!parsed || !parsed.summary || !Array.isArray(parsed.keyPoints)) {
        const sentences = rawText.split(/[.!?]\s*/).filter((s: string) => s.trim().length > 10)
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
