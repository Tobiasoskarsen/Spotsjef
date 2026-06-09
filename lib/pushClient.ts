// Klient-side hjelpere for push-abonnement (kjører i nettleseren).
const VAPID_PUBLIC = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY

function base64TilUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4)
  const b64 = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(b64)
  const arr = new Uint8Array(new ArrayBuffer(raw.length))
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i)
  return arr
}

// Sant hvis nettleseren + oppsettet støtter push
export function pushStottes(): boolean {
  return Boolean(
    VAPID_PUBLIC &&
      typeof window !== 'undefined' &&
      'serviceWorker' in navigator &&
      'PushManager' in window &&
      'Notification' in window,
  )
}

// Abonnerer på push og sender abonnementet + grensen til serveren.
// Returnerer true ved suksess.
export async function abonnerPaaPush(grense: number, zone: string): Promise<boolean> {
  if (!pushStottes()) return false
  try {
    const tillatelse = await Notification.requestPermission()
    if (tillatelse !== 'granted') return false

    const reg = await navigator.serviceWorker.ready
    const sub =
      (await reg.pushManager.getSubscription()) ??
      (await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: base64TilUint8Array(VAPID_PUBLIC as string),
      }))

    const res = await fetch('/api/push/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sub, grense, zone }),
    })
    return res.ok
  } catch {
    return false
  }
}

// Avslutter push-abonnementet (lokalt + på serveren).
export async function avsluttPush(): Promise<void> {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return
  try {
    const reg = await navigator.serviceWorker.ready
    const sub = await reg.pushManager.getSubscription()
    if (sub) {
      await fetch('/api/push/unsubscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ endpoint: sub.endpoint }),
      })
      await sub.unsubscribe()
    }
  } catch {
    // Ignorer – avslutting er best-effort
  }
}
