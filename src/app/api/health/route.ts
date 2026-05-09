import { NextResponse } from 'next/server'

export async function GET() {
  const geminiKey = process.env.GEMINI_API_KEY
  const rapidKey = process.env.RAPIDAPI_KEY

  let geminiTest = { ok: false, status: null, error: null, latency_ms: null }
  if (geminiKey) {
    const start = Date.now()
    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: 'Responde solo: OK' }] }],
          generationConfig: { maxOutputTokens: 10 },
        }),
      })
      geminiTest.latency_ms = Date.now() - start
      geminiTest.status = response.status
      geminiTest.ok = response.ok
      if (!response.ok) {
        const err = await response.text()
        geminiTest.error = err.substring(0, 200)
      }
    } catch (err: any) {
      geminiTest.latency_ms = Date.now() - start
      geminiTest.error = err.message
    }
  }

  return NextResponse.json({
    ai_provider: geminiKey ? 'gemini' : 'NONE',
    gemini_set: !!geminiKey,
    gemini_test: geminiTest,
    rapidapi_set: !!rapidKey,
  })
}
