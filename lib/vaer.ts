export type VaerTime = {
  tid: string
  temp: number | null
  vind: number | null
  symbol: string | null
  nedbor: number
}

// Oversetter MET sine symbol-koder til norsk tekst + emoji.
// Koden kan ha suffiks som _day/_night – vi stripper det først.
const SYMBOL_TEKST: Record<string, { tekst: string; emoji: string }> = {
  clearsky: { tekst: 'Klarvær', emoji: '☀️' },
  fair: { tekst: 'Lettskyet', emoji: '🌤️' },
  partlycloudy: { tekst: 'Delvis skyet', emoji: '⛅' },
  cloudy: { tekst: 'Skyet', emoji: '☁️' },
  lightrain: { tekst: 'Lett regn', emoji: '🌦️' },
  rain: { tekst: 'Regn', emoji: '🌧️' },
  heavyrain: { tekst: 'Kraftig regn', emoji: '🌧️' },
  lightrainshowers: { tekst: 'Lette regnbyger', emoji: '🌦️' },
  rainshowers: { tekst: 'Regnbyger', emoji: '🌦️' },
  snow: { tekst: 'Snø', emoji: '🌨️' },
  lightsnow: { tekst: 'Lett snø', emoji: '🌨️' },
  heavysnow: { tekst: 'Kraftig snø', emoji: '❄️' },
  sleet: { tekst: 'Sludd', emoji: '🌨️' },
  fog: { tekst: 'Tåke', emoji: '🌫️' },
}

export function tolkSymbol(symbol: string | null): { tekst: string; emoji: string } {
  if (!symbol) return { tekst: 'Ukjent', emoji: '🌡️' }
  const basis = symbol.split('_')[0]
  return SYMBOL_TEKST[basis] ?? { tekst: 'Vekslende', emoji: '🌥️' }
}

// Henter vær for en sone via vår egen backend-route
export async function hentVaer(zone: string, lat?: number, lon?: number): Promise<VaerTime[]> {
  const params = new URLSearchParams()
  params.set('zone', zone)
  if (lat !== undefined && lon !== undefined) {
    params.set('lat', lat.toString())
    params.set('lon', lon.toString())
  }
  const res = await fetch(`/api/weather?${params.toString()}`)
  if (!res.ok) return []
  const data = await res.json()
  return Array.isArray(data.timer) ? data.timer : []
}

// Finner neste nedbør innenfor de neste N timene (for "ta ut søpla nå"-råd)
export function nesteNedbor(timer: VaerTime[], antallTimer = 6): VaerTime | null {
  return timer.slice(0, antallTimer).find(t => t.nedbor > 0.1) ?? null
}
