import webpush from 'web-push'
import { createClient, SupabaseClient } from '@supabase/supabase-js'

export type PushAbonnement = {
  sub: { endpoint: string; keys: { p256dh: string; auth: string } }
  grense: number // øre/kWh – varsle når prisen går under
  zone: string
  varslet: boolean // har vi allerede varslet i denne billig-perioden?
  userId?: string | null // kobler abonnementet til en bruker (assistent-påminnelser)
  soppVarslet?: string | null // dato (YYYY-MM-DD) sist søppel-påminnelse ble sendt
}

// Lagring i Supabase (Postgres). Valgt fordi appen skal vokse til en
// assistent med påminnelser/gjøremål – relasjonsdata som passer SQL.
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const VAPID_PUBLIC = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:hei@flyt.app'

const TABELL = 'push_subscriptions'

// Sant kun hvis alt er satt opp (VAPID-nøkler + Supabase). Lar appen fungere uten.
export function pushKonfigurert(): boolean {
  return Boolean(SUPABASE_URL && SUPABASE_KEY && VAPID_PUBLIC && VAPID_PRIVATE)
}

let db: SupabaseClient | null = null
function getDb(): SupabaseClient | null {
  if (!SUPABASE_URL || !SUPABASE_KEY) return null
  if (!db) db = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false } })
  return db
}

if (VAPID_PUBLIC && VAPID_PRIVATE) {
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC, VAPID_PRIVATE)
}

// En databaserad mappes til/fra PushAbonnement-formen resten av koden bruker.
type Rad = {
  endpoint: string; p256dh: string; auth: string; grense: number; zone: string
  varslet: boolean; user_id?: string | null; sopp_varslet?: string | null
}

function tilRad(a: PushAbonnement): Rad {
  return {
    endpoint: a.sub.endpoint,
    p256dh: a.sub.keys.p256dh,
    auth: a.sub.keys.auth,
    grense: a.grense,
    zone: a.zone,
    varslet: a.varslet,
  }
}

function fraRad(r: Rad): PushAbonnement {
  return {
    sub: { endpoint: r.endpoint, keys: { p256dh: r.p256dh, auth: r.auth } },
    grense: Number(r.grense) || 0,
    zone: r.zone,
    varslet: Boolean(r.varslet),
    userId: r.user_id ?? null,
    soppVarslet: r.sopp_varslet ?? null,
  }
}

export async function lagreAbonnement(a: PushAbonnement): Promise<void> {
  const r = getDb()
  if (!r) return
  await r.from(TABELL).upsert(tilRad(a), { onConflict: 'endpoint' })
}

export async function slettAbonnement(endpoint: string): Promise<void> {
  const r = getDb()
  if (!r) return
  await r.from(TABELL).delete().eq('endpoint', endpoint)
}

export async function hentAlleAbonnement(): Promise<PushAbonnement[]> {
  const r = getDb()
  if (!r) return []
  const { data } = await r.from(TABELL).select('*')
  return ((data as Rad[]) ?? []).map(fraRad)
}

// Kobler et abonnement (enhet) til en bruker. Delvis upsert: rører kun
// user_id (+ nøkler), så grense/zone/varslet/sopp_varslet beholdes om de finnes.
export async function koblBruker(
  sub: { endpoint: string; keys: { p256dh: string; auth: string } },
  userId: string,
): Promise<void> {
  const r = getDb()
  if (!r) return
  await r.from(TABELL).upsert(
    { endpoint: sub.endpoint, p256dh: sub.keys.p256dh, auth: sub.keys.auth, user_id: userId },
    { onConflict: 'endpoint' },
  )
}

export type VarselProfil = { tommedag: number | null; stilleFra: number; stilleTil: number }

// Henter varsel-relevant profil per bruker (tømmedag + stilletimer) for cron-en.
export async function hentVarselProfiler(userIds: string[]): Promise<Record<string, VarselProfil>> {
  const r = getDb()
  if (!r || userIds.length === 0) return {}
  const { data } = await r.from('profiles').select('id, tommedag, stille_fra, stille_til').in('id', userIds)
  const kart: Record<string, VarselProfil> = {}
  for (const row of (data ?? []) as { id: string; tommedag: number | null; stille_fra: number | null; stille_til: number | null }[]) {
    kart[row.id] = {
      tommedag: row.tommedag ?? null,
      stilleFra: row.stille_fra ?? 22,
      stilleTil: row.stille_til ?? 7,
    }
  }
  return kart
}

// Markerer at søppel-påminnelse er sendt for en gitt dato (debounce).
export async function settSoppVarslet(endpoint: string, dato: string): Promise<void> {
  const r = getDb()
  if (!r) return
  await r.from(TABELL).update({ sopp_varslet: dato }).eq('endpoint', endpoint)
}

// Egne påminnelser som har forfalt og ikke er varslet ennå.
export type ForfaltReminder = { id: string; user_id: string; tekst: string }
export async function hentForfalteReminder(): Promise<ForfaltReminder[]> {
  const r = getDb()
  if (!r) return []
  const { data } = await r
    .from('reminders')
    .select('id, user_id, tekst')
    .lte('tid', new Date().toISOString())
    .eq('varslet', false)
  return (data ?? []) as ForfaltReminder[]
}

export async function merkReminderVarslet(id: string): Promise<void> {
  const r = getDb()
  if (!r) return
  await r.from('reminders').update({ varslet: true }).eq('id', id)
}

// Sender ett varsel. Returnerer true ved suksess. Fjerner utløpte abonnement.
export async function sendVarsel(a: PushAbonnement, tittel: string, tekst: string): Promise<boolean> {
  try {
    await webpush.sendNotification(a.sub, JSON.stringify({ title: tittel, body: tekst }))
    return true
  } catch (e: unknown) {
    const status = (e as { statusCode?: number })?.statusCode
    if (status === 404 || status === 410) {
      await slettAbonnement(a.sub.endpoint) // abonnementet finnes ikke lenger
    }
    return false
  }
}
