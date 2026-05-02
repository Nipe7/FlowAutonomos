import { NextResponse } from 'next/server'

// Endpoint de diagnóstico para verificar que las variables de entorno están activas
export async function GET() {
  const anthropic = process.env.ANTHROPIC_API_KEY
  const rapidKey = process.env.RAPIDAPI_KEY
  const rapidHost = process.env.RAPIDAPI_HOST

  return NextResponse.json({
    anthropic_set: !!anthropic,
    anthropic_prefix: anthropic ? anthropic.substring(0, 10) + '...' : 'NOT_SET',
    rapidapi_set: !!(rapidKey && rapidHost),
  })
}
