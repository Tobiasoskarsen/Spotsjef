import webpush from 'web-push'
import { createClient, SupabaseClient } from '@supabase/supabase-js'

export type PushAbonnement = {
  sub: { endpoint: string; keys: { p256dh: string; auth: string } }
  grense: number // øre/kWh – varsle når prisen går under
  zone: string
  varslet: boolean // har vi allerede varslet i denne billig-perioden?
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
type Rad = { endpoint: string; p256dh: string; auth: string; grense: number; zone: string; varslet: boolean }

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
