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

// ── Hilsener: bilder og varme ord til mottakerens skjerm ────────────────────

export type Hilsen = {
  id: string
  tekst: string
  bildeUrl: string | null // signert URL (privat bøtte), null for ren teksthilsen
  opprettet: string
}

// Krymper et bilde i nettleseren før opplasting. Mobilbilder er gjerne
// 5–10 MB – skjermen trenger en brøkdel. Grensen er 2048 px på lengste side:
// nok til at bildet er skarpt i fullskjerm på en moderne mobil/nettbrett
// (fotorammen viser det i hele skjermhøyden), uten å bli tungt å laste.
// Bilder som alt er mindre skaleres ALDRI opp.
async function komprimerBilde(fil: File): Promise<Blob> {
  const bitmap = await createImageBitmap(fil)
  const maks = 2048
  const skala = Math.min(1, maks / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bitmap.width * skala)
  canvas.height = Math.round(bitmap.height * skala)
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  bitmap.close()
  const blob = await new Promise<Blob | null>(r => canvas.toBlob(r, 'image/jpeg', 0.85))
  return blob ?? fil
}

// Sender en hilsen (tekst og/eller bilde) til mottakerens skjerm.
export async function sendHilsen(
  avsenderId: string,
  mottakerId: string,
  tekst: string,
  bilde: File | null,
): Promise<{ ok: boolean; feil?: string }> {
  const sb = getSupabase()
  if (!sb) return { ok: false, feil: 'Ikke koblet til database.' }
  if (!tekst.trim() && !bilde) return { ok: false, feil: 'Skriv noe eller velg et bilde.' }

  let bildePath: string | null = null
  if (bilde) {
    bildePath = `${mottakerId}/${crypto.randomUUID()}.jpg`
    const komprimert = await komprimerBilde(bilde)
    const { error } = await sb.storage
      .from('hilsener')
      .upload(bildePath, komprimert, { contentType: 'image/jpeg' })
    if (error) return { ok: false, feil: `Fikk ikke lastet opp bildet: ${error.message}` }
  }

  const { error } = await sb.from('hilsener').insert({
    mottaker_id: mottakerId, avsender_id: avsenderId, tekst: tekst.trim(), bilde_path: bildePath,
  })
  if (error) {
    // Ikke la et foreldreløst bilde ligge igjen hvis raden feilet
    if (bildePath) await sb.storage.from('hilsener').remove([bildePath])
    return { ok: false, feil: error.message }
  }
  return { ok: true }
}

// Henter de siste hilsenene med signerte bilde-URL-er (gyldige i 6 timer –
// skjermen henter ferske lenker lenge før de utløper).
export async function hentHilsener(mottakerId: string, antall = 10): Promise<Hilsen[]> {
  const sb = getSupabase()
  if (!sb) return []
  const { data } = await sb
    .from('hilsener')
    .select('id, tekst, bilde_path, opprettet')
    .eq('mottaker_id', mottakerId)
    .order('opprettet', { ascending: false })
    .limit(antall)
  const rader = (data ?? []) as { id: string; tekst: string; bilde_path: string | null; opprettet: string }[]
  if (rader.length === 0) return []

  const stier = rader.filter(r => r.bilde_path).map(r => r.bilde_path as string)
  const urlKart: Record<string, string> = {}
  if (stier.length > 0) {
    const { data: signerte } = await sb.storage.from('hilsener').createSignedUrls(stier, 6 * 60 * 60)
    for (const s of signerte ?? []) {
      if (s.signedUrl && s.path) urlKart[s.path] = s.signedUrl
    }
  }
  return rader.map(r => ({
    id: r.id,
    tekst: r.tekst,
    bildeUrl: r.bilde_path ? (urlKart[r.bilde_path] ?? null) : null,
    opprettet: r.opprettet,
  }))
}

// ── «Alt ok»-puls: frivillig god morgen-knapp ────────────────────────────────

// Mottakeren sier «alt er bra» med ett trykk. Returnerer false ved feil.
export async function sendPuls(brukerId: string): Promise<boolean> {
  const sb = getSupabase()
  if (!sb) return false
  const { error } = await sb.from('pulser').insert({ user_id: brukerId })
  return !error
}

// Siste puls for en bruker (mottakers egen knapp-status / pårørendes prikk).
export async function hentSistePuls(brukerId: string): Promise<string | null> {
  const sb = getSupabase()
  if (!sb) return null
  const { data } = await sb
    .from('pulser')
    .select('opprettet')
    .eq('user_id', brukerId)
    .order('opprettet', { ascending: false })
    .limit(1)
    .maybeSingle()
  return (data as { opprettet: string } | null)?.opprettet ?? null
}

// ── Nærvær: «sist innom» + hjerte tilbake ───────────────────────────────────

// Mottakerskjermen melder at den er i bruk. Setter varslet=false igjen, så en
// eventuell stillhets-beskjed re-armes når hun er innom.
export async function registrerNaervaer(brukerId: string): Promise<void> {
  const sb = getSupabase()
  if (!sb) return
  await sb.from('naervaer').upsert(
    { user_id: brukerId, sist_aktiv: new Date().toISOString(), varslet: false },
    { onConflict: 'user_id' },
  )
}

// Pårørende leser «sist innom» (ISO-tid, eller null hvis aldri vært innom).
export async function hentNaervaer(mottakerId: string): Promise<string | null> {
  const sb = getSupabase()
  if (!sb) return null
  const { data } = await sb.from('naervaer').select('sist_aktiv').eq('user_id', mottakerId).maybeSingle()
  return (data as { sist_aktiv: string } | null)?.sist_aktiv ?? null
}

// Et raskt hjerte tilbake til mottakerens skjerm (gjenbruker hilsener).
export async function sendHjerte(parorendeId: string, mottakerId: string): Promise<boolean> {
  const { ok } = await sendHilsen(parorendeId, mottakerId, 'Glad i deg ❤️', null)
  return ok
}

// ── Familie-deling: inviter søsken til samme mottaker ───────────────────────

export async function lagFamiliekode(
  parorendeId: string,
  mottakerId: string,
  mottakerNavn: string,
): Promise<{ kode: string | null; feil?: string }> {
  const sb = getSupabase()
  if (!sb) return { kode: null, feil: 'Ikke koblet til database.' }
  for (let forsok = 0; forsok < 3; forsok++) {
    const kode = lagKode()
    const { error } = await sb.from('familieinvitasjoner').insert({
      kode, mottaker_id: mottakerId, mottaker_navn: mottakerNavn, opprettet_av: parorendeId,
    })
    if (!error) return { kode }
    if (!error.message.includes('duplicate')) return { kode: null, feil: error.message }
  }
  return { kode: null, feil: 'Kunne ikke lage kode. Prøv igjen.' }
}

// Et søsken taster familiekoden → egen aktiv relasjon til samme mottaker.
export async function aksepterFamiliekode(kode: string): Promise<{ navn: string | null; feil?: string }> {
  const sb = getSupabase()
  if (!sb) return { navn: null, feil: 'Ikke koblet til database.' }
  const { data, error } = await sb.rpc('aksepter_familiekode', { kode: kode.trim().toUpperCase() })
  if (error) return { navn: null, feil: error.message }
  const rad = (data as { mottaker_navn: string }[] | null)?.[0]
  return { navn: rad?.mottaker_navn ?? '' }
}

// ── Fjernkonfigurasjon: sted (vær/strøm-sone) for mottakerens skjerm ─────────

export const NAER_SONER = [
  { kode: 'NO1', navn: 'Østlandet (Oslo)' },
  { kode: 'NO2', navn: 'Sørlandet (Kristiansand)' },
  { kode: 'NO3', navn: 'Midt-Norge (Trondheim)' },
  { kode: 'NO4', navn: 'Nord-Norge (Tromsø)' },
  { kode: 'NO5', navn: 'Vestlandet (Bergen)' },
] as const

export async function settMottakerZone(mottakerId: string, zone: string): Promise<boolean> {
  const sb = getSupabase()
  if (!sb) return false
  const { error } = await sb.rpc('sett_mottaker_zone', { mottaker: mottakerId, ny_zone: zone })
  return !error
}

// Mottakerens lagrede sone (les egen profil); pårørende kan også lese via RLS? Nei –
// profiles er privat, så pårørende husker valget lokalt. Mottakerskjermen leser denne.
export async function hentMinZone(brukerId: string): Promise<string | null> {
  const sb = getSupabase()
  if (!sb) return null
  const { data } = await sb.from('profiles').select('zone').eq('id', brukerId).maybeSingle()
  return (data as { zone: string | null } | null)?.zone ?? null
}

// ── Felles omsorgslogg: alt familien gjør rundt personen, ett sted ───────────

export type LoggInnslag = {
  id: string
  tid: string // ISO
  tekst: string
  type: 'bekreftet' | 'levert' | 'hilsen' | 'puls'
}

// Bygges av data familien alt kan se (RLS): kvitteringer + hilsener + pulser.
export async function hentOmsorgslogg(mottakerId: string, antall = 12): Promise<LoggInnslag[]> {
  const sb = getSupabase()
  if (!sb) return []
  const fra = new Date(Date.now() - 14 * 86_400_000).toISOString()

  const [kvitteringer, hilsener, pulser] = await Promise.all([
    sb.from('kvitteringer')
      .select('id, tekst, planlagt, levert, bekreftet')
      .eq('user_id', mottakerId).gte('opprettet', fra)
      .order('opprettet', { ascending: false }).limit(antall),
    sb.from('hilsener')
      .select('id, tekst, bilde_path, opprettet')
      .eq('mottaker_id', mottakerId).gte('opprettet', fra)
      .order('opprettet', { ascending: false }).limit(antall),
    sb.from('pulser')
      .select('id, opprettet')
      .eq('user_id', mottakerId).gte('opprettet', fra)
      .order('opprettet', { ascending: false }).limit(antall),
  ])

  const innslag: LoggInnslag[] = []
  for (const k of (kvitteringer.data ?? []) as { id: string; tekst: string; planlagt: string; levert: string | null; bekreftet: string | null }[]) {
    if (k.bekreftet) innslag.push({ id: `k${k.id}`, tid: k.bekreftet, tekst: `Bekreftet «${k.tekst}» ✓`, type: 'bekreftet' })
    else innslag.push({ id: `k${k.id}`, tid: k.levert ?? k.planlagt, tekst: `«${k.tekst}» – ikke bekreftet ennå`, type: 'levert' })
  }
  for (const h of (hilsener.data ?? []) as { id: string; tekst: string; bilde_path: string | null; opprettet: string }[]) {
    innslag.push({
      id: `h${h.id}`, tid: h.opprettet, type: 'hilsen',
      tekst: h.bilde_path ? `Familien sendte et bilde${h.tekst ? `: «${h.tekst}»` : ''}` : `Hilsen: «${h.tekst}»`,
    })
  }
  for (const p of (pulser.data ?? []) as { id: string; opprettet: string }[]) {
    innslag.push({ id: `p${p.id}`, tid: p.opprettet, tekst: 'Sa at alt er bra ☀️', type: 'puls' })
  }
  return innslag.sort((a, b) => b.tid.localeCompare(a.tid)).slice(0, antall)
}

// ── Ukentlige trygghetsrapporter ─────────────────────────────────────────────

export type Rapport = { uke: string; tekst: string; opprettet: string }

export async function hentSisteRapport(relasjonId: string): Promise<Rapport | null> {
  const sb = getSupabase()
  if (!sb) return null
  const { data } = await sb
    .from('rapporter')
    .select('uke, tekst, opprettet')
    .eq('relasjon_id', relasjonId)
    .order('opprettet', { ascending: false })
    .limit(1)
    .maybeSingle()
  return (data as Rapport | null) ?? null
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
