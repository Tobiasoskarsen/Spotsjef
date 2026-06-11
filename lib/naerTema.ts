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
} as const
