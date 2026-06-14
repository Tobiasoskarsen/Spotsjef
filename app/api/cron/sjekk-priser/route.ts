import { NextRequest, NextResponse } from 'next/server'
import { hentAlleAbonnement, lagreAbonnement, sendVarsel, pushKonfigurert, hentVarselProfiler, settSoppVarslet, hentForfalteReminder, merkReminderVarslet, opprettKvittering, flyttReminder, hentEskaleringer, merkEskalert, hentAktiveRelasjoner, harRapport, lagreRapport, hentUkesData, UkesData } from '@/lib/push'
import { nesteForekomst } from '@/lib/tid'
import { formaterPriser, formatDato } from '@/lib/priser'
import { ApiPris } from '@/lib/types'

export const dynamic = 'force-dynamic'

// Klokke i Europe/Oslo (håndterer sommertid riktig – ikke fast UTC+1/+2).
function osloNaa(): Date {
  return new Date(new Date().toLocaleString('en-US', { timeZone: 'Europe/Oslo' }))
}

// Dato N dager frem som YYYY-MM-DD (stabil nøkkel for debounce).
function datoPluss(d: Date, dager: number): string {
  const x = new Date(d)
  x.setDate(x.getDate() + dager)
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`
}

// Er klokketimen innenfor brukerens stilletimer? (vinduet kan krysse midnatt)
function erStilletid(time: number, fra: number, til: number): boolean {
  return fra <= til ? time >= fra && time < til : time >= fra || time < til
}

// ISO-ukenøkkel («2026-W24») – én rapport per relasjon per uke
function ukeNokkel(d: Date): string {
  const x = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()))
  const dag = x.getUTCDay() || 7
  x.setUTCDate(x.getUTCDate() + 4 - dag)
  const aarStart = new Date(Date.UTC(x.getUTCFullYear(), 0, 1))
  const uke = Math.ceil(((x.getTime() - aarStart.getTime()) / 86_400_000 + 1) / 7)
  return `${x.getUTCFullYear()}-W${String(uke).padStart(2, '0')}`
}

// Rådata blir omsorg: AI formulerer ukens tall som en varm, ærlig oppsummering.
// Faller tilbake på en enkel mal hvis AI ikke er tilgjengelig – rapporten skal
// aldri utebli på grunn av en API-feil.
async function lagRapportTekst(navn: string, d: UkesData): Promise<string> {
  const mal = [
    `${navn} bekreftet ${d.bekreftet} av ${d.planlagt} påminnelser denne uka`,
    d.snittMin != null ? `, som regel innen ${d.snittMin} minutter` : '',
    '.',
    d.pulser > 0 ? ` Og ${d.pulser} ${d.pulser === 1 ? 'dag' : 'dager'} kom det et «alt er bra» ☀️` : '',
  ].join('')

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) return mal
  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({
        model: 'claude-opus-4-8',
        max_tokens: 250,
        messages: [{
          role: 'user',
          content: [
            'Skriv en kort, varm ukesoppsummering (2–3 setninger, norsk bokmål) til en pårørende i appen Nær.',
            `Personen omtales som «${navn}». Ukens tall:`,
            `- Påminnelser som forfalt: ${d.planlagt}`,
            `- Bekreftet: ${d.bekreftet}`,
            d.snittMin != null ? `- Typisk tid før bekreftelse: ${d.snittMin} minutter` : '- (ingen bekreftelser å måle tid på)',
            `- Antall «alt er bra»-trykk: ${d.pulser}`,
            'Regler: bruk KUN tallene over, aldri dikt opp hendelser. Ingen helsetolkninger eller diagnoser.',
            'Tonen er rolig og hjertelig, aldri alarmerende. Ikke bruk overskrift, emojier er ok (maks én).',
          ].join('\n'),
        }],
      }),
    })
    if (!res.ok) return mal
    const data = await res.json()
    const tekst = data.content?.find((b: { type?: string }) => b.type === 'text')?.text?.trim()
    return tekst || mal
  } catch {
    return mal
  }
}

// Henter nåværende strømpris (etter strømstøtte, øre/kWh) for en sone
async function hentNaaPris(zone: string, naaTime: number): Promise<number | null> {
  try {
    const dato = formatDato(new Date())
    const res = await fetch(`https://www.hvakosterstrommen.no/api/v1/prices/${dato}_${zone}.json`)
    if (!res.ok) return null
    const data: ApiPris[] = await res.json()
    if (!Array.isArray(data) || data.length === 0) return null
    const priser = formaterPriser(data, zone)
    return priser[naaTime]?.pris ?? null
  } catch {
    return null
  }
}

export async function GET(req: NextRequest) {
  // Vercel Cron sender Authorization: Bearer ${CRON_SECRET} når den er satt
  const secret = process.env.CRON_SECRET
  if (secret && req.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (!pushKonfigurert()) {
    return NextResponse.json({ error: 'Push er ikke konfigurert' }, { status: 501 })
  }

  const abonnement = await hentAlleAbonnement()
  const naaTime = new Date().getHours()
  const prisPerSone: Record<string, number | null> = {}
  let sendt = 0

  for (const a of abonnement) {
    if (!a.grense) continue
    if (!(a.zone in prisPerSone)) prisPerSone[a.zone] = await hentNaaPris(a.zone, naaTime)
    const pris = prisPerSone[a.zone]
    if (pris == null) continue

    if (pris < a.grense && !a.varslet) {
      // Pris falt under grensen – varsle én gang
      const ok = await sendVarsel(
        a,
        'Nær — billig strøm nå',
        `Prisen er ${pris.toFixed(0)} øre/kWh — under grensen din på ${a.grense} øre.`,
      )
      if (ok) {
        a.varslet = true
        await lagreAbonnement(a)
        sendt++
      }
    } else if (pris >= a.grense && a.varslet) {
      // Tilbake over grensen – nullstill så vi kan varsle ved neste dip
      a.varslet = false
      await lagreAbonnement(a)
    }
  }

  // --- Assistent-påminnelser: søppel dagen før tømmedag ---
  let sendtSoppel = 0
  const medBruker = abonnement.filter(a => a.userId)
  if (medBruker.length > 0) {
    const profiler = await hentVarselProfiler([...new Set(medBruker.map(a => a.userId as string))])
    const naa = osloNaa()
    const osloTime = naa.getHours()
    const iMorgenUkedag = (naa.getDay() + 1) % 7
    const iMorgenDato = datoPluss(naa, 1)

    for (const a of medBruker) {
      const p = profiler[a.userId as string]
      if (!p || p.tommedag == null || p.tommedag !== iMorgenUkedag) continue
      if (a.soppVarslet === iMorgenDato) continue // alt varslet for denne datoen
      if (erStilletid(osloTime, p.stilleFra, p.stilleTil)) continue // respekter stilletimer
      const ok = await sendVarsel(a, 'Nær — tøm søpla', 'Søpla tømmes i morgen. Husk å sette den ut i kveld.')
      if (ok) {
        await settSoppVarslet(a.sub.endpoint, iMorgenDato)
        sendtSoppel++
      }
    }
  }

  // --- Påminnelser som har forfalt ---
  // Eksplisitte, tidsbestemte påminnelser sendes uavhengig av stilletimer
  // (brukeren valgte selv tidspunktet).
  let sendtReminder = 0
  const forfalte = await hentForfalteReminder()
  const subsPerBruker: Record<string, typeof abonnement> = {}
  for (const a of abonnement) {
    if (a.userId) (subsPerBruker[a.userId] ??= []).push(a)
  }
  for (const rem of forfalte) {
    const subs = subsPerBruker[rem.user_id] ?? []
    let nadd = false
    for (const a of subs) {
      if (await sendVarsel(a, 'Nær — påminnelse', rem.tekst)) nadd = true
    }

    const fraParorende = Boolean(rem.opprettet_av && rem.opprettet_av !== rem.user_id)
    if (fraParorende) {
      // Nær-påminnelse: logg kvittering uansett (skjermen viser den selv uten
      // push – og «levert: null» er ærlig info til pårørende, aldri stille feiling).
      await opprettKvittering(rem, nadd)
      if (rem.gjentakelse) {
        await flyttReminder(rem.id, nesteForekomst(rem.tid, rem.gjentakelse))
      } else {
        await merkReminderVarslet(rem.id)
      }
      if (nadd) sendtReminder++
    } else if (nadd) {
      // Egen påminnelse (uten kvittering): prøv igjen til en enhet nås
      if (rem.gjentakelse) {
        await flyttReminder(rem.id, nesteForekomst(rem.tid, rem.gjentakelse))
      } else {
        await merkReminderVarslet(rem.id)
      }
      sendtReminder++
    }
  }

  // --- Nær: eskalering – varsle pårørende om ubekreftede påminnelser ---
  // Kjernefunksjonen: «Mamma har ikke kvittert på medisinen». Markeres som
  // eskalert uansett, så pårørende aldri spammes – status er synlig i appen.
  let sendtEskalering = 0
  const eskaleringer = await hentEskaleringer()
  for (const e of eskaleringer) {
    const subs = subsPerBruker[e.parorendeId] ?? []
    const kl = new Date(e.planlagt).toLocaleTimeString('nb-NO', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Oslo' })
    for (const a of subs) {
      if (await sendVarsel(a, `Nær — ${e.mottakerNavn} har ikke bekreftet`, `«${e.tekst}» (kl. ${kl}) er ikke bekreftet ennå.`)) {
        sendtEskalering++
      }
    }
    await merkEskalert(e.kvitteringId)
  }

  // --- Nær: ukentlig trygghetsrapport (søndag kveld, én per relasjon per uke) ---
  let sendtRapport = 0
  const osloTidNaa = osloNaa()
  if (osloTidNaa.getDay() === 0 && osloTidNaa.getHours() >= 17) {
    const uke = ukeNokkel(osloTidNaa)
    for (const rel of await hentAktiveRelasjoner()) {
      if (await harRapport(rel.id, uke)) continue
      const d = await hentUkesData(rel.mottaker_id)
      if (d.planlagt === 0 && d.pulser === 0) continue // ingenting å fortelle ennå
      const tekst = await lagRapportTekst(rel.mottaker_navn, d)
      await lagreRapport(rel.id, uke, tekst)
      for (const a of subsPerBruker[rel.parorende_id] ?? []) {
        await sendVarsel(a, `Nær — slik gikk uka til ${rel.mottaker_navn}`, tekst)
      }
      sendtRapport++
    }
  }

  return NextResponse.json({ ok: true, antallAbonnement: abonnement.length, sendt, sendtSoppel, sendtReminder, sendtEskalering, sendtRapport })
}
