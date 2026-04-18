import { NextRequest, NextResponse } from 'next/server'

const XAI_API_URL = 'https://api.x.ai/v1/chat/completions'
const XAI_TIMEOUT = 20000

// ============================================================
// Errores técnicos → mensajes amigables
// ============================================================
function friendlyError(error: any): string {
  const msg = error?.message || String(error) || ''
  if (msg.includes('429') || msg.includes('quota') || msg.includes('rate') || msg.includes('Too Many')) {
    return 'La IA ha alcanzado su límite de uso. Prueba de nuevo en unos minutos o usa la búsqueda directa.'
  }
  if (msg.includes('401') || msg.includes('API key') || msg.includes('UNAUTHORIZED') || msg.includes('invalid')) {
    return 'El servicio de IA no está disponible en este momento.'
  }
  if (msg.includes('timeout') || msg.includes('abort') || msg.includes('TIMEOUT')) {
    return 'La IA tardó demasiado en responder. Prueba de nuevo.'
  }
  if (msg.includes('fetch') || msg.includes('network') || msg.includes('ECONN')) {
    return 'No se pudo conectar con el servicio de IA. Verifica tu conexión.'
  }
  return 'No se pudieron generar sugerencias en este momento. Inténtalo de nuevo.'
}

export async function POST(req: NextRequest) {
  try {
    const { nombre, sector, zona, descripcion } = await req.json()

    if (!sector) {
      return NextResponse.json(
        { error: 'Por favor, indica tu sector.' },
        { status: 400 }
      )
    }

    const apiKey = process.env.XAI_API_KEY
    if (!apiKey) {
      return NextResponse.json({
        errorFriendly: 'El servicio de IA no está disponible en este momento. Prueba más tarde.',
        suggestions: null,
      })
    }

    const prompt = `Eres un consultor experto en sinergias empresariales para autónomos y pequeños comercios en España.

Datos del negocio del usuario:
- Nombre: ${nombre || 'No indicado'}
- Sector: ${sector}
- Zona: ${zona || 'No indicada'}
- Descripción: ${descripcion || 'No indicada'}

Tu tarea es sugerir con qué tipos de negocios podría aliarse este autónomo. Debes dar:
- 3 sinergias CONVENCIONALES (colaboraciones naturales con negocios complementarios que estén cerca)
- 3 sinergias DISRUPTIVAS (alianzas creativas e inesperadas con negocios de otros sectores)

Para cada sugerencia:
- Indica el TIPO de negocio (en 1-2 palabras, sin artículo) en el campo "businessType"
- Describe QUÉ harían juntos de forma concreta en el campo "text"

IMPORTANTE para "businessType": usa solo el tipo de negocio que se buscaría en Google Maps.
Ejemplos correctos: "floristería", "cafetería", "gimnasio", "fotógrafo", "tienda de ropa", "peluquería"
Ejemplos incorrectos: "una floristería", "los cafés de la zona"

Responde SOLO con este JSON (sin markdown, sin backticks):
{
  "suggestions": [
    { "type": "convencional", "businessType": "tipo_de_negocio_1", "text": "Descripción concreta de la acción conjunta." },
    { "type": "convencional", "businessType": "tipo_de_negocio_2", "text": "..." },
    { "type": "convencional", "businessType": "tipo_de_negocio_3", "text": "..." },
    { "type": "disruptiva", "businessType": "tipo_de_negocio_4", "text": "Descripción concreta e inesperada." },
    { "type": "disruptiva", "businessType": "tipo_de_negocio_5", "text": "..." },
    { "type": "disruptiva", "businessType": "tipo_de_negocio_6", "text": "..." }
  ]
}

Adapta todo al sector "${sector}" y la zona "${zona || 'su localidad'}". Sé práctico y creativo.`

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), XAI_TIMEOUT)

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
            { role: 'system', content: 'Eres un consultor de sinergias empresariales. Responde SOLO con JSON válido, sin markdown ni backticks.' },
            { role: 'user', content: prompt },
          ],
          temperature: 0.8,
          max_tokens: 1500,
        }),
        signal: controller.signal,
      })
      clearTimeout(timeoutId)

      if (!response.ok) {
        const errBody = await response.text()
        console.error('xAI API error:', response.status, errBody)
        return NextResponse.json({
          errorFriendly: friendlyError({ message: errBody }),
          suggestions: null,
        })
      }

      const data = await response.json()
      const responseContent = data.choices?.[0]?.message?.content || ''

      try {
        const jsonMatch = responseContent.match(/\{[\s\S]*\}/)
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0])
          if (parsed.suggestions && Array.isArray(parsed.suggestions)) {
            return NextResponse.json({ suggestions: parsed.suggestions })
          }
        }
      } catch { /* fallback */ }

      const lines = responseContent.split('\n').filter((l: string) => l.trim().length > 0).slice(0, 6)
      return NextResponse.json({
        suggestions: lines.map((line: string, i: number) => ({
          type: i < 3 ? 'convencional' : 'disruptiva',
          businessType: '',
          text: line.replace(/^[-*\d.)\s]+/, '').trim(),
        }))
      })

    } catch (fetchError: any) {
      clearTimeout(timeoutId)
      return NextResponse.json({
        errorFriendly: friendlyError(fetchError),
        suggestions: null,
      })
    }

  } catch (error: any) {
    console.error('Synergy error:', error)
    return NextResponse.json({
      errorFriendly: 'Ha ocurrido un error inesperado. Inténtalo de nuevo.',
      suggestions: null,
    })
  }
}
