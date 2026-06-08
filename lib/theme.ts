export type Tema = {
  bg: string
  bgGradient: string
  cardBg: string
  border: string
  tekst: string
  subtekst: string
  inputBg: string
  // Aksent og status-farger
  accent: string
  accentBg: string
  accentGradient: string
  pillBg: string
  pillTekst: string
  // Dybde
  skygge: string
  skyggeHero: string
}

export function lagTema(darkMode: boolean): Tema {
  return darkMode
    ? {
        bg: '#12161f',
        bgGradient:
          'radial-gradient(1100px 560px at 50% -8%, #1f2a3a 0%, #151b26 48%, #11151d 100%)',
        cardBg: '#1e2531',
        border: 'rgba(255,255,255,0.07)',
        tekst: '#e9edf3',
        subtekst: '#8b95a3',
        inputBg: '#161b24',
        accent: '#84cba6',
        accentBg: 'rgba(132,203,166,0.13)',
        accentGradient: 'linear-gradient(135deg, #5fb389 0%, #84cba6 100%)',
        pillBg: 'rgba(132,203,166,0.15)',
        pillTekst: '#a3dcbf',
        skygge: '0 1px 2px rgba(0,0,0,0.32), 0 10px 28px rgba(0,0,0,0.30)',
        skyggeHero: '0 2px 6px rgba(0,0,0,0.34), 0 22px 50px rgba(0,0,0,0.42)',
      }
    : {
        bg: '#eef1f6',
        bgGradient:
          'radial-gradient(1100px 560px at 50% -8%, #ffffff 0%, #f1f4f9 46%, #e9edf4 100%)',
        cardBg: '#ffffff',
        border: 'rgba(22,32,52,0.07)',
        tekst: '#1e2733',
        subtekst: '#97a1b1',
        inputBg: '#f4f6fb',
        accent: '#3f8f6e',
        accentBg: '#e7f2ec',
        accentGradient: 'linear-gradient(135deg, #44966f 0%, #6cc198 100%)',
        pillBg: '#e7f2ec',
        pillTekst: '#2f7a5b',
        skygge: '0 1px 2px rgba(18,28,45,0.05), 0 12px 28px rgba(18,28,45,0.07)',
        skyggeHero: '0 2px 6px rgba(18,28,45,0.06), 0 22px 48px rgba(18,28,45,0.13)',
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
