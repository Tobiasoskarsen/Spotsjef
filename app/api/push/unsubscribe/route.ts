import { NextRequest, NextResponse } from 'next/server'
import { slettAbonnement } from '@/lib/push'

export async function POST(req: NextRequest) {
  try {
    const { endpoint } = await req.json()
    if (typeof endpoint === 'string') await slettAbonnement(endpoint)
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Kunne ikke avslutte abonnement' }, { status: 500 })
  }
}
