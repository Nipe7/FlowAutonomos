import { NextRequest, NextResponse } from 'next/server'

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions'
const OPENROUTER_KEY = process.env.OPENROUTER_API_KEY
const GEMINI_KEY = process.env.GEMINI_API_KEY
const AI_MODEL = 'meta-llama/llama-3.3-70b-instruct:free'

function cleanJSON(rawText: string) {
  return rawText.replace(/```json\n?/g, '').replace(/```\n?/g, '').replace(/^[^{]*/, '').replace(/[^}]*$/, '').trim()
}

function parseSynergiesResponse(rawText: string) {
  try {
    const clean = cleanJSON(rawText)
    const match = clean.match(/\{[\s\S]*\}/)
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

    const systemPrompt = `Eres un experto en estrategias de negocio para autonomos en Espana.
Responde SIEMPRE en espanol. Da ideas concretas y variadas, nunca repetidas.
JSON: {"suggestions":[{"type":"convencional","businessType":"tipo de negocio","text":"descripcion breve de la sinergia"},...]}`

    const userPrompt = `Genera 6 sinergias de negocio (3 convencionales + 3 disruptivas) para:
- Nombre: ${nombre || '-'}
- Sector: ${sector}
- Zona: ${zona || '-'}
${descripcion ? '- Notas: ' + descripcion : ''}`

    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ]

    // 1. OpenRouter
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
            model: AI_MODEL,
            messages,
            temperature: 0.8,
            max_tokens: 600,
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

    // 2. Gemini fallback
    if (GEMINI_KEY) {
      try {
        const resp = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_KEY}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }] }],
            generationConfig: { temperature: 0.8, maxOutputTokens: 600, responseMimeType: 'application/json' },
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

    return NextResponse.json({ errorFriendly: 'La IA no está disponible ahora. Prueba en unos minutos.', suggestions: null })
  } catch (err: any) {
    console.error('Synergies error:', err.message)
    return NextResponse.json({ errorFriendly: 'Error inesperado. Prueba de nuevo.', suggestions: null })
  }
}
