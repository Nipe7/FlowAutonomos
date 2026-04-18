import { NextRequest, NextResponse } from 'next/server'

// ============================================================
// TIPOS
// ============================================================
interface BusinessResult {
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

// ============================================================
// SISTEMA DE CACHÉ EN MEMORIA (24h)
// ============================================================
const CACHE_TTL = 24 * 60 * 60 * 1000

interface CacheEntry {
  results: BusinessResult[]
  source: string
  timestamp: number
}

const searchCache = new Map<string, CacheEntry>()

function getCacheKey(query: string): string {
  return query.toLowerCase().trim().replace(/\s+/g, ' ')
}

function getCached(query: string): CacheEntry | null {
  const key = getCacheKey(query)
  const entry = searchCache.get(key)
  if (!entry) return null
  if (Date.now() - entry.timestamp > CACHE_TTL) {
    searchCache.delete(key)
    return null
  }
  return entry
}

function setCache(query: string, results: BusinessResult[], source: string): void {
  const key = getCacheKey(query)
  searchCache.set(key, { results, source, timestamp: Date.now() })
}

// ============================================================
// SISTEMA DE LÍMITE DE USO RAPIDAPI
// ============================================================
const MAX_RAPIDAPI_CALLS_PER_DAY = 4

interface ApiUsageRecord {
  count: number
  date: string
}

let apiUsage: ApiUsageRecord = {
  count: 0,
  date: new Date().toISOString().split('T')[0],
}

function canUseRapidAPI(): boolean {
  const today = new Date().toISOString().split('T')[0]
  if (apiUsage.date !== today) {
    apiUsage = { count: 0, date: today }
  }
  return apiUsage.count < MAX_RAPIDAPI_CALLS_PER_DAY
}

function incrementRapidAPIUsage(): void {
  const today = new Date().toISOString().split('T')[0]
  if (apiUsage.date !== today) {
    apiUsage = { count: 0, date: today }
  }
  apiUsage.count++
}

function getRemainingSearches(): number {
  const today = new Date().toISOString().split('T')[0]
  if (apiUsage.date !== today) {
    return MAX_RAPIDAPI_CALLS_PER_DAY
  }
  return Math.max(0, MAX_RAPIDAPI_CALLS_PER_DAY - apiUsage.count)
}

// ============================================================
// HANDLER PRINCIPAL
// ============================================================
export async function GET(req: NextRequest) {
  try {
    const query = req.nextUrl.searchParams.get('q')

    if (!query || !query.trim()) {
      return NextResponse.json(
        { error: 'Por favor, introduce un término de búsqueda.' },
        { status: 400 }
      )
    }

    const searchQuery = query.trim()

    // 1. Comprobar caché primero
    const cached = getCached(searchQuery)
    if (cached) {
      return NextResponse.json({
        results: cached.results,
        source: cached.source,
        cached: true,
        remainingSearches: getRemainingSearches(),
      })
    }

    // 2. Intentar RapidAPI si hay créditos disponibles
    const rapidApiKey = process.env.RAPIDAPI_KEY
    const rapidApiHost = process.env.RAPIDAPI_HOST

    if (rapidApiKey && rapidApiHost && canUseRapidAPI()) {
      try {
        const rapidResults = await searchRapidAPI(searchQuery, rapidApiKey, rapidApiHost)
        if (rapidResults.length > 0) {
          incrementRapidAPIUsage()
          setCache(searchQuery, rapidResults, 'google_places')
          return NextResponse.json({
            results: rapidResults,
            source: 'google_places',
            cached: false,
            remainingSearches: getRemainingSearches(),
          })
        }
      } catch (err: any) {
        console.warn('RapidAPI failed, falling back to Overpass:', err.message)
      }
    }

    // 3. Fallback: OpenStreetMap / Overpass (gratis, sin límite)
    const overpassResults = await searchOverpass(searchQuery)
    setCache(searchQuery, overpassResults, 'openstreetmap')
    return NextResponse.json({
      results: overpassResults,
      source: 'openstreetmap',
      cached: false,
      remainingSearches: getRemainingSearches(),
    })

  } catch (error: any) {
    console.error('Search error:', error)
    return NextResponse.json(
      { error: 'Error al realizar la búsqueda: ' + (error.message || 'Error desconocido') },
      { status: 500 }
    )
  }
}

// ============================================================
// RAPIDAPI — Local Business Data (Google Places)
// ============================================================
async function searchRapidAPI(query: string, apiKey: string, host: string): Promise<BusinessResult[]> {
  const parts = query.split(/\s+en\s+/i)
  let searchQuery = parts[0] || query
  let city = parts[1] || ''

  if (!city) {
    const spanishCities = [
      'madrid', 'barcelona', 'valencia', 'sevilla', 'malaga', 'bilbao', 'granada',
      'cordoba', 'zaragoza', 'pamplona', 'murcia', 'alicante', 'vigo', 'gijon',
      'coruña', 'coruna', 'palma', 'las palmas', 'tenerife', 'toledo', 'leon',
      'salamanca', 'vitoria', 'santander', 'burgos', 'badajoz', 'caceres',
      'tarragona', 'girona', 'lleida', 'cadiz', 'huelva', 'almeria', 'jaen',
      'oviedo', 'pontevedra', 'lugo', 'ourense', 'valladolid', 'segovia', 'avila',
      'zamora', 'palencia', 'soria', 'guadalajara', 'cuenca', 'ciudad real',
      'albacete', 'logroño', 'logrono', 'san sebastian', 'donostia',
      'irun', 'getxo', 'mataro', 'terrassa', 'sabadell', 'mostoles', 'alcala',
      'fuenlabrada', 'leganes', 'getafe', 'alcorcon', 'coslada', 'parla'
    ]
    const words = query.toLowerCase().split(/\s+/)
    for (let i = words.length - 1; i >= 0; i--) {
      if (spanishCities.includes(words[i])) {
        city = words[i]
        searchQuery = words.slice(0, i).join(' ')
        break
      }
    }
  }

  const url = `https://${host}/search-by-query`
  const params = new URLSearchParams({
    query: searchQuery,
    limit: '20',
  })
  if (city) params.set('city', city)
  params.set('country', 'es')

  const response = await fetch(`${url}?${params.toString()}`, {
    method: 'GET',
    headers: {
      'X-RapidAPI-Key': apiKey,
      'X-RapidAPI-Host': host,
    },
    signal: AbortSignal.timeout(8000),
  })

  if (!response.ok) {
    const status = response.status
    if (status === 429) {
      console.warn('RapidAPI rate limit reached (429)')
      throw new Error('RATE_LIMIT')
    }
    throw new Error(`RapidAPI responded with ${status}`)
  }

  const data = await response.json()
  const businesses = data?.data || data?.results || data || []

  if (!Array.isArray(businesses) || businesses.length === 0) {
    return []
  }

  return businesses.slice(0, 20).map((biz: any) => {
    const name = biz.name || biz.businessName || 'Negocio'
    const address = [
      biz.address?.street || biz.street,
      biz.address?.city || biz.city,
      biz.address?.postalCode || biz.postalCode,
    ].filter(Boolean).join(', ') || biz.addressFormatted || biz.vicinity || ''

    const types = biz.type || biz.types || biz.category || []
    const typeArr = Array.isArray(types)
      ? types.map((t: string) => typeof t === 'string' ? t : t?.name || '').filter(Boolean)
      : [String(types)]

    const rating = biz.rating || biz.score || 0
    const totalReviews = biz.reviewsCount || biz.totalReviews || biz.userRatingsTotal || 0

    let photo = ''
    if (biz.photoUrl) photo = biz.photoUrl
    else if (biz.photos?.[0]) {
      photo = typeof biz.photos[0] === 'string'
        ? biz.photos[0]
        : biz.photos[0]?.url || biz.photos[0]?.photoUrl || ''
    }

    const mapsUrl = biz.googleMapsUri || biz.url || biz.website || '#'

    let hours: string | undefined
    if (biz.workingHours) {
      hours = typeof biz.workingHours === 'string'
        ? biz.workingHours
        : JSON.stringify(biz.workingHours)
    } else if (biz.hours) {
      hours = typeof biz.hours === 'string' ? biz.hours : JSON.stringify(biz.hours)
    }

    return {
      name,
      address,
      rating: Number(rating) || 0,
      totalReviews: Number(totalReviews) || 0,
      types: typeArr.slice(0, 3),
      url: mapsUrl,
      source: 'google_places',
      photo: photo || undefined,
      phone: biz.phone || biz.phoneNumber || undefined,
      website: biz.website || biz.siteWeb || undefined,
      openNow: biz.openNow ?? biz.opened?.now ?? undefined,
      hours,
    } as BusinessResult
  })
}

// ============================================================
// FALLBACK: OpenStreetMap / Overpass API (gratis, sin límite)
// ============================================================
async function searchOverpass(query: string): Promise<BusinessResult[]> {
  // Estrategia: buscar por zona/ciudad en Nominatim y luego buscar negocios cercanos
  let lat: number | undefined
  let lon: number | undefined
  let displayName = ''

  // 1. Geocodificar la consulta con Nominatim
  try {
    const nominatimUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1&accept-language=es`
    const geoRes = await fetch(nominatimUrl, {
      headers: { 'User-Agent': 'FlowAutonomos/1.0' },
      signal: AbortSignal.timeout(8000),
    })
    const geocodeResult = await geoRes.json()

    if (geocodeResult && geocodeResult.length > 0) {
      lat = parseFloat(geocodeResult[0].lat)
      lon = parseFloat(geocodeResult[0].lon)
      displayName = geocodeResult[0].display_name || ''
    }
  } catch (err) {
    console.warn('Nominatim geocoding failed:', err)
  }

  // 2. Si Nominatim no encontró nada, intentar extraer ciudad y buscar coordenadas por nombre
  if (!lat || !lon) {
    try {
      const cleanQuery = query.replace(/[áà]/g, 'a').replace(/[éè]/g, 'e')
        .replace(/[íì]/g, 'i').replace(/[óò]/g, 'o').replace(/[úù]/g, 'u')
        .split(/\s+/).pop() || query

      const cityUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(cleanQuery + ' España')}&limit=1&accept-language=es`
      const cityRes = await fetch(cityUrl, {
        headers: { 'User-Agent': 'FlowAutonomos/1.0' },
        signal: AbortSignal.timeout(6000),
      })
      const cityResult = await cityRes.json()

      if (cityResult && cityResult.length > 0) {
        lat = parseFloat(cityResult[0].lat)
        lon = parseFloat(cityResult[0].lon)
        displayName = cityResult[0].display_name || ''
      }
    } catch {
      // Si tampoco funciona, devolver vacío
    }
  }

  if (!lat || !lon) {
    return []
  }

  // 3. Buscar negocios con Overpass - query MÁS AMPLIA
  const radius = 5000 // 5km para más resultados

  const overpassQuery = `
    [out:json][timeout:12];
    (
      node["shop"](around:${radius},${lat},${lon});
      node["amenity"](around:${radius},${lat},${lon});
      node["office"](around:${radius},${lat},${lon});
      node["craft"](around:${radius},${lat},${lon});
      node["tourism"~"hotel|hostel|guest_house|apartment"](around:${radius},${lat},${lon});
      way["shop"](around:${radius},${lat},${lon});
      way["amenity"](around:${radius},${lat},${lon});
      way["office"](around:${radius},${lat},${lon});
      way["craft"](around:${radius},${lat},${lon});
      way["tourism"~"hotel|hostel|guest_house|apartment"](around:${radius},${lat},${lon});
    );
    out center;
  `

  try {
    const overpassRes = await fetch('https://overpass-api.de/api/interpreter', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `data=${encodeURIComponent(overpassQuery)}`,
      signal: AbortSignal.timeout(15000),
    })
    const data = await overpassRes.json()

    if (!data.elements || data.elements.length === 0) {
      return []
    }

    // Filtrar solo elementos que tengan nombre (negocios reales)
    const namedElements = data.elements.filter((el: any) => el.tags?.name)

    if (namedElements.length === 0) {
      return []
    }

    return namedElements.slice(0, 20).map((element: any) => {
      const tags = element.tags || {}
      const elLat = element.lat || element.center?.lat
      const elLon = element.lon || element.center?.lon

      // Determinar tipo de negocio con mejor descripción
      const type = tags.shop || tags.amenity || tags.office || tags.craft || tags.tourism || 'Negocio'

      // Mapear tipos de amenity a nombres más legibles
      const amenityNames: Record<string, string> = {
        restaurant: 'Restaurante', cafe: 'Cafetería', bar: 'Bar',
        bakery: 'Panadería', butcher: 'Carnicería', hairdresser: 'Peluquería',
        beauty: 'Salón de belleza', dentist: 'Dentista', pharmacy: 'Farmacia',
        veterinary: 'Veterinario', bank: 'Banco', atm: 'Cajero',
        fuel: 'Gasolinera', post_office: 'Oficina de correos',
        library: 'Biblioteca', school: 'Escuela', university: 'Universidad',
        hospital: 'Hospital', clinic: 'Clínica', doctors: 'Médico',
        cinema: 'Cine', theatre: 'Teatro', museum: 'Museo',
        gym: 'Gimnasio', swimming_pool: 'Piscina',
        marketplace: 'Mercado', kindergarten: 'Guardería',
      }

      const typeName = amenityNames[type] || type.charAt(0).toUpperCase() + type.slice(1)
      const name = tags.name || typeName
      const address = [
        tags['addr:street'],
        tags['addr:housenumber'],
        tags['addr:city'],
        tags['addr:postcode'],
      ].filter(Boolean).join(', ') || (displayName ? displayName.split(',').slice(0, 2).join(',') : '')

      const osmUrl = elLat && elLon
        ? `https://www.openstreetmap.org/?mlat=${elLat}&mlon=${elLon}#map=17/${elLat}/${elLon}`
        : `https://www.openstreetmap.org/search?query=${encodeURIComponent(name + ' ' + address)}`

      const phone = tags.phone || tags['contact:phone'] || undefined
      const website = tags.website || tags['contact:website'] || undefined
      const hours = tags.opening_hours || undefined

      return {
        name,
        address,
        rating: 0,
        totalReviews: 0,
        types: [typeName],
        url: osmUrl,
        source: 'openstreetmap',
        phone,
        website,
        hours,
      } as BusinessResult
    })
  } catch (err) {
    console.warn('Overpass search failed:', err)
    return []
  }
}
