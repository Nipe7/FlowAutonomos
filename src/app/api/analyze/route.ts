import { NextRequest, NextResponse } from 'next/server'

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions'

export async function POST(req: NextRequest) {
  try {
    const { text, image, platform } = await req.json()

    if (!text && !image) {
      return NextResponse.json({ error: 'Proporciona texto o una imagen.' }, { status: 400 })
    }

    const apiKey = process.env.XAI_API_KEY
    if (!apiKey) {
      return NextResponse.json({ errorFriendly: 'La IA no está configurada todavía. Vuelve a intentarlo más tarde.' })
    }

    const platformNote = platform
      ? `Plataforma: ${platform}.`
      : 'Sin plataforma especificada.'

    const systemPrompt = `Eres "Analista Flow", experta en Social Media con 10 años de experiencia con autónomos en España. ${platformNote}
Analiza el post y devuelve SOLO este JSON sin markdown ni backticks:
{"summary":"Diagnóstico en 2 frases.","keyPoints":["Punto 1","Punto 2","Punto 3"],"recommendations":["Cambio 1","Cambio 2","Cambio 3"]}`

    const userContent: Array<{ type: string; text?: string; image_url?: { url: string } }> = []
    userContent.push({ type: 'text', text: `Analiza este post:\n${text || '(solo imagen adjunta)'}` })

    if (image) {
      const imageUrl = image.includes('data:') ? image : `data:image/jpeg;base64,${image}`
      userContent.push({ type: 'image_url', image_url: { url: imageUrl } })
    }

    // Timeout de 6s para dejar margen dentro del límite de 10s de Netlify
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 6000)

    try {
      const model = image ? 'meta-llama/llama-4-scout-17b-16e-instruct' : 'llama-3.3-70b-versatile'

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
        if (response.status === 401) {
          return NextResponse.json({ errorFriendly: 'La clave de IA no es válida. Contacta con soporte.' })
        }
        if (response.status === 429 || errBody.includes('rate') || errBody.includes('quota')) {
          return NextResponse.json({ errorFriendly: 'La IA ha alcanzado su límite de uso. Prueba en unos minutos.' })
        }
        // Si el modelo de visión falla, reintentar sin imagen
        if (image && response.status !== 200) {
          const retryController = new AbortController()
          const retryTimeout = setTimeout(() => retryController.abort(), 6000)
          try {
            const retryResponse = await fetch(GROQ_API_URL, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`,
              },
              body: JSON.stringify({
                model: 'llama-3.3-70b-versatile',
                messages: [
                  { role: 'system', content: systemPrompt },
                  { role: 'user', content: `Analiza este post:\n${text || '(imagen adjunta que no se pudo procesar)'}` },
                ],
                temperature: 0.7,
                max_tokens: 500,
              }),
              signal: retryController.signal,
            })
            clearTimeout(retryTimeout)
            if (retryResponse.ok) {
              const retryData = await retryResponse.json()
              const retryContent = retryData.choices?.[0]?.message?.content || ''
              let retryParsed
              try {
                const match = retryContent.match(/\{[\s\S]*\}/)
                retryParsed = match ? JSON.parse(match[0]) : null
              } catch { retryParsed = null }
              if (retryParsed) return NextResponse.json(retryParsed)
              return NextResponse.json({ summary: retryContent, keyPoints: ['Análisis completado'], recommendations: ['Revisa el resumen'] })
            }
          } catch {
            clearTimeout(retryTimeout)
          }
        }
        return NextResponse.json({ errorFriendly: 'No se pudo analizar. Prueba de nuevo.' })
      }

      const data = await response.json()
      const content = data.choices?.[0]?.message?.content || ''

      let parsed
      try {
        const match = content.match(/\{[\s\S]*\}/)
        parsed = match ? JSON.parse(match[0]) : null
      } catch { parsed = null }

      if (!parsed) {
        parsed = { summary: content, keyPoints: ['Análisis completado'], recommendations: ['Revisa el resumen'] }
      }

      return NextResponse.json(parsed)
    } catch (err: any) {
      clearTimeout(timeoutId)
      console.error('Groq analyze timeout/error:', err.message)
      return NextResponse.json({ errorFriendly: 'El análisis tardó demasiado. Prueba sin imagen o con texto más corto.' })
    }
  } catch (err: any) {
    console.error('Analyze route error:', err.message)
    return NextResponse.json({ errorFriendly: 'Error inesperado. Prueba de nuevo.' })
  }
}
