// Klient-hjelpere for .ics-kalenderimport. URL-en lagres lokalt på enheten;
// selve hentingen/tolkingen skjer på serveren (/api/kalender) pga. CORS.
export type KalenderEvent = { tekst: string; tid: string }

const NOKKEL = 'flyt:ical'

export function lesKalenderUrl(): string {
  if (typeof localStorage === 'undefined') return ''
  return localStorage.getItem(NOKKEL) || ''
}

export function lagreKalenderUrl(url: string): void {
  if (url) localStorage.setItem(NOKKEL, url)
  else localStorage.removeItem(NOKKEL)
}

export async function hentKalender(url: string): Promise<{ events: KalenderEvent[]; feil?: string }> {
  try {
    const res = await fetch(`/api/kalender?url=${encodeURIComponent(url)}`)
    const data = await res.json()
    if (!res.ok) return { events: [], feil: data.error || 'Kunne ikke hente kalenderen.' }
    return { events: Array.isArray(data.events) ? data.events : [] }
  } catch {
    return { events: [], feil: 'Kunne ikke hente kalenderen akkurat nå.' }
  }
}
