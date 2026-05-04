import { NextRequest, NextResponse } from 'next/server'

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages'
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions'

export async function POST(req: NextRequest) {
  try {
    const { nombre, sector, zona, descripcion } = await req.json()

    if (!sector) {
      return NextResponse.json({ error: 'Por favor, indica tu sector.' }, { status: 400 })
    }

    const anthropicKey = process.env.CLAUDE_API_KEY || process.env.ANTHROPIC_API_KEY
    const groqKey = process.env.GROQ_API_KEY
    const apiKey = anthropicKey || groqKey

    if (!apiKey) {
      return NextResponse.json({
        errorFriendly: 'La IA no está configurada todavía. Vuelve a intentarlo más tarde.',
        suggestions: null,
      })
    }

    const prompt = `Negocio:${nombre||'-'} Sector:${sector} Zona:${zona||'-'} ${descripcion||''}
Da 6 sinergias: 3 convencionales + 3 disruptivas.
JSON: {"suggestions":[{"type":"convencional","businessType":"floristeria","text":"Colabora con..."},...]}`
    const systemMsg = 'Responde SOLO JSON sin markdown ni backticks. Breve.'

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 8000)

    try {
      let content = ''

      if (anthropicKey) {
        const response = await fetch(ANTHROPIC_API_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': anthropicKey,
            'anthropic-version': '2023-06-01',
          },
          body: JSON.stringify({
            model: 'claude-3-5-haiku-20241022',
            max_tokens: 500,
            messages: [{ role: 'user', content: prompt }],
            system: systemMsg,
          }),
          signal: controller.signal,
        })
        clearTimeout(timeoutId)

        if (!response.ok) {
          const errBody = await response.text()
          console.error('Anthropic syn error:', response.status, errBody.substring(0, 300))
          if (response.status === 401) return NextResponse.json({ errorFriendly: 'Clave de IA no válida.', suggestions: null })
          if (response.status === 429) return NextResponse.json({ errorFriendly: 'IA ocupada. Prueba en segundos.', suggestions: null })
          if (response.status === 529) return NextResponse.json({ errorFriendly: 'IA sobrecargada. Prueba en 30s.', suggestions: null })
          // Si Anthropic falla y hay Groq, intentar Groq
          if (groqKey) {
            console.log('Anthropic failed, trying Groq backup...')
            content = await tryGroq(prompt, systemMsg, groqKey)
          }
          if (!content) return NextResponse.json({ errorFriendly: 'Error de IA. Prueba de nuevo.', suggestions: null })
        } else {
          const data = await response.json()
          content = data.content?.[0]?.text || ''
        }
      } else {
        content = await tryGroq(prompt, systemMsg, groqKey!)
        if (!content) return NextResponse.json({ errorFriendly: 'Error de IA. Prueba de nuevo.', suggestions: null })
      }

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
      console.error('Synergies timeout:', err.message)
      return NextResponse.json({ errorFriendly: 'La IA tardó demasiado. Prueba de nuevo.', suggestions: null })
    }
  } catch (err: any) {
    console.error('Synergies error:', err.message)
    return NextResponse.json({ errorFriendly: 'Error inesperado. Prueba de nuevo.', suggestions: null })
  }
}

async function tryGroq(prompt: string, systemMsg: string, groqKey: string): Promise<string> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 8000)
  try {
    const response = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${groqKey}` },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: systemMsg },
          { role: 'user', content: prompt },
        ],
        temperature: 0.8, max_tokens: 600,
      }),
      signal: controller.signal,
    })
    clearTimeout(timeoutId)
    if (!response.ok) { console.error('Groq error:', response.status); return '' }
    const data = await response.json()
    return data.choices?.[0]?.message?.content || ''
  } catch (err: any) {
    clearTimeout(timeoutId)
    console.error('Groq timeout:', err.message)
    return ''
  }
}
