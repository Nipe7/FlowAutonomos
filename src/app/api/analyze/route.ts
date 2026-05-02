import { NextRequest, NextResponse } from 'next/server'

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages'
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions'

export async function POST(req: NextRequest) {
  try {
    const { text, image, platform } = await req.json()

    if (!text && !image) {
      return NextResponse.json({ error: 'Proporciona texto o una imagen.' }, { status: 400 })
    }

    // Soportar Anthropic (CLAUDE_API_KEY o ANTHROPIC_API_KEY) y Groq (GROQ_API_KEY)
    const anthropicKey = process.env.CLAUDE_API_KEY || process.env.ANTHROPIC_API_KEY
    const groqKey = process.env.GROQ_API_KEY
    const apiKey = anthropicKey || groqKey
    const useAnthropic = !!anthropicKey

    if (!apiKey) {
      return NextResponse.json({ errorFriendly: 'La IA no está configurada todavía. Vuelve a intentarlo más tarde.' })
    }

    const platformInfo: Record<string, string> = {
      instagram: 'Instagram (visual, hashtags, stories)',
      tiktok: 'TikTok (vídeos cortos, trends, música)',
      facebook: 'Facebook (comunidad, texto largo)',
      linkedin: 'LinkedIn (profesional, B2B)',
      x: 'X/Twitter (brevedad, inmediatez)'
    }

    const platformNote = platform && platformInfo[platform]
      ? `Plataforma: ${platformInfo[platform]}`
      : 'Sin plataforma especificada.'

    const systemPrompt = `Eres "Analista Flow", experta en Social Media con 10 años de experiencia ayudando a autónomos en España. ${platformNote}
Analiza el post y devuelve SOLO este JSON sin markdown ni backticks:
{"summary":"Diagnóstico en 2 frases.","keyPoints":["Punto 1","Punto 2","Punto 3"],"recommendations":["Cambio 1","Cambio 2","Cambio 3"]}`

    // Timeout de 8s para dejar margen dentro del límite de 10s de Netlify
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 8000)

    try {
      let content = ''

      if (useAnthropic) {
        // === Anthropic (Claude) ===
        const messageContent: Array<any> = []
        if (image) {
          let imageBase64 = image
          let mediaType = 'image/jpeg'
          if (image.includes('data:')) {
            const match = image.match(/data:(image\/[a-zA-Z]+);base64,(.*)/)
            if (match) {
              mediaType = match[1]
              imageBase64 = match[2]
            } else {
              imageBase64 = image.split(',')[1] || image
            }
          }
          messageContent.push({
            type: 'image',
            source: { type: 'base64', media_type: mediaType, data: imageBase64 }
          })
        }
        const textPrompt = text
          ? `Analiza este post:\n\n${text}`
          : 'Analiza la imagen adjunta del post y proporciona feedback de marketing.'
        messageContent.push({ type: 'text', text: textPrompt })

        const response = await fetch(ANTHROPIC_API_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01',
          },
          body: JSON.stringify({
            model: 'claude-sonnet-4-20250514',
            max_tokens: 800,
            system: systemPrompt,
            messages: [{ role: 'user', content: messageContent }],
          }),
          signal: controller.signal,
        })
        clearTimeout(timeoutId)

        if (!response.ok) {
          const errBody = await response.text()
          console.error('Anthropic analyze error:', response.status, errBody)
          if (response.status === 401) return NextResponse.json({ errorFriendly: 'La clave de IA no es válida. Contacta con soporte.' })
          if (response.status === 429) return NextResponse.json({ errorFriendly: 'La IA está ocupada. Prueba en unos segundos.' })
          return NextResponse.json({ errorFriendly: 'No se pudo analizar. Prueba de nuevo.' })
        }

        const data = await response.json()
        content = data.content?.[0]?.text || ''
      } else {
        // === Groq (OpenAI-compatible) ===
        const model = image ? 'meta-llama/llama-4-scout-17b-16e-instruct' : 'llama-3.3-70b-versatile'

        const userContent: Array<any> = []
        userContent.push({ type: 'text', text: `Analiza este post:\n${text || '(solo imagen adjunta)'}` })
        if (image) {
          const imageUrl = image.includes('data:') ? image : `data:image/jpeg;base64,${image}`
          userContent.push({ type: 'image_url', image_url: { url: imageUrl } })
        }

        const response = await fetch(GROQ_API_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model,
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: userContent },
            ],
            temperature: 0.7,
            max_tokens: 500,
          }),
          signal: controller.signal,
        })
        clearTimeout(timeoutId)

        if (!response.ok) {
          const errBody = await response.text()
          console.error('Groq analyze error:', response.status, errBody)
          if (response.status === 401 || response.status === 403) return NextResponse.json({ errorFriendly: 'La clave de IA no es válida. Contacta con soporte.' })
          if (response.status === 429) return NextResponse.json({ errorFriendly: 'La IA ha alcanzado su límite. Prueba en unos minutos.' })
          // Si el modelo de visión falla, reintentar sin imagen
          if (image && response.status !== 200) {
            const retryCtrl = new AbortController()
            const retryTid = setTimeout(() => retryCtrl.abort(), 8000)
            try {
              const retryRes = await fetch(GROQ_API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
                body: JSON.stringify({
                  model: 'llama-3.3-70b-versatile',
                  messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: `Analiza este post:\n${text || '(imagen adjunta que no se pudo procesar)'}` },
                  ],
                  temperature: 0.7, max_tokens: 500,
                }),
                signal: retryCtrl.signal,
              })
              clearTimeout(retryTid)
              if (retryRes.ok) {
                const retryData = await retryRes.json()
                content = retryData.choices?.[0]?.message?.content || ''
              }
            } catch { clearTimeout(retryTid) }
          }
          if (!content) return NextResponse.json({ errorFriendly: 'No se pudo analizar. Prueba de nuevo.' })
        } else {
          const data = await response.json()
          content = data.choices?.[0]?.message?.content || ''
        }
      }

      // Extraer JSON del contenido
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
      console.error('Analyze timeout/error:', err.message)
      return NextResponse.json({ errorFriendly: 'El análisis tardó demasiado. Prueba sin imagen o con texto más corto.' })
    }
  } catch (err: any) {
    console.error('Analyze route error:', err.message)
    return NextResponse.json({ errorFriendly: 'Error inesperado. Prueba de nuevo.' })
  }
}
