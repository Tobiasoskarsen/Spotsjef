import { NextRequest, NextResponse } from 'next/server'
import { hentAlleAbonnement, lagreAbonnement, sendVarsel, pushKonfigurert, hentVarselProfiler, settSoppVarslet, hentForfalteReminder, merkReminderVarslet, opprettKvittering, flyttReminder, hentEskaleringer, merkEskalert } from '@/lib/push'
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
      // Egen påminnelse (Flyt-stil): som før – prøv igjen til en enhet nås
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

  return NextResponse.json({ ok: true, antallAbonnement: abonnement.length, sendt, sendtSoppel, sendtReminder, sendtEskalering })
}
