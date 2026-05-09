import { NextResponse } from 'next/server'

export async function GET() {
  const rapidKey = process.env.RAPIDAPI_KEY

  let aiTest = { ok: false, status: null, error: null, latency_ms: null, response: null }
  if (rapidKey) {
    const start = Date.now()
    try {
      const response = await fetch('https://chatgpt-42.p.rapidapi.com/gpt4o', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-rapidapi-key': rapidKey,
          'x-rapidapi-host': 'chatgpt-42.p.rapidapi.com',
        },
        body: JSON.stringify({
          messages: [{ role: 'user', content: 'Responde: OK' }],
          max_tokens: 10,
        }),
      })
      aiTest.latency_ms = Date.now() - start
      aiTest.status = response.status
      aiTest.ok = response.ok
      const data = await response.json()
      aiTest.response = data?.result ? data.result.substring(0, 100) : JSON.stringify(data).substring(0, 200)
    } catch (err: any) {
      aiTest.latency_ms = Date.now() - start
      aiTest.error = err.message
    }
  }

  return NextResponse.json({
    ai_provider: 'prlabs_gpt4o',
    rapidapi_set: !!rapidKey,
    ai_test: aiTest,
  })
}
