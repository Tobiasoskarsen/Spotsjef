'use client'
import { useEffect, useState } from 'react'
import type { User } from '@supabase/supabase-js'
import { getSupabase } from '@/lib/supabaseClient'
import { Tema } from '@/lib/theme'

// Fase 7: kontooppgradering. Brukeren starter som anonym (data i skyen, kun denne
// enheten). Her kan hen koble på e-post – da beholdes ALT, og man kan logge inn
// på andre enheter med en innloggingslenke. Ingen passord.
export default function Konto({ tema }: { tema: Tema }) {
  const [bruker, setBruker] = useState<User | null>(null)
  const [laster, setLaster] = useState(true)
  const [epost, setEpost] = useState('')
  const [melding, setMelding] = useState('')
  const [feil, setFeil] = useState('')
  const [jobber, setJobber] = useState(false)
  const [visInnlogging, setVisInnlogging] = useState(false)

  useEffect(() => {
    const sb = getSupabase()
    if (!sb) { setLaster(false); return }
    let aktiv = true
    sb.auth.getUser().then(({ data }) => { if (aktiv) { setBruker(data.user); setLaster(false) } })
    const { data: lytter } = sb.auth.onAuthStateChange((_e, session) => {
      if (aktiv) setBruker(session?.user ?? null)
    })
    return () => { aktiv = false; lytter.subscription.unsubscribe() }
  }, [])

  if (laster) return null

  const sb = getSupabase()
  const kortStil: React.CSSProperties = {
    background: tema.cardBg, borderRadius: '18px', padding: '18px', marginBottom: '14px',
    boxShadow: tema.skygge, border: `1px solid ${tema.border}`,
  }
  const merkelapp: React.CSSProperties = {
    fontSize: '11px', color: tema.subtekst, margin: '0 0 10px',
    textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 700,
  }
  const inputStil: React.CSSProperties = {
    width: '100%', padding: '12px 14px', borderRadius: '14px', border: `1px solid ${tema.border}`,
    background: tema.inputBg, color: tema.tekst, fontSize: '14px', fontFamily: 'inherit', outline: 'none',
  }
  const primKnapp: React.CSSProperties = {
    padding: '12px 16px', borderRadius: '14px', border: 'none', background: tema.accentBg,
    color: '#fff', cursor: jobber ? 'default' : 'pointer', fontSize: '14px', fontWeight: 700,
    fontFamily: 'inherit', opacity: jobber ? 0.7 : 1,
  }

  if (!sb) {
    return (
      <div style={kortStil}>
        <p style={merkelapp}>Konto</p>
        <p style={{ fontSize: '13px', color: tema.subtekst, margin: 0 }}>Innlogging er ikke satt opp i denne versjonen.</p>
      </div>
    )
  }

  const innlogget = bruker && !bruker.is_anonymous && bruker.email

  async function koblEpost() {
    if (!epost.trim() || !sb) return
    setJobber(true); setFeil(''); setMelding('')
    try {
      const { error } = await sb.auth.updateUser(
        { email: epost.trim() },
        { emailRedirectTo: window.location.origin },
      )
      if (error) setFeil(error.message)
      else setMelding('Sjekk e-posten din og bekreft – da er kontoen koblet til, og du beholder alt på nye enheter.')
    } catch {
      setFeil('Noe gikk galt. Prøv igjen.')
    }
    setJobber(false)
  }

  async function loggInn() {
    if (!epost.trim() || !sb) return
    setJobber(true); setFeil(''); setMelding('')
    try {
      const { error } = await sb.auth.signInWithOtp({
        email: epost.trim(),
        options: { emailRedirectTo: window.location.origin },
      })
      if (error) setFeil(error.message)
      else setMelding('Innloggingslenke sendt! Åpne den på denne enheten for å logge inn.')
    } catch {
      setFeil('Noe gikk galt. Prøv igjen.')
    }
    setJobber(false)
  }

  async function loggUt() {
    if (!sb) return
    await sb.auth.signOut()
    setMelding(''); setFeil(''); setEpost('')
  }

  return (
    <div style={kortStil}>
      <p style={merkelapp}>Konto</p>

      {innlogget ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
          <div>
            <p style={{ fontSize: '15px', fontWeight: 700, color: tema.tekst, margin: '0 0 2px' }}>Innlogget ✓</p>
            <p style={{ fontSize: '13px', color: tema.subtekst, margin: 0 }}>{bruker!.email}</p>
          </div>
          <button type="button" onClick={loggUt} style={{ padding: '10px 14px', borderRadius: '12px', border: `1px solid ${tema.border}`, background: tema.inputBg, color: tema.subtekst, cursor: 'pointer', fontSize: '13px', fontWeight: 600, fontFamily: 'inherit' }}>
            Logg ut
          </button>
        </div>
      ) : (
        <>
          <p style={{ fontSize: '15px', fontWeight: 700, color: tema.tekst, margin: '0 0 4px' }}>Gjest – kun denne enheten</p>
          <p style={{ fontSize: '13px', color: tema.subtekst, margin: '0 0 14px', lineHeight: 1.6 }}>
            {visInnlogging
              ? 'Skriv inn e-posten du brukte før, så sender vi en innloggingslenke.'
              : 'Koble på e-post for å beholde profilen din og bruke den på flere enheter. Ingen passord.'}
          </p>
          <div style={{ display: 'grid', gap: '10px' }}>
            <input type="email" value={epost} onChange={e => setEpost(e.target.value)} placeholder="din@epost.no" style={inputStil} />
            <button type="button" onClick={visInnlogging ? loggInn : koblEpost} disabled={jobber} style={primKnapp}>
              {jobber ? 'Sender …' : visInnlogging ? 'Send innloggingslenke' : 'Koble til e-post'}
            </button>
          </div>
          <button type="button" onClick={() => { setVisInnlogging(!visInnlogging); setMelding(''); setFeil('') }} style={{ marginTop: '10px', padding: 0, background: 'none', border: 'none', color: tema.subtekst, cursor: 'pointer', fontSize: '12px', fontFamily: 'inherit', textDecoration: 'underline' }}>
            {visInnlogging ? 'Tilbake' : 'Har du allerede konto? Logg inn'}
          </button>
        </>
      )}

      {melding && <p style={{ fontSize: '12px', color: tema.tekst, margin: '12px 0 0', lineHeight: 1.6 }}>{melding}</p>}
      {feil && <p style={{ fontSize: '12px', color: '#d1605f', margin: '12px 0 0' }}>{feil}</p>}
    </div>
  )
}
