'use client'

import { motion } from 'framer-motion'
import { Search, MapPin, Star, ExternalLink, Loader2, Building2, Sparkles, ArrowRight, Phone, Globe, Clock, SearchX, RefreshCw } from 'lucide-react'
import { useState, useCallback } from 'react'

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

type TabMode = 'search' | 'recommend'
type ViewMode = 'input' | 'results'

interface Suggestion {
  type: string
  businessType: string
  text: string
}

interface RecommendForm {
  nombre: string
  sector: string
  zona: string
  descripcion: string
}

export default function SinergiasSection() {
  // Tab: search o recommend (SIEMPRE visible)
  const [tab, setTab] = useState<TabMode>('search')

  // Vista: input o results
  const [view, setView] = useState<ViewMode>('input')

  // Search mode
  const [sector, setSector] = useState('')
  const [zona, setZona] = useState('')

  // Recommend mode
  const [recForm, setRecForm] = useState<RecommendForm>({ nombre: '', sector: '', zona: '', descripcion: '' })

  // Resultados
  const [loading, setLoading] = useState(false)
  const [aiSuggestions, setAiSuggestions] = useState<Suggestion[]>([])
  const [businessResults, setBusinessResults] = useState<Business[]>([])
  const [dataSource, setDataSource] = useState('')
  const [remainingSearches, setRemainingSearches] = useState<number | null>(null)
  const [errorFriendly, setErrorFriendly] = useState('')
  const [loadingBusinesses, setLoadingBusinesses] = useState<string | null>(null) // businessType currently loading

  const resetResults = () => {
    setView('input')
    setBusinessResults([])
    setAiSuggestions([])
    setDataSource('')
    setRemainingSearches(null)
    setErrorFriendly('')
    setLoadingBusinesses(null)
  }

  // ====== SEARCH: Búsqueda directa ======
  const handleSearch = async () => {
    const q = `${sector} ${zona}`.trim()
    if (!q) return

    setLoading(true)
    setErrorFriendly('')
    setBusinessResults([])
    setAiSuggestions([])
    setView('results')

    try {
      const res = await fetch('/api/search-business?' + new URLSearchParams({ q }), {
        signal: AbortSignal.timeout(20000),
      })
      const data = await res.json()
      if (data.error) setErrorFriendly(data.error)
      else {
        setBusinessResults(data.results || [])
        setDataSource(data.source || '')
        setRemainingSearches(data.remainingSearches ?? null)
      }
    } catch (err: any) {
      setErrorFriendly('La búsqueda tardó demasiado. Inténtalo de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  // ====== RECOMMEND: IA sugiere + busca negocios de cada tipo ======
  const handleRecommend = async () => {
    if (!recForm.sector.trim()) return

    setLoading(true)
    setErrorFriendly('')
    setAiSuggestions([])
    setBusinessResults([])
    setView('results')

    try {
      // 1. Pedir sugerencias a la IA
      const res = await fetch('/api/suggest-synergies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(recForm),
        signal: AbortSignal.timeout(25000),
      })
      const data = await res.json()

      if (data.suggestions && Array.isArray(data.suggestions) && data.suggestions.length > 0) {
        setAiSuggestions(data.suggestions)

        // 2. Buscar negocios reales del PRIMER tipo sugerido en la zona del usuario
        const firstSuggestion = data.suggestions.find((s: Suggestion) => s.businessType && s.businessType.trim())
        if (firstSuggestion && recForm.zona) {
          const bizType = firstSuggestion.businessType.trim()
          const q = `${bizType} en ${recForm.zona.trim()}`.trim()
          setLoadingBusinesses(bizType)
          try {
            const bizRes = await fetch('/api/search-business?' + new URLSearchParams({ q }), {
              signal: AbortSignal.timeout(15000),
            })
            const bizData = await bizRes.json()
            if (bizData.results) {
              setBusinessResults(bizData.results)
              setDataSource(bizData.source || '')
              setRemainingSearches(bizData.remainingSearches ?? null)
            }
          } catch { /* sin resultados no pasa nada */ }
          setLoadingBusinesses(null)
        }
      } else if (data.errorFriendly) {
        setErrorFriendly(data.errorFriendly)
      } else {
        setErrorFriendly('No se pudieron generar sugerencias. Inténtalo de nuevo.')
      }
    } catch (err: any) {
      setErrorFriendly('La petición tardó demasiado. Inténtalo de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  // ====== Buscar negocios de una sugerencia concreta ======
  const searchForType = useCallback(async (businessType: string) => {
    if (!businessType || !recForm.zona) return
    const q = `${businessType} en ${recForm.zona.trim()}`.trim()
    if (!q) return

    setLoadingBusinesses(businessType)
    setBusinessResults([])
    setErrorFriendly('')

    try {
      const bizRes = await fetch('/api/search-business?' + new URLSearchParams({ q }), {
        signal: AbortSignal.timeout(15000),
      })
      const bizData = await bizRes.json()
      if (bizData.results) {
        setBusinessResults(bizData.results)
        setDataSource(bizData.source || '')
        setRemainingSearches(bizData.remainingSearches ?? null)
      } else {
        setBusinessResults([])
      }
    } catch {
      setBusinessResults([])
    } finally {
      setLoadingBusinesses(null)
    }
  }, [recForm.zona])

  const handleKeyDownSearch = (e: React.KeyboardEvent) => { if (e.key === 'Enter') handleSearch() }
  const handleKeyDownRec = (e: React.KeyboardEvent) => { if (e.key === 'Enter') handleRecommend() }

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star key={i} className={`w-3.5 h-3.5 ${i < Math.floor(rating) ? 'text-[#44c478] fill-[#44c478]' : 'text-white/15'}`} />
    ))
  }

  // Si estamos en vista resultados, mostrar resultados
  if (view === 'results') {
    return (
      <section id="sinergias" className="relative py-20 px-4 sm:px-6 lg:px-8">
        <div className="absolute inset-0 bg-[#020202]" />
        <div className="absolute top-0 left-0 right-0 section-divider" />

        <div className="relative z-10 max-w-4xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            {/* Botón volver + tabs */}
            <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
              <button onClick={resetResults} className="text-[#44c478]/60 hover:text-[#44c478] text-xs flex items-center gap-1 transition-colors">
                <RefreshCw className="w-3 h-3" /> Nueva búsqueda
              </button>
              <div className="flex gap-2">
                <button
                  onClick={() => { setTab('search'); resetResults() }}
                  className={`px-3 py-1.5 rounded-lg text-xs transition-colors ${tab === 'search' ? 'bg-[#44c478]/15 text-[#44c478] border border-[#44c478]/30' : 'text-[#eaecee]/30 border border-transparent hover:text-[#eaecee]/50'}`}
                  style={{ fontFamily: "'Oswald', sans-serif", letterSpacing: '1px', textTransform: 'uppercase' }}
                >
                  <Search className="w-3 h-3 inline mr-1" /> Buscar
                </button>
                <button
                  onClick={() => { setTab('recommend'); resetResults() }}
                  className={`px-3 py-1.5 rounded-lg text-xs transition-colors ${tab === 'recommend' ? 'bg-[#566c83]/15 text-[#566c83] border border-[#566c83]/30' : 'text-[#eaecee]/30 border border-transparent hover:text-[#eaecee]/50'}`}
                  style={{ fontFamily: "'Oswald', sans-serif", letterSpacing: '1px', textTransform: 'uppercase' }}
                >
                  <Sparkles className="w-3 h-3 inline mr-1" /> IA sugiere
                </button>
              </div>
            </div>

            {/* Loading global */}
            {loading && (
              <div className="flex flex-col items-center justify-center py-16">
                <Loader2 className="w-8 h-8 animate-spin text-[#44c478]/60 mb-3" />
                <p className="text-[#eaecee]/50 text-sm">
                  {tab === 'recommend' ? 'Analizando tu negocio...' : 'Buscando negocios...'}
                </p>
              </div>
            )}

            {/* Error amigable */}
            {!loading && errorFriendly && (
              <div className="p-4 rounded-lg bg-[#566c83]/10 border border-[#566c83]/20 text-center mb-6">
                <p className="text-[#eaecee]/70 text-sm">{errorFriendly}</p>
              </div>
            )}

            {/* ====== SUGERENCIAS IA ====== */}
            {!loading && aiSuggestions.length > 0 && (
              <div className="mb-6">
                <div className="flex items-center gap-1.5 mb-3">
                  <Sparkles className="w-4 h-4 text-[#FF6B35]" />
                  <h3
                    className="text-sm text-[#FF6B35] uppercase tracking-wider"
                    style={{ fontFamily: "'Oswald', sans-serif", fontWeight: 600 }}
                  >
                    Sinergias sugeridas para ti
                  </h3>
                </div>
                <p className="text-[#eaecee]/35 text-xs mb-3">
                  Pincha en un tipo de negocio para buscar ejemplos reales en tu zona
                </p>
                <div className="space-y-2">
                  {aiSuggestions.map((sug, i) => (
                    <div
                      key={i}
                      className={`p-3.5 rounded-lg transition-all ${
                        sug.type === 'disruptiva' ? 'card-orange-soft' : 'card-green-soft'
                      } ${sug.businessType ? 'cursor-pointer hover:scale-[1.01]' : ''}`}
                      onClick={() => {
                        if (sug.businessType) searchForType(sug.businessType)
                      }}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`text-[10px] uppercase tracking-wider font-medium ${
                              sug.type === 'disruptiva' ? 'text-[#FF6B35]' : 'text-[#44c478]'
                            }`}>
                              {sug.type}
                            </span>
                            {sug.businessType && (
                              <span className="text-[10px] uppercase tracking-wider font-medium text-[#566c83]/70 bg-[#566c83]/10 px-1.5 py-0.5 rounded">
                                {sug.businessType}
                              </span>
                            )}
                          </div>
                          <p className="text-[#eaecee]/70 text-sm leading-relaxed">{sug.text}</p>
                        </div>
                        {sug.businessType && (
                          <div className={`flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center ${
                            loadingBusinesses === sug.businessType
                              ? 'bg-[#44c478]/20'
                              : 'bg-[#44c478]/8'
                          }`}>
                            {loadingBusinesses === sug.businessType ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin text-[#44c478]" />
                            ) : (
                              <ArrowRight className="w-3.5 h-3.5 text-[#44c478]/60" />
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ====== NEGOCIOS ENCONTRADOS ====== */}
            {!loading && businessResults.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-1.5">
                    <MapPin className="w-4 h-4 text-[#44c478]" />
                    <h3 className="text-sm text-[#44c478] uppercase tracking-wider" style={{ fontFamily: "'Oswald', sans-serif", fontWeight: 600 }}>
                      Negocios encontrados
                    </h3>
                  </div>
                  <div className="flex items-center gap-2">
                    {remainingSearches !== null && dataSource === 'google_places' && (
                      <span className="text-[10px] text-[#eaecee]/20">{remainingSearches}/4</span>
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

                          {biz.rating > 0 && (
                            <div className="flex items-center gap-1.5 mb-0.5">
                              <div className="flex items-center gap-0.5">{renderStars(biz.rating)}</div>
                              <span className="text-[#eaecee]/40 text-[11px] font-medium">{biz.rating}</span>
                              {biz.totalReviews > 0 && (
                                <span className="text-[#eaecee]/25 text-[10px]">({biz.totalReviews})</span>
                              )}
                            </div>
                          )}

                          {biz.address && (
                            <p className="text-[#eaecee]/30 text-xs truncate mb-1">{biz.address}</p>
                          )}

                          {biz.types && biz.types.length > 0 && (
                            <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                              {biz.types.slice(0, 2).map((type, i) => (
                                <span key={i} className="inline-block px-2 py-0.5 rounded text-[9px] uppercase tracking-wider bg-[#566c83]/10 text-[#566c83]/60 border border-[#566c83]/10">
                                  {typeof type === 'string' ? type.charAt(0).toUpperCase() + type.slice(1) : type}
                                </span>
                              ))}
                            </div>
                          )}

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

            {/* ====== SIN RESULTADOS ====== */}
            {!loading && !errorFriendly && aiSuggestions.length === 0 && businessResults.length === 0 && (
              <div className="text-center py-10 text-[#eaecee]/20">
                <SearchX className="w-10 h-10 mx-auto mb-2 opacity-40" />
                <p className="text-sm">No hemos encontrado resultados.</p>
                <p className="text-xs mt-1">Prueba con otros datos.</p>
              </div>
            )}

            {/* Cargando negocios de un tipo */}
            {!loading && loadingBusinesses && businessResults.length === 0 && aiSuggestions.length > 0 && (
              <div className="flex items-center gap-2 py-4 justify-center">
                <Loader2 className="w-4 h-4 animate-spin text-[#44c478]/50" />
                <p className="text-[#eaecee]/30 text-xs">Buscando {loadingBusinesses} en tu zona...</p>
              </div>
            )}
          </motion.div>
        </div>
      </section>
    )
  }

  // ====== VISTA INPUT: Pestañas siempre visibles ======
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
          className="text-center mb-8"
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
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="panel p-6 sm:p-8"
        >
          {/* Tabs SIEMPRE visibles */}
          <div className="flex gap-2 mb-6">
            <button
              onClick={() => setTab('search')}
              className={`flex-1 p-3 rounded-xl transition-all text-left group ${tab === 'search' ? 'card-green-soft bg-[#44c478]/10' : 'hover:bg-white/[0.02]'}`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${tab === 'search' ? 'bg-[#44c478]/20' : 'bg-[#44c478]/8'}`}>
                  <Search className={`w-4 h-4 ${tab === 'search' ? 'text-[#44c478]' : 'text-[#44c478]/40'}`} />
                </div>
                <div>
                  <h3 className={`text-sm font-medium mb-0.5 ${tab === 'search' ? 'text-[#eaecee]' : 'text-[#eaecee]/50'}`}>
                    Buscar sinergia
                  </h3>
                  <p className={`text-[11px] ${tab === 'search' ? 'text-[#eaecee]/40' : 'text-[#eaecee]/20'}`}>
                    Ya sabes qué tipo de negocio buscas
                  </p>
                </div>
              </div>
            </button>

            <button
              onClick={() => setTab('recommend')}
              className={`flex-1 p-3 rounded-xl transition-all text-left group ${tab === 'recommend' ? 'card-blue-soft bg-[#566c83]/10' : 'hover:bg-white/[0.02]'}`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${tab === 'recommend' ? 'bg-[#566c83]/20' : 'bg-[#566c83]/8'}`}>
                  <Sparkles className={`w-4 h-4 ${tab === 'recommend' ? 'text-[#566c83]' : 'text-[#566c83]/40'}`} />
                </div>
                <div>
                  <h3 className={`text-sm font-medium mb-0.5 ${tab === 'recommend' ? 'text-[#eaecee]' : 'text-[#eaecee]/50'}`}>
                    IA me sugiere
                  </h3>
                  <p className={`text-[11px] ${tab === 'recommend' ? 'text-[#eaecee]/40' : 'text-[#eaecee]/20'}`}>
                    No sabes con quién aliarte
                  </p>
                </div>
              </div>
            </button>
          </div>

          {/* ====== TAB: BÚSQUEDA DIRECTA ====== */}
          {tab === 'search' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
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
                className="w-full py-3.5 rounded-lg bg-[#44c478] text-[#020202] font-bold text-sm uppercase tracking-wider disabled:opacity-50 flex items-center justify-center gap-2 hover:bg-[#44c478]/90 transition-colors cursor-pointer"
                style={{ fontFamily: "'Oswald', sans-serif" }}
              >
                {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Buscando...</> : <><Search className="w-4 h-4" /> Buscar</>}
              </button>
            </motion.div>
          )}

          {/* ====== TAB: IA SUGIERE ====== */}
          {tab === 'recommend' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <p className="text-[#eaecee]/60 text-sm mb-4 text-center">
                Cuéntanos sobre tu negocio y te sugerimos con quién aliarte.
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
                className="w-full py-3.5 rounded-lg bg-[#566c83] text-[#eaecee] font-bold text-sm uppercase tracking-wider disabled:opacity-50 flex items-center justify-center gap-2 hover:bg-[#566c83]/90 transition-colors cursor-pointer"
                style={{ fontFamily: "'Oswald', sans-serif" }}
              >
                {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Pensando...</> : <><Sparkles className="w-4 h-4" /> Sugerirme sinergias</>}
              </button>
            </motion.div>
          )}
        </div>
      </div>
    </section>
  )
}
