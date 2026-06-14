// Intern kostnadsrapport for AI-bruk i Nær. KUN for Tobias – ikke en del av appen.
//
// Leser faktisk token-bruk fra ai_bruk-tabellen (logget fra Anthropics usage-felt)
// og regner ut hva AI-en faktisk har kostet – i dag, denne måneden, totalt, og
// per aktiv familie.
//
// Kjør:  node --env-file=.env.local scripts/ai-kostnad.mjs
// (Node 20.6+ leser .env.local med --env-file. Trenger SUPABASE-nøklene som
//  allerede ligger der.)

import { createClient } from '@supabase/supabase-js'

// Priser per million tokens (USD), per claude-api skill (juni 2026).
const PRIS = {
  'claude-haiku-4-5': { inn: 1, ut: 5 },
  'claude-opus-4-8': { inn: 5, ut: 25 },
}
// Juster kursen ved behov – kun for å vise et omtrentlig kronebeløp.
const USD_TIL_NOK = 11

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!URL || !KEY) {
  console.error('Mangler NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY.')
  console.error('Kjør med:  node --env-file=.env.local scripts/ai-kostnad.mjs')
  process.exit(1)
}

const db = createClient(URL, KEY, { auth: { persistSession: false } })

function kostnadUsd(rad) {
  const p = PRIS[rad.modell] ?? { inn: 0, ut: 0 }
  return (rad.inn_tokens / 1e6) * p.inn + (rad.ut_tokens / 1e6) * p.ut
}

function kr(usd) {
  return (usd * USD_TIL_NOK).toLocaleString('nb-NO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
function usdStr(usd) {
  return usd.toLocaleString('en-US', { minimumFractionDigits: 4, maximumFractionDigits: 4 })
}

// Oppsummerer en mengde rader: antall kall, tokens og kostnad per modell + sum.
function oppsummer(rader) {
  const perModell = {}
  let sumUsd = 0
  for (const rad of rader) {
    const m = (perModell[rad.modell] ??= { kall: 0, inn: 0, ut: 0, usd: 0 })
    m.kall++
    m.inn += rad.inn_tokens
    m.ut += rad.ut_tokens
    const u = kostnadUsd(rad)
    m.usd += u
    sumUsd += u
  }
  return { perModell, sumUsd, antall: rader.length }
}

function skrivBlokk(tittel, o) {
  console.log(`\n${tittel}`)
  console.log('─'.repeat(tittel.length))
  if (o.antall === 0) {
    console.log('  (ingen AI-kall ennå)')
    return
  }
  for (const [modell, m] of Object.entries(o.perModell)) {
    console.log(
      `  ${modell.padEnd(20)} ${String(m.kall).padStart(4)} kall · ` +
      `${(m.inn + m.ut).toLocaleString('nb-NO').padStart(9)} tokens · ` +
      `$${usdStr(m.usd)}  (~${kr(m.usd)} kr)`,
    )
  }
  console.log(`  → SUM: $${usdStr(o.sumUsd)}  (~${kr(o.sumUsd)} kr)`)
}

const { data, error } = await db
  .from('ai_bruk')
  .select('modell, inn_tokens, ut_tokens, formaal, opprettet')
  .order('opprettet', { ascending: false })

if (error) {
  console.error('Klarte ikke å lese ai_bruk:', error.message)
  console.error('Har du kjørt den nye SQL-en (ai_bruk-tabellen) i Supabase?')
  process.exit(1)
}

const naa = new Date()
const startDag = new Date(naa.getFullYear(), naa.getMonth(), naa.getDate())
const startMnd = new Date(naa.getFullYear(), naa.getMonth(), 1)

const idag = data.filter(r => new Date(r.opprettet) >= startDag)
const mnd = data.filter(r => new Date(r.opprettet) >= startMnd)

console.log('\n╔═══════════════════════════════════════════════╗')
console.log('║   Nær – AI-kostnad (faktiske tall)            ║')
console.log('╚═══════════════════════════════════════════════╝')

skrivBlokk('I dag', oppsummer(idag))
skrivBlokk('Denne måneden', oppsummer(mnd))
const total = oppsummer(data)
skrivBlokk('Totalt (alt logget)', total)

// Per aktiv familie denne måneden – den tallet som faktisk betyr noe
const { count: aktive } = await db
  .from('relasjoner')
  .select('id', { count: 'exact', head: true })
  .eq('status', 'aktiv')

if (aktive && aktive > 0) {
  const perFamilieUsd = oppsummer(mnd).sumUsd / aktive
  console.log(`\nPer aktiv familie denne måneden (${aktive} stk):`)
  console.log(`  ~$${usdStr(perFamilieUsd)}  (~${kr(perFamilieUsd)} kr)`)
  console.log(`  Til sammenligning: abonnement er 59 kr/mnd.`)
}

console.log('')
