import { getSupabase } from './supabaseClient'

// Brukerens assistent-profil. Lagres i Supabase-tabellen `profiles` (én rad per
// bruker, beskyttet av RLS). Vokser senere med sone, apparater, vaner osv.
export type AssistentProfil = {
  navn: string
  vilStrom: boolean
  vilVaer: boolean
  tommedag: number | null // ukedag søpla tømmes (0=søn..6=lør), null = ikke satt
}

export const STD_PROFIL: AssistentProfil = { navn: '', vilStrom: true, vilVaer: true, tommedag: null }

// Henter profilen til en bruker. null = ingen rad (ikke konfigurert ennå).
export async function hentProfil(brukerId: string): Promise<AssistentProfil | null> {
  const sb = getSupabase()
  if (!sb) return null
  const { data, error } = await sb
    .from('profiles')
    .select('navn, vil_strom, vil_vaer, tommedag')
    .eq('id', brukerId)
    .maybeSingle()
  if (error || !data) return null
  return {
    navn: data.navn ?? '',
    vilStrom: data.vil_strom ?? true,
    vilVaer: data.vil_vaer ?? true,
    tommedag: data.tommedag ?? null,
  }
}

// Lagrer (oppretter eller oppdaterer) profilen.
export async function lagreProfil(brukerId: string, p: AssistentProfil): Promise<boolean> {
  const sb = getSupabase()
  if (!sb) return false
  const { error } = await sb.from('profiles').upsert({
    id: brukerId,
    navn: p.navn,
    vil_strom: p.vilStrom,
    vil_vaer: p.vilVaer,
    tommedag: p.tommedag,
    oppdatert: new Date().toISOString(),
  })
  return !error
}
