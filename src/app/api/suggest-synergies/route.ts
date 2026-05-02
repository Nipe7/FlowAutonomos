import { NextRequest, NextResponse } from 'next/server'

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages'

export async function POST(req: NextRequest) {
  try {
    const { nombre, sector, zona, descripcion } = await req.json()

    if (!sector) {
      return NextResponse.json({ error: 'Por favor, indica tu sector.' }, { status: 400 })
    }

    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
      return NextResponse.json({
        errorFriendly: 'La IA no está configurada. Contacta con soporte.',
        suggestions: null,
      })
    }

    const prompt = `Eres consultor de sinergias para autónomos en España.

Negocio: ${nombre || 'Sin nombre'}
Sector: ${sector}
Zona: ${zona || 'Sin especificar'}
${descripcion ? `Descripción: ${descripcion}` : ''}

Genera EXACTAMENTE 6 sugerencias de sinergia:
- 3 CONVENCIONALES (colaboraciones típicas del sector)
- 3 DISRUPTIVAS (ideas innovadoras y sorprendentes)

Para cada sinergia:
- "type": "convencional" o "disruptiva"
- "businessType": tipo de negocio en 1-3 palabras (ej: "floristería", "gimnasio", "cafetería")
- "text": descripción concreta de la acción conjunta (1-2 frases)

Responde SOLO con este JSON exacto, sin markdown ni explicaciones:
{"suggestions":[{"type":"convencional","businessType":"floristería","text":"Colabora con floristerías para ofrecer arreglos en eventos especiales."},...]}

Asegúrate de que businessType sea siempre un tipo de negocio buscable (no pongas descripciones largas).`

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
          messages: [
            { role: 'user', content: prompt }
          ],
        }),
        signal: controller.signal,
      })
      clearTimeout(timeoutId)

      if (!response.ok) {
        const errBody = await response.text()
        console.error('Anthropic error:', response.status, errBody)
        if (response.status === 401) {
          return NextResponse.json({ errorFriendly: 'La clave de IA no es válida. Contacta con soporte.', suggestions: null })
        }
        if (response.status === 429) {
          return NextResponse.json({ errorFriendly: 'La IA está ocupada. Prueba en unos segundos.', suggestions: null })
        }
        return NextResponse.json({ errorFriendly: 'La IA no está disponible ahora. Prueba de nuevo.', suggestions: null })
      }

      const data = await response.json()
      const content = data.content?.[0]?.text || ''

      // Extraer JSON del contenido
      let parsed
      try {
        const match = content.match(/\{[\s\S]*\}/)
        if (match) {
          parsed = JSON.parse(match[0])
          if (parsed.suggestions && Array.isArray(parsed.suggestions)) {
            return NextResponse.json({ suggestions: parsed.suggestions })
          }
        }
      } catch (e) {
        console.error('Error parsing JSON:', e)
      }

      // Fallback si no se pudo parsear
      return NextResponse.json({
        errorFriendly: 'La IA respondió en formato incorrecto. Prueba de nuevo.',
        suggestions: null
      })

    } catch (err: any) {
      clearTimeout(timeoutId)
      if (err.name === 'AbortError') {
        return NextResponse.json({ errorFriendly: 'La IA tardó demasiado. Prueba de nuevo.', suggestions: null })
      }
      return NextResponse.json({ errorFriendly: 'Error de conexión con la IA.', suggestions: null })
    }
  } catch (err: any) {
    console.error('Suggest synergies error:', err)
    return NextResponse.json({ errorFriendly: 'Error inesperado. Prueba de nuevo.', suggestions: null })
  }
}
