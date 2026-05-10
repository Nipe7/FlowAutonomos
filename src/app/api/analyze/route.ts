import { NextRequest, NextResponse } from 'next/server'
import ZAI from 'z-ai-web-dev-sdk'

export async function POST(req: NextRequest) {
  try {
    const { text, image, platform } = await req.json()

    if (!text && !image) {
      return NextResponse.json({ error: 'Proporciona texto o una imagen.' }, { status: 400 })
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
      const zai = await ZAI.create()
      const completion = await zai.chat.completions.create({
        messages: [
          { role: 'system', content: 'Eres un experto en marketing de redes sociales. Responde siempre en JSON valido, sin texto adicional.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.4,
        max_tokens: 400,
      })

      const rawText = completion.choices[0]?.message?.content || ''

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
