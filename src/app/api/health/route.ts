import { NextResponse } from 'next/server'

// Endpoint de diagnóstico que hace una llamada REAL a Anthropic para ver el error
export async function GET() {
  const anthropicKey = process.env.CLAUDE_API_KEY || process.env.ANTHROPIC_API_KEY
  const groqKey = process.env.GROQ_API_KEY
  const rapidKey = process.env.RAPIDAPI_KEY
  const rapidHost = process.env.RAPIDAPI_HOST

  let anthropicTest = { ok: false, status: null, error: null, latency_ms: null }
  if (anthropicKey) {
    const start = Date.now()
    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': anthropicKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-3-5-haiku-20241022',
          max_tokens: 20,
          messages: [{ role: 'user', content: 'Di hola' }],
        }),
      })
      anthropicTest.latency_ms = Date.now() - start
      anthropicTest.status = response.status
      anthropicTest.ok = response.ok
      const body = await response.text()
      anthropicTest.error = body.substring(0, 500)
    } catch (err: any) {
      anthropicTest.latency_ms = Date.now() - start
      anthropicTest.error = err.message
    }
  }

  return NextResponse.json({
    anthropic_set: !!anthropicKey,
    anthropic_prefix: anthropicKey ? anthropicKey.substring(0, 10) + '...' : 'NOT_SET',
    anthropic_test: anthropicTest,
    groq_set: !!groqKey,
    ai_provider: anthropicKey ? 'anthropic' : (groqKey ? 'groq' : 'NONE'),
    rapidapi_set: !!(rapidKey && rapidHost),
  })
}
