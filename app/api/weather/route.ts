import { NextRequest, NextResponse } from 'next/server'

// MET krever en identifiserende User-Agent, ellers gir de 403.
// BYTT UT med din egen URL/e-post når appen er live.
const USER_AGENT = 'Naer/1.0 https://github.com/Tobiasoskarsen/Spotsjef'

// Koordinater for hovedbyen i hver prissone (maks 4 desimaler – MET-krav)
const SONE_KOORDINATER: Record<string, { lat: number; lon: number }> = {
  NO1: { lat: 59.9139, lon: 10.7522 }, // Oslo
  NO2: { lat: 58.1467, lon: 7.9956 },  // Kristiansand
  NO3: { lat: 63.4305, lon: 10.3951 }, // Trondheim
  NO4: { lat: 69.6492, lon: 18.9553 }, // Tromsø
  NO5: { lat: 60.3913, lon: 5.3221 },  // Bergen
}

// Formen på ett tidspunkt i MET sin locationforecast (kun feltene vi bruker)
type MetPunkt = {
  time: string
  data?: {
    instant?: { details?: { air_temperature?: number; wind_speed?: number } }
    next_1_hours?: {
      summary?: { symbol_code?: string }
      details?: { precipitation_amount?: number }
    }
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const zone = searchParams.get('zone') || 'NO1'
  const latParam = parseFloat(searchParams.get('lat') || '')
  const lonParam = parseFloat(searchParams.get('lon') || '')
  const koord = Number.isFinite(latParam) && Number.isFinite(lonParam)
    ? { lat: latParam, lon: lonParam }
    : SONE_KOORDINATER[zone] || SONE_KOORDINATER.NO1

  try {
    const res = await fetch(
      `https://api.met.no/weatherapi/locationforecast/2.0/compact?lat=${koord.lat}&lon=${koord.lon}`,
      { headers: { 'User-Agent': USER_AGENT } }
    )

    if (!res.ok) {
      return NextResponse.json({ error: 'Værdata utilgjengelig' }, { status: 502 })
    }

    const data = await res.json()
    const serie = data?.properties?.timeseries ?? []

    // Plukk ut de neste 24 timene i et enkelt format
    const timer = serie.slice(0, 24).map((punkt: MetPunkt) => {
      const detaljer = punkt.data?.instant?.details ?? {}
      const neste1t = punkt.data?.next_1_hours
      return {
        tid: punkt.time,
        temp: detaljer.air_temperature ?? null,
        vind: detaljer.wind_speed ?? null,
        symbol: neste1t?.summary?.symbol_code ?? null,
        nedbor: neste1t?.details?.precipitation_amount ?? 0,
      }
    })

    // Cache i 30 min – vær endrer seg ikke så ofte, og sparer MET for trafikk
    return NextResponse.json(
      { timer },
      { headers: { 'Cache-Control': 's-maxage=1800, stale-while-revalidate' } }
    )
  } catch (e) {
    console.error('Vær-route feilet:', e)
    return NextResponse.json({ error: 'Kunne ikke hente vær' }, { status: 500 })
  }
}
