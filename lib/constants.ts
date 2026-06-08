import { Apparat } from './types'

export const APPARATER: Apparat[] = [
  { navn: 'Oppvaskmaskin', watt: 1800, timer: 1.5, ikon: '🍽️' },
  { navn: 'Vaskemaskin', watt: 2000, timer: 2, ikon: '👕' },
  { navn: 'Tørketrommel', watt: 2500, timer: 2, ikon: '💨' },
  { navn: 'Elbil-lading (11kW)', watt: 11000, timer: 4, ikon: '🚗' },
]

export const SONER = [
  { kode: 'NO1', navn: 'Oslo (NO1)' },
  { kode: 'NO2', navn: 'Kristiansand (NO2)' },
  { kode: 'NO3', navn: 'Trondheim (NO3)' },
  { kode: 'NO4', navn: 'Tromsø (NO4)' },
  { kode: 'NO5', navn: 'Bergen (NO5)' },
]
