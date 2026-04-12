'use client'

import { motion } from 'framer-motion'
import { Search, MapPin, Star, ExternalLink, Loader2, Building2, Sparkles, ArrowRight, Phone, Globe, Clock, Camera } from 'lucide-react'
import { useState } from 'react'

interface Business {
  name: string
  address: string
  rating: number
  totalReviews: number
  types: string[]
  url: string
  source: string
  photo?: string
  phone?: string
  website?: string
  openNow?: boolean
  hours?: string
}

type Mode = 'choose' | 'search' | 'recommend' | 'results'

interface RecommendForm {
  nombre: string
  sector: string
  zona: string
  descripcion: string
}

export default function SinergiasSection() {
  // Mode state
  const [mode, setMode] = useState<Mode>('choose')

  // Search mode
  const [sector, setSector] = useState('')
  const [zona, setZona] = useState('')

  // Recommend mode
  const [recForm, setRecForm] = useState<RecommendForm>({ nombre: '', sector: '', zona: '', descripcion: '' })

  // Shared results
  const [loading, setLoading] = useState(false)
  const [aiSuggestions, setAiSuggestions] = useState<{ type: string; text: string }[]>([])
  const [businessResults, setBusinessResults] = useState<Business[]>([])
  const [dataSource, setDataSource] = useState('')
  const [remainingSearches, setRemainingSearches] = useState<number | null>(null)
  const [fromCache, setFromCache] = useState(false)
  const [error, setError] = useState('')

  const resetAll = () => {
    setMode('choose')
    setBusinessResults([])
    setAiSuggestions([])
    setDataSource('')
    setRemainingSearches(null)
    setFromCache(false)
    setError('')
    setSector('')
    setZona('')
    setRecForm({ nombre: '', sector: '', zona: '', descripcion: '' })
  }

  // ====== SEARCH: Ya sabe qué busca ======
  const handleSearch = async () => {
    const q = `${sector} ${zona}`.trim()
    if (!q) return

    setLoading(true)
    setError('')
    setBusinessResults([])
    setAiSuggestions([])
    setMode('results')

    try {
      const res = await fetch('/api/search-business?' + new URLSearchParams({ q }))
      const data = await res.json()
      if (data.error) setError(data.error)
      else {
        setBusinessResults(data.results || [])
        setDataSource(data.source || '')
        setRemainingSearches(data.remainingSearches ?? null)
        setFromCache(data.cached === true)
      }
    } catch {
      setError('Error al buscar. Inténtalo de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  // ====== RECOMMEND: No sabe, pide IA ======
  const handleRecommend = async () => {
    if (!recForm.sector.trim()) return

    setLoading(true)
    setError('')
    setAiSuggestions([])
    setBusinessResults([])
    setMode('results')

    try {
      const res = await fetch('/api/suggest-synergies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(recForm),
      })
      const data = await res.json()
      if (data.suggestions) {
        setAiSuggestions(data.suggestions)
      }

      // También buscar negocios reales del sector/zona
      const q = `${recForm.sector} ${recForm.zona}`.trim()
      if (q) {
        try {
          const bizRes = await fetch('/api/search-business?' + new URLSearchParams({ q }))
          const bizData = await bizRes.json()
          if (bizData.results) {
            setBusinessResults(bizData.results)
            setDataSource(bizData.source || '')
            setRemainingSearches(bizData.remainingSearches ?? null)
            setFromCache(bizData.cached === true)
          }
        } catch { /* no pasa nada */ }
      }
    } catch {
      setError('Error al generar recomendaciones. Inténtalo de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  const handleKeyDownSearch = (e: React.KeyboardEvent) => { if (e.key === 'Enter') handleSearch() }
  const handleKeyDownRec = (e: React.KeyboardEvent) => { if (e.key === 'Enter') handleRecommend() }

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star key={i} className={`w-3.5 h-3.5 ${i < Math.floor(rating) ? 'text-[#44c478] fill-[#44c478]' : 'text-white/15'}`} />
    ))
  }

  return (
    <section id="sinergias" className="relative py-20 px-4 sm:px-6 lg:px-8">
      <div className="absolute inset-0 bg-[#020202]" />
      <div className="absolute top-0 left-0 right-0 section-divider" />

      <div className="relative z-10 max-w-4xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-10"
        >
          <h2
            className="text-3xl sm:text-4xl md:text-5xl text-[#44c478]/80 mb-4"
            style={{ fontFamily: "'Oswald', sans-serif", fontWeight: 700 }}
          >
            ¿Con quién te alías hoy?
          </h2>
          <p className="text-[#eaecee]/50 text-base max-w-lg mx-auto">
            Encuentra aliados para tu negocio o deja que la IA te sugiera con quién podría funcionar.
          </p>
        </motion.div>

        {/* Panel principal */}
        <div className="panel p-6 sm:p-8">

          {/* ====== PASO 0: Elegir modo ====== */}
          {mode === 'choose' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
              <p className="text-[#eaecee]/50 text-sm text-center mb-2">¿Cómo quieres buscar?</p>

              <button
                onClick={() => setMode('search')}
                className="w-full p-5 rounded-xl card-green-soft hover:bg-[#44c478]/12 transition-colors text-left group"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-[#44c478]/15 flex items-center justify-center flex-shrink-0">
                    <Search className="w-5 h-5 text-[#44c478]" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-[#eaecee] font-medium text-sm mb-0.5">Ya sé qué busco</h3>
                    <p className="text-[#eaecee]/40 text-xs">Busca directamente el tipo de negocio y zona que te interesa.</p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-[#44c478]/40 group-hover:text-[#44c478] transition-colors" />
                </div>
              </button>

              <button
                onClick={() => setMode('recommend')}
                className="w-full p-5 rounded-xl card-blue-soft hover:bg-[#566c83]/15 transition-colors text-left group"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-[#566c83]/15 flex items-center justify-center flex-shrink-0">
                    <Sparkles className="w-5 h-5 text-[#566c83]" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-[#eaecee] font-medium text-sm mb-0.5">Que la IA me sugiera</h3>
                    <p className="text-[#eaecee]/40 text-xs">Cuéntanos sobre tu negocio y te recomendamos sinergias convencionales y disruptivas.</p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-[#566c83]/40 group-hover:text-[#566c83] transition-colors" />
                </div>
              </button>
            </motion.div>
          )}

          {/* ====== PASO 1A: Búsqueda directa ====== */}
          {mode === 'search' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <button onClick={resetAll} className="text-[#44c478]/60 hover:text-[#44c478] text-xs mb-4 flex items-center gap-1 transition-colors">
                ← Volver
              </button>
              <p className="text-[#eaecee]/60 text-sm mb-4 text-center">
                ¿Qué tipo de negocio buscas y en qué zona?
              </p>
              <div className="flex flex-col sm:flex-row gap-3 mb-4">
                <div className="flex-1 relative">
                  <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#eaecee]/25 text-sm">🔍</div>
                  <input
                    type="text"
                    placeholder="Sector (ej: floristería, café...)"
                    value={sector}
                    onChange={(e) => setSector(e.target.value)}
                    onKeyDown={handleKeyDownSearch}
                    className="w-full pl-10 pr-4 py-3.5 rounded-lg bg-[#020202] border border-[#44c478]/15 text-[#eaecee] placeholder:text-[#eaecee]/20 focus:outline-none focus:border-[#44c478]/40 transition-colors text-sm"
                  />
                </div>
                <div className="flex-1 relative">
                  <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#eaecee]/25 text-sm">📍</div>
                  <input
                    type="text"
                    placeholder="Zona o ciudad"
                    value={zona}
                    onChange={(e) => setZona(e.target.value)}
                    onKeyDown={handleKeyDownSearch}
                    className="w-full pl-10 pr-4 py-3.5 rounded-lg bg-[#020202] border border-[#44c478]/15 text-[#eaecee] placeholder:text-[#eaecee]/20 focus:outline-none focus:border-[#44c478]/40 transition-colors text-sm"
                  />
                </div>
              </div>
              <button
                onClick={handleSearch}
                disabled={loading}
                className="w-full btn-neon-green py-3.5 rounded-lg bg-[#44c478] text-[#020202] font-bold text-sm uppercase tracking-wider disabled:opacity-50 flex items-center justify-center gap-2"
                style={{ fontFamily: "'Oswald', sans-serif" }}
              >
                {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Buscando...</> : <><Search className="w-4 h-4" /> Buscar</>}
              </button>
            </motion.div>
          )}

          {/* ====== PASO 1B: Recomendación IA ====== */}
          {mode === 'recommend' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <button onClick={resetAll} className="text-[#566c83]/60 hover:text-[#566c83] text-xs mb-4 flex items-center gap-1 transition-colors">
                ← Volver
              </button>
              <p className="text-[#eaecee]/60 text-sm mb-4 text-center">
                Cuéntanos sobre tu negocio y la IA te dirá con quién podrías aliarte.
              </p>
              <div className="space-y-3 mb-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <input
                    type="text"
                    placeholder="Nombre de tu negocio"
                    value={recForm.nombre}
                    onChange={(e) => setRecForm({ ...recForm, nombre: e.target.value })}
                    className="w-full px-4 py-3 rounded-lg bg-[#020202] border border-[#566c83]/20 text-[#eaecee] placeholder:text-[#eaecee]/20 focus:outline-none focus:border-[#566c83]/50 transition-colors text-sm"
                  />
                  <input
                    type="text"
                    placeholder="Sector (ej: peluquería, cafetería...)"
                    value={recForm.sector}
                    onChange={(e) => setRecForm({ ...recForm, sector: e.target.value })}
                    className="w-full px-4 py-3 rounded-lg bg-[#020202] border border-[#566c83]/20 text-[#eaecee] placeholder:text-[#eaecee]/20 focus:outline-none focus:border-[#566c83]/50 transition-colors text-sm"
                  />
                </div>
                <input
                  type="text"
                  placeholder="Zona o ciudad (ej: Granada)"
                  value={recForm.zona}
                  onChange={(e) => setRecForm({ ...recForm, zona: e.target.value })}
                  onKeyDown={handleKeyDownRec}
                  className="w-full px-4 py-3 rounded-lg bg-[#020202] border border-[#566c83]/20 text-[#eaecee] placeholder:text-[#eaecee]/20 focus:outline-none focus:border-[#566c83]/50 transition-colors text-sm"
                />
                <textarea
                  placeholder="Describe brevemente tu negocio (opcional)"
                  value={recForm.descripcion}
                  onChange={(e) => setRecForm({ ...recForm, descripcion: e.target.value })}
                  rows={2}
                  className="w-full px-4 py-3 rounded-lg bg-[#020202] border border-[#566c83]/20 text-[#eaecee] placeholder:text-[#eaecee]/20 focus:outline-none focus:border-[#566c83]/50 transition-colors text-sm resize-none"
                />
              </div>
              <button
                onClick={handleRecommend}
                disabled={loading || !recForm.sector.trim()}
                className="w-full btn-neon-blue py-3.5 rounded-lg bg-[#566c83] text-[#eaecee] font-bold text-sm uppercase tracking-wider disabled:opacity-50 flex items-center justify-center gap-2"
                style={{ fontFamily: "'Oswald', sans-serif" }}
              >
                {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Pensando...</> : <><Sparkles className="w-4 h-4" /> Sugerirme sinergias</>}
              </button>
            </motion.div>
          )}

          {/* ====== PASO 2: Resultados ====== */}
          {mode === 'results' && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              <button onClick={resetAll} className="text-[#44c478]/60 hover:text-[#44c478] text-xs mb-5 flex items-center gap-1 transition-colors">
                ← Nueva búsqueda
              </button>

              {error && (
                <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm text-center mb-5">
                  {error}
                </div>
              )}

              {/* Sugerencias IA */}
              {aiSuggestions.length > 0 && (
                <div className="mb-6">
                  <div className="flex items-center gap-1.5 mb-3">
                    <Sparkles className="w-4 h-4 text-[#FF6B35]" />
                    <h3 className="text-sm text-[#FF6B35] uppercase tracking-wider" style={{ fontFamily: "'Oswald', sans-serif", fontWeight: 600 }}>
                      {typeof aiSuggestions[0] === 'object' && 'type' in aiSuggestions[0] ? 'Sinergias sugeridas' : 'Ideas de sinergia para ti'}
                    </h3>
                  </div>
                  <div className="space-y-2">
                    {aiSuggestions.map((sug, i) => {
                      const isStructured = typeof sug === 'object' && sug !== null && 'type' in sug
                      return (
                        <div key={i} className={`p-3 rounded-lg ${isStructured && sug.type === 'disruptiva' ? 'card-orange-soft' : 'card-green-soft'}`}>
                          {isStructured && (
                            <span className={`text-[10px] uppercase tracking-wider font-medium mb-1 block ${sug.type === 'disruptiva' ? 'text-[#FF6B35]' : 'text-[#44c478]'}`}>
                              {sug.type}
                            </span>
                          )}
                          <p className="text-[#eaecee]/70 text-sm leading-relaxed">{isStructured ? sug.text : sug}</p>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Resultados de negocios */}
              {businessResults.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-1.5">
                      <MapPin className="w-4 h-4 text-[#44c478]" />
                      <h3 className="text-sm text-[#44c478] uppercase tracking-wider" style={{ fontFamily: "'Oswald', sans-serif", fontWeight: 600 }}>
                        Negocios cerca de ti
                      </h3>
                    </div>
                    <div className="flex items-center gap-2">
                      {remainingSearches !== null && dataSource === 'google_places' && (
                        <span className="text-[10px] text-[#eaecee]/20">
                          {fromCache ? '⚡' : ''} {remainingSearches}/4
                        </span>
                      )}
                      <span className="text-[10px] text-[#eaecee]/25 uppercase tracking-wider">
                        {dataSource === 'google_places' ? 'Google Maps' : 'OpenStreetMap'}
                      </span>
                    </div>
                  </div>
                  <div className="max-h-[480px] overflow-y-auto pr-1 space-y-2">
                    {businessResults.map((biz, index) => (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.3, delay: index * 0.04 }}
                        className="p-3.5 rounded-lg bg-[#020202] border border-[#44c478]/8 hover:border-[#44c478]/20 transition-colors"
                      >
                        <div className="flex items-start gap-3">
                          {/* Foto del negocio si hay */}
                          {biz.photo ? (
                            <div className="flex-shrink-0 w-14 h-14 rounded-lg overflow-hidden bg-[#0a0a0a]">
                              <img src={biz.photo} alt={biz.name} className="w-full h-full object-cover" loading="lazy" />
                            </div>
                          ) : (
                            <div className="flex-shrink-0 w-14 h-14 rounded-lg bg-[#44c478]/8 flex items-center justify-center">
                              <Building2 className="w-5 h-5 text-[#44c478]/40" />
                            </div>
                          )}

                          <div className="flex-1 min-w-0">
                            <h4 className="text-[#eaecee] font-medium text-sm truncate mb-0.5">{biz.name}</h4>
                            
                            {/* Rating real + nº reviews */}
                            {biz.rating > 0 && (
                              <div className="flex items-center gap-1.5 mb-0.5">
                                <div className="flex items-center gap-0.5">
                                  {renderStars(biz.rating)}
                                </div>
                                <span className="text-[#eaecee]/40 text-[11px] font-medium">{biz.rating}</span>
                                {biz.totalReviews > 0 && (
                                  <span className="text-[#eaecee]/25 text-[10px]">({biz.totalReviews})</span>
                                )}
                              </div>
                            )}

                            {/* Dirección */}
                            {biz.address && (
                              <p className="text-[#eaecee]/30 text-xs truncate mb-1">{biz.address}</p>
                            )}

                            {/* Tipo de negocio */}
                            {biz.types && biz.types.length > 0 && (
                              <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                                {biz.types.slice(0, 2).map((type, i) => (
                                  <span key={i} className="inline-block px-2 py-0.5 rounded text-[9px] uppercase tracking-wider bg-[#566c83]/10 text-[#566c83]/60 border border-[#566c83]/10">
                                    {typeof type === 'string' ? type.charAt(0).toUpperCase() + type.slice(1) : type}
                                  </span>
                                ))}
                              </div>
                            )}

                            {/* Teléfono + Web + Horario (solo Google Places) */}
                            <div className="flex items-center gap-3 mt-1 flex-wrap">
                              {biz.phone && (
                                <span className="flex items-center gap-1 text-[#eaecee]/25 text-[10px]">
                                  <Phone className="w-2.5 h-2.5" /> {biz.phone}
                                </span>
                              )}
                              {biz.website && (
                                <a href={biz.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-[#eaecee]/25 hover:text-[#44c478]/60 text-[10px] transition-colors">
                                  <Globe className="w-2.5 h-2.5" /> Web
                                </a>
                              )}
                              {biz.openNow !== undefined && (
                                <span className={`flex items-center gap-1 text-[10px] font-medium ${biz.openNow ? 'text-[#44c478]/60' : 'text-[#FF6B35]/60'}`}>
                                  <Clock className="w-2.5 h-2.5" /> {biz.openNow ? 'Abierto' : 'Cerrado'}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Botón Ver */}
                          <a
                            href={biz.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex-shrink-0 px-3 py-1.5 rounded-lg bg-[#44c478]/10 text-[#44c478]/70 hover:text-[#44c478] hover:bg-[#44c478]/20 transition-colors text-xs flex items-center gap-1 mt-1"
                          >
                            Ver <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}

              {!loading && aiSuggestions.length === 0 && businessResults.length === 0 && !error && (
                <div className="text-center py-10 text-[#eaecee]/20">
                  <MapPin className="w-10 h-10 mx-auto mb-2 opacity-40" />
                  <p className="text-sm">No hemos encontrado resultados.</p>
                  <p className="text-xs mt-1">Prueba con otros datos.</p>
                </div>
              )}
            </motion.div>
          )}
        </div>
      </div>
    </section>
  )
}
