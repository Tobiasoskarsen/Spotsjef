import { createClient, SupabaseClient } from '@supabase/supabase-js'

// Intern kostnadslogg for AI-kall. KUN server-side (service-role-nøkkel).
// Lagrer faktisk token-bruk fra Anthropics `usage`-felt, så scripts/ai-kostnad.mjs
// kan regne ut reelle kroner. Loggingen er best-effort: den skal ALDRI kaste
// eller blokkere en ekte handling (en påminnelse er viktigere enn en logglinje).

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

let db: SupabaseClient | null = null
function getDb(): SupabaseClient | null {
  if (!URL || !KEY) return null
  if (!db) db = createClient(URL, KEY, { auth: { persistSession: false } })
  return db
}

export async function loggAiBruk(
  modell: string,
  innTokens: number,
  utTokens: number,
  formaal: string,
): Promise<void> {
  try {
    const r = getDb()
    if (!r) return
    await r.from('ai_bruk').insert({
      modell,
      inn_tokens: innTokens,
      ut_tokens: utTokens,
      formaal,
    })
  } catch {
    // Svelg – kostnadslogging er aldri verdt å feile en ekte handling for.
  }
}
