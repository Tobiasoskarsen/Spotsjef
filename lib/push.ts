import webpush from 'web-push'
import { Redis } from '@upstash/redis'

export type PushAbonnement = {
  sub: { endpoint: string; keys: { p256dh: string; auth: string } }
  grense: number // øre/kWh – varsle når prisen går under
  zone: string
  varslet: boolean // har vi allerede varslet i denne billig-perioden?
}

// Støtter både Vercel KV- og Upstash-navngivning på miljøvariablene
const REDIS_URL = process.env.KV_REST_API_URL ?? process.env.UPSTASH_REDIS_REST_URL
const REDIS_TOKEN = process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN
const VAPID_PUBLIC = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY

const SUBS_KEY = 'flyt:abonnement'

// Sant kun hvis alt er satt opp (nøkler + lagring). Lar appen fungere uten.
export function pushKonfigurert(): boolean {
  return Boolean(REDIS_URL && REDIS_TOKEN && VAPID_PUBLIC && VAPID_PRIVATE)
}

let redis: Redis | null = null
function getRedis(): Redis | null {
  if (!REDIS_URL || !REDIS_TOKEN) return null
  if (!redis) redis = new Redis({ url: REDIS_URL, token: REDIS_TOKEN })
  return redis
}

if (VAPID_PUBLIC && VAPID_PRIVATE) {
  webpush.setVapidDetails('mailto:hei@flyt.app', VAPID_PUBLIC, VAPID_PRIVATE)
}

export async function lagreAbonnement(a: PushAbonnement): Promise<void> {
  const r = getRedis()
  if (!r) return
  await r.hset(SUBS_KEY, { [a.sub.endpoint]: a })
}

export async function slettAbonnement(endpoint: string): Promise<void> {
  const r = getRedis()
  if (!r) return
  await r.hdel(SUBS_KEY, endpoint)
}

export async function hentAlleAbonnement(): Promise<PushAbonnement[]> {
  const r = getRedis()
  if (!r) return []
  const alle = await r.hgetall<Record<string, PushAbonnement>>(SUBS_KEY)
  return alle ? Object.values(alle) : []
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
