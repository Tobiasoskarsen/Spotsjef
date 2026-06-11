import { NextRequest, NextResponse } from 'next/server'

// Henter og tolker en .ics-kalender (iCloud/Google/Outlook) på serveren –
// nettleseren får ikke gjøre det selv pga. CORS. Returnerer kommende avtaler.

export const dynamic = 'force-dynamic'

// Avkoder ICS-tekst (escapede tegn) til lesbar streng
function avkod(s: string): string {
  return s.replace(/\\n/gi, ' ').replace(/\\,/g, ',').replace(/\\;/g, ';').replace(/\\\\/g, '\\').trim()
}

// Gjør en DTSTART-verdi om til en streng klienten kan tolke riktig:
// - heldag "20260612"            -> "2026-06-12"
// - UTC "20260612T140000Z"       -> "2026-06-12T14:00:00.000Z"
// - lokal/TZID "20260612T140000" -> "2026-06-12T14:00:00" (tolkes i brukerens tid)
function parseDato(val: string): string | null {
  const d = val.trim()
  if (/^\d{8}$/.test(d)) return `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}`
  const m = d.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})(Z?)$/)
  if (m) {
    const [, y, mo, da, h, mi, s, z] = m
    return `${y}-${mo}-${da}T${h}:${mi}:${s}${z ? '.000Z' : ''}`
  }
  return null
}

type Avtale = { tekst: string; tid: string }

function parseICS(tekst: string): Avtale[] {
  // Slå sammen «foldede» linjer (RFC 5545: linje som starter med mellomrom/tab)
  const unfolded = tekst.replace(/\r\n/g, '\n').replace(/\r/g, '\n').replace(/\n[ \t]/g, '')
  const linjer = unfolded.split('\n')
  const avtaler: Avtale[] = []
  let tekstFelt: string | null = null
  let tidFelt: string | null = null
  let inne = false

  for (const linje of linjer) {
    if (linje === 'BEGIN:VEVENT') { inne = true; tekstFelt = null; tidFelt = null }
    else if (linje === 'END:VEVENT') {
      if (inne && tidFelt) avtaler.push({ tekst: tekstFelt || 'Avtale', tid: tidFelt })
      inne = false
    } else if (inne) {
      const idx = linje.indexOf(':')
      if (idx === -1) continue
      const navn = linje.slice(0, idx).split(';')[0]
      const verdi = linje.slice(idx + 1)
      if (navn === 'SUMMARY') tekstFelt = avkod(verdi)
      else if (navn === 'DTSTART') tidFelt = parseDato(verdi)
    }
  }
  return avtaler
}

// Enkel SSRF-beskyttelse: blokker åpenbare interne adresser
function erTrygg(u: URL): boolean {
  if (u.protocol !== 'http:' && u.protocol !== 'https:') return false
  const h = u.hostname.toLowerCase()
  if (h === 'localhost' || h.endsWith('.local')) return false
  if (/^(127\.|10\.|192\.168\.|169\.254\.|0\.)/.test(h)) return false
  if (/^172\.(1[6-9]|2\d|3[01])\./.test(h)) return false
  return true
}

export async function GET(request: NextRequest) {
  const raw = request.nextUrl.searchParams.get('url') || ''
  // webcal:// er bare https:// i forkledning
  const urlStr = raw.replace(/^webcal:\/\//i, 'https://')

  let url: URL
  try {
    url = new URL(urlStr)
  } catch {
    return NextResponse.json({ error: 'Ugyldig kalender-lenke.' }, { status: 400 })
  }
  if (!erTrygg(url)) {
    return NextResponse.json({ error: 'Denne lenken er ikke tillatt.' }, { status: 400 })
  }

  try {
    const res = await fetch(url.toString(), { headers: { 'User-Agent': 'Flyt/1.0' } })
    if (!res.ok) {
      return NextResponse.json({ error: 'Fant ikke kalenderen. Sjekk at lenken er riktig og offentlig.' }, { status: 502 })
    }
    const tekst = await res.text()
    if (!tekst.includes('BEGIN:VCALENDAR')) {
      return NextResponse.json({ error: 'Lenken peker ikke til en gyldig kalender (.ics).' }, { status: 422 })
    }

    const naa = Date.now()
    const grense = naa + 30 * 24 * 60 * 60 * 1000 // 30 dager frem
    const events = parseICS(tekst)
      .map(a => ({ ...a, ms: new Date(a.tid).getTime() }))
      .filter(a => !Number.isNaN(a.ms) && a.ms > naa - 12 * 60 * 60 * 1000 && a.ms < grense)
      .sort((a, b) => a.ms - b.ms)
      .slice(0, 30)
      .map(({ tekst, tid }) => ({ tekst, tid }))

    return NextResponse.json(
      { events },
      { headers: { 'Cache-Control': 's-maxage=900, stale-while-revalidate' } },
    )
  } catch (e) {
    console.error('Kalender-route feilet:', e)
    return NextResponse.json({ error: 'Kunne ikke hente kalenderen akkurat nå.' }, { status: 500 })
  }
}
