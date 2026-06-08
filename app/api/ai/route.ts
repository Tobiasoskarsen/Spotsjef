import { NextRequest, NextResponse } from 'next/server'

// Backend-route for AI-innsikt. Holder API-nøkkelen trygt på serveren –
// den blir ALDRI sendt til nettleseren.
export async function POST(req: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return NextResponse.json(
      { error: 'API-nøkkel mangler på serveren' },
      { status: 500 }
    )
  }

  try {
    const { snitt, min, max, billigTimer } = await req.json()

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        messages: [
          {
            role: 'user',
            content: `Du er en hjelpsom strømekspert. Gi en kort, praktisk analyse (3-4 setninger) på norsk av dagens strømpriser. Snittprisen er ${snitt} øre/kWh, laveste er ${min} øre, høyeste er ${max} øre. De billigste timene er: ${billigTimer}. Gi konkrete råd om når folk bør bruke strøm i dag. Vær direkte og uformell.`,
          },
        ],
      }),
    })

    if (!res.ok) {
      return NextResponse.json(
        { error: 'Anthropic API svarte med feil' },
        { status: 502 }
      )
    }

    const data = await res.json()
    const tekst = data.content?.[0]?.text ?? 'Kunne ikke hente innsikt.'
    return NextResponse.json({ tekst })
  } catch (e) {
    console.error('AI-route feilet:', e)
    return NextResponse.json(
      { error: 'Kunne ikke hente AI-innsikt akkurat nå.' },
      { status: 500 }
    )
  }
}
