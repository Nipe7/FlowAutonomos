import { NextRequest, NextResponse } from 'next/server'

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions'
const OPENROUTER_KEY = process.env.OPENROUTER_API_KEY
const GEMINI_KEY = process.env.GEMINI_API_KEY
const AI_MODEL = 'deepseek/deepseek-v4-flash:free'

function cleanJSON(rawText: string) {
  return rawText.replace(/```json\n?/g, '').replace(/```\n?/g, '').replace(/^[^{]*/, '').replace(/[^}]*$/, '').trim()
}

function parseAIResponse(rawText: string) {
  let parsed: any = null
  try {
    const clean = cleanJSON(rawText)
    const match = clean.match(/\{[\s\S]*\}/)
    if (match) parsed = JSON.parse(match[0])
  } catch { parsed = null }

  if (!parsed || !parsed.summary) {
    const sentences = rawText.split(/[.!?]\s*/).filter((s: string) => s.trim().length > 10)
    parsed = {
      summary: sentences.slice(0, 2).join('. ').substring(0, 200),
      keyPoints: sentences.slice(2, 5).map((s: string) => s.trim().substring(0, 100)).filter(Boolean),
      recommendations: ['Incluye una llamada a la acción clara', 'Añade hashtags relevantes para mayor alcance', 'Publica en horarios de mayor audiencia']
    }
  }

  return {
    summary: String(parsed.summary || '').substring(0, 400),
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

    const userPrompt = `${pNote}Analiza este post de redes sociales:
"${(text || '').substring(0, 800)}"`

    const systemPrompt = `Eres Analista Flow, experta en marketing para autonomos en Espana.
Reglas:
- NUNCA repitas el texto del post. ANALIZA y ACONSEJA.
- Si el post es corto o pobre, explica por que no funciona y como mejorarlo.
- Si el post es bueno, destaca lo positivo y sugiere mejoras.
- Frases siempre COMPLETAS.
- Recomendaciones ACCIONABLES y concretas.
- Responde SIEMPRE en espanol.

JSON: {"summary":"diagnostico en 2-3 frases","keyPoints":["punto1","punto2","punto3"],"recommendations":["rec1","rec2","rec3"]}`

    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ]

    // 1. OpenRouter
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
            model: AI_MODEL,
            messages,
            temperature: 0.5,
            max_tokens: 500,
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

    // 2. Gemini fallback
    if (GEMINI_KEY) {
      try {
        const resp = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_KEY}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }] }],
            generationConfig: { temperature: 0.5, maxOutputTokens: 500, responseMimeType: 'application/json' },
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

    return NextResponse.json({ errorFriendly: 'La IA no está disponible ahora. Prueba en unos minutos.' })
  } catch (err: any) {
    console.error('Analyze error:', err.message)
    return NextResponse.json({ errorFriendly: 'Error inesperado. Prueba de nuevo.' })
  }
}
