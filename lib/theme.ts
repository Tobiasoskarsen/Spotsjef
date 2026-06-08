export type Tema = {
  bg: string
  cardBg: string
  border: string
  tekst: string
  subtekst: string
  inputBg: string
}

export function lagTema(darkMode: boolean): Tema {
  return darkMode
    ? {
        bg: '#0f172a',
        cardBg: '#1e293b',
        border: '#334155',
        tekst: '#f1f5f9',
        subtekst: '#94a3b8',
        inputBg: '#0f172a',
      }
    : {
        bg: '#f8fafc',
        cardBg: '#ffffff',
        border: '#e2e8f0',
        tekst: '#1e293b',
        subtekst: '#64748b',
        inputBg: '#f8fafc',
      }
}

// Farge basert på hvor dyr en pris er relativt til dagens min/maks.
export function getColor(pris: number, min: number, max: number): string {
  const range = max - min || 1
  const ratio = (pris - min) / range
  if (ratio < 0.33) return '#22c55e'
  if (ratio < 0.66) return '#f59e0b'
  return '#ef4444'
}
