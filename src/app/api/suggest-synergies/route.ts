import { NextRequest, NextResponse } from 'next/server'

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages'
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions'

export async function POST(req: NextRequest) {
  try {
    const { nombre, sector, zona, descripcion } = await req.json()

    if (!sector) {
      return NextResponse.json({ error: 'Por favor, indica tu sector.' }, { status: 400 })
    }

    // Soportar Anthropic (CLAUDE_API_KEY o ANTHROPIC_API_KEY) y Groq (GROQ_API_KEY)
    const anthropicKey = process.env.CLAUDE_API_KEY || process.env.ANTHROPIC_API_KEY
    const groqKey = process.env.GROQ_API_KEY
    const apiKey = anthropicKey || groqKey
    const useAnthropic = !!anthropicKey

    if (!apiKey) {
      return NextResponse.json({
        errorFriendly: 'La IA no está configurada todavía. Vuelve a intentarlo más tarde.',
        suggestions: null,
      })
    }

    const prompt = `Eres consultor de sinergias para autónomos en España.
Negocio: ${nombre || '-'} | Sector: ${sector} | Zona: ${zona || '-'}
${descripcion ? `Descripción: ${descripcion}` : ''}

Sugiere 3 sinergias CONVENCIONALES y 3 DISRUPTIVAS.
Para cada una indica:
- "type": "convencional" o "disruptiva"
- "businessType": tipo de negocio en 1-2 palabras (ej: "floristería", "gimnasio")
- "text": descripción concreta de la acción conjunta

JSON sin markdown ni backticks:
{"suggestions":[{"type":"convencional","businessType":"...","text":"..."}, ...]}`

    // Timeout de 8s para dejar margen dentro del límite de 10s de Netlify
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 8000)

    try {
      let content = ''

      if (useAnthropic) {
        // === Anthropic (Claude) ===
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
            messages: [{ role: 'user', content: prompt }],
          }),
          signal: controller.signal,
        })
        clearTimeout(timeoutId)

        if (!response.ok) {
          const errBody = await response.text()
          console.error('Anthropic synergies error:', response.status, errBody)
          if (response.status === 401) return NextResponse.json({ errorFriendly: 'La clave de IA no es válida. Contacta con soporte.', suggestions: null })
          if (response.status === 429) return NextResponse.json({ errorFriendly: 'La IA está ocupada. Prueba en unos segundos.', suggestions: null })
          return NextResponse.json({ errorFriendly: 'No se pudo generar sugerencias. Prueba de nuevo.', suggestions: null })
        }

        const data = await response.json()
        content = data.content?.[0]?.text || ''
      } else {
        // === Groq (OpenAI-compatible) ===
        const response = await fetch(GROQ_API_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: 'llama-3.3-70b-versatile',
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
          console.error('Groq synergies error:', response.status, errBody)
          if (response.status === 401 || response.status === 403) return NextResponse.json({ errorFriendly: 'La clave de IA no es válida. Contacta con soporte.', suggestions: null })
          if (response.status === 429) return NextResponse.json({ errorFriendly: 'La IA ha alcanzado su límite. Prueba en unos minutos.', suggestions: null })
          return NextResponse.json({ errorFriendly: 'No se pudo generar sugerencias. Prueba de nuevo.', suggestions: null })
        }

        const data = await response.json()
        content = data.choices?.[0]?.message?.content || ''
      }

      // Extraer JSON del contenido
      try {
        const match = content.match(/\{[\s\S]*\}/)
        if (match) {
          const parsed = JSON.parse(match[0])
          if (parsed.suggestions) return NextResponse.json({ suggestions: parsed.suggestions })
        }
      } catch { /* fallback */ }

      // Fallback: crear sugerencias a partir del texto
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
      console.error('Synergies timeout/error:', err.message)
      return NextResponse.json({ errorFriendly: 'La IA tardó demasiado. Prueba de nuevo.', suggestions: null })
    }
  } catch (err: any) {
    console.error('Suggest synergies error:', err.message)
    return NextResponse.json({ errorFriendly: 'Error inesperado. Prueba de nuevo.', suggestions: null })
  }
}
