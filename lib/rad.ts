import { Pris } from './types'
import { VaerTime, tolkSymbol } from './vaer'

export type Rad = {
  emoji: string
  tittel: string
  detalj: string
  prioritet: number // høyere = viktigere, brukes til sortering
}

// Hjelpere for å lese ut mønstre fra prisene
function billigsteTimer(priser: Pris[], antall = 3): Pris[] {
  return [...priser].sort((a, b) => a.pris - b.pris).slice(0, antall)
}

function naavaerendePris(priser: Pris[]): number {
  return priser[new Date().getHours()]?.pris ?? 0
}

function snittPris(priser: Pris[]): number {
  if (priser.length === 0) return 0
  return priser.reduce((a, b) => a + b.pris, 0) / priser.length
}

// Sjekker om en time-streng (f.eks. "14:00") faller i kveld/natt
function erKveldEllerNatt(time: string): boolean {
  const t = parseInt(time)
  return t >= 22 || t <= 6
}

/**
 * Lager 3-4 treffsikre råd basert på vær + strøm.
 * Hver regel legger til et råd HVIS situasjonen passer.
 * Til slutt sorteres de etter prioritet og vi tar de beste.
 */
export function lagRad(priser: Pris[], vaer: VaerTime[]): Rad[] {
  const rad: Rad[] = []
  if (priser.length === 0) return rad

  const naa = naavaerendePris(priser)
  const snitt = snittPris(priser)
  const billige = billigsteTimer(priser, 3)
  const billigsteTime = billige[0]
  const naaTime = new Date().getHours()

  // REGEL 1: Er strømmen billig akkurat nå? -> bruk den
  if (naa > 0 && naa < snitt * 0.8) {
    rad.push({
      emoji: '⚡',
      tittel: 'Billig strøm akkurat nå',
      detalj: `Prisen er ${naa.toFixed(0)} øre/kWh, godt under dagens snitt på ${snitt.toFixed(0)}. Bra tidspunkt for vask, oppvask eller lading.`,
      prioritet: 90,
    })
  }

  // REGEL 2: Dyr strøm nå, men billig senere? -> vent
  if (naa > snitt * 1.2 && billigsteTime && billigsteTime.pris < naa * 0.7) {
    rad.push({
      emoji: '⏳',
      tittel: 'Vent med strømkrevende ting',
      detalj: `Strømmen er dyr nå (${naa.toFixed(0)} øre). Billigst kl. ${billigsteTime.time} (${billigsteTime.pris.toFixed(0)} øre) – vent hvis du kan.`,
      prioritet: 85,
    })
  }

  // REGEL 3: Vær + strøm kombinert – tørke klær?
  if (vaer.length > 0) {
    const nesteTimer = vaer.slice(0, 8)
    const oppholdsvaer = nesteTimer.every(t => t.nedbor < 0.2)
    const regnSnart = nesteTimer.slice(0, 4).find(t => t.nedbor > 0.2)

    if (oppholdsvaer && billigsteTime) {
      rad.push({
        emoji: '🧺',
        tittel: 'Fin dag for klesvask',
        detalj: `Oppholdsvær de neste timene, og billigst strøm kl. ${billigsteTime.time}. Kjør vaskemaskinen da og heng klærne ut.`,
        prioritet: 70,
      })
    } else if (regnSnart) {
      rad.push({
        emoji: '🌧️',
        tittel: 'Regn på vei',
        detalj: `Nedbør ventet rundt kl. ${new Date(regnSnart.tid).getHours()}:00. Få inn det som ikke tåler regn, og tørk klesvask inne i dag.`,
        prioritet: 65,
      })
    }
  }

  // REGEL 4: Kald kveld + dyr kveldsstrøm -> alternativ oppvarming
  if (vaer.length > 0) {
    const kveldsTemp = vaer.find(t => {
      const h = new Date(t.tid).getHours()
      return h >= 18 && h <= 21
    })
    const kveldsPriser = priser.filter(p => {
      const h = parseInt(p.time)
      return h >= 18 && h <= 21
    })
    const dyrKveld = kveldsPriser.length > 0 && kveldsPriser.every(p => p.pris > snitt)

    if (kveldsTemp && kveldsTemp.temp !== null && kveldsTemp.temp < 0 && dyrKveld) {
      rad.push({
        emoji: '🔥',
        tittel: 'Kald og dyr kveld',
        detalj: `Det blir kaldt i kveld (${Math.round(kveldsTemp.temp)}°) og strømmen er dyr 18–21. Fyr i peisen eller bruk varmepumpe smart.`,
        prioritet: 60,
      })
    }
  }

  // Sorter etter prioritet, behold de 4 beste
  return rad.sort((a, b) => b.prioritet - a.prioritet).slice(0, 4)
}
