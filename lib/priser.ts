import { Pris, Apparat, Anbefaling, ApiPris } from './types'

// Formaterer en dato til API-format: YYYY/MM-DD
export function formatDato(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}/${m}-${day}`
}

// Gjør om rådata fra API til vårt interne Pris-format
export function formaterPriser(data: ApiPris[]): Pris[] {
  return data.map(p => ({
    time: new Date(p.time_start).getHours() + ':00',
    pris: parseFloat((p.NOK_per_kWh * 100).toFixed(1)),
    raw: p.NOK_per_kWh,
  }))
}

// Henter priser for én dato/sone via vår egen API-route
async function hentDag(zone: string, dato: Date): Promise<Pris[]> {
  const res = await fetch(`/api/prices?zone=${zone}&date=${formatDato(dato)}`)
  const data = await res.json()
  return Array.isArray(data) ? formaterPriser(data) : []
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

  // De 6 dagene før i dag (for historikk-grafen)
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

// Månedlig kostnad for et apparat ved gitt kWh-pris (NOK)
export function maanedskostnad(apparat: Apparat, prisPerKwh: number): number {
  return (apparat.watt / 1000) * apparat.timer * 30 * prisPerKwh
}
