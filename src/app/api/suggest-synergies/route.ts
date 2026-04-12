import { NextRequest, NextResponse } from 'next/server'
import ZAI from 'z-ai-web-dev-sdk'

export async function POST(req: NextRequest) {
  try {
    const { nombre, sector, zona, descripcion } = await req.json()

    if (!sector) {
      return NextResponse.json(
        { error: 'Por favor, indica tu sector.' },
        { status: 400 }
      )
    }

    const zai = await ZAI.create()

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

    const completion = await zai.chat.completions.create({
      messages: [
        { role: 'system', content: 'Eres un consultor de sinergias empresariales. Responde SOLO con JSON válido, sin markdown ni backticks.' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.8,
      max_tokens: 1500,
    })

    const responseContent = completion.choices[0]?.message?.content || ''

    try {
      const jsonMatch = responseContent.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        const result = JSON.parse(jsonMatch[0])
        return NextResponse.json(result)
      }
    } catch { /* fallback */ }

    return NextResponse.json({
      suggestions: responseContent.split('\n').filter((l: string) => l.trim().length > 0).slice(0, 6)
    })

  } catch (error: any) {
    console.error('Synergy suggestion error:', error)
    return NextResponse.json(
      { error: 'Error al generar sugerencias. Inténtalo de nuevo.' },
      { status: 500 }
    )
  }
}
