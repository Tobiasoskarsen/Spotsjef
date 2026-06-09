import { Apparat } from './types'

export const APPARATER: Apparat[] = [
  { navn: 'Oppvaskmaskin', watt: 1800, timer: 1.5, ikon: '🍽️', gangerPerUke: 5 },
  { navn: 'Vaskemaskin', watt: 2000, timer: 2, ikon: '👕', gangerPerUke: 4 },
  { navn: 'Tørketrommel', watt: 2500, timer: 2, ikon: '💨', gangerPerUke: 3 },
  { navn: 'Elbil-lading (11kW)', watt: 11000, timer: 4, ikon: '🚗', gangerPerUke: 4 },
  { navn: 'Varmtvannsbereder', watt: 2000, timer: 3, ikon: '🚿', gangerPerUke: 7 },
  { navn: 'Panelovn', watt: 1000, timer: 5, ikon: '🔥', gangerPerUke: 7 },
  { navn: 'Varmepumpe', watt: 1000, timer: 6, ikon: '♨️', gangerPerUke: 7 },
  { navn: 'Stekeovn', watt: 2500, timer: 1, ikon: '🍳', gangerPerUke: 4 },
  { navn: 'Badstue', watt: 6000, timer: 1, ikon: '🧖', gangerPerUke: 1 },
]

// Ikon-palett brukeren kan velge fra når de legger til et eget apparat
export const APPARAT_IKONER = [
  '🔌', '🍽️', '👕', '💨', '🚗', '🚿', '🔥', '♨️',
  '🍳', '🧖', '❄️', '💡', '🖥️', '📺', '🌡️', '🛁',
]

export const SONER = [
  { kode: 'NO1', navn: 'Oslo (NO1)' },
  { kode: 'NO2', navn: 'Kristiansand (NO2)' },
  { kode: 'NO3', navn: 'Trondheim (NO3)' },
  { kode: 'NO4', navn: 'Tromsø (NO4)' },
  { kode: 'NO5', navn: 'Bergen (NO5)' },
]

const COUNTY_TO_ZONE: Record<string, string> = {
  Oslo: 'NO1',
  Akershus: 'NO1',
  Buskerud: 'NO1',
  Innlandet: 'NO1',
  Vestfold: 'NO1',
  Telemark: 'NO1',
  Østfold: 'NO1',
  Agder: 'NO2',
  Rogaland: 'NO2',
  Trøndelag: 'NO3',
  'Møre og Romsdal': 'NO3',
  Nordland: 'NO4',
  Troms: 'NO4',
  Finnmark: 'NO4',
  Vestland: 'NO5',
  // For backwards compatibility if geocoding returns merged/older names:
  Viken: 'NO1',
  'Vestfold og Telemark': 'NO1',
  'Troms og Finnmark': 'NO4',
  'Aust-Agder': 'NO2',
  'Vest-Agder': 'NO2',
  'Sogn og Fjordane': 'NO5',
  Hordaland: 'NO5',
}

export function soneForStedsdata(data: { county?: string; state?: string; region?: string }) {
  const county = data.county || data.state || data.region
  if (!county) return null
  return COUNTY_TO_ZONE[county] || null
}

export function soneForKoordinater(lat: number, lon: number) {
  if (lat >= 66) return 'NO4'
  if (lat >= 62) return 'NO3'
  if (lon < 7.5) return 'NO5'
  if (lat < 60.5) return 'NO2'
  return 'NO1'
}
