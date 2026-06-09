import { getSupabase } from './supabaseClient'

// Brukerens assistent-profil. Lagres i Supabase-tabellen `profiles` (én rad per
// bruker, beskyttet av RLS). Vokser senere med sone, apparater, vaner osv.
export type AssistentProfil = {
  navn: string
  vilStrom: boolean
  vilVaer: boolean
  tommedag: number | null // ukedag søpla tømmes (0=søn..6=lør), null = ikke satt
  stilleFra: number // time (0-23) varsler IKKE sendes fra
  stilleTil: number // time (0-23) varsler IKKE sendes til
}

export const STD_PROFIL: AssistentProfil = {
  navn: '', vilStrom: true, vilVaer: true, tommedag: null, stilleFra: 22, stilleTil: 7,
}

// Henter profilen til en bruker. null = ingen rad (ikke konfigurert ennå).
export async function hentProfil(brukerId: string): Promise<AssistentProfil | null> {
  const sb = getSupabase()
  if (!sb) return null
  const { data, error } = await sb
    .from('profiles')
    .select('navn, vil_strom, vil_vaer, tommedag, stille_fra, stille_til')
    .eq('id', brukerId)
    .maybeSingle()
  if (error || !data) return null
  return {
    navn: data.navn ?? '',
    vilStrom: data.vil_strom ?? true,
    vilVaer: data.vil_vaer ?? true,
    tommedag: data.tommedag ?? null,
    stilleFra: data.stille_fra ?? 22,
    stilleTil: data.stille_til ?? 7,
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
    stille_fra: p.stilleFra,
    stille_til: p.stilleTil,
    oppdatert: new Date().toISOString(),
  })
  return !error
}
