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
