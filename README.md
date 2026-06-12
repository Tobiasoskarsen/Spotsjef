# Nær – trygghet for familien

Nær lar deg hjelpe noen du er glad i med hverdagen: påminnelser, vær og
praktiske beskjeder på en skjerm de faktisk forstår – og gir deg visshet om at
det når frem.

**Én app, to opplevelser:**

- **Mottakeren** får én rolig skjerm: dato og vær i stor skrift, neste
  hendelse med en stor «Ferdig ✓»-knapp. Ingen menyer, ingenting å rote seg
  bort i. Aktiveres med invitasjonskode og et tydelig samtykke.
- **Den pårørende** kobler til sine personer, legger inn påminnelser (også
  gjentakende, gjerne skrevet i naturlig språk) og ser kvitteringer:
  «Levert 20:00 ✓ · Bekreftet 20:04». Varsles hvis noe ikke bekreftes.

## Teknisk

- Next.js (App Router) på Vercel, PWA med Web Push (VAPID)
- Supabase: Postgres + Auth (anonym først, oppgraderbar til e-post) med RLS
- Vær fra MET/Yr, strømpriser fra hvakosterstrommen.no
- AI (Claude) tolker naturlig språk til påminnelser – kun på pårørende-siden

## Kom i gang

```bash
npm install
npm run dev
```

Kopier `.env.example` til `.env.local` og fyll inn Supabase-, VAPID- og
Anthropic-nøkler. Kjør `supabase/schema.sql` i Supabase SQL Editor.

Cron: `GET /api/cron/sjekk-priser` (beskyttet med `CRON_SECRET`) leverer
påminnelser, logger kvitteringer og eskalerer ubekreftede til pårørende.
