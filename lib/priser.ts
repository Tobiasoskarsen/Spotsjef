import { Pris, Apparat, Anbefaling, ApiPris } from './types'

const MVA = 0.25

// NO4 (Nord-Norge) er fritatt for mva. Alle andre soner får 25% mva.
function mvaFaktor(zone: string): number {
  return zone === 'NO4' ? 1 : 1 + MVA
}

// Formaterer en dato til API-format: YYYY/MM-DD
export function formatDato(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}/${m}-${day}`
}

// Gjør om rådata fra API til vårt interne Pris-format (med mva lagt på)
export function formaterPriser(data: ApiPris[], zone: string): Pris[] {
  const faktor = mvaFaktor(zone)
  return data.map(p => {
    const medMva = p.NOK_per_kWh * faktor
    return {
      time: new Date(p.time_start).getHours() + ':00',
      pris: parseFloat((medMva * 100).toFixed(1)),
      raw: medMva,
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

// Finner det billigste sammenhengende tidsvinduet for et apparat
export function beregnAnbefaling(data: Pris[], apparat: Apparat): Anbefaling | null {
  if (data.length === 0) return null

  const timerNoedvendig = Math.ceil(apparat.timer)
  let bestStart = 0
  let lavestSum = Infinity

  for (let i = 0; i <= data.length - timerNoedvendig; i++) {
    const sum = data.slice(i, i + timerNoedvendig).reduce((a, b) => a + b.raw, 0)
    if (sum < lavestSum) {
      lavestSum = sum
      bestStart = i
    }
  }

  const snittPris = ((lavestSum / timerNoedvendig) * 100).toFixed(1)
  const kostnad = ((apparat.watt / 1000) * apparat.timer * (lavestSum / timerNoedvendig)).toFixed(2)

  return {
    startTime: data[bestStart]?.time,
    sluttTime: data[bestStart + timerNoedvendig]?.time || '00:00',
    snittPris,
    kostnad,
    startIdx: bestStart,
  }
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
export function maanedskostnad(apparat: Apparat, prisPerKwh: number): number {
  const perUke = apparat.gangerPerUke ?? 7
  const gangerPerMaaned = (perUke * 52) / 12 // ~4.33 uker per måned
  const kwhPerGang = (apparat.watt / 1000) * apparat.timer
  return kwhPerGang * gangerPerMaaned * prisPerKwh
}
