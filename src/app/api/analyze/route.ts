import { NextRequest, NextResponse } from 'next/server'

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages'
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions'

export async function POST(req: NextRequest) {
  try {
    const { text, image, platform } = await req.json()

    if (!text && !image) {
      return NextResponse.json({ error: 'Proporciona texto o una imagen.' }, { status: 400 })
    }

    // Soportar Anthropic y Groq
    const anthropicKey = process.env.CLAUDE_API_KEY || process.env.ANTHROPIC_API_KEY
    const groqKey = process.env.GROQ_API_KEY
    const apiKey = anthropicKey || groqKey

    if (!apiKey) {
      return NextResponse.json({ errorFriendly: 'La IA no está configurada todavía. Vuelve a intentarlo más tarde.' })
    }

    const platformInfo: Record<string, string> = {
      instagram: 'Instagram',
      tiktok: 'TikTok',
      facebook: 'Facebook',
      linkedin: 'LinkedIn',
      x: 'X/Twitter'
    }

    const pNote = platform && platformInfo[platform]
      ? `Plataforma: ${platformInfo[platform]}.`
      : ''

    // Prompts ultra-cortos para que Anthropic responda en menos de 8s
    const systemPrompt = `Eres Analista Flow, experta en Social Media. ${pNote}
Responde SOLO JSON sin markdown:
{"summary":"diag en 2 frases","keyPoints":["p1","p2","p3"],"recommendations":["c1","c2","c3"]}`

    const userText = text || '(solo imagen)'

    // Timeout 8s para Netlify free (límite 10s)
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 8000)

    try {
      let content = ''

      if (anthropicKey) {
        // === Anthropic (Claude) ===
        const messageContent: Array<any> = []
        if (image) {
          let b64 = image
          let mt = 'image/jpeg'
          if (image.includes('data:')) {
            const m = image.match(/data:(image\/[a-zA-Z]+);base64,(.*)/)
            if (m) { mt = m[1]; b64 = m[2] }
            else { b64 = image.split(',')[1] || image }
          }
          messageContent.push({ type: 'image', source: { type: 'base64', media_type: mt, data: b64 } })
        }
        messageContent.push({ type: 'text', text: `Analiza:${userText}` })

        const response = await fetch(ANTHROPIC_API_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': anthropicKey,
            'anthropic-version': '2023-06-01',
            'anthropic-dangerous-direct-browser-access': 'true',
          },
          body: JSON.stringify({
            model: 'claude-haiku-4-5-20241022',
            max_tokens: 500,
            system: systemPrompt,
            messages: [{ role: 'user', content: messageContent }],
          }),
          signal: controller.signal,
        })
        clearTimeout(timeoutId)

        if (!response.ok) {
          const errBody = await response.text()
          console.error('Anthropic error:', response.status, errBody.substring(0, 200))
          if (response.status === 401) return NextResponse.json({ errorFriendly: 'Clave de IA no válida.' })
          if (response.status === 429) return NextResponse.json({ errorFriendly: 'IA ocupada. Prueba en unos segundos.' })
          if (response.status === 529) return NextResponse.json({ errorFriendly: 'IA sobrecargada. Prueba en 30 segundos.' })
          return NextResponse.json({ errorFriendly: 'Error de IA. Prueba de nuevo.' })
        }
        const data = await response.json()
        content = data.content?.[0]?.text || ''

      } else {
        // === Groq (OpenAI-compatible) ===
        const model = image ? 'meta-llama/llama-4-scout-17b-16e-instruct' : 'llama-3.3-70b-versatile'
        const userContent: Array<any> = []
        userContent.push({ type: 'text', text: `Analiza este post:\n${userText}` })
        if (image) {
          const imgUrl = image.includes('data:') ? image : `data:image/jpeg;base64,${image}`
          userContent.push({ type: 'image_url', image_url: { url: imgUrl } })
        }

        const response = await fetch(GROQ_API_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${groqKey}` },
          body: JSON.stringify({
            model,
            messages: [
              { role: 'system', content: 'Responde SOLO JSON sin markdown: {"summary":"","keyPoints":[],"recommendations":[]}' },
              { role: 'user', content: userContent },
            ],
            temperature: 0.7, max_tokens: 400,
          }),
          signal: controller.signal,
        })
        clearTimeout(timeoutId)

        if (!response.ok) {
          const errBody = await response.text()
          console.error('Groq error:', response.status, errBody.substring(0, 200))
          if (image && response.status !== 200) {
            // Retry sin imagen
            const rc = new AbortController()
            const rt = setTimeout(() => rc.abort(), 8000)
            try {
              const rr = await fetch(GROQ_API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${groqKey}` },
                body: JSON.stringify({
                  model: 'llama-3.3-70b-versatile',
                  messages: [
                    { role: 'system', content: 'Responde SOLO JSON sin markdown: {"summary":"","keyPoints":[],"recommendations":[]}' },
                    { role: 'user', content: `Analiza este post:\n${text || '(imagen que no se pudo procesar)'}` },
                  ],
                  temperature: 0.7, max_tokens: 400,
                }),
                signal: rc.signal,
              })
              clearTimeout(rt)
              if (rr.ok) { const rd = await rr.json(); content = rd.choices?.[0]?.message?.content || '' }
            } catch { clearTimeout(rt) }
          }
          if (!content) return NextResponse.json({ errorFriendly: 'Error de IA. Prueba de nuevo.' })
        } else {
          const data = await response.json()
          content = data.choices?.[0]?.message?.content || ''
        }
      }

      // Parsear JSON de la respuesta
      let parsed: any = null
      try {
        const match = content.match(/\{[\s\S]*\}/)
        parsed = match ? JSON.parse(match[0]) : null
      } catch { parsed = null }

      if (!parsed || !parsed.summary) {
        parsed = { summary: content.substring(0, 200), keyPoints: ['Análisis completado'], recommendations: ['Revisa el resumen'] }
      }

      return NextResponse.json(parsed)

    } catch (err: any) {
      clearTimeout(timeoutId)
      console.error('Analyze timeout:', err.message)
      return NextResponse.json({ errorFriendly: 'La IA tardó demasiado. Prueba con texto más corto o sin imagen.' })
    }
  } catch (err: any) {
    console.error('Analyze route error:', err.message)
    return NextResponse.json({ errorFriendly: 'Error inesperado. Prueba de nuevo.' })
  }
}
