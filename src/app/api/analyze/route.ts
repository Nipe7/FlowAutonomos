import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const { text, image, platform } = await req.json()

    if (!text && !image) {
      return NextResponse.json({ error: 'Proporciona texto o una imagen.' }, { status: 400 })
    }

    const platformInfo: Record<string, string> = {
      instagram: 'Instagram', tiktok: 'TikTok', facebook: 'Facebook',
      linkedin: 'X/Twitter'
    }
    const pNote = platform && platformInfo[platform] ? `Plataforma: ${platformInfo[platform]}.` : ''

    const userPrompt = `${pNote}Analiza este post y da solo JSON:
{"summary":"2 frases max","keyPoints":["p1","p2","p3"],"recommendations":["r1","r2","r3"]}

Post: "${(text || '').substring(0, 500)}"`

    try {
      // Importar dinámicamente para evitar problemas de bundle
      const ZAI = (await import('z-ai-web-dev-sdk')).default || (await import('z-ai-web-dev-sdk'))
      const createFn = typeof ZAI === 'function' ? ZAI : ZAI.default || ZAI.create
      const zai = await createFn()

      const completion = await zai.chat.completions.create({
        messages: [
          { role: 'system', content: 'Responde SOLO en JSON valido. Sin texto adicional.' },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.4,
        max_tokens: 300,
      })

      const rawText = completion.choices[0]?.message?.content || ''

      let parsed: any = null
      try {
        const match = rawText.match(/\{[\s\S]*\}/)
        if (match) parsed = JSON.parse(match[0])
      } catch { parsed = null }

      if (!parsed || !parsed.summary) {
        const sentences = rawText.split(/[.!?]\s*/).filter((s: string) => s.trim().length > 10)
        parsed = {
          summary: sentences.slice(0, 2).join('. ').substring(0, 200),
          keyPoints: sentences.slice(2, 5).map((s: string) => s.trim().substring(0, 100)).filter(Boolean),
          recommendations: ['Incluye una llamada a la acción clara', 'Añade hashtags relevantes', 'Publica en horarios de mayor audiencia']
        }
      }

      return NextResponse.json({
        summary: String(parsed.summary || '').substring(0, 300),
        keyPoints: Array.isArray(parsed.keyPoints) ? parsed.keyPoints.map(String).slice(0, 5) : [],
        recommendations: Array.isArray(parsed.recommendations) ? parsed.recommendations.map(String).slice(0, 5) : [],
      })

    } catch (err: any) {
      console.error('Analyze AI error:', err.message, err.stack?.substring(0, 300))
      return NextResponse.json({ errorFriendly: 'La IA tardó demasiado. Prueba de nuevo.', debug: err.message })
    }
  } catch (err: any) {
    console.error('Analyze error:', err.message)
    return NextResponse.json({ errorFriendly: 'Error inesperado. Prueba de nuevo.' })
  }
}
