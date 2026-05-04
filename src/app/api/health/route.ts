import { NextResponse } from 'next/server'

export async function GET() {
  const rapidKey = process.env.RAPIDAPI_KEY

  let prLabsTest = { ok: false, status: null, error: null, latency_ms: null }
  if (rapidKey) {
    const start = Date.now()
    try {
      const response = await fetch('https://chatgpt-42.p.rapidapi.com/matag2', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-rapidapi-key': rapidKey,
          'x-rapidapi-host': 'chatgpt-42.p.rapidapi.com',
        },
        body: JSON.stringify({
          messages: [{ role: 'user', content: 'Di hola' }],
          max_tokens: 10,
        }),
      })
      prLabsTest.latency_ms = Date.now() - start
      prLabsTest.status = response.status
      prLabsTest.ok = response.ok
      const body = await response.text()
      prLabsTest.error = body.substring(0, 300)
    } catch (err: any) {
      prLabsTest.latency_ms = Date.now() - start
      prLabsTest.error = err.message
    }
  }

  return NextResponse.json({
    ai_provider: 'prlabs_rapidapi',
    rapidapi_set: !!rapidKey,
    prlabs_test: prLabsTest,
  })
}
