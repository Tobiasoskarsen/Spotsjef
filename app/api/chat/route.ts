import { NextRequest, NextResponse } from 'next/server'

// Samtale-assistenten «Spør Flyt». Grunnet i brukerens egne data (pris, vær,
// påminnelser …) så den svarer ærlig og ikke finner på tall. Bruker Opus
// (beste kvalitet) – kan byttes til en rimeligere modell senere.
export async function POST(req: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'AI er ikke konfigurert (mangler API-nøkkel).' }, { status: 501 })
  }

  try {
    const { meldinger, kontekst } = await req.json()
    if (!Array.isArray(meldinger) || meldinger.length === 0) {
      return NextResponse.json({ error: 'Ingen melding.' }, { status: 400 })
    }

    const system = [
      'Du er Flyt – en vennlig, ærlig hverdagsassistent i en norsk mobilapp.',
      'Du hjelper folk med strøm (når den er billig), vær, påminnelser og helt vanlige spørsmål i hverdagen.',
      'Snakk enkelt og varmt, som om du forklarer til hvem som helst – også en som ikke er teknisk. Svar kort og direkte på norsk.',
      'Bruk KONTEKST nedenfor når spørsmålet handler om brukerens egen dag (pris, vær, påminnelser). Ikke finn på tall eller tidspunkter du ikke har – si heller at du ikke vet det ennå.',
      'Du kan ikke endre innstillinger eller lage påminnelser selv ennå; forklar heller hvor i appen brukeren gjør det (Påminnelser-fanen, Planlegg, Mer).',
      'Ikke vis resonnementet ditt – gi bare det ferdige svaret.',
      'Skriv som vanlig tekst. IKKE bruk markdown eller formateringstegn som ** for fet skrift, # for overskrifter eller * for punktlister. Skriv naturlig, gjerne med korte avsnitt.',
      kontekst ? `\nKONTEKST om brukeren akkurat nå:\n${kontekst}` : '',
    ].join('\n')

    // Begrens historikk + lengde for å holde kostnad nede
    const trygge = meldinger
      .slice(-12)
      .filter((m: { role?: string; content?: string }) => (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
      .map((m: { role: string; content: string }) => ({ role: m.role, content: m.content.slice(0, 2000) }))

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-opus-4-8',
        max_tokens: 1024,
        system,
        messages: trygge,
      }),
    })

    if (!res.ok) {
      return NextResponse.json({ error: 'AI svarte med feil.' }, { status: 502 })
    }
    const data = await res.json()
    const svar = data.content?.find((b: { type?: string }) => b.type === 'text')?.text ?? ''
    return NextResponse.json({ svar: svar.trim() || 'Beklager, jeg fikk ikke til å svare akkurat nå.' })
  } catch (e) {
    console.error('Chat-route feilet:', e)
    return NextResponse.json({ error: 'Kunne ikke svare akkurat nå.' }, { status: 500 })
  }
}
