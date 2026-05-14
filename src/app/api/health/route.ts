import { NextResponse } from 'next/server'

export async function GET() {
  const rapidKey = process.env.RAPIDAPI_KEY
  const openrouterKey = process.env.OPENROUTER_API_KEY
  const geminiKey = process.env.GEMINI_API_KEY

  const tests: Record<string, any> = {}

  // Test OpenRouter
  if (openrouterKey) {
    const start = Date.now()
    try {
      const resp = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${openrouterKey}`,
          'HTTP-Referer': 'https://flowautonomos.netlify.app',
        },
        body: JSON.stringify({
          model: 'deepseek/deepseek-v4-flash:free',
          messages: [{ role: 'user', content: 'Responde solo: OK' }],
          max_tokens: 5,
        }),
        signal: AbortSignal.timeout(8000),
      })
      tests.openrouter = { ok: resp.ok, status: resp.status, latency_ms: Date.now() - start }
    } catch (e: any) {
      tests.openrouter = { ok: false, error: e.message, latency_ms: Date.now() - start }
    }
  }

  // Test Gemini
  if (geminiKey) {
    const start = Date.now()
    try {
      const resp = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: 'Responde solo: OK' }] }],
          generationConfig: { maxOutputTokens: 10 },
        }),
        signal: AbortSignal.timeout(8000),
      })
      tests.gemini = { ok: resp.ok, status: resp.status, latency_ms: Date.now() - start }
    } catch (e: any) {
      tests.gemini = { ok: false, error: e.message, latency_ms: Date.now() - start }
    }
  }

  return NextResponse.json({
    ai_providers: {
      openrouter_set: !!openrouterKey,
      gemini_set: !!geminiKey,
    },
    ai_tests: tests,
    rapidapi_set: !!rapidKey,
  })
}
