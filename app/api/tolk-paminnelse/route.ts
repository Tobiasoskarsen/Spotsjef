import { NextRequest, NextResponse } from 'next/server'
import { loggAiBruk } from '@/lib/aiBruk'

// Tolker en påminnelse skrevet i vanlig språk («ring mamma fredag kl 18») til
// struktur { tekst, lokalTid }. Bruker Haiku (rask + rimelig – enkel uttrekking).
// Klienten sender sin egen «nå» så relative datoer (i dag/fredag) blir riktige.
export async function POST(req: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'AI er ikke konfigurert (mangler API-nøkkel).' }, { status: 501 })
  }

  try {
    const { tekst, naa, naaLesbar } = await req.json()
    if (!tekst || typeof tekst !== 'string') {
      return NextResponse.json({ error: 'Mangler tekst.' }, { status: 400 })
    }

    const instruks = [
      'Du gjør om en påminnelse skrevet i naturlig norsk språk til struktur.',
      `Akkurat nå er det: ${naaLesbar || naa || 'ukjent'} (ISO: ${naa || 'ukjent'}).`,
      'Regler:',
      '- "tekst": kort beskrivelse av HVA påminnelsen gjelder, uten tidsangivelse (f.eks. "Ring mamma").',
      '- "lokalTid": tidspunktet i brukerens lokale tid, format YYYY-MM-DDTHH:MM (24-timers).',
      '- Mangler klokkeslett: bruk 09:00.',
      '- Mangler dato: bruk i dag, men hvis klokkeslettet allerede er passert i dag, bruk neste dag.',
      '- "fredag", "neste tirsdag" osv. regnes ut fra tidspunktet over.',
      'Svar KUN ved å kalle verktøyet lag_paminnelse.',
    ].join('\n')

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5',
        max_tokens: 300,
        tools: [
          {
            name: 'lag_paminnelse',
            description: 'Lagrer en påminnelse med beskrivelse og tidspunkt.',
            input_schema: {
              type: 'object',
              properties: {
                tekst: { type: 'string', description: 'Hva påminnelsen gjelder, uten tid.' },
                lokalTid: { type: 'string', description: 'YYYY-MM-DDTHH:MM i brukerens lokale tid.' },
              },
              required: ['tekst', 'lokalTid'],
            },
          },
        ],
        tool_choice: { type: 'tool', name: 'lag_paminnelse' },
        messages: [{ role: 'user', content: `${instruks}\n\nPåminnelse: ${tekst}` }],
      }),
    })

    if (!res.ok) {
      return NextResponse.json({ error: 'AI svarte med feil.' }, { status: 502 })
    }

    const data = await res.json()
    if (data.usage) {
      await loggAiBruk('claude-haiku-4-5', data.usage.input_tokens ?? 0, data.usage.output_tokens ?? 0, 'tolk-paminnelse')
    }
    const verktoy = data.content?.find((b: { type?: string }) => b.type === 'tool_use')
    const ut = verktoy?.input as { tekst?: string; lokalTid?: string } | undefined
    if (!ut?.tekst || !ut?.lokalTid || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(ut.lokalTid)) {
      return NextResponse.json({ error: 'Forsto ikke helt – prøv å skrive det enklere.' }, { status: 422 })
    }

    return NextResponse.json({ tekst: ut.tekst, lokalTid: ut.lokalTid })
  } catch (e) {
    console.error('Tolk-paminnelse feilet:', e)
    return NextResponse.json({ error: 'Kunne ikke tolke påminnelsen akkurat nå.' }, { status: 500 })
  }
}
