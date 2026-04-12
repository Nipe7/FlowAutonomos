'use client'

import { motion } from 'framer-motion'
import { Search, MapPin, Star, ExternalLink, Loader2, Building2, Phone, Clock } from 'lucide-react'
import { useState } from 'react'

interface Business {
  name: string
  address: string
  rating: number
  totalReviews: number
  phone?: string
  hours?: string
  types: string[]
  url: string
}

export default function BusinessSearch() {
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<Business[]>([])
  const [error, setError] = useState('')

  const handleSearch = async () => {
    if (!query.trim()) return
    
    setLoading(true)
    setError('')
    setResults([])

    try {
      const res = await fetch('/api/search-business?' + new URLSearchParams({
        q: query.trim()
      }))
      const data = await res.json()
      
      if (data.error) {
        setError(data.error)
      } else {
        setResults(data.results || [])
      }
    } catch {
      setError('Error al buscar. Inténtalo de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSearch()
  }

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`w-4 h-4 ${
          i < Math.floor(rating) ? 'text-flow-amber fill-flow-amber' : 'text-white/20'
        }`}
      />
    ))
  }

  return (
    <section id="buscador" className="relative py-24 px-4 sm:px-6 lg:px-8">
      <div className="absolute inset-0 bg-flow-dark" />
      <div className="absolute top-0 left-0 right-0 section-divider" />
      
      <div className="absolute top-40 right-20 w-80 h-80 rounded-full bg-flow-purple/5 blur-[100px]" />

      <div className="relative z-10 max-w-4xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <span className="inline-block px-4 py-1.5 rounded-full glass text-flow-amber text-sm font-medium mb-4">
            📍 Buscador Inteligente
          </span>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-6">
            <span className="text-white">Busca Negocios en</span>{' '}
            <span className="text-gradient">Google Maps</span>
          </h2>
          <p className="text-white/50 text-lg max-w-xl mx-auto">
            Encuentra negocios reales cerca de ti o en cualquier ubicación. 
            Datos en tiempo real de Google Maps.
          </p>
        </motion.div>

        {/* Search bar */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="mb-8"
        >
          <div className="flex gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/30" />
              <input
                type="text"
                placeholder="Ej: restaurantes en Madrid, peluquerías en Barcelona..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                className="w-full pl-12 pr-4 py-4 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-white/30 focus:outline-none focus:border-flow-purple/50 focus:ring-2 focus:ring-flow-purple/20 transition-all"
              />
            </div>
            <button
              onClick={handleSearch}
              disabled={loading}
              className="px-8 py-4 bg-gradient-flow text-white font-semibold rounded-xl hover:opacity-90 transition-all shadow-lg shadow-flow-purple/25 disabled:opacity-50 flex items-center gap-2 whitespace-nowrap"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Search className="w-5 h-5" />
              )}
              <span className="hidden sm:inline">Buscar</span>
            </button>
          </div>
        </motion.div>

        {/* Error */}
        {error && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm text-center mb-6"
          >
            {error}
          </motion.div>
        )}

        {/* Results */}
        <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2">
          {results.map((biz, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4, delay: index * 0.05 }}
              className="p-5 rounded-xl glass hover:bg-white/[0.08] transition-all group"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <Building2 className="w-4 h-4 text-flow-cyan flex-shrink-0" />
                    <h3 className="text-white font-semibold truncate">{biz.name}</h3>
                  </div>
                  
                  <div className="flex items-center gap-1 mb-2">
                    {renderStars(biz.rating)}
                    <span className="text-white/50 text-sm ml-2">
                      {biz.rating} ({biz.totalReviews} reseñas)
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 text-white/40 text-sm mb-1">
                    <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                    <span className="truncate">{biz.address}</span>
                  </div>

                  {biz.phone && (
                    <div className="flex items-center gap-1.5 text-white/40 text-sm">
                      <Phone className="w-3.5 h-3.5 flex-shrink-0" />
                      <span>{biz.phone}</span>
                    </div>
                  )}

                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {biz.types.slice(0, 3).map((type, i) => (
                      <span
                        key={i}
                        className="px-2.5 py-0.5 text-xs rounded-full bg-flow-purple/10 text-flow-purple border border-flow-purple/20"
                      >
                        {type}
                      </span>
                    ))}
                  </div>
                </div>

                <a
                  href={biz.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-shrink-0 p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors text-white/40 hover:text-white"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Empty state */}
        {!loading && results.length === 0 && !error && (
          <div className="text-center py-16 text-white/20">
            <MapPin className="w-16 h-16 mx-auto mb-4 opacity-30" />
            <p className="text-lg">Busca negocios reales en Google Maps</p>
            <p className="text-sm mt-1">Intenta con &quot;restaurantes en tu ciudad&quot;</p>
          </div>
        )}
      </div>
    </section>
  )
}
