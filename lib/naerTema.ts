// Nær – design tokens. ALT av farger/typografi/avstander for mottakerflaten
// bor her (én fil, klar for React Native-overgang senere).
//
// Retning: varm, rolig, voksen. En pen klokke/kalender – ikke et helseprodukt.
// Mottakerskjermen er alltid lys: høy kontrast (WCAG AAA-mål), stor skrift,
// aldri tidspress. Knapper minst 56 px høye.

export const NAER = {
  // Farger – varm bakgrunn, dyp blågrå tekst, dempet grønn til bekreftelse
  bg: '#faf7f1', // varm, papiraktig bakgrunn
  kortBg: '#ffffff',
  border: 'rgba(31,42,58,0.10)',
  tekst: '#1f2a3a', // dyp blågrå – kontrast mot bg > 12:1
  subtekst: '#5b6573', // fortsatt AAA mot hvit for stor tekst
  gronn: '#2e7d5b', // bekreftelse/«Ferdig»
  gronnLys: '#e7f2ec',
  bla: '#2b5d8a', // rolige detaljer
  blaLys: '#e9f1f7',
  gul: '#f3ecdc', // varsom fremheving (f.eks. strømkortet)
  rod: '#a35a45', // kun til feil – aldri til mas

  // Typografi – 1,5–2x normal størrelse
  fontKjempe: '40px', // klokke/dato
  fontStor: '30px', // hovedbudskap på kort
  fontMedium: '24px', // sekundært (vær, tidspunkt)
  fontNormal: '19px', // brødtekst
  fontLiten: '16px', // diskret bunntekst

  // Avstander og former – luftig og umulig å bomme på
  radius: '24px',
  knappHoyde: '64px', // godt over 56 px-kravet
  mellomrom: '20px',

  skygge: '0 2px 6px rgba(31,42,58,0.06), 0 14px 34px rgba(31,42,58,0.08)',

  // Merkevare (fra logoen): blå→grønn gradient + dyp marineblå ordbilde
  logoBla: '#35a6ef',
  logoGronn: '#4cb878',
  navn: '#23355c',
} as const

import type { Tema } from './theme'

// Pårørende-flatens tema, i samme Tema-form som komponentene allerede bruker.
// Alltid lys, varm og rolig – aldri «techy». (Flyt hadde mørk modus; Nær har én
// gjennomtenkt visning.)
export function lagNaerTema(): Tema {
  return {
    bg: NAER.bg,
    bgGradient: 'radial-gradient(1100px 560px at 50% -8%, #ffffff 0%, #faf7f1 52%, #f2ecdf 100%)',
    cardBg: NAER.kortBg,
    border: NAER.border,
    tekst: NAER.tekst,
    subtekst: NAER.subtekst,
    inputBg: '#f4f1e9',
    accent: NAER.gronn,
    accentBg: NAER.gronn, // solid – hvit knappetekst skal alltid være lesbar
    accentGradient: `linear-gradient(135deg, ${NAER.logoBla} 0%, ${NAER.logoGronn} 100%)`,
    pillBg: NAER.gronnLys,
    pillTekst: '#26684c',
    skygge: NAER.skygge,
    skyggeHero: '0 2px 8px rgba(31,42,58,0.07), 0 22px 48px rgba(31,42,58,0.12)',
  }
}
