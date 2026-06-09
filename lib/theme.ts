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
        bg: '#0f1320',
        bgGradient:
          'radial-gradient(1200px 640px at 50% -12%, #1d2740 0%, #141a28 50%, #0e121c 100%)',
        cardBg: '#1a2132',
        border: 'rgba(255,255,255,0.06)',
        tekst: '#e8ecf5',
        subtekst: '#97a1b6',
        inputBg: '#141a28',
        accent: '#5aa6f5',
        accentBg: 'rgba(90,166,245,0.15)',
        accentGradient: 'linear-gradient(135deg, #4a97f0 0%, #38cdb2 100%)',
        pillBg: 'rgba(90,166,245,0.16)',
        pillTekst: '#9ccbff',
        skygge: '0 1px 2px rgba(0,0,0,0.26), 0 10px 26px rgba(0,0,0,0.30)',
        skyggeHero: '0 2px 8px rgba(0,0,0,0.30), 0 24px 54px rgba(8,14,28,0.46)',
      }
    : {
        bg: '#eaeef5',
        bgGradient:
          'radial-gradient(1100px 560px at 50% -8%, #ffffff 0%, #eef3fa 46%, #e6ecf5 100%)',
        cardBg: '#ffffff',
        border: 'rgba(20,32,56,0.08)',
        tekst: '#16202e',
        subtekst: '#8a95a8',
        inputBg: '#f2f6fb',
        accent: '#1f74e0',
        accentBg: '#e7f0fc',
        accentGradient: 'linear-gradient(135deg, #2b8fff 0%, #1fbfa0 100%)',
        pillBg: '#e7f0fc',
        pillTekst: '#1660c8',
        skygge: '0 1px 2px rgba(18,28,45,0.05), 0 12px 28px rgba(18,28,45,0.08)',
        skyggeHero: '0 2px 6px rgba(18,28,45,0.06), 0 22px 48px rgba(18,28,45,0.14)',
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
