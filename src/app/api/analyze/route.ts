import { NextRequest, NextResponse } from 'next/server'

// OpenRouter: gratuita, sin tarjeta, 200+ req/dia con modelos :free
const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions'
const OPENROUTER_KEY = process.env.OPENROUTER_API_KEY

// Gemini: con config de facturacion en Google Cloud
const GEMINI_KEY = process.env.GEMINI_API_KEY

function parseAIResponse(rawText: string) {
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

  return {
    summary: String(parsed.summary || '').substring(0, 300),
    keyPoints: Array.isArray(parsed.keyPoints) ? parsed.keyPoints.map(String).slice(0, 5) : [],
    recommendations: Array.isArray(parsed.recommendations) ? parsed.recommendations.map(String).slice(0, 5) : [],
  }
}

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

    const userPrompt = `${pNote}Analiza este post y da solo JSON:
{"summary":"2 frases max","keyPoints":["p1","p2","p3"],"recommendations":["r1","r2","r3"]}

Post: "${(text || '').substring(0, 500)}"`

    const systemPrompt = 'Responde SOLO en JSON valido. Sin texto adicional.'
    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ]

    // 1. Intentar OpenRouter (gratuito, sin tarjeta)
    if (OPENROUTER_KEY) {
      try {
        const resp = await fetch(OPENROUTER_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${OPENROUTER_KEY}`,
            'HTTP-Referer': 'https://flowautonomos.netlify.app',
          },
          body: JSON.stringify({
            model: 'deepseek/deepseek-v4-flash:free',
            messages,
            temperature: 0.4,
            max_tokens: 300,
          }),
          signal: AbortSignal.timeout(8000),
        })
        if (resp.ok) {
          const data = await resp.json()
          const rawText = data?.choices?.[0]?.message?.content || ''
          if (rawText) return NextResponse.json(parseAIResponse(rawText))
        }
      } catch (e: any) {
        console.error('OpenRouter error:', e.message)
      }
    }

    // 2. Intentar Gemini (si tiene API key)
    if (GEMINI_KEY) {
      try {
        const resp = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_KEY}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }] }],
            generationConfig: { temperature: 0.4, maxOutputTokens: 300, responseMimeType: 'application/json' },
          }),
          signal: AbortSignal.timeout(8000),
        })
        if (resp.ok) {
          const data = await resp.json()
          const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text || ''
          if (rawText) return NextResponse.json(parseAIResponse(rawText))
        }
      } catch (e: any) {
        console.error('Gemini error:', e.message)
      }
    }

    return NextResponse.json({ errorFriendly: 'La IA no está disponible en este momento. Prueba de nuevo en unos minutos.' })

  } catch (err: any) {
    console.error('Analyze error:', err.message)
    return NextResponse.json({ errorFriendly: 'Error inesperado. Prueba de nuevo.' })
  }
}
