import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'

const GEMINI_TIMEOUT = 20000

// ============================================================
// Convierte errores técnicos en mensajes amigables para el usuario
// ============================================================
function friendlyError(error: any): string {
  const msg = error?.message || String(error) || ''

  if (msg.includes('429') || msg.includes('quota') || msg.includes('Too Many Requests') || msg.includes('exceeded')) {
    return 'IA_AGOTADA'
  }
  if (msg.includes('API key') || msg.includes('API_KEY') || msg.includes('invalid') || msg.includes('UNAUTHENTICATED')) {
    return 'IA_CONFIGURACION'
  }
  if (msg.includes('timeout') || msg.includes('abort') || msg.includes('TIMEOUT')) {
    return 'IA_TIMEOUT'
  }
  if (msg.includes('fetch') || msg.includes('network') || msg.includes('ECONNREFUSED')) {
    return 'IA_CONEXION'
  }
  return 'IA_ERROR'
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

    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) {
      return NextResponse.json({
        errorFriendly: 'El servicio de IA no está disponible en este momento. Prueba más tarde.',
        suggestions: null,
      })
    }

    const genAI = new GoogleGenerativeAI(apiKey)
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' })

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

IMPORTANTE para el campo "businessType": usa solo el tipo de negocio que se buscaría en un directorio como Google Maps.
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
    const timeoutId = setTimeout(() => controller.abort(), GEMINI_TIMEOUT)

    try {
      const result = await model.generateContent(prompt)
      clearTimeout(timeoutId)
      const responseContent = result.response.text()

      try {
        const jsonMatch = responseContent.match(/\{[\s\S]*\}/)
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0])
          if (parsed.suggestions && Array.isArray(parsed.suggestions)) {
            return NextResponse.json({ suggestions: parsed.suggestions })
          }
        }
      } catch { /* fallback */ }

      // Fallback: intentar extraer algo útil del texto
      const lines = responseContent.split('\n').filter((l: string) => l.trim().length > 0).slice(0, 6)
      return NextResponse.json({
        suggestions: lines.map((line: string, i: number) => ({
          type: i < 3 ? 'convencional' : 'disruptiva',
          businessType: '',
          text: line.replace(/^[-*\d.)\s]+/, '').trim(),
        }))
      })

    } catch (geminiError: any) {
      clearTimeout(timeoutId)
      const code = friendlyError(geminiError)
      const messages: Record<string, string> = {
        IA_AGOTADA: 'La IA ha alcanzado su límite diario de uso. Prueba de nuevo en unas horas o usa la búsqueda directa.',
        IA_CONFIGURACION: 'El servicio de IA no está disponible. Prueba más tarde.',
        IA_TIMEOUT: 'La IA tardó demasiado en responder. Prueba de nuevo.',
        IA_CONEXION: 'No se pudo conectar con el servicio de IA. Verifica tu conexión.',
        IA_ERROR: 'El servicio de IA no está disponible ahora. Prueba más tarde.',
      }
      return NextResponse.json({
        errorFriendly: messages[code] || messages.IA_ERROR,
        suggestions: null,
      })
    }

  } catch (error: any) {
    return NextResponse.json({
      errorFriendly: 'Ha ocurrido un error inesperado. Inténtalo de nuevo.',
      suggestions: null,
    })
  }
}
