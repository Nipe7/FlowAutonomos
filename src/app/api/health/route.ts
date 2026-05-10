import { NextResponse } from 'next/server'
import ZAI from 'z-ai-web-dev-sdk'

export async function GET() {
  const rapidKey = process.env.RAPIDAPI_KEY

  let aiTest = { ok: false, status: null, error: null, latency_ms: null }
  const start = Date.now()
  try {
    const zai = await ZAI.create()
    const completion = await zai.chat.completions.create({
      messages: [{ role: 'user', content: 'Responde solo: OK' }],
      max_tokens: 5,
    })
    aiTest.latency_ms = Date.now() - start
    aiTest.ok = !!completion.choices?.[0]?.message?.content
    aiTest.status = 200
  } catch (err: any) {
    aiTest.latency_ms = Date.now() - start
    aiTest.error = err.message
  }

  return NextResponse.json({
    ai_provider: 'z-ai-web-dev-sdk',
    ai_test: aiTest,
    rapidapi_set: !!rapidKey,
  })
}
