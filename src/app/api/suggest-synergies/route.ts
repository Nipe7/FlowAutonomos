import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'

// Timeout para no exceder límite de Netlify
const GEMINI_TIMEOUT = 20000

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
      return NextResponse.json(
        { error: 'Servicio de IA no configurado. Contacta con el administrador.' },
        { status: 500 }
      )
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
- 3 sinergias DISRUPTIVAS (alianzas creativas e inesperadas con negocios de otros sectores que puedan generar impacto)

Para cada sugerencia, indica el TIPO de negocio con el que haría la sinergia y QUÉ harían juntos de forma concreta.

Responde SOLO con este JSON (sin markdown, sin backticks):
{
  "suggestions": [
    { "type": "convencional", "text": "Con una [tipo negocio]: [descripción concreta de la acción conjunta]" },
    { "type": "convencional", "text": "..." },
    { "type": "convencional", "text": "..." },
    { "type": "disruptiva", "text": "Con una [tipo negocio]: [descripción concreta e inesperada]" },
    { "type": "disruptiva", "text": "..." },
    { "type": "disruptiva", "text": "..." }
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
          return NextResponse.json(parsed)
        }
      } catch { /* fallback */ }

      return NextResponse.json({
        suggestions: responseContent.split('\n').filter((l: string) => l.trim().length > 0).slice(0, 6)
      })
    } catch (geminiError: any) {
      clearTimeout(timeoutId)
      if (geminiError.name === 'AbortError' || geminiError.message?.includes('timeout') || geminiError.message?.includes('abort')) {
        return NextResponse.json(
          { error: 'La sugerencia tardó demasiado. Inténtalo de nuevo.' },
          { status: 504 }
        )
      }
      throw geminiError
    }

  } catch (error: any) {
    console.error('Synergy suggestion error:', error)
    return NextResponse.json(
      { error: error.message || 'Error al generar sugerencias. Inténtalo de nuevo.' },
      { status: 500 }
    )
  }
}
