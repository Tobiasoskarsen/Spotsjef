import { NextRequest, NextResponse } from 'next/server'
import { lagreAbonnement, pushKonfigurert } from '@/lib/push'

export async function POST(req: NextRequest) {
  if (!pushKonfigurert()) {
    return NextResponse.json({ error: 'Push er ikke konfigurert' }, { status: 501 })
  }
  try {
    const { sub, grense, zone } = await req.json()
    if (!sub?.endpoint || !sub?.keys) {
      return NextResponse.json({ error: 'Ugyldig abonnement' }, { status: 400 })
    }
    await lagreAbonnement({
      sub,
      grense: Number(grense) || 0,
      zone: typeof zone === 'string' ? zone : 'NO1',
      varslet: false,
    })
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Kunne ikke lagre abonnement' }, { status: 500 })
  }
}
