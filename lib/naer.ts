import { getSupabase } from './supabaseClient'
import { Gjentakelse, nesteForekomst } from './tid'

// Nær – datalag for relasjoner (pårørende ↔ mottaker), mottaker-påminnelser
// og kvitteringer. Alt beskyttes av RLS i Supabase: pårørende når kun data for
// mottakere som har samtykket (status 'aktiv' i relasjoner).

export type Relasjon = {
  id: string
  mottakerId: string | null
  mottakerNavn: string
  kode: string
  status: 'venter' | 'aktiv'
}

export type NaerReminder = {
  id: string
  tekst: string
  tid: string // ISO
  gjentakelse: Gjentakelse | null
  varslet: boolean
}

export type Kvittering = {
  id: string
  reminderId: string
  tekst: string
  planlagt: string
  levert: string | null
  bekreftet: string | null
  eskalert: boolean
}

// Kort kode uten lett-forvekslbare tegn (ingen O/0, I/1, L). Store bokstaver –
// lette å lese opp over telefon.
const KODE_TEGN = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'
export function lagKode(): string {
  let kode = ''
  const tilfeldig = new Uint32Array(6)
  crypto.getRandomValues(tilfeldig)
  for (let i = 0; i < 6; i++) kode += KODE_TEGN[tilfeldig[i] % KODE_TEGN.length]
  return kode
}

// ── Pårørende-siden ──────────────────────────────────────────────────────────

export async function opprettInvitasjon(
  parorendeId: string,
  mottakerNavn: string,
): Promise<{ relasjon: Relasjon | null; feil?: string }> {
  const sb = getSupabase()
  if (!sb) return { relasjon: null, feil: 'Ikke koblet til database.' }
  // Prøv noen ganger i tilfelle kode-kollisjon (unik-indeks)
  for (let forsok = 0; forsok < 3; forsok++) {
    const kode = lagKode()
    const { data, error } = await sb
      .from('relasjoner')
      .insert({ parorende_id: parorendeId, mottaker_navn: mottakerNavn, invitasjonskode: kode })
      .select('id, mottaker_id, mottaker_navn, invitasjonskode, status')
      .single()
    if (!error && data) return { relasjon: tilRelasjon(data) }
    if (error && !error.message.includes('duplicate')) return { relasjon: null, feil: error.message }
  }
  return { relasjon: null, feil: 'Kunne ikke lage kode. Prøv igjen.' }
}

type RelasjonRad = {
  id: string; mottaker_id: string | null; mottaker_navn: string
  invitasjonskode: string; status: string
}

function tilRelasjon(r: RelasjonRad): Relasjon {
  return {
    id: r.id,
    mottakerId: r.mottaker_id,
    mottakerNavn: r.mottaker_navn,
    kode: r.invitasjonskode,
    status: r.status === 'aktiv' ? 'aktiv' : 'venter',
  }
}

export async function hentMineMottakere(parorendeId: string): Promise<Relasjon[]> {
  const sb = getSupabase()
  if (!sb) return []
  const { data } = await sb
    .from('relasjoner')
    .select('id, mottaker_id, mottaker_navn, invitasjonskode, status')
    .eq('parorende_id', parorendeId)
    .order('opprettet', { ascending: true })
  return ((data as RelasjonRad[]) ?? []).map(tilRelasjon)
}

export async function slettRelasjon(id: string): Promise<void> {
  const sb = getSupabase()
  if (!sb) return
  await sb.from('relasjoner').delete().eq('id', id)
}

// Påminnelser for en mottaker (RLS slipper pårørende inn via aktiv relasjon).
// Tar med en uke bakover så historikken med kvitteringer gir mening.
export async function hentReminderFor(mottakerId: string): Promise<NaerReminder[]> {
  const sb = getSupabase()
  if (!sb) return []
  const fra = new Date(Date.now() - 7 * 86_400_000).toISOString()
  const { data } = await sb
    .from('reminders')
    .select('id, tekst, tid, gjentakelse, varslet')
    .eq('user_id', mottakerId)
    .gte('tid', fra)
    .order('tid', { ascending: true })
  return ((data ?? []) as { id: string; tekst: string; tid: string; gjentakelse: string | null; varslet: boolean }[])
    .map(r => ({ ...r, gjentakelse: (r.gjentakelse as Gjentakelse) ?? null }))
}

export async function leggTilReminderFor(
  parorendeId: string,
  mottakerId: string,
  tekst: string,
  tidISO: string,
  gjentakelse: Gjentakelse | null,
): Promise<{ reminder: NaerReminder | null; feil?: string }> {
  const sb = getSupabase()
  if (!sb) return { reminder: null, feil: 'Ikke koblet til database.' }
  const { data, error } = await sb
    .from('reminders')
    .insert({ user_id: mottakerId, opprettet_av: parorendeId, tekst, tid: tidISO, gjentakelse })
    .select('id, tekst, tid, gjentakelse, varslet')
    .single()
  if (error || !data) return { reminder: null, feil: error?.message }
  return { reminder: { ...data, gjentakelse: (data.gjentakelse as Gjentakelse) ?? null } }
}

type KvitteringRad = {
  id: string; reminder_id: string; tekst: string; planlagt: string
  levert: string | null; bekreftet: string | null; eskalert: boolean
}

function tilKvittering(k: KvitteringRad): Kvittering {
  return {
    id: k.id, reminderId: k.reminder_id, tekst: k.tekst, planlagt: k.planlagt,
    levert: k.levert, bekreftet: k.bekreftet, eskalert: Boolean(k.eskalert),
  }
}

// Siste kvittering per påminnelse (til statusvisning hos pårørende).
export async function hentSisteKvitteringer(reminderIds: string[]): Promise<Record<string, Kvittering>> {
  const sb = getSupabase()
  if (!sb || reminderIds.length === 0) return {}
  const { data } = await sb
    .from('kvitteringer')
    .select('id, reminder_id, tekst, planlagt, levert, bekreftet, eskalert')
    .in('reminder_id', reminderIds)
    .order('planlagt', { ascending: false })
  const kart: Record<string, Kvittering> = {}
  for (const rad of (data ?? []) as KvitteringRad[]) {
    if (!kart[rad.reminder_id]) kart[rad.reminder_id] = tilKvittering(rad)
  }
  return kart
}

// ── Mottaker-siden ───────────────────────────────────────────────────────────

// Mottakeren taster koden og samtykker. Kjøres som RPC (security definer).
export async function aksepterInvitasjon(kode: string): Promise<{ ok: boolean; feil?: string }> {
  const sb = getSupabase()
  if (!sb) return { ok: false, feil: 'Ikke koblet til database.' }
  const { error } = await sb.rpc('aksepter_invitasjon', { kode: kode.trim().toUpperCase() })
  if (error) {
    // Postgres-exceptions kommer som feilmelding – vis dem pent
    const melding = error.message.includes('Fant ingen')
      ? 'Fant ingen invitasjon med denne koden. Sjekk at den er riktig.'
      : error.message
    return { ok: false, feil: melding }
  }
  return { ok: true }
}

// Mottakerens egne kommende påminnelser (siste 12 t + fremover).
export async function hentMineHendelser(brukerId: string): Promise<NaerReminder[]> {
  const sb = getSupabase()
  if (!sb) return []
  const fra = new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString()
  const { data } = await sb
    .from('reminders')
    .select('id, tekst, tid, gjentakelse, varslet')
    .eq('user_id', brukerId)
    .gte('tid', fra)
    .order('tid', { ascending: true })
  return ((data ?? []) as { id: string; tekst: string; tid: string; gjentakelse: string | null; varslet: boolean }[])
    .map(r => ({ ...r, gjentakelse: (r.gjentakelse as Gjentakelse) ?? null }))
}

// Ubekreftede kvitteringer (forfalt, venter på «Ferdig ✓»). Maks 12 t gamle –
// skjermen skal hjelpe, ikke mase om gårsdagen.
export async function hentVentendeKvitteringer(brukerId: string): Promise<Kvittering[]> {
  const sb = getSupabase()
  if (!sb) return []
  const fra = new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString()
  const { data } = await sb
    .from('kvitteringer')
    .select('id, reminder_id, tekst, planlagt, levert, bekreftet, eskalert')
    .eq('user_id', brukerId)
    .is('bekreftet', null)
    .gte('planlagt', fra)
    .order('planlagt', { ascending: true })
  return ((data ?? []) as KvitteringRad[]).map(tilKvittering)
}

// «Ferdig ✓» på en levert påminnelse: tidsstempelet pårørende betaler for.
export async function bekreftKvittering(id: string): Promise<boolean> {
  const sb = getSupabase()
  if (!sb) return false
  const { error } = await sb
    .from('kvitteringer')
    .update({ bekreftet: new Date().toISOString() })
    .eq('id', id)
  return !error
}

// «Ferdig ✓» FØR cron-en har levert (mottakeren var tidlig ute): logg en
// bekreftet kvittering nå, og flytt/avslutt selve påminnelsen så cron-en
// ikke purrer på noe som alt er gjort.
export async function bekreftReminderTidlig(brukerId: string, rem: NaerReminder): Promise<boolean> {
  const sb = getSupabase()
  if (!sb) return false
  const naa = new Date().toISOString()
  const { error } = await sb.from('kvitteringer').insert({
    reminder_id: rem.id, user_id: brukerId, tekst: rem.tekst,
    planlagt: rem.tid, bekreftet: naa,
  })
  if (error) return false
  if (rem.gjentakelse) {
    await sb.from('reminders').update({ tid: nesteForekomst(rem.tid, rem.gjentakelse) }).eq('id', rem.id)
  } else {
    await sb.from('reminders').update({ varslet: true }).eq('id', rem.id)
  }
  return true
}

// Mottakerens kobling («Kari følger med på at alt er ok»). null = ingen.
export async function hentMinKobling(brukerId: string): Promise<Relasjon | null> {
  const sb = getSupabase()
  if (!sb) return null
  const { data } = await sb
    .from('relasjoner')
    .select('id, mottaker_id, mottaker_navn, invitasjonskode, status')
    .eq('mottaker_id', brukerId)
    .eq('status', 'aktiv')
    .limit(1)
    .maybeSingle()
  return data ? tilRelasjon(data as RelasjonRad) : null
}

// Lokal merking av at denne enheten er en mottaker-skjerm
const MODUS_NOKKEL = 'naer:modus'
export function erMottakerEnhet(): boolean {
  if (typeof window === 'undefined') return false
  return localStorage.getItem(MODUS_NOKKEL) === 'mottaker'
}
export function settMottakerEnhet(paa: boolean): void {
  if (paa) localStorage.setItem(MODUS_NOKKEL, 'mottaker')
  else localStorage.removeItem(MODUS_NOKKEL)
}
