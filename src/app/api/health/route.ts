import { NextResponse } from 'next/server'

// Endpoint de diagnóstico para verificar que las variables de entorno están activas
export async function GET() {
  const xai = process.env.XAI_API_KEY
  const rapidKey = process.env.RAPIDAPI_KEY
  const rapidHost = process.env.RAPIDAPI_HOST

  return NextResponse.json({
    xai_set: !!xai,
    xai_prefix: xai ? xai.substring(0, 6) + '...' : 'NOT_SET',
    rapidapi_set: !!(rapidKey && rapidHost),
  })
}
