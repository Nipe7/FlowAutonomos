import { NextRequest, NextResponse } from 'next/server'

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

    try {
      // Importar dinámicamente
      const ZAI = (await import('z-ai-web-dev-sdk')).default || (await import('z-ai-web-dev-sdk'))
      const createFn = typeof ZAI === 'function' ? ZAI : ZAI.default || ZAI.create
      const zai = await createFn()

      const completion = await zai.chat.completions.create({
        messages: [
          { role: 'system', content: 'Responde SOLO en JSON valido. Sin texto adicional.' },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.8,
        max_tokens: 500,
      })

      const rawText = completion.choices[0]?.message?.content || ''

      try {
        const match = rawText.match(/\{[\s\S]*\}/)
        if (match) {
          const parsed = JSON.parse(match[0])
          if (parsed.suggestions && Array.isArray(parsed.suggestions)) {
            const cleaned = parsed.suggestions.map((s: any) => ({
              type: s.type || 'convencional',
              businessType: String(s.businessType || ''),
              text: String(s.text || '').substring(0, 200),
            }))
            return NextResponse.json({ suggestions: cleaned.slice(0, 6) })
          }
        }
      } catch { /* fallback below */ }

      const lines = rawText.split('\n').filter((l: string) => l.trim().length > 10).slice(0, 6)
      return NextResponse.json({
        suggestions: lines.map((line: string, i: number) => ({
          type: i < 3 ? 'convencional' : 'disruptiva',
          businessType: '',
          text: line.replace(/^[-*\d.)\s]+/, '').trim().substring(0, 200),
        }))
      })

    } catch (err: any) {
      console.error('Synergies AI error:', err.message, err.stack?.substring(0, 300))
      return NextResponse.json({ errorFriendly: 'La IA tardó demasiado. Prueba de nuevo.', suggestions: null, debug: err.message })
    }
  } catch (err: any) {
    console.error('Synergies error:', err.message)
    return NextResponse.json({ errorFriendly: 'Error inesperado. Prueba de nuevo.', suggestions: null })
  }
}
