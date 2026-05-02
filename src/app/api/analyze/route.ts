import { NextRequest, NextResponse } from 'next/server'

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages'

export async function POST(req: NextRequest) {
  try {
    const { text, image, platform } = await req.json()

    if (!text && !image) {
      return NextResponse.json({ error: 'Proporciona texto o una imagen.' }, { status: 400 })
    }

    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
      return NextResponse.json({ errorFriendly: 'La IA no está configurada. Contacta con soporte.' })
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

Analiza este post como experta en marketing y devuelve EXACTAMENTE este formato JSON sin markdown ni explicaciones:

{
  "summary": "Diagnóstico general del post en 2-3 frases directas y prácticas",
  "keyPoints": [
    "Punto fuerte 1 del contenido",
    "Punto fuerte 2 o aspecto destacable",
    "Punto fuerte 3 o elemento que funciona"
  ],
  "recommendations": [
    "Mejora concreta 1 (accionable)",
    "Mejora concreta 2 (accionable)",
    "Mejora concreta 3 (accionable)"
  ]
}

Sé específica, práctica y directa. Enfócate en lo que el autónomo puede mejorar HOY.`

    // Construir contenido del mensaje
    const messageContent: Array<any> = []

    // Si hay imagen, procesarla primero
    if (image) {
      // Extraer el base64 y el tipo de imagen
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
        source: {
          type: 'base64',
          media_type: mediaType,
          data: imageBase64
        }
      })
    }

    // Añadir el texto del prompt
    const textPrompt = text 
      ? `Analiza este post:\n\n${text}`
      : 'Analiza la imagen adjunta del post y proporciona feedback de marketing.'

    messageContent.push({
      type: 'text',
      text: textPrompt
    })

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 20000)

    try {
      const response = await fetch(ANTHROPIC_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1500,
          system: systemPrompt,
          messages: [
            { role: 'user', content: messageContent }
          ],
        }),
        signal: controller.signal,
      })
      clearTimeout(timeoutId)

      if (!response.ok) {
        const errBody = await response.text()
        console.error('Anthropic analyze error:', response.status, errBody)
        if (response.status === 401) {
          return NextResponse.json({ errorFriendly: 'La clave de IA no es válida. Contacta con soporte.' })
        }
        if (response.status === 429) {
          return NextResponse.json({ errorFriendly: 'La IA está ocupada. Prueba en unos segundos.' })
        }
        return NextResponse.json({ errorFriendly: 'No se pudo analizar. Prueba de nuevo.' })
      }

      const data = await response.json()
      const content = data.content?.[0]?.text || ''

      // Extraer JSON del contenido
      let parsed
      try {
        const match = content.match(/\{[\s\S]*\}/)
        if (match) {
          parsed = JSON.parse(match[0])
          if (parsed.summary && parsed.keyPoints && parsed.recommendations) {
            return NextResponse.json(parsed)
          }
        }
      } catch (e) {
        console.error('Error parsing JSON:', e)
      }

      // Fallback: estructurar la respuesta aunque no sea JSON perfecto
      return NextResponse.json({
        summary: content.substring(0, 200) + '...',
        keyPoints: ['Análisis completado', 'Revisa el contenido general'],
        recommendations: ['Aplica los consejos del resumen']
      })

    } catch (err: any) {
      clearTimeout(timeoutId)
      if (err.name === 'AbortError') {
        return NextResponse.json({ errorFriendly: 'El análisis tardó demasiado. Prueba con texto más corto.' })
      }
      return NextResponse.json({ errorFriendly: 'Error de conexión con la IA.' })
    }
  } catch (err: any) {
    console.error('Analyze route error:', err)
    return NextResponse.json({ errorFriendly: 'Error inesperado. Prueba de nuevo.' })
  }
}
