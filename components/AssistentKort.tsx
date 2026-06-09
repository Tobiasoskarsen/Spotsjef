'use client'
import { useEffect, useState } from 'react'
import { Pris } from '@/lib/types'
import { VaerTime, nesteNedbor } from '@/lib/vaer'
import { Tema } from '@/lib/theme'
import { useBruker } from '@/lib/bruker'
import { hentProfil, lagreProfil } from '@/lib/profil'

// Fase 1 av hverdagsassistenten.
// Prinsipp: assistenten sier KUN ting den faktisk vet – fra ekte data
// (pris/vær/klokke) eller fra valg brukeren selv har gjort. Ingen oppdiktede
// påminnelser. Før brukeren har satt den opp, viser vi en invitasjon – ikke
// fyllstoff. Konfig lagres foreløpig i localStorage; flyttes til Supabase-profil
// i en senere fase (anonym konto), uten at brukeren mister noe.

type AssistentConfig = {
  konfigurert: boolean
  navn: string
  vilStrom: boolean
  vilVaer: boolean
}

const STD: AssistentConfig = { konfigurert: false, navn: '', vilStrom: true, vilVaer: true }
const LAGER_NOKKEL = 'flyt:assistent'

type Props = {
  vaer: VaerTime[]
  priser: Pris[]
  tema: Tema
}

function hilsen(navn: string): string {
  const t = new Date().getHours()
  const tid = t < 5 ? 'God natt' : t < 10 ? 'God morgen' : t < 18 ? 'God dag' : 'God kveld'
  return navn.trim() ? `${tid}, ${navn.trim()}` : tid
}

function billigsteTime(priser: Pris[]): Pris | null {
  if (priser.length === 0) return null
  return [...priser].sort((a, b) => a.pris - b.pris)[0]
}

export default function AssistentKort({ vaer, priser, tema }: Props) {
  const { brukerId, laster: lasterBruker } = useBruker()
  const [cfg, setCfg] = useState<AssistentConfig>(STD)
  const [lastet, setLastet] = useState(false)
  const [visOppsett, setVisOppsett] = useState(false)
  const [lagrer, setLagrer] = useState(false)
  // Lokalt skjema-utkast så vi ikke lagrer før brukeren trykker «Lagre»
  const [utkast, setUtkast] = useState<AssistentConfig>(STD)

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

  function startOppsett() {
    setUtkast(cfg)
    setVisOppsett(true)
  }

  async function lagre() {
    const ny = { ...utkast, konfigurert: true }
    setLagrer(true)
    if (brukerId) await lagreProfil(brukerId, ny)
    else localStorage.setItem(LAGER_NOKKEL, JSON.stringify(ny))
    setCfg(ny)
    setLagrer(false)
    setVisOppsett(false)
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

  // ---- 1) Oppsett-skjema (første gang via invitasjon, eller «Endre») ----
  if (visOppsett) {
    const inputStil: React.CSSProperties = {
      width: '100%', padding: '12px 14px', borderRadius: '14px',
      border: `1px solid ${tema.border}`, background: tema.inputBg,
      color: tema.tekst, fontSize: '14px', fontFamily: 'inherit', outline: 'none',
    }
    const Bryter = ({ paa, on, etikett, beskrivelse }: { paa: boolean; on: () => void; etikett: string; beskrivelse: string }) => (
      <button type="button" onClick={on} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', width: '100%', textAlign: 'left', padding: '14px 16px', borderRadius: '14px', border: `1px solid ${paa ? tema.accentBg : tema.border}`, background: paa ? tema.accentBg : tema.inputBg, color: paa ? '#fff' : tema.tekst, cursor: 'pointer', fontFamily: 'inherit' }}>
        <span>
          <span style={{ display: 'block', fontSize: '14px', fontWeight: 700 }}>{etikett}</span>
          <span style={{ display: 'block', fontSize: '12px', opacity: 0.85, marginTop: '2px' }}>{beskrivelse}</span>
        </span>
        <span style={{ fontSize: '13px', fontWeight: 700, flexShrink: 0 }}>{paa ? 'På' : 'Av'}</span>
      </button>
    )

    return (
      <div style={kortStil}>
        <p style={merkelapp}>{cfg.konfigurert ? 'Rediger assistent' : 'Sett opp assistenten'}</p>
        <div style={{ display: 'grid', gap: '14px' }}>
          <div>
            <label style={{ fontSize: '12px', color: tema.subtekst, fontWeight: 600, display: 'block', marginBottom: '6px' }}>Hva heter du? (valgfritt)</label>
            <input value={utkast.navn} onChange={e => setUtkast({ ...utkast, navn: e.target.value })} placeholder="Fornavn" style={inputStil} />
          </div>
          <Bryter paa={utkast.vilStrom} on={() => setUtkast({ ...utkast, vilStrom: !utkast.vilStrom })} etikett="Strøm-tips" beskrivelse="Når på dagen strømmen er billigst" />
          <Bryter paa={utkast.vilVaer} on={() => setUtkast({ ...utkast, vilVaer: !utkast.vilVaer })} etikett="Vær-tips" beskrivelse="Beskjed når regn er på vei" />
          <p style={{ fontSize: '12px', color: tema.subtekst, margin: 0, lineHeight: 1.6 }}>
            Påminnelser, tømmedag og mer kommer i en senere oppdatering.
          </p>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button type="button" onClick={lagre} disabled={lagrer} style={{ flex: 1, padding: '12px', borderRadius: '14px', border: 'none', background: tema.accentBg, color: '#fff', cursor: lagrer ? 'default' : 'pointer', fontSize: '14px', fontWeight: 700, opacity: lagrer ? 0.7 : 1 }}>
              {lagrer ? 'Lagrer …' : 'Lagre'}
            </button>
            {cfg.konfigurert && (
              <button type="button" onClick={() => setVisOppsett(false)} style={{ padding: '12px 18px', borderRadius: '14px', border: `1px solid ${tema.border}`, background: tema.inputBg, color: tema.subtekst, cursor: 'pointer', fontSize: '14px', fontWeight: 600, fontFamily: 'inherit' }}>
                Avbryt
              </button>
            )}
          </div>
        </div>
      </div>
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
        <button type="button" onClick={startOppsett} style={{ padding: '12px 18px', borderRadius: '14px', border: 'none', background: tema.accentBg, color: '#fff', cursor: 'pointer', fontSize: '14px', fontWeight: 700 }}>
          Sett opp assistenten
        </button>
      </div>
    )
  }

  // ---- 3) Konfigurert: ærlig brief basert på ekte data + valgene dine ----
  const billig = cfg.vilStrom ? billigsteTime(priser) : null
  const regn = cfg.vilVaer ? nesteNedbor(vaer, 6) : null
  const venterData = (cfg.vilStrom && priser.length === 0) || (cfg.vilVaer && vaer.length === 0)

  const punkter: { emoji: string; tekst: string }[] = []
  if (billig) punkter.push({ emoji: '💡', tekst: `Billigst strøm kl. ${billig.time} (${billig.pris.toFixed(0)} øre/kWh)` })
  if (cfg.vilVaer) {
    if (regn) punkter.push({ emoji: '🌧️', tekst: `Regn ventet rundt kl. ${new Date(regn.tid).getHours()}:00 – ta med paraply` })
    else if (vaer.length > 0) punkter.push({ emoji: '☀️', tekst: 'Oppholdsvær de neste timene' })
  }

  return (
    <div style={kortStil}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px', marginBottom: '12px' }}>
        <div>
          <p style={merkelapp}>Din assistent</p>
          <p style={{ fontSize: '18px', fontWeight: 700, color: tema.tekst, margin: 0 }}>{hilsen(cfg.navn)}</p>
        </div>
        <button type="button" onClick={startOppsett} style={{ flexShrink: 0, padding: '8px 14px', borderRadius: '12px', border: `1px solid ${tema.border}`, background: tema.inputBg, color: tema.subtekst, cursor: 'pointer', fontSize: '12px', fontWeight: 600, fontFamily: 'inherit' }}>
          Endre
        </button>
      </div>

      {venterData && punkter.length === 0 ? (
        <p style={{ fontSize: '13px', color: tema.subtekst, margin: 0 }}>Henter dagens data …</p>
      ) : punkter.length > 0 ? (
        <div style={{ display: 'grid', gap: '10px' }}>
          {punkter.map((p, i) => (
            <div key={i} style={{ display: 'flex', gap: '10px', alignItems: 'center', background: tema.inputBg, borderRadius: '14px', padding: '12px 14px' }}>
              <span style={{ fontSize: '18px', lineHeight: 1 }}>{p.emoji}</span>
              <span style={{ fontSize: '14px', color: tema.tekst, lineHeight: 1.4 }}>{p.tekst}</span>
            </div>
          ))}
        </div>
      ) : (
        <p style={{ fontSize: '13px', color: tema.subtekst, margin: 0 }}>
          Du har skrudd av både strøm- og vær-tips. Trykk «Endre» for å slå dem på igjen.
        </p>
      )}

      <p style={{ fontSize: '11px', color: tema.subtekst, margin: '14px 0 0', lineHeight: 1.6 }}>
        Mer personlig hjelp – påminnelser, tømmedag og smartere brief med AI – kommer snart.
      </p>
    </div>
  )
}
