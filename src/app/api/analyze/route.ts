import { NextRequest, NextResponse } from 'next/server'

const XAI_API_URL = 'https://api.x.ai/v1/chat/completions'

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

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 8000)

    try {
      const response = await fetch(XAI_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: 'grok-3-mini',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userContent },
          ],
          temperature: 0.7,
          max_tokens: 600,
        }),
        signal: controller.signal,
      })
      clearTimeout(timeoutId)

      if (!response.ok) {
        const errBody = await response.text()
        console.error('xAI error:', response.status, errBody)
        if (errBody.includes('429') || errBody.includes('rate') || errBody.includes('quota')) {
          return NextResponse.json({ errorFriendly: 'La IA ha alcanzado su límite de uso. Prueba en unos minutos.' })
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
      return NextResponse.json({ errorFriendly: 'El análisis tardó demasiado. Prueba sin imagen o con texto más corto.' })
    }
  } catch {
    return NextResponse.json({ errorFriendly: 'Error inesperado. Prueba de nuevo.' })
  }
}
