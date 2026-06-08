export type Tema = {
  bg: string
  cardBg: string
  border: string
  tekst: string
  subtekst: string
  inputBg: string
  // Aksent og status-farger
  accent: string
  accentBg: string
  pillBg: string
  pillTekst: string
}

export function lagTema(darkMode: boolean): Tema {
  return darkMode
    ? {
        bg: '#1a1f29',
        cardBg: '#242b38',
        border: '#323a4a',
        tekst: '#e8ecf2',
        subtekst: '#8b95a3',
        inputBg: '#1a1f29',
        accent: '#7fae96',
        accentBg: '#2a3a32',
        pillBg: '#2a3a32',
        pillTekst: '#9ec9b0',
      }
    : {
        bg: '#f4f6f8',
        cardBg: '#ffffff',
        border: '#e8ecf0',
        tekst: '#2a3340',
        subtekst: '#a3aab6',
        inputBg: '#f7f9fb',
        accent: '#5b9279',
        accentBg: '#e8f1ec',
        pillBg: '#e8f1ec',
        pillTekst: '#3d6b54',
      }
}

// Dempet palett: salviegrønn (billig) -> sand (middels) -> terrakotta (dyrt)
export function getColor(pris: number, min: number, max: number): string {
  const range = max - min || 1
  const ratio = (pris - min) / range
  if (ratio < 0.33) return '#9ec9b0'
  if (ratio < 0.66) return '#e6cf9a'
  return '#dab3a6'
}

// Mørkere variant av samme farger til tekst/ikoner
export function getColorSterk(pris: number, min: number, max: number): string {
  const range = max - min || 1
  const ratio = (pris - min) / range
  if (ratio < 0.33) return '#5b9279'
  if (ratio < 0.66) return '#c9a85f'
  return '#c98a7a'
}
