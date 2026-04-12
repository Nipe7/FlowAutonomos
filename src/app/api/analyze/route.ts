import { NextRequest, NextResponse } from 'next/server'
import ZAI from 'z-ai-web-dev-sdk'

export async function POST(req: NextRequest) {
  try {
    const { text, image, platform } = await req.json()

    if (!text && !image) {
      return NextResponse.json(
        { error: 'Por favor, proporciona texto o una imagen para analizar.' },
        { status: 400 }
      )
    }

    const zai = await ZAI.create()

    const platformTips: Record<string, string> = {
      instagram: `INSTAGRAM:
- Ideal: 125-150 carácteres para Feed, máximo 2200. Reels: texto corto en el video.
- Emojis: 3-5 distribuidos, NO en exceso. Los de corazón y fuego aumentan engagement.
- Hashtags: 5-15 relevantes (mezcla populares + nicho), ocultos en comentario o al final.
- CTA: "Guarda este post", "Etiqueta a alguien", "Desliza" funcionan mejor que "Comenta".
- El mejor momento para publicar: entre 10-13h y 19-21h de lunes a viernes.
- Las Stories con encuestas y preguntas generan más interacción directa.`,
      tiktok: `TIKTOK:
- Los primeros 2-3 segundos son CRÍTICOS. Si no enganchas, pierdes al usuario.
- Texto en pantalla obligatorio (80% ve videos sin sonido).
- Longitud ideal: 15-30 segundos para max alcance, hasta 60s para contenido valor.
- Hashtags: 3-5, incluyendo al menos 1 trending.
- CTA: "Sígueme para más", "Comenta tu experiencia" en texto superpuesto.
- Tono: auténtico, sin filtro, directo. El contenido "imperfecto" funciona mejor.`,
      facebook: `FACEBOOK:
- Ideal: 40-80 caracteres para posts con imagen, hasta 300 para texto largo.
- Las publicaciones con preguntas directas generan 2x más comentarios.
- Emojis: 1-3, sobrio. Demasiados restan profesionalidad en FB.
- CTA: "Comparte si estás de acuerdo", "¿Qué opinas?" son los más efectivos.
- Fotos reales (no stock) generan 2-3x más engagement.
- Horario óptimo: 12-14h y 17-19h, especialmente miércoles a viernes.`,
      linkedin: `LINKEDIN:
- Ideal: 1200-1500 caracteres con estructura clara (introducción, desarrollo, reflexión).
- Tono profesional pero humano. Evita jerga excesiva.
- Sin emojis excesivos: máximo 2-3 discretos.
- CTA: "¿Cuál ha sido tu experiencia?", "Comparto porque..." invitan a debate.
- Los posts que cuentan una historia personal tienen 3x más alcance.
- Mejor horario: martes a jueves, 7-9h y 17-19h.`,
      youtube: `YOUTUBE:
- El título debe ser claro y con palabras clave, máximo 60 caracteres.
- Descripción: primeras 2 líneas son vitales (antes de "Ver más").
- Thumbnails con texto grande y facial expression generan más clics.
- CTA en los primeros 30 segundos: suscríbete, comenta, visita...
- Tags relevantes (5-10) y hashtags (#) en título y descripción.`,
      x: `X/TWITTER:
- Ideal: 200-280 caracteres. Los tweets más cortos (70-100) suelen tener más engagement.
- Los hilos (threads) funcionan muy bien para contar historias o dar consejos.
- Emojis: 1-2 como máximo. Los tweets sin emojis pueden tener más retweets.
- Hashtags: 1-2 relevantes. No abuses, resta visibilidad.
- CTA: "RT si estás de acuerdo", "Responde con tu experiencia", "Bookmark para leer después".
- Horario óptimo: lunes a viernes, 8-10h y 17-19h.
- Los tweets con imagen generan 2x más engagement que solo texto.
- Tono: directo, atrevido, opiniático. En X funciona ser provocador (con medida).`,
    }

    const platformInfo = platform && platformTips[platform]
      ? `\n\nCONTEXTO ESPECÍFICO PARA ${platform.toUpperCase()}:\n${platformTips[platform]}\n\nUsa estos datos para dar recomendaciones específicas.`
      : '\n\nNo se especificó plataforma. Da consejos generales para redes sociales.'

    const messages: Array<{ role: string; content: Array<{ type: string; text?: string; image_url?: { url: string } }> }> = [
      {
        role: 'system',
        content: [
          {
            type: 'text',
            text: `Eres una experta en Social Media con más de 10 años gestionando cuentas de autónomos y pequeñas empresas en España. Te llamas "Analista Flow" y tu estilo es directo, profesional pero cercano.

Tu metodología de análisis cubre SIEMPRE estos puntos:
1. 📏 LONGITUD - ¿Es la adecuada para la plataforma?
2. 🎯 ENGAGEMENT POTENCIAL - ¿Generará interacción? ¿Por qué?
3. 😊 EMOJIS - ¿Cantidad, tipo y colocación correctos?
4. 📢 CTA (Call to Action) - ¿Es claro? ¿Está bien posicionado?
5. 🎭 TONO EMOCIONAL - ¿Qué transmite? ¿Es coherente con el mensaje?
6. ⚡ OPCIONES DE MEJORA - Cosas específicas que cambiaría YA
${platformInfo}
Responde SIEMPRE en español. JSON válido (sin markdown, sin backticks):
{
  "summary": "Diagnóstico general del post en 2-3 frases claras.",
  "keyPoints": [
    "📏 Longitud: [análisis concreto]",
    "🎯 Engagement: [predicción y porqué]",
    "😊 Emojis: [evaluación]",
    "📢 CTA: [evaluación]",
    "🎭 Tono emocional: [qué transmite]"
  ],
  "recommendations": [
    "💡 Cambio 1: [acción concreta]",
    "💡 Cambio 2: [acción concreta]",
    "💡 Cambio 3: [acción concreta]"
  ]
}`
          }
        ]
      }
    ]

    const userContent: Array<{ type: string; text?: string; image_url?: { url: string } }> = []
    if (text) userContent.push({ type: 'text', text })
    if (image) userContent.push({ type: 'image_url', image_url: { url: image } })
    messages.push({ role: 'user', content: userContent })

    const completion = await zai.chat.completions.create({
      messages: messages as any,
      temperature: 0.7,
      max_tokens: 1800,
    })

    const responseContent = completion.choices[0]?.message?.content || ''

    let result
    try {
      const jsonMatch = responseContent.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        result = JSON.parse(jsonMatch[0])
      } else {
        result = { summary: responseContent, keyPoints: ['Análisis completado'], recommendations: ['Revisa el resumen'] }
      }
    } catch {
      result = { summary: responseContent, keyPoints: ['Análisis completado'], recommendations: ['Revisa el resumen'] }
    }

    return NextResponse.json(result)
  } catch (error: any) {
    console.error('Analysis error:', error)
    return NextResponse.json(
      { error: 'Error al procesar el análisis.' },
      { status: 500 }
    )
  }
}
