import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'

// Timeout máximo para no exceder el límite de Netlify (10s free tier)
const GEMINI_TIMEOUT = 25000

export async function POST(req: NextRequest) {
  try {
    const { text, image, platform } = await req.json()

    if (!text && !image) {
      return NextResponse.json(
        { error: 'Por favor, proporciona texto o una imagen para analizar.' },
        { status: 400 }
      )
    }

    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Servicio de IA no configurado. Contacta con el administrador.' },
        { status: 500 }
      )
    }

    const genAI = new GoogleGenerativeAI(apiKey)
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' })

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

    const systemPrompt = `Eres una experta en Social Media con más de 10 años gestionando cuentas de autónomos y pequeñas empresas en España. Te llamas "Analista Flow" y tu estilo es directo, profesional pero cercano.

Tu metodología de análisis cubre SIEMPRE estos puntos:
1. LONGITUD - ¿Es la adecuada para la plataforma?
2. ENGAGEMENT POTENCIAL - ¿Generará interacción? ¿Por qué?
3. EMOJIS - ¿Cantidad, tipo y colocación correctos?
4. CTA (Call to Action) - ¿Es claro? ¿Está bien posicionado?
5. TONO EMOCIONAL - ¿Qué transmite? ¿Es coherente con el mensaje?
6. OPCIONES DE MEJORA - Cosas específicas que cambiaría YA
${platformInfo}
Responde SIEMPRE en español. JSON válido (sin markdown, sin backticks):
{
  "summary": "Diagnóstico general del post en 2-3 frases claras.",
  "keyPoints": [
    "Longitud: [análisis concreto]",
    "Engagement: [predicción y porqué]",
    "Emojis: [evaluación]",
    "CTA: [evaluación]",
    "Tono emocional: [qué transmite]"
  ],
  "recommendations": [
    "Cambio 1: [acción concreta]",
    "Cambio 2: [acción concreta]",
    "Cambio 3: [acción concreta]"
  ]
}`

    // Construir las partes del contenido
    const parts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> = []
    parts.push({ text: systemPrompt + '\n\nAnaliza el siguiente contenido:' })

    if (text) {
      parts.push({ text: `TEXTO DEL POST:\n${text}` })
    }

    // Si hay imagen (base64), añadirla como inlineData para visión
    if (image) {
      let mimeType = 'image/jpeg'
      let base64Data = image

      if (image.includes('data:')) {
        const mimeMatch = image.match(/data:([^;]+);/)
        if (mimeMatch) mimeType = mimeMatch[1]
        base64Data = image.replace(/^data:[^;]+;base64,/, '')
      }

      // Limitar tamaño de imagen para no exceder límites de Netlify/Gemini
      // Gemini soporta hasta 20MB pero Netlify free tier tiene límite menor
      if (base64Data.length > 4_000_000) {
        // Reducir calidad quitando datos del final (aproximación simple)
        // En producción se usaría sharp, pero en serverless no siempre disponible
        console.warn('Image too large, truncating to ~3MB')
        base64Data = base64Data.substring(0, 4_000_000)
      }

      parts.push({ inlineData: { mimeType, data: base64Data } })
    }

    // Llamar a Gemini con timeout
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), GEMINI_TIMEOUT)

    try {
      const result = await model.generateContent(parts)
      clearTimeout(timeoutId)
      const responseContent = result.response.text()

      let parsed
      try {
        const jsonMatch = responseContent.match(/\{[\s\S]*\}/)
        if (jsonMatch) {
          parsed = JSON.parse(jsonMatch[0])
        } else {
          parsed = { summary: responseContent, keyPoints: ['Análisis completado'], recommendations: ['Revisa el resumen'] }
        }
      } catch {
        parsed = { summary: responseContent, keyPoints: ['Análisis completado'], recommendations: ['Revisa el resumen'] }
      }

      return NextResponse.json(parsed)
    } catch (geminiError: any) {
      clearTimeout(timeoutId)
      if (geminiError.name === 'AbortError' || geminiError.message?.includes('timeout') || geminiError.message?.includes('abort')) {
        return NextResponse.json(
          { error: 'El análisis tardó demasiado. Intenta con un texto más corto o sin imagen.' },
          { status: 504 }
        )
      }
      throw geminiError
    }

  } catch (error: any) {
    console.error('Analysis error:', error)
    return NextResponse.json(
      { error: error.message || 'Error al procesar el análisis.' },
      { status: 500 }
    )
  }
}
