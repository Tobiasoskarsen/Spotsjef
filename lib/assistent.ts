import { Pris, Apparat } from './types'
import { VaerTime, nesteNedbor } from './vaer'
import { AssistentProfil } from './profil'

// Regel-motoren for hverdagsassistenten (Fase 4).
// Deterministisk: reglene bestemmer HVA som vises, alltid fra ekte data + brukerens
// egne valg. Hvert punkt bærer en `kilde` så brukeren ser HVORFOR det dukket opp –
// det er det som skaper tillit. (AI-laget i neste fase formulerer/prioriterer,
// men finner aldri på noe utover disse punktene.)

export type BriefPunkt = {
  emoji: string
  tekst: string
  kilde: string // hvorfor punktet vises – sporbart til data/valg
  prioritet: number // høyere = viktigere
}

export type AssistentKontekst = {
  profil: AssistentProfil
  priser: Pris[]
  vaer: VaerTime[]
  apparater?: Apparat[]
  naa?: Date
}

const UKEDAG = ['søndag', 'mandag', 'tirsdag', 'onsdag', 'torsdag', 'fredag', 'lørdag']

function snitt(priser: Pris[]): number {
  if (priser.length === 0) return 0
  return priser.reduce((a, b) => a + b.pris, 0) / priser.length
}

// Billigste sammenhengende vindu (gitt lengde i timer) innenfor et prisutvalg.
function billigsteVindu(priser: Pris[], lengde: number): { start: Pris; slutt: Pris; snitt: number } | null {
  if (priser.length < lengde) return priser.length ? { start: priser[0], slutt: priser[priser.length - 1], snitt: snitt(priser) } : null
  let beste: { i: number; snitt: number } | null = null
  for (let i = 0; i + lengde <= priser.length; i++) {
    const s = priser.slice(i, i + lengde).reduce((a, b) => a + b.pris, 0) / lengde
    if (!beste || s < beste.snitt) beste = { i, snitt: s }
  }
  if (!beste) return null
  return { start: priser[beste.i], slutt: priser[beste.i + lengde - 1], snitt: beste.snitt }
}

export function lagBrief(k: AssistentKontekst): BriefPunkt[] {
  const { profil, priser, vaer, apparater = [], naa = new Date() } = k
  const punkter: BriefPunkt[] = []
  const time = naa.getHours()

  // ── Tømmedag (din egen oppgitte vane) ────────────────────────────────
  if (profil.tommedag !== null && profil.tommedag !== undefined) {
    const idag = naa.getDay()
    const kilde = `Din tømmedag: ${UKEDAG[profil.tommedag]}`
    if (profil.tommedag === idag) {
      punkter.push({ emoji: '🗑️', tekst: 'Søpla tømmes i dag – håper den er satt ut', kilde, prioritet: 95 })
    } else if (profil.tommedag === (idag + 1) % 7) {
      punkter.push({ emoji: '🗑️', tekst: 'Søpla tømmes i morgen – sett den ut i kveld', kilde, prioritet: 92 })
    }
  }

  // ── Strøm ────────────────────────────────────────────────────────────
  if (profil.vilStrom && priser.length > 0) {
    const s = snitt(priser)
    const naaP = priser[time]?.pris ?? 0

    // Status akkurat nå
    if (naaP > 0 && naaP < s * 0.8) {
      punkter.push({ emoji: '⚡', tekst: `Billig strøm akkurat nå (${naaP.toFixed(0)} øre) – fin tid for vask eller lading`, kilde: 'Spotpris nå vs. dagens snitt', prioritet: 85 })
    } else if (naaP > s * 1.2) {
      punkter.push({ emoji: '⏳', tekst: `Strømmen er dyr nå (${naaP.toFixed(0)} øre) – vent med vask og lading hvis du kan`, kilde: 'Spotpris nå vs. dagens snitt', prioritet: 82 })
    }

    // Billigste vindu fremover i dag (faller tilbake på hele dagen om kvelden)
    const fremover = priser.slice(time)
    const vindu = billigsteVindu(fremover.length >= 3 ? fremover : priser, 3)
    if (vindu && vindu.snitt < s) {
      punkter.push({ emoji: '💡', tekst: `Billigst strøm kl. ${vindu.start.time}–${vindu.slutt.time} (snitt ${vindu.snitt.toFixed(0)} øre/kWh)`, kilde: 'Spotpris i dag · strøm-tips på', prioritet: 70 })
    }

    // Apparat-bevisst: har du lagt inn elbil? Foreslå ladevindu i natt/fremover.
    const harElbil = apparater.some(a => a.ikon === '🚗' || /elbil|lading|lade/i.test(a.navn))
    if (harElbil && vindu) {
      punkter.push({ emoji: '🚗', tekst: `Beste ladetid for elbilen: kl. ${vindu.start.time}–${vindu.slutt.time}`, kilde: 'Du har lagt inn elbil + spotpris', prioritet: 65 })
    }
  }

  // ── Vær ──────────────────────────────────────────────────────────────
  if (profil.vilVaer && vaer.length > 0) {
    const regn = nesteNedbor(vaer, 6)
    if (regn) {
      punkter.push({ emoji: '🌧️', tekst: `Regn ventet rundt kl. ${new Date(regn.tid).getHours()}:00 – ta med paraply`, kilde: 'Værvarsel (MET/Yr)', prioritet: 75 })
    } else {
      punkter.push({ emoji: '☀️', tekst: 'Oppholdsvær de neste timene', kilde: 'Værvarsel (MET/Yr)', prioritet: 40 })
    }
    const temp = vaer[0]?.temp
    if (typeof temp === 'number' && temp <= 0) {
      punkter.push({ emoji: '🧥', tekst: `Det er ${Math.round(temp)}° ute – kle deg godt`, kilde: 'Værvarsel (MET/Yr)', prioritet: 48 })
    }
  }

  return punkter.sort((a, b) => b.prioritet - a.prioritet)
}
