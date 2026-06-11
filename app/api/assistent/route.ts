import { NextRequest, NextResponse } from 'next/server'

// Fase 5: AI-laget. Tar regel-motorens punkter (allerede utledet fra ekte data)
// og formulerer en kort, naturlig "Dagens brief". Prinsipp: AI formulerer, men
// finner ALDRI på noe utover punktene den får. API-nøkkelen holdes på serveren.
export async function POST(req: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'AI er ikke konfigurert (mangler API-nøkkel).' }, { status: 501 })
  }

  try {
    const { navn, punkter } = await req.json()
    if (!Array.isArray(punkter) || punkter.length === 0) {
      return NextResponse.json({ error: 'Ingen punkter å oppsummere.' }, { status: 400 })
    }

    // Bygg en kompakt, sporbar liste til modellen
    const fakta = punkter
      .map((p: { tekst?: string; kilde?: string }) => `- ${p.tekst}${p.kilde ? ` (kilde: ${p.kilde})` : ''}`)
      .join('\n')

    const instruks = [
      'Du er Flyt sin hverdagsassistent.',
      'Du får en liste FAKTA-punkter som allerede er utledet fra ekte data.',
      'Skriv en kort, vennlig oppsummering (1–3 setninger) på norsk som binder sammen det viktigste for brukeren akkurat nå.',
      '',
      'STRENGE REGLER:',
      '- Bruk KUN informasjonen i punktene. Ikke legg til nye fakta, tall, klokkeslett eller råd som ikke står der.',
      '- Ikke gjenta alle punktene ordrett – løft frem det viktigste først.',
      '- Vær varm og naturlig. Bruk navnet hvis det er oppgitt.',
      '- Ikke bruk emoji. Svar KUN med oppsummeringen, ingen innledning eller overskrift.',
      '- Skriv som vanlig tekst, uten markdown/formateringstegn (ingen ** eller *).',
      navn ? `\nBrukerens navn: ${navn}` : '',
      `\nPunkter:\n${fakta}`,
    ].join('\n')

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-opus-4-8',
        max_tokens: 300,
        messages: [{ role: 'user', content: instruks }],
      }),
    })

    if (!res.ok) {
      return NextResponse.json({ error: 'Anthropic API svarte med feil.' }, { status: 502 })
    }

    const data = await res.json()
    const tekst = data.content?.find((b: { type?: string }) => b.type === 'text')?.text ?? ''
    return NextResponse.json({ tekst: tekst.trim() })
  } catch (e) {
    console.error('Assistent-route feilet:', e)
    return NextResponse.json({ error: 'Kunne ikke lage oppsummering akkurat nå.' }, { status: 500 })
  }
}
