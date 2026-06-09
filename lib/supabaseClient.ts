import { createClient, SupabaseClient } from '@supabase/supabase-js'

// Browser-klient for Supabase (bruker den OFFENTLIGE anon/publishable-nøkkelen –
// trygg i nettleseren). Server-siden bruker service-role-nøkkelen i lib/push.ts.
// Returnerer null hvis env mangler, så appen degraderer pent (faller tilbake på
// localStorage) uten å krasje.
const URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

let klient: SupabaseClient | null = null

export function getSupabase(): SupabaseClient | null {
  if (!URL || !ANON) return null
  if (!klient) {
    klient = createClient(URL, ANON, {
      // detectSessionInUrl: fanger opp magic-link/OAuth-retur i URL-en
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
    })
  }
  return klient
}

export function supabaseAktiv(): boolean {
  return Boolean(URL && ANON)
}
