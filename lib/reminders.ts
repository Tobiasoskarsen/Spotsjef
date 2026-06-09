import { getSupabase } from './supabaseClient'

// Brukerens egne påminnelser/hendelser (egen kalender). Lagres i Supabase med
// RLS, så hver bruker ser kun sine egne. Pushes ved forfall via cron-en.
export type Reminder = {
  id: string
  tekst: string
  tid: string // ISO timestamptz
  varslet: boolean
}

// Henter kommende påminnelser (forfaller nå eller senere), tidligst først.
export async function hentReminder(brukerId: string): Promise<Reminder[]> {
  const sb = getSupabase()
  if (!sb) return []
  // Ta med litt bakover i tid også, så ferske/akkurat forfalte vises i dag
  const fra = new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString()
  const { data, error } = await sb
    .from('reminders')
    .select('id, tekst, tid, varslet')
    .eq('user_id', brukerId)
    .gte('tid', fra)
    .order('tid', { ascending: true })
  if (error || !data) return []
  return data as Reminder[]
}

// Oppretter en påminnelse. Returnerer raden ved suksess.
export async function leggTilReminder(brukerId: string, tekst: string, tidISO: string): Promise<Reminder | null> {
  const sb = getSupabase()
  if (!sb) return null
  const { data, error } = await sb
    .from('reminders')
    .insert({ user_id: brukerId, tekst, tid: tidISO })
    .select('id, tekst, tid, varslet')
    .single()
  if (error || !data) return null
  return data as Reminder
}

export async function slettReminder(id: string): Promise<void> {
  const sb = getSupabase()
  if (!sb) return
  await sb.from('reminders').delete().eq('id', id)
}
