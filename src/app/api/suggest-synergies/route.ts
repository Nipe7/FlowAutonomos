import { NextRequest, NextResponse } from 'next/server'

const XAI_API_URL = 'https://api.x.ai/v1/chat/completions'

export async function POST(req: NextRequest) {
  try {
    const { nombre, sector, zona, descripcion } = await req.json()

    if (!sector) {
      return NextResponse.json({ error: 'Por favor, indica tu sector.' }, { status: 400 })
    }

    const apiKey = process.env.XAI_API_KEY
    if (!apiKey) {
      return NextResponse.json({
        errorFriendly: 'La IA no está configurada todavía. Vuelve a intentarlo más tarde.',
        suggestions: null,
      })
    }

    const prompt = `Eres consultor de sinergias para autónomos en España.
Negocio: ${nombre || '-'} | Sector: ${sector} | Zona: ${zona || '-'}

Sugiere 3 sinergias CONVENCIONALES y 3 DISRUPTIVAS.
Para cada una indica:
- "type": "convencional" o "disruptiva"
- "businessType": tipo de negocio en 1-2 palabras (ej: "floristería", "gimnasio")
- "text": descripción concreta de la acción conjunta

JSON sin markdown ni backticks:
{"suggestions":[{"type":"convencional","businessType":"...","text":"..."}, ...]}`

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
            { role: 'system', content: 'Responde SOLO con JSON válido, sin markdown ni backticks.' },
            { role: 'user', content: prompt },
          ],
          temperature: 0.8,
          max_tokens: 800,
        }),
        signal: controller.signal,
      })
      clearTimeout(timeoutId)

      if (!response.ok) {
        const errBody = await response.text()
        console.error('xAI error:', response.status, errBody)
        if (errBody.includes('429') || errBody.includes('rate') || errBody.includes('quota')) {
          return NextResponse.json({ errorFriendly: 'La IA ha alcanzado su límite de uso. Prueba en unos minutos.', suggestions: null })
        }
        return NextResponse.json({ errorFriendly: 'La IA no está disponible ahora. Prueba de nuevo.', suggestions: null })
      }

      const data = await response.json()
      const content = data.choices?.[0]?.message?.content || ''

      try {
        const match = content.match(/\{[\s\S]*\}/)
        if (match) {
          const parsed = JSON.parse(match[0])
          if (parsed.suggestions) return NextResponse.json({ suggestions: parsed.suggestions })
        }
      } catch { /* fallback */ }

      const lines = content.split('\n').filter((l: string) => l.trim().length > 0).slice(0, 6)
      return NextResponse.json({
        suggestions: lines.map((line: string, i: number) => ({
          type: i < 3 ? 'convencional' : 'disruptiva',
          businessType: '',
          text: line.replace(/^[-*\d.)\s]+/, '').trim(),
        }))
      })
    } catch (err: any) {
      clearTimeout(timeoutId)
      return NextResponse.json({ errorFriendly: 'La IA tardó demasiado. Prueba de nuevo.', suggestions: null })
    }
  } catch {
    return NextResponse.json({ errorFriendly: 'Error inesperado. Prueba de nuevo.', suggestions: null })
  }
}
