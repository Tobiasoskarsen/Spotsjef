'use client'
import { useEffect, useState } from 'react'
import { Pris, Apparat } from '@/lib/types'
import { VaerTime } from '@/lib/vaer'
import { Tema } from '@/lib/theme'
import { useBruker } from '@/lib/bruker'
import { hentProfil, lagreProfil, AssistentProfil } from '@/lib/profil'
import { lagBrief } from '@/lib/assistent'
import { koblBrukerTilPush, pushStottes } from '@/lib/pushClient'
import AssistentOppsett from '@/components/AssistentOppsett'

// Hverdagsassistenten.
// Prinsipp: assistenten sier KUN ting den faktisk vet – fra ekte data
// (pris/vær/klokke) eller fra valg brukeren selv har gjort. Ingen oppdiktede
// påminnelser. Før brukeren har satt den opp, viser vi en invitasjon – ikke
// fyllstoff. Profil lagres i Supabase (anonym konto); faller tilbake på
// localStorage hvis Supabase ikke er konfigurert.

type AssistentConfig = AssistentProfil & { konfigurert: boolean }

const STD: AssistentConfig = { konfigurert: false, navn: '', vilStrom: true, vilVaer: true, tommedag: null, stilleFra: 22, stilleTil: 7 }
const LAGER_NOKKEL = 'flyt:assistent'

type Props = {
  vaer: VaerTime[]
  priser: Pris[]
  apparater?: Apparat[]
  tema: Tema
}

function hilsen(navn: string): string {
  const t = new Date().getHours()
  const tid = t < 5 ? 'God natt' : t < 10 ? 'God morgen' : t < 18 ? 'God dag' : 'God kveld'
  return navn.trim() ? `${tid}, ${navn.trim()}` : tid
}

export default function AssistentKort({ vaer, priser, apparater = [], tema }: Props) {
  const { brukerId, laster: lasterBruker } = useBruker()
  const [cfg, setCfg] = useState<AssistentConfig>(STD)
  const [lastet, setLastet] = useState(false)
  const [visOppsett, setVisOppsett] = useState(false)
  const [lagrer, setLagrer] = useState(false)
  const [aiSammendrag, setAiSammendrag] = useState('')
  const [lasterAi, setLasterAi] = useState(false)
  const [aiFeil, setAiFeil] = useState('')
  const [varslerPaa, setVarslerPaa] = useState(false)
  const [varslerLaster, setVarslerLaster] = useState(false)
  const [varslerFeil, setVarslerFeil] = useState('')

  useEffect(() => {
    setVarslerPaa(localStorage.getItem('flyt:varsler') === 'on')
  }, [])

  async function slaaPaaVarsler() {
    if (!brukerId) {
      setVarslerFeil('Krever innlogging (Supabase) – ikke satt opp ennå.')
      return
    }
    if (!pushStottes()) {
      setVarslerFeil('Nettleseren din støtter ikke varsler.')
      return
    }
    setVarslerLaster(true)
    setVarslerFeil('')
    const ok = await koblBrukerTilPush(brukerId)
    if (ok) {
      setVarslerPaa(true)
      localStorage.setItem('flyt:varsler', 'on')
    } else {
      setVarslerFeil('Du må tillate varsler for å få påminnelser.')
    }
    setVarslerLaster(false)
  }

  function lesLokal(): AssistentConfig | null {
    try {
      const lagret = localStorage.getItem(LAGER_NOKKEL)
      if (lagret) return { ...STD, ...JSON.parse(lagret) }
    } catch {
      // ugyldig lagret data
    }
    return null
  }

  // Last profil: Supabase er fasit når brukeren er innlogget (anonymt).
  // Finnes ingen sky-profil, migreres et evt. tidligere localStorage-oppsett opp.
  // Uten Supabase/innlogging faller vi pent tilbake på localStorage.
  useEffect(() => {
    if (lasterBruker) return
    let aktiv = true
    ;(async () => {
      if (brukerId) {
        const p = await hentProfil(brukerId)
        if (p) {
          if (aktiv) { setCfg({ ...p, konfigurert: true }); setLastet(true) }
          return
        }
        const lokal = lesLokal()
        if (lokal?.konfigurert) {
          await lagreProfil(brukerId, lokal) // engangsmigrering til skyen
          if (aktiv) { setCfg(lokal); setLastet(true) }
          return
        }
        if (aktiv) { setCfg(STD); setLastet(true) }
        return
      }
      const lokal = lesLokal()
      if (aktiv) { if (lokal) setCfg(lokal); setLastet(true) }
    })()
    return () => { aktiv = false }
  }, [brukerId, lasterBruker])

  async function lagreFraOppsett(p: AssistentProfil) {
    const ny: AssistentConfig = { ...p, konfigurert: true }
    setLagrer(true)
    if (brukerId) await lagreProfil(brukerId, p)
    else localStorage.setItem(LAGER_NOKKEL, JSON.stringify(ny))
    setCfg(ny)
    setLagrer(false)
    setVisOppsett(false)
  }

  // AI-laget (Fase 5): be Claude formulere punktene til en naturlig brief.
  // På forespørsel (knapp) – holder kostnad nede. AI finner aldri på noe.
  async function hentSammendrag(p: { tekst: string; kilde: string }[]) {
    setLasterAi(true)
    setAiFeil('')
    try {
      const res = await fetch('/api/assistent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ navn: cfg.navn, punkter: p }),
      })
      const data = await res.json()
      if (res.ok && data.tekst) setAiSammendrag(data.tekst)
      else setAiFeil(data.error || 'Kunne ikke lage oppsummering.')
    } catch {
      setAiFeil('Kunne ikke lage oppsummering akkurat nå.')
    }
    setLasterAi(false)
  }

  // Unngå hopp/feil innhold før vi vet hva som er lagret
  if (!lastet) return null

  const kortStil: React.CSSProperties = {
    background: tema.cardBg, borderRadius: '20px', padding: '22px',
    boxShadow: tema.skygge, border: `1px solid ${tema.border}`,
  }
  const merkelapp: React.CSSProperties = {
    fontSize: '11px', color: tema.subtekst, margin: '0 0 10px',
    textTransform: 'uppercase', letterSpacing: '0.12em', fontWeight: 700,
  }

  // ---- 1) Oppsett-veiviser (første gang via invitasjon, eller «Endre») ----
  if (visOppsett) {
    return (
      <AssistentOppsett
        start={{ navn: cfg.navn, vilStrom: cfg.vilStrom, vilVaer: cfg.vilVaer, tommedag: cfg.tommedag, stilleFra: cfg.stilleFra, stilleTil: cfg.stilleTil }}
        onLagre={lagreFraOppsett}
        onAvbryt={cfg.konfigurert ? () => setVisOppsett(false) : undefined}
        erRedigering={cfg.konfigurert}
        lagrer={lagrer}
        tema={tema}
      />
    )
  }

  // ---- 2) Invitasjon – før brukeren har satt opp noe ----
  if (!cfg.konfigurert) {
    return (
      <div style={kortStil}>
        <p style={merkelapp}>Assistent</p>
        <p style={{ fontSize: '17px', fontWeight: 700, color: tema.tekst, margin: '0 0 8px' }}>La Flyt hjelpe deg i hverdagen</p>
        <p style={{ fontSize: '13px', color: tema.subtekst, margin: '0 0 16px', lineHeight: 1.6 }}>
          Ingen tilfeldige forslag – bare det som bygger på dine valg og ekte data (strøm og vær). Fortell meg litt, så samler jeg det viktigste på ett sted.
        </p>
        <button type="button" onClick={() => setVisOppsett(true)} style={{ padding: '12px 18px', borderRadius: '14px', border: 'none', background: tema.accentBg, color: '#fff', cursor: 'pointer', fontSize: '14px', fontWeight: 700 }}>
          Sett opp assistenten
        </button>
      </div>
    )
  }

  // ---- 3) Konfigurert: ærlig brief fra regel-motoren (hvert punkt har kilde) ----
  const profil: AssistentProfil = { navn: cfg.navn, vilStrom: cfg.vilStrom, vilVaer: cfg.vilVaer, tommedag: cfg.tommedag, stilleFra: cfg.stilleFra, stilleTil: cfg.stilleTil }
  const punkter = lagBrief({ profil, priser, vaer, apparater }).slice(0, 4)
  const venterData = (cfg.vilStrom && priser.length === 0) || (cfg.vilVaer && vaer.length === 0)

  return (
    <div style={kortStil}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px', marginBottom: '12px' }}>
        <div>
          <p style={merkelapp}>Din assistent</p>
          <p style={{ fontSize: '18px', fontWeight: 700, color: tema.tekst, margin: 0 }}>{hilsen(cfg.navn)}</p>
        </div>
        <button type="button" onClick={() => setVisOppsett(true)} style={{ flexShrink: 0, padding: '8px 14px', borderRadius: '12px', border: `1px solid ${tema.border}`, background: tema.inputBg, color: tema.subtekst, cursor: 'pointer', fontSize: '12px', fontWeight: 600, fontFamily: 'inherit' }}>
          Endre
        </button>
      </div>

      {venterData && punkter.length === 0 ? (
        <p style={{ fontSize: '13px', color: tema.subtekst, margin: 0 }}>Henter dagens data …</p>
      ) : punkter.length > 0 ? (
        <div style={{ display: 'grid', gap: '10px' }}>
          {punkter.map((p, i) => (
            <div key={i} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', background: tema.inputBg, borderRadius: '14px', padding: '12px 14px' }}>
              <span style={{ fontSize: '18px', lineHeight: 1.3 }}>{p.emoji}</span>
              <span>
                <span style={{ display: 'block', fontSize: '14px', color: tema.tekst, lineHeight: 1.4 }}>{p.tekst}</span>
                <span style={{ display: 'block', fontSize: '11px', color: tema.subtekst, marginTop: '3px' }}>Kilde: {p.kilde}</span>
              </span>
            </div>
          ))}
        </div>
      ) : (
        <p style={{ fontSize: '13px', color: tema.subtekst, margin: 0 }}>
          Du har skrudd av både strøm- og vær-tips. Trykk «Endre» for å slå dem på igjen.
        </p>
      )}

      {cfg.tommedag !== null && (
        varslerPaa ? (
          <p style={{ fontSize: '12px', color: tema.subtekst, margin: '14px 0 0' }}>
            🔔 Påminnelser er på – du får beskjed kvelden før søpla skal ut, selv når appen er lukket.
          </p>
        ) : (
          <div style={{ marginTop: '14px' }}>
            <button type="button" onClick={slaaPaaVarsler} disabled={varslerLaster} style={{ width: '100%', padding: '11px', borderRadius: '12px', border: 'none', background: tema.accentBg, color: '#fff', cursor: varslerLaster ? 'default' : 'pointer', fontSize: '13px', fontWeight: 700, fontFamily: 'inherit', opacity: varslerLaster ? 0.7 : 1 }}>
              {varslerLaster ? 'Slår på …' : '🔔 Slå på påminnelser'}
            </button>
            <p style={{ fontSize: '11px', color: tema.subtekst, margin: '8px 0 0', lineHeight: 1.5 }}>
              Få beskjed kvelden før søpla skal ut – også når appen er lukket.
            </p>
            {varslerFeil && <p style={{ fontSize: '11px', color: '#d1605f', margin: '6px 0 0' }}>{varslerFeil}</p>}
          </div>
        )
      )}

      {aiSammendrag && (
        <div style={{ marginTop: '14px', padding: '14px 16px', borderRadius: '14px', background: tema.accentBg, color: '#fff' }}>
          <p style={{ fontSize: '11px', margin: '0 0 6px', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700, opacity: 0.85 }}>✨ Dagens brief</p>
          <p style={{ fontSize: '14px', margin: 0, lineHeight: 1.6 }}>{aiSammendrag}</p>
        </div>
      )}

      {aiFeil && (
        <p style={{ fontSize: '12px', color: '#d1605f', margin: '10px 0 0' }}>{aiFeil}</p>
      )}

      {punkter.length > 0 && !aiSammendrag && (
        <button type="button" onClick={() => hentSammendrag(punkter.map(p => ({ tekst: p.tekst, kilde: p.kilde })))} disabled={lasterAi} style={{ marginTop: '14px', width: '100%', padding: '11px', borderRadius: '12px', border: `1px solid ${tema.border}`, background: tema.inputBg, color: tema.tekst, cursor: lasterAi ? 'default' : 'pointer', fontSize: '13px', fontWeight: 700, fontFamily: 'inherit', opacity: lasterAi ? 0.7 : 1 }}>
          {lasterAi ? 'Lager brief …' : '✨ Oppsummer med AI'}
        </button>
      )}

      <p style={{ fontSize: '11px', color: tema.subtekst, margin: '14px 0 0', lineHeight: 1.6 }}>
        Snart: innlogging på tvers av enheter og egne påminnelser.
      </p>
    </div>
  )
}
