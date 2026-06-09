'use client'
import { useEffect, useState } from 'react'
import { getSupabase } from './supabaseClient'

// Sørger for at hver besøkende har en stabil bruker-id via Supabase Auth.
// Strategi: ANONYM innlogging ved første åpning (null friksjon, ingen e-post).
// Kontoen kan oppgraderes til e-post/Google senere UTEN å miste data – samme id.
// Hvis Supabase ikke er konfigurert eller anonym innlogging ikke er skrudd på,
// blir brukerId null og appen faller pent tilbake på localStorage.
export function useBruker() {
  const [brukerId, setBrukerId] = useState<string | null>(null)
  const [laster, setLaster] = useState(true)

  useEffect(() => {
    const sb = getSupabase()
    if (!sb) {
      setLaster(false)
      return
    }
    let aktiv = true

    ;(async () => {
      try {
        const { data } = await sb.auth.getSession()
        let uid = data.session?.user?.id ?? null
        if (!uid) {
          const { data: anon } = await sb.auth.signInAnonymously()
          uid = anon?.user?.id ?? null
        }
        if (aktiv) setBrukerId(uid)
      } catch {
        // Anonym innlogging ikke aktivert e.l. – degrader til localStorage
      } finally {
        if (aktiv) setLaster(false)
      }
    })()

    const { data: lytter } = sb.auth.onAuthStateChange((_event, session) => {
      if (aktiv) setBrukerId(session?.user?.id ?? null)
    })

    return () => {
      aktiv = false
      lytter.subscription.unsubscribe()
    }
  }, [])

  return { brukerId, laster }
}
