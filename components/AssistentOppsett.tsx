'use client'
import { useState } from 'react'
import { Tema } from '@/lib/theme'
import { AssistentProfil } from '@/lib/profil'

// Onboarding-veiviser for assistenten.
// - Ny bruker: stegvis (intro → interesser → tømmedag) – vennlig og lett.
// - Redigering: alt på én side.
// Samler kun ting vi faktisk bruker (navn, hva du vil ha hjelp med, tømmedag).

type Props = {
  start: AssistentProfil
  onLagre: (p: AssistentProfil) => void
  onAvbryt?: () => void
  erRedigering: boolean
  lagrer: boolean
  tema: Tema
}

// Ukedager i menneskelig rekkefølge (man–søn), verdi = JS getDay (0=søn..6=lør)
const UKEDAGER: { verdi: number; kort: string }[] = [
  { verdi: 1, kort: 'Man' }, { verdi: 2, kort: 'Tir' }, { verdi: 3, kort: 'Ons' },
  { verdi: 4, kort: 'Tor' }, { verdi: 5, kort: 'Fre' }, { verdi: 6, kort: 'Lør' },
  { verdi: 0, kort: 'Søn' },
]

export default function AssistentOppsett({ start, onLagre, onAvbryt, erRedigering, lagrer, tema }: Props) {
  const [p, setP] = useState<AssistentProfil>(start)
  const [steg, setSteg] = useState(0)
  const sisteSteg = 2

  const kortStil: React.CSSProperties = {
    background: tema.cardBg, borderRadius: '20px', padding: '22px',
    boxShadow: tema.skygge, border: `1px solid ${tema.border}`,
  }
  const merkelapp: React.CSSProperties = {
    fontSize: '11px', color: tema.subtekst, margin: '0 0 10px',
    textTransform: 'uppercase', letterSpacing: '0.12em', fontWeight: 700,
  }
  const inputStil: React.CSSProperties = {
    width: '100%', padding: '12px 14px', borderRadius: '14px',
    border: `1px solid ${tema.border}`, background: tema.inputBg,
    color: tema.tekst, fontSize: '14px', fontFamily: 'inherit', outline: 'none',
  }
  const primKnapp: React.CSSProperties = {
    padding: '12px 18px', borderRadius: '14px', border: 'none',
    background: tema.accentBg, color: '#fff', cursor: lagrer ? 'default' : 'pointer',
    fontSize: '14px', fontWeight: 700, fontFamily: 'inherit', opacity: lagrer ? 0.7 : 1,
  }
  const sekKnapp: React.CSSProperties = {
    padding: '12px 18px', borderRadius: '14px', border: `1px solid ${tema.border}`,
    background: tema.inputBg, color: tema.subtekst, cursor: 'pointer',
    fontSize: '14px', fontWeight: 600, fontFamily: 'inherit',
  }

  // ── Gjenbrukbare felt ──────────────────────────────────────────────
  const NavnFelt = (
    <div>
      <label style={{ fontSize: '13px', color: tema.tekst, fontWeight: 700, display: 'block', marginBottom: '8px' }}>Hva heter du? <span style={{ color: tema.subtekst, fontWeight: 400 }}>(valgfritt)</span></label>
      <input value={p.navn} onChange={e => setP({ ...p, navn: e.target.value })} placeholder="Fornavn" style={inputStil} autoFocus={!erRedigering} />
    </div>
  )

  const Bryter = ({ paa, on, etikett, beskrivelse }: { paa: boolean; on: () => void; etikett: string; beskrivelse: string }) => (
    <button type="button" onClick={on} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', width: '100%', textAlign: 'left', padding: '14px 16px', borderRadius: '14px', border: `1px solid ${paa ? tema.accentBg : tema.border}`, background: paa ? tema.accentBg : tema.inputBg, color: paa ? '#fff' : tema.tekst, cursor: 'pointer', fontFamily: 'inherit' }}>
      <span>
        <span style={{ display: 'block', fontSize: '14px', fontWeight: 700 }}>{etikett}</span>
        <span style={{ display: 'block', fontSize: '12px', opacity: 0.85, marginTop: '2px' }}>{beskrivelse}</span>
      </span>
      <span style={{ fontSize: '13px', fontWeight: 700, flexShrink: 0 }}>{paa ? 'På' : 'Av'}</span>
    </button>
  )

  const InteresseFelt = (
    <div style={{ display: 'grid', gap: '10px' }}>
      <Bryter paa={p.vilStrom} on={() => setP({ ...p, vilStrom: !p.vilStrom })} etikett="Strøm-tips" beskrivelse="Når på dagen strømmen er billigst" />
      <Bryter paa={p.vilVaer} on={() => setP({ ...p, vilVaer: !p.vilVaer })} etikett="Vær-tips" beskrivelse="Beskjed når regn er på vei" />
    </div>
  )

  const TommedagFelt = (
    <div>
      <p style={{ fontSize: '13px', color: tema.subtekst, margin: '0 0 10px', lineHeight: 1.5 }}>Da minner jeg deg på å sette den ut kvelden før.</p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
        {UKEDAGER.map(d => {
          const valgt = p.tommedag === d.verdi
          return (
            <button key={d.verdi} type="button" onClick={() => setP({ ...p, tommedag: valgt ? null : d.verdi })} style={{ flex: '1 0 auto', minWidth: '58px', padding: '12px 8px', borderRadius: '12px', border: `1px solid ${valgt ? tema.accentBg : tema.border}`, background: valgt ? tema.accentBg : tema.inputBg, color: valgt ? '#fff' : tema.tekst, cursor: 'pointer', fontSize: '13px', fontWeight: 700, fontFamily: 'inherit' }}>
              {d.kort}
            </button>
          )
        })}
      </div>
      <button type="button" onClick={() => setP({ ...p, tommedag: null })} style={{ marginTop: '10px', padding: 0, background: 'none', border: 'none', color: tema.subtekst, cursor: 'pointer', fontSize: '12px', fontFamily: 'inherit', textDecoration: 'underline' }}>
        Hopp over / vet ikke
      </button>
    </div>
  )

  // ── Redigering: alt på én side ─────────────────────────────────────
  if (erRedigering) {
    return (
      <div style={kortStil}>
        <p style={merkelapp}>Rediger assistent</p>
        <div style={{ display: 'grid', gap: '18px' }}>
          {NavnFelt}
          <div>
            <p style={{ fontSize: '13px', color: tema.tekst, fontWeight: 700, margin: '0 0 8px' }}>Hva vil du ha hjelp med?</p>
            {InteresseFelt}
          </div>
          <div>
            <p style={{ fontSize: '13px', color: tema.tekst, fontWeight: 700, margin: '0 0 8px' }}>Når tømmes søpla hos deg?</p>
            {TommedagFelt}
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button type="button" onClick={() => onLagre(p)} disabled={lagrer} style={{ ...primKnapp, flex: 1 }}>{lagrer ? 'Lagrer …' : 'Lagre'}</button>
            {onAvbryt && <button type="button" onClick={onAvbryt} style={sekKnapp}>Avbryt</button>}
          </div>
        </div>
      </div>
    )
  }

  // ── Ny bruker: stegvis ─────────────────────────────────────────────
  const stegInnhold = [
    {
      tittel: 'Hei! Jeg er Flyt-assistenten din 👋',
      undertekst: 'Jeg samler det viktigste for dagen din – og lover å bare si ting jeg faktisk vet. Først: hva skal jeg kalle deg?',
      felt: NavnFelt,
    },
    {
      tittel: 'Hva vil du ha hjelp med?',
      undertekst: 'Skru på det som passer deg. Du kan endre dette når som helst.',
      felt: InteresseFelt,
    },
    {
      tittel: 'Når tømmes søpla hos deg?',
      undertekst: 'Valgfritt – men da kan jeg gi deg en påminnelse kvelden før.',
      felt: TommedagFelt,
    },
  ]
  const n = stegInnhold[steg]

  return (
    <div style={kortStil}>
      {/* Fremdrift */}
      <div style={{ display: 'flex', gap: '6px', marginBottom: '18px' }}>
        {stegInnhold.map((_, i) => (
          <span key={i} style={{ flex: 1, height: '4px', borderRadius: '2px', background: i <= steg ? tema.accentBg : tema.border }} />
        ))}
      </div>

      <p style={{ fontSize: '18px', fontWeight: 700, color: tema.tekst, margin: '0 0 6px', lineHeight: 1.25 }}>{n.tittel}</p>
      <p style={{ fontSize: '13px', color: tema.subtekst, margin: '0 0 16px', lineHeight: 1.6 }}>{n.undertekst}</p>

      <div style={{ marginBottom: '20px' }}>{n.felt}</div>

      <div style={{ display: 'flex', gap: '10px', justifyContent: 'space-between' }}>
        {steg > 0
          ? <button type="button" onClick={() => setSteg(steg - 1)} style={sekKnapp}>Tilbake</button>
          : <span />}
        {steg < sisteSteg
          ? <button type="button" onClick={() => setSteg(steg + 1)} style={primKnapp}>Neste</button>
          : <button type="button" onClick={() => onLagre(p)} disabled={lagrer} style={primKnapp}>{lagrer ? 'Lagrer …' : 'Fullfør'}</button>}
      </div>
    </div>
  )
}
