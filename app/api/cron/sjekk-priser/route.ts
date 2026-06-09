import { NextRequest, NextResponse } from 'next/server'
import { hentAlleAbonnement, lagreAbonnement, sendVarsel, pushKonfigurert } from '@/lib/push'
import { formaterPriser, formatDato } from '@/lib/priser'
import { ApiPris } from '@/lib/types'

export const dynamic = 'force-dynamic'

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
        'Flyt — billig strøm nå!',
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

  return NextResponse.json({ ok: true, antallAbonnement: abonnement.length, sendt })
}
