'use client'

import { motion } from 'framer-motion'
import { Brain, Upload, FileText, Image as ImageIcon, Loader2, Sparkles, X } from 'lucide-react'
import { useState, useRef } from 'react'

interface AnalysisResult {
  summary: string
  keyPoints: string[]
  recommendations: string[]
}

const platforms = [
  { id: 'instagram', label: '📸 Instagram', color: '#E4405F' },
  { id: 'tiktok', label: '🎵 TikTok', color: '#00f2ea' },
  { id: 'facebook', label: '📘 Facebook', color: '#1877F2' },
  { id: 'linkedin', label: '💼 LinkedIn', color: '#0A66C2' },
  { id: 'x', label: '✖️ X/Twitter', color: '#eaecee' },
]

export default function AIAnalyzer() {
  const [postText, setPostText] = useState('')
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [imageBase64, setImageBase64] = useState<string | null>(null)
  const [selectedPlatform, setSelectedPlatform] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<AnalysisResult | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) {
      alert('Por favor, selecciona un archivo de imagen o vídeo válido.')
      return
    }
    const reader = new FileReader()
    reader.onloadend = () => {
      const base64 = reader.result as string
      setImagePreview(base64)
      setImageBase64(base64)
    }
    reader.readAsDataURL(file)
  }

  const removeImage = () => {
    setImagePreview(null)
    setImageBase64(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleAnalyze = async () => {
    if (!postText.trim() && !imageBase64) return

    setLoading(true)
    setResult(null)

    try {
      const body: { text: string; image?: string; platform: string } = {
        text: postText.trim(),
        platform: selectedPlatform,
      }
      if (imageBase64) body.image = imageBase64

      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()

      if (data.error) {
        setResult({
          summary: 'Error en el análisis',
          keyPoints: [data.error],
          recommendations: ['Inténtalo de nuevo con contenido diferente.'],
        })
      } else {
        setResult(data)
      }
    } catch {
      setResult({
        summary: 'Error de conexión',
        keyPoints: ['No se pudo conectar con el servidor.'],
        recommendations: ['Verifica tu conexión e inténtalo de nuevo.'],
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <section id="analizador" className="relative" style={{ padding: '76px 32px' }}>
      <div className="absolute top-0 left-0 right-0 divider" />

      <div style={{ maxWidth: '1160px', margin: '0 auto' }}>
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <h2
            style={{
              fontFamily: 'var(--font-oswald), Oswald, sans-serif',
              fontWeight: 700,
              fontSize: 'clamp(1.85rem, 4.2vw, 2.9rem)',
              letterSpacing: '2.5px',
              textTransform: 'uppercase',
              color: '#566c83',
            }}
          >
            Analizador Flow
          </h2>
          <p
            className="mt-2 max-w-xl mx-auto"
            style={{
              fontFamily: 'var(--font-inter), Inter, sans-serif',
              fontSize: '0.88rem',
              color: 'rgba(234,236,238,0.5)',
            }}
          >
            Pega el texto de tu post, sube la imagen o vídeo, selecciona la plataforma y obtén tips personalizados antes de publicar.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Input Panel */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="panel"
          >
            {/* Platform selector */}
            <div className="mb-5">
              <label
                className="block mb-2"
                style={{
                  fontFamily: 'var(--font-oswald), Oswald, sans-serif',
                  fontSize: '0.77rem',
                  letterSpacing: '1.5px',
                  textTransform: 'uppercase',
                  color: 'rgba(234,236,238,0.5)',
                }}
              >
                Plataforma
              </label>
              <div className="flex flex-wrap gap-2">
                {platforms.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setSelectedPlatform(selectedPlatform === p.id ? '' : p.id)}
                    className="px-4 py-2 text-xs font-medium transition-all duration-300 cursor-pointer"
                    style={{
                      fontFamily: 'var(--font-oswald), Oswald, sans-serif',
                      fontSize: '0.77rem',
                      letterSpacing: '1px',
                      textTransform: 'uppercase',
                      borderRadius: '3px',
                      border: selectedPlatform === p.id
                        ? `1.5px solid ${p.color}`
                        : '1px solid rgba(234,236,238,0.1)',
                      color: selectedPlatform === p.id
                        ? p.color
                        : 'rgba(234,236,238,0.35)',
                      background: selectedPlatform === p.id
                        ? 'rgba(255,255,255,0.03)'
                        : 'transparent',
                    }}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Post text */}
            <div className="mb-5">
              <div className="flex items-center gap-1.5 mb-1.5">
                <FileText style={{ width: '14px', height: '14px', color: 'rgba(234,236,238,0.3)' }} />
                <label
                  style={{
                    fontFamily: 'var(--font-oswald), Oswald, sans-serif',
                    fontSize: '0.77rem',
                    letterSpacing: '1.5px',
                    textTransform: 'uppercase',
                    color: 'rgba(234,236,238,0.5)',
                  }}
                >
                  Texto del post
                </label>
              </div>
              <textarea
                value={postText}
                onChange={(e) => setPostText(e.target.value)}
                placeholder="Pega aquí el texto de tu post..."
                rows={6}
                className="w-full resize-none text-sm transition-colors duration-300"
                style={{
                  fontFamily: 'var(--font-inter), Inter, sans-serif',
                  padding: '14px',
                  borderRadius: '6px',
                  background: 'rgba(2,2,2,0.6)',
                  border: '1px solid rgba(68,196,120,0.12)',
                  color: '#eaecee',
                  outline: 'none',
                }}
              />
            </div>

            {/* Image / Video */}
            <div className="mb-6">
              <div className="flex items-center gap-1.5 mb-1.5">
                <ImageIcon style={{ width: '14px', height: '14px', color: 'rgba(234,236,238,0.3)' }} />
                <label
                  style={{
                    fontFamily: 'var(--font-oswald), Oswald, sans-serif',
                    fontSize: '0.77rem',
                    letterSpacing: '1.5px',
                    textTransform: 'uppercase',
                    color: 'rgba(234,236,238,0.5)',
                  }}
                >
                  Imagen / Vídeo (opcional)
                </label>
              </div>

              {imagePreview ? (
                <div className="relative overflow-hidden" style={{ borderRadius: '6px', border: '1px solid rgba(68,196,120,0.15)' }}>
                  <img src={imagePreview} alt="Preview" className="w-full object-cover" style={{ maxHeight: '160px' }} />
                  <button
                    onClick={removeImage}
                    className="absolute top-2 right-2 p-1 cursor-pointer"
                    style={{ borderRadius: '4px', background: 'rgba(0,0,0,0.6)', border: 'none', color: 'white' }}
                  >
                    <X style={{ width: '14px', height: '14px' }} />
                  </button>
                </div>
              ) : (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="text-center cursor-pointer transition-colors duration-300"
                  style={{
                    border: '1px dashed rgba(234,236,238,0.1)',
                    borderRadius: '6px',
                    padding: '24px',
                  }}
                >
                  <Upload style={{ width: '24px', height: '24px', color: 'rgba(234,236,238,0.15)', margin: '0 auto 6px' }} />
                  <p style={{ fontFamily: 'var(--font-inter), Inter, sans-serif', fontSize: '0.74rem', color: 'rgba(234,236,238,0.3)' }}>
                    Clic para subir imagen o vídeo
                  </p>
                </div>
              )}
              <input ref={fileInputRef} type="file" accept="image/*,video/*" onChange={handleImageUpload} className="hidden" />
            </div>

            {/* Analyze Button */}
            <button
              onClick={handleAnalyze}
              disabled={loading || (!postText.trim() && !imageBase64)}
              className="w-full flex items-center justify-center gap-2 cursor-pointer transition-all duration-300"
              style={{
                fontFamily: 'var(--font-oswald), Oswald, sans-serif',
                fontSize: '0.84rem',
                fontWeight: 600,
                letterSpacing: '2px',
                textTransform: 'uppercase',
                padding: '14px 26px',
                borderRadius: '3px',
                border: '1.5px solid #44c478',
                background: loading || (!postText.trim() && !imageBase64) ? 'transparent' : 'transparent',
                color: loading || (!postText.trim() && !imageBase64) ? 'rgba(68,196,120,0.4)' : '#44c478',
                opacity: loading || (!postText.trim() && !imageBase64) ? 0.4 : 1,
                animation: loading || (!postText.trim() && !imageBase64) ? 'none' : 'neonPulse 3.5s ease-in-out infinite',
              }}
            >
              {loading ? (
                <><Loader2 style={{ width: '16px', height: '16px' }} className="animate-spin" /> Analizando...</>
              ) : (
                <><Sparkles style={{ width: '16px', height: '16px' }} /> Analizar Flow</>
              )}
            </button>
          </motion.div>

          {/* Results Panel */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="panel"
          >
            <h3
              className="mb-4"
              style={{
                fontFamily: 'var(--font-oswald), Oswald, sans-serif',
                fontWeight: 600,
                fontSize: '0.84rem',
                letterSpacing: '2px',
                textTransform: 'uppercase',
                color: '#44c478',
              }}
            >
              Resultado del análisis
            </h3>

            {!result && !loading && (
              <div className="flex flex-col items-center justify-center text-center" style={{ height: '192px' }}>
                <Brain style={{ width: '48px', height: '48px', marginBottom: '12px', opacity: 0.15 }} />
                <p style={{ fontFamily: 'var(--font-inter), Inter, sans-serif', fontSize: '0.88rem', color: 'rgba(234,236,238,0.15)' }}>
                  Tu análisis aparecerá aquí
                </p>
              </div>
            )}

            {loading && (
              <div className="flex flex-col items-center justify-center text-center" style={{ height: '192px' }}>
                <div
                  className="mb-4"
                  style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '50%',
                    border: '2px solid rgba(68,196,120,0.2)',
                    borderTopColor: '#44c478',
                  }}
                />
                <p style={{ fontFamily: 'var(--font-inter), Inter, sans-serif', fontSize: '0.88rem', color: 'rgba(234,236,238,0.5)' }}>
                  Analizando contenido...
                </p>
              </div>
            )}

            {result && !loading && (
              <div className="space-y-5 pr-1" style={{ maxHeight: '420px', overflowY: 'auto' }}>
                <div>
                  <h4
                    className="mb-2"
                    style={{
                      fontFamily: 'var(--font-oswald), Oswald, sans-serif',
                      fontSize: '0.77rem',
                      letterSpacing: '1.5px',
                      textTransform: 'uppercase',
                      color: '#44c478',
                    }}
                  >
                    Resumen
                  </h4>
                  <p style={{ fontFamily: 'var(--font-inter), Inter, sans-serif', fontSize: '0.88rem', lineHeight: 1.7, color: 'rgba(234,236,238,0.7)' }}>
                    {result.summary}
                  </p>
                </div>
                <div>
                  <h4
                    className="mb-2"
                    style={{
                      fontFamily: 'var(--font-oswald), Oswald, sans-serif',
                      fontSize: '0.77rem',
                      letterSpacing: '1.5px',
                      textTransform: 'uppercase',
                      color: '#566c83',
                    }}
                  >
                    Puntos clave
                  </h4>
                  <ul className="space-y-2">
                    {result.keyPoints.map((point, i) => (
                      <li key={i} className="flex items-start gap-2" style={{ fontSize: '0.88rem', color: 'rgba(234,236,238,0.6)' }}>
                        <span
                          className="flex-shrink-0 flex items-center justify-center mt-0.5"
                          style={{
                            width: '20px',
                            height: '20px',
                            borderRadius: '3px',
                            background: 'rgba(68,196,120,0.1)',
                            color: '#44c478',
                            fontSize: '10px',
                          }}
                        >
                          {i + 1}
                        </span>
                        <span style={{ lineHeight: 1.7 }}>{point}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h4
                    className="mb-2"
                    style={{
                      fontFamily: 'var(--font-oswald), Oswald, sans-serif',
                      fontSize: '0.77rem',
                      letterSpacing: '1.5px',
                      textTransform: 'uppercase',
                      color: '#FF6B35',
                    }}
                  >
                    Recomendaciones
                  </h4>
                  <ul className="space-y-2">
                    {result.recommendations.map((rec, i) => (
                      <li key={i} style={{ fontSize: '0.88rem', color: 'rgba(234,236,238,0.6)', lineHeight: 1.7 }}>
                        → {rec}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </motion.div>
        </div>
      </div>

      {/* Responsive padding */}
      <style jsx global>{`
        @media (max-width: 768px) {
          #analizador {
            padding: 54px 17px !important;
          }
        }
      `}</style>
    </section>
  )
}
