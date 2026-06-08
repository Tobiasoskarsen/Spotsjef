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
        bg: '#080b11',
        bgGradient:
          'radial-gradient(1100px 560px at 50% -8%, #122438 0%, #0a1019 52%, #06080d 100%)',
        cardBg: '#111824',
        border: 'rgba(255,255,255,0.07)',
        tekst: '#e9eef6',
        subtekst: '#828da2',
        inputBg: '#0c121c',
        accent: '#3b9eff',
        accentBg: 'rgba(59,158,255,0.14)',
        accentGradient: 'linear-gradient(135deg, #2b8fff 0%, #2bd4b0 100%)',
        pillBg: 'rgba(59,158,255,0.15)',
        pillTekst: '#86c8ff',
        skygge: '0 1px 2px rgba(0,0,0,0.40), 0 10px 28px rgba(0,0,0,0.42)',
        skyggeHero: '0 2px 6px rgba(0,0,0,0.42), 0 22px 52px rgba(2,10,22,0.55)',
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
