import { Pris, Apparat, Anbefaling, ApiPris } from './types'

const MVA = 0.25

// NO4 (Nord-Norge) er fritatt for mva. Alle andre soner får 25% mva.
function mvaFaktor(zone: string): number {
  return zone === 'NO4' ? 1 : 1 + MVA
}

// Strømstøtte (strømstønad): staten dekker en andel av spotprisen over en
// terskel, beregnet time for time. Terskel i kr/kWh ekskl. mva.
// Juster disse hvis ordningen endres.
export const STOTTE_TERSKEL = 0.70
export const STOTTE_DEKNING = 0.90

export function stromstotte(spotEksklMva: number, zone: string): number {
  if (spotEksklMva <= STOTTE_TERSKEL) return 0
  // Støtten gis inkl. mva for husholdninger
  return (spotEksklMva - STOTTE_TERSKEL) * STOTTE_DEKNING * mvaFaktor(zone)
}

// Formaterer en dato til API-format: YYYY/MM-DD
export function formatDato(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}/${m}-${day}`
}

// Gjør om rådata fra API til vårt interne Pris-format.
// pris/raw = strømpris ETTER strømstøtte (inkl. mva). spot = før støtte (øre),
// så vi kan vise hvor mye støtten trekker fra.
export function formaterPriser(data: ApiPris[], zone: string): Pris[] {
  const faktor = mvaFaktor(zone)
  return data.map(p => {
    const spotInkl = p.NOK_per_kWh * faktor
    const etterStotte = Math.max(0, spotInkl - stromstotte(p.NOK_per_kWh, zone))
    return {
      time: new Date(p.time_start).getHours() + ':00',
      pris: parseFloat((etterStotte * 100).toFixed(1)),
      raw: etterStotte,
      spot: parseFloat((spotInkl * 100).toFixed(1)),
    }
  })
}

// Henter priser for én dato/sone via vår egen API-route
async function hentDag(zone: string, dato: Date): Promise<Pris[]> {
  const res = await fetch(`/api/prices?zone=${zone}&date=${formatDato(dato)}`)
  const data = await res.json()
  return Array.isArray(data) ? formaterPriser(data, zone) : []
}

export type AltData = {
  idag: Pris[]
  imorgen: Pris[]
  historikk: { dato: string; snitt: number }[]
}

// Henter dagens priser, morgendagens, og snitt for de 6 foregående dagene
export async function hentAltData(zone: string): Promise<AltData> {
  const now = new Date()
  const imorgen = new Date(now.getTime() + 86400000)

  const historikkDatoer = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now)
    d.setDate(d.getDate() - (i + 1))
    return d
  })

  const [idagData, imorgenData, ...historikkData] = await Promise.all([
    hentDag(zone, now),
    hentDag(zone, imorgen),
    ...historikkDatoer.map(d => hentDag(zone, d)),
  ])

  const historikk = historikkData
    .map((priser, i) => {
      if (priser.length === 0) return null
      const snitt = priser.reduce((a, b) => a + b.raw, 0) / priser.length
      return {
        dato: historikkDatoer[i].toLocaleDateString('no', { weekday: 'short', day: 'numeric' }),
        snitt: parseFloat((snitt * 100).toFixed(1)),
      }
    })
    .filter((p): p is { dato: string; snitt: number } => p !== null)
    .reverse()

  return { idag: idagData, imorgen: imorgenData, historikk }
}

// --- Lokal cache, så appen åpner lynraskt og virker offline ---

export type PrisCache = { tid: number; data: AltData }

export function skrivPrisCache(zone: string, data: AltData, tid: number): void {
  try {
    localStorage.setItem(`naer_priser_${zone}`, JSON.stringify({ tid, dato: formatDato(new Date()), data }))
  } catch {
    // localStorage utilgjengelig/full – cache er valgfritt, ignorer
  }
}

// Returnerer cache kun hvis den er fra i dag (ellers ville "i dag" vist gårsdagens priser)
export function lesPrisCache(zone: string): PrisCache | null {
  try {
    const rå = localStorage.getItem(`naer_priser_${zone}`)
    if (!rå) return null
    const c = JSON.parse(rå)
    if (c?.dato !== formatDato(new Date())) return null
    if (!Array.isArray(c?.data?.idag)) return null
    return { tid: c.tid, data: c.data }
  } catch {
    return null
  }
}

// Finner det billigste sammenhengende tidsvinduet for et apparat.
// Hvis fristTime er satt (f.eks. 7 = "ferdig før 07:00"), vurderes kun
// vinduer som rekker å bli ferdige innen den timen.
export function beregnAnbefaling(
  data: Pris[],
  apparat: Apparat,
  fristTime?: number,
  nettleie = 0, // kr/kWh som legges til for "reell" totalpris
): Anbefaling | null {
  if (data.length === 0) return null

  const timerNoedvendig = Math.ceil(apparat.timer)
  const kwh = (apparat.watt / 1000) * apparat.timer

  // Øvre grense for når vinduet må være ferdig (eksklusiv indeks)
  const maksSlutt = fristTime != null ? Math.min(data.length, fristTime) : data.length
  if (maksSlutt < timerNoedvendig) return null // rekker ikke fristen

  let bestStart = -1
  let lavestSum = Infinity
  for (let i = 0; i + timerNoedvendig <= maksSlutt; i++) {
    const sum = data.slice(i, i + timerNoedvendig).reduce((a, b) => a + b.raw, 0)
    if (sum < lavestSum) {
      lavestSum = sum
      bestStart = i
    }
  }
  if (bestStart < 0) return null

  // Dyreste vindu over HELE dagen (uavhengig av frist) – grunnlag for spar-estimat
  let hoyestSum = -Infinity
  for (let i = 0; i + timerNoedvendig <= data.length; i++) {
    const sum = data.slice(i, i + timerNoedvendig).reduce((a, b) => a + b.raw, 0)
    if (sum > hoyestSum) hoyestSum = sum
  }

  const lavestSnitt = lavestSum / timerNoedvendig + nettleie
  const hoyestSnitt = hoyestSum / timerNoedvendig + nettleie

  return {
    startTime: data[bestStart]?.time,
    sluttTime: data[bestStart + timerNoedvendig]?.time || '00:00',
    snittPris: (lavestSnitt * 100).toFixed(1),
    kostnad: (kwh * lavestSnitt).toFixed(2),
    kostnadDyrest: (kwh * hoyestSnitt).toFixed(2),
    startIdx: bestStart,
  }
}

// Kostnad for å kjøre apparatet i et vindu som starter på en gitt time-indeks.
// Brukes til "kjør nå"-sammenligningen. null hvis vinduet ikke får plass.
export function kostnadForStart(
  data: Pris[],
  apparat: Apparat,
  startIdx: number,
  nettleie = 0,
): string | null {
  const timerNoedvendig = Math.ceil(apparat.timer)
  if (startIdx < 0 || startIdx + timerNoedvendig > data.length) return null
  const sum = data.slice(startIdx, startIdx + timerNoedvendig).reduce((a, b) => a + b.raw, 0)
  const kwh = (apparat.watt / 1000) * apparat.timer
  return (kwh * (sum / timerNoedvendig + nettleie)).toFixed(2)
}

// Statistikk for en liste priser
export function prisStatistikk(data: Pris[]) {
  if (data.length === 0) return { min: 0, max: 0, snitt: '0' }
  return {
    min: Math.min(...data.map(p => p.pris)),
    max: Math.max(...data.map(p => p.pris)),
    snitt: (data.reduce((a, b) => a + b.pris, 0) / data.length).toFixed(1),
  }
}

// Månedlig kostnad for et apparat ved gitt kWh-pris (NOK).
// Bruker apparatets faktiske bruksfrekvens (ganger per uke). Eldre apparater
// uten frekvens antas brukt daglig (7/uke), som matcher gammel oppførsel.
export function maanedskostnad(apparat: Apparat, prisPerKwh: number, nettleie = 0): number {
  const perUke = apparat.gangerPerUke ?? 7
  const gangerPerMaaned = (perUke * 52) / 12 // ~4.33 uker per måned
  const kwhPerGang = (apparat.watt / 1000) * apparat.timer
  return kwhPerGang * gangerPerMaaned * (prisPerKwh + nettleie)
}
