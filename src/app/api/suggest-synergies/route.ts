import { NextRequest, NextResponse } from 'next/server'

// OpenRouter: gratuita, sin tarjeta, 200+ req/dia con modelos :free
const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions'
const OPENROUTER_KEY = process.env.OPENROUTER_API_KEY

// Gemini: con config de facturacion en Google Cloud
const GEMINI_KEY = process.env.GEMINI_API_KEY

function parseSynergiesResponse(rawText: string) {
  try {
    const match = rawText.match(/\{[\s\S]*\}/)
    if (match) {
      const parsed = JSON.parse(match[0])
      if (parsed.suggestions && Array.isArray(parsed.suggestions)) {
        return parsed.suggestions.map((s: any) => ({
          type: s.type || 'convencional',
          businessType: String(s.businessType || ''),
          text: String(s.text || '').substring(0, 200),
        })).slice(0, 6)
      }
    }
  } catch { /* fallback */ }

  const lines = rawText.split('\n').filter((l: string) => l.trim().length > 10).slice(0, 6)
  return lines.map((line: string, i: number) => ({
    type: i < 3 ? 'convencional' : 'disruptiva',
    businessType: '',
    text: line.replace(/^[-*\d.)\s]+/, '').trim().substring(0, 200),
  }))
}

export async function POST(req: NextRequest) {
  try {
    const { nombre, sector, zona, descripcion } = await req.json()

    if (!sector) {
      return NextResponse.json({ error: 'Por favor, indica tu sector.' }, { status: 400 })
    }

    const userPrompt = `Genera 6 sinergias para:
- Sector: ${sector}
- Nombre: ${nombre || '-'}
- Zona: ${zona || '-'}
${descripcion ? '- Notas: ' + descripcion : ''}

3 convencionales + 3 disruptivas. Solo JSON:
{"suggestions":[{"type":"convencional","businessType":"tipo","text":"desc"},{"type":"disruptiva","businessType":"tipo","text":"desc"}]}`

    const systemPrompt = 'Responde SOLO en JSON valido. Sin texto adicional.'
    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ]

    // 1. Intentar OpenRouter (gratuito, sin tarjeta)
    if (OPENROUTER_KEY) {
      try {
        const resp = await fetch(OPENROUTER_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${OPENROUTER_KEY}`,
            'HTTP-Referer': 'https://flowautonomos.netlify.app',
          },
          body: JSON.stringify({
            model: 'google/gemma-3-27b-it:free',
            messages,
            temperature: 0.8,
            max_tokens: 500,
          }),
          signal: AbortSignal.timeout(8000),
        })
        if (resp.ok) {
          const data = await resp.json()
          const rawText = data?.choices?.[0]?.message?.content || ''
          if (rawText) return NextResponse.json({ suggestions: parseSynergiesResponse(rawText) })
        }
      } catch (e: any) {
        console.error('OpenRouter syn error:', e.message)
      }
    }

    // 2. Intentar Gemini (si tiene API key)
    if (GEMINI_KEY) {
      try {
        const resp = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_KEY}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }] }],
            generationConfig: { temperature: 0.8, maxOutputTokens: 500, responseMimeType: 'application/json' },
          }),
          signal: AbortSignal.timeout(8000),
        })
        if (resp.ok) {
          const data = await resp.json()
          const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text || ''
          if (rawText) return NextResponse.json({ suggestions: parseSynergiesResponse(rawText) })
        }
      } catch (e: any) {
        console.error('Gemini syn error:', e.message)
      }
    }

    return NextResponse.json({ errorFriendly: 'La IA no está disponible en este momento. Prueba de nuevo en unos minutos.', suggestions: null })

  } catch (err: any) {
    console.error('Synergies error:', err.message)
    return NextResponse.json({ errorFriendly: 'Error inesperado. Prueba de nuevo.', suggestions: null })
  }
}
