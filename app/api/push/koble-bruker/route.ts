import { NextRequest, NextResponse } from 'next/server'
import { koblBruker, pushKonfigurert } from '@/lib/push'

// Kobler enhetens push-abonnement til en (anonym) bruker, så assistenten kan
// sende personlige påminnelser (f.eks. søppel-påminnelse) via cron-en.
export async function POST(req: NextRequest) {
  if (!pushKonfigurert()) {
    return NextResponse.json({ error: 'Push er ikke konfigurert' }, { status: 501 })
  }
  try {
    const { sub, userId } = await req.json()
    if (!sub?.endpoint || !sub?.keys || !userId) {
      return NextResponse.json({ error: 'Ugyldig forespørsel' }, { status: 400 })
    }
    await koblBruker(sub, userId)
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Kunne ikke koble bruker' }, { status: 500 })
  }
}
