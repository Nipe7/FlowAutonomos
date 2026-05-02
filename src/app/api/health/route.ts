import { NextResponse } from 'next/server'

// Endpoint de diagnóstico para verificar que las variables de entorno están activas
export async function GET() {
  const anthropicKey = process.env.CLAUDE_API_KEY || process.env.ANTHROPIC_API_KEY
  const groqKey = process.env.GROQ_API_KEY
  const rapidKey = process.env.RAPIDAPI_KEY
  const rapidHost = process.env.RAPIDAPI_HOST

  return NextResponse.json({
    anthropic_set: !!anthropicKey,
    anthropic_prefix: anthropicKey ? anthropicKey.substring(0, 10) + '...' : 'NOT_SET',
    groq_set: !!groqKey,
    groq_prefix: groqKey ? groqKey.substring(0, 10) + '...' : 'NOT_SET',
    ai_provider: anthropicKey ? 'anthropic' : (groqKey ? 'groq' : 'NONE'),
    rapidapi_set: !!(rapidKey && rapidHost),
  })
}
