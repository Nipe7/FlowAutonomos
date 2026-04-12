import { NextRequest, NextResponse } from 'next/server'

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

    // === ESTRATEGIA: RapidAPI primero, Overpass como fallback ===
    const rapidApiKey = process.env.RAPIDAPI_KEY
    const rapidApiHost = process.env.RAPIDAPI_HOST

    if (rapidApiKey && rapidApiHost) {
      try {
        const rapidResults = await searchRapidAPI(searchQuery, rapidApiKey, rapidApiHost)
        if (rapidResults.length > 0) {
          return NextResponse.json({ results: rapidResults, source: 'google_places' })
        }
      } catch (err: any) {
        console.warn('RapidAPI failed, falling back to Overpass:', err.message)
      }
    }

    // Fallback: OpenStreetMap / Overpass
    const overpassResults = await searchOverpass(searchQuery)
    return NextResponse.json({ results: overpassResults, source: 'openstreetmap' })

  } catch (error: any) {
    console.error('Search error:', error)
    return NextResponse.json(
      { error: 'Error al realizar la búsqueda.' },
      { status: 500 }
    )
  }
}

// ============================================================
// RAPIDAPI — Local Business Data (Google Places)
// ============================================================
async function searchRapidAPI(query: string, apiKey: string, host: string): Promise<BusinessResult[]> {
  // Parse query: "restaurantes en Madrid" → query: "restaurantes", city: "Madrid"
  const parts = query.split(/\s+en\s+/i)
  let searchQuery = parts[0] || query
  let city = parts[1] || ''

  // If no "en" separator, try "en" detection for Spanish cities
  if (!city) {
    const spanishCities = [
      'madrid', 'barcelona', 'valencia', 'sevilla', 'malaga', 'bilbao', 'granada',
      'cordoba', 'zaragoza', 'pamplona', 'murcia', 'alicante', 'vigo', 'gijon',
      'coruña', 'palma', 'las palmas', 'tenerife', 'toledo', 'leon', 'salamanca',
      'vitoria', 'santander', 'burgos', 'badajoz', 'caceres', 'tarragona',
      'girona', 'lleida', 'cadiz', 'huelva', 'almeria', 'jaen', 'oviedo',
      'pontevedra', 'lugo', 'ourense', 'valladolid', 'segovia', 'avila',
      'zamora', 'palencia', 'soria', 'guadalajara', 'cuenca', 'ciudad real',
      'albacete', 'cuenca', 'toledo', 'logroño', 'san sebastian', 'donostia',
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

  // Call RapidAPI search-by-query endpoint
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
  })

  if (!response.ok) {
    throw new Error(`RapidAPI responded with ${response.status}`)
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
    const typeArr = Array.isArray(types) ? types.map((t: string) => typeof t === 'string' ? t : t?.name || '').filter(Boolean) : [String(types)]

    const rating = biz.rating || biz.score || 0
    const totalReviews = biz.reviewsCount || biz.totalReviews || biz.userRatingsTotal || 0

    // Photo
    let photo = ''
    if (biz.photoUrl) photo = biz.photoUrl
    else if (biz.photos?.[0]) photo = typeof biz.photos[0] === 'string' ? biz.photos[0] : biz.photos[0]?.url || biz.photos[0]?.photoUrl || ''

    // Google Maps link
    const mapsUrl = biz.googleMapsUri || biz.url || biz.website || '#'

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
      hours: biz.workingHours || biz.hours || undefined,
    } as BusinessResult
  })
}

// ============================================================
// FALLBACK: OpenStreetMap / Overpass API (gratis, sin límite)
// ============================================================
async function searchOverpass(query: string): Promise<BusinessResult[]> {
  // Geocode the query
  const nominatimUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1&accept-language=es`

  let geocodeResult
  try {
    const geoRes = await fetch(nominatimUrl, {
      headers: { 'User-Agent': 'FlowAutonomos/1.0' }
    })
    geocodeResult = await geoRes.json()
  } catch {
    return []
  }

  if (!geocodeResult || geocodeResult.length === 0) {
    return []
  }

  const { lat, lon, display_name } = geocodeResult[0]
  const radius = 3000

  // Build Overpass QL query
  const overpassQuery = `
    [out:json][timeout:10];
    (
      node["shop"](around:${radius},${lat},${lon});
      node["amenity"~"restaurant|cafe|bar|bakery|butcher|hairdresser|beauty|dentist|pharmacy|veterinary"](around:${radius},${lat},${lon});
      node["office"](around:${radius},${lat},${lon});
      node["craft"](around:${radius},${lat},${lon});
      way["shop"](around:${radius},${lat},${lon});
      way["amenity"~"restaurant|cafe|bar|bakery|butcher|hairdresser|beauty|dentist|pharmacy|veterinary"](around:${radius},${lat},${lon});
      way["office"](around:${radius},${lat},${lon});
      way["craft"](around:${radius},${lat},${lon});
    );
    out center;
  `

  try {
    const overpassRes = await fetch('https://overpass-api.de/api/interpreter', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `data=${encodeURIComponent(overpassQuery)}`,
    })
    const data = await overpassRes.json()

    if (!data.elements || data.elements.length === 0) {
      return []
    }

    return data.elements.slice(0, 20).map((element: any) => {
      const tags = element.tags || {}
      const elLat = element.lat || element.center?.lat
      const elLon = element.lon || element.center?.lon
      const type = tags.shop || tags.amenity || tags.office || tags.craft || tags.tourism || 'Negocio'
      const name = tags.name || `${type.charAt(0).toUpperCase() + type.slice(1)}`
      const address = [
        tags['addr:street'],
        tags['addr:housenumber'],
        tags['addr:city'],
        tags['addr:postcode'],
      ].filter(Boolean).join(', ') || display_name.split(',').slice(0, 2).join(',')

      const osmUrl = elLat && elLon
        ? `https://www.openstreetmap.org/?mlat=${elLat}&mlon=${elLon}#map=17/${elLat}/${elLon}`
        : `https://www.openstreetmap.org/search?query=${encodeURIComponent(name + ' ' + address)}`

      return {
        name,
        address,
        rating: 0,
        totalReviews: 0,
        types: [type.charAt(0).toUpperCase() + type.slice(1)],
        url: osmUrl,
        source: 'openstreetmap',
      } as BusinessResult
    })
  } catch {
    return []
  }
}
