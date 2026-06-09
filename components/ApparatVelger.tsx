import { useState } from 'react'
import { Apparat, Anbefaling } from '@/lib/types'
import { APPARAT_IKONER } from '@/lib/constants'
import { Tema } from '@/lib/theme'
import { Pencil, X, Plus, RotateCcw, Clock } from 'lucide-react'

type Props = {
  alleApparater: Apparat[]
  valgtApparat: Apparat
  onVelg: (a: Apparat) => void
  anbefaling: Anbefaling | null
  visEgetSkjema: boolean
  onToggleSkjema: () => void
  egetApparat: { navn: string; watt: string; timer: string; ikon: string; gangerPerUke: string }
  onEndreEget: (felt: 'navn' | 'watt' | 'timer' | 'ikon' | 'gangerPerUke', verdi: string) => void
  onLagre: () => void
  onRediger: (a: Apparat) => void
  onSlett: (a: Apparat) => void
  redigererNavn: string | null
  onAvbryt: () => void
  onTilbakestill: () => void
  skjemaFeil: string
  delt: boolean
  onDel: () => void
  frist: string
  onEndreFrist: (v: string) => void
  kjorNaaKostnad: string | null
  tema: Tema
}

export default function ApparatVelger({
  alleApparater, valgtApparat, onVelg, anbefaling, visEgetSkjema, onToggleSkjema,
  egetApparat, onEndreEget, onLagre, onRediger, onSlett, redigererNavn, onAvbryt,
  onTilbakestill, skjemaFeil, delt, onDel, frist, onEndreFrist, kjorNaaKostnad, tema,
}: Props) {
  const [bekreftTilbakestill, setBekreftTilbakestill] = useState(false)

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '10px 14px', borderRadius: '12px', border: 'none',
    background: tema.cardBg, color: tema.tekst, fontSize: '14px', outline: 'none',
    boxSizing: 'border-box', fontFamily: 'inherit',
  }

  // Liten knapp i hjørnet av et apparat-kort (endre/slett)
  const hjorneKnapp: React.CSSProperties = {
    width: '24px', height: '24px', borderRadius: '8px', border: `1px solid ${tema.border}`,
    background: tema.cardBg, color: tema.subtekst, cursor: 'pointer', fontSize: '12px',
    lineHeight: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontFamily: 'inherit', padding: 0,
  }

  // Spar-estimat: foretrekk "kjør nå"-sammenligning, ellers "vs dyreste tid"
  let sparingTekst: string | null = null
  if (anbefaling) {
    const best = parseFloat(anbefaling.kostnad)
    const dyrest = parseFloat(anbefaling.kostnadDyrest)
    const naa = kjorNaaKostnad != null ? parseFloat(kjorNaaKostnad) : null
    if (naa != null && naa - best > 0.05) {
      sparingTekst = `Kjør nå koster ${naa.toFixed(2)} kr — spar ${(naa - best).toFixed(2)} kr ved å vente til kl. ${anbefaling.startTime}`
    } else if (dyrest - best > 0.05) {
      sparingTekst = `Spar opptil ${(dyrest - best).toFixed(2)} kr vs. det dyreste tidspunktet`
    }
  }

  const kanSlette = alleApparater.length > 1

  return (
    <div style={{ background: tema.cardBg, borderRadius: '18px', padding: '20px', marginBottom: '14px', boxShadow: tema.skygge, border: `1px solid ${tema.border}` }}>
      <h2 style={{ fontSize: '15px', fontWeight: 600, color: tema.tekst, margin: '0 0 14px', letterSpacing: '-0.01em' }}>Når bør jeg kjøre?</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '10px', marginBottom: '12px' }}>
        {alleApparater.map(a => {
          const valgt = valgtApparat.navn === a.navn
          return (
            <div key={a.navn} style={{ position: 'relative' }}>
              <button onClick={() => onVelg(a)} style={{ width: '100%', padding: '14px', borderRadius: '14px', textAlign: 'left', border: valgt ? `1.5px solid ${tema.accent}` : '1.5px solid transparent', cursor: 'pointer', transition: 'all 0.2s', background: valgt ? tema.accentBg : tema.inputBg, fontFamily: 'inherit' }}>
                <div style={{ fontSize: '20px', marginBottom: '6px' }}>{a.ikon || '🔌'}</div>
                <div style={{ fontSize: '13px', fontWeight: 500, color: valgt ? tema.pillTekst : tema.tekst, paddingRight: '4px' }}>{a.navn}</div>
                <div style={{ fontSize: '11px', color: tema.subtekst }}>{a.watt}W · {a.timer}t{a.gangerPerUke ? ` · ${a.gangerPerUke}×/uke` : ''}</div>
              </button>
              <div style={{ position: 'absolute', top: '8px', right: '8px', display: 'flex', gap: '4px' }}>
                <button onClick={() => onRediger(a)} aria-label={`Endre ${a.navn}`} title="Endre apparat" style={hjorneKnapp}><Pencil size={13} /></button>
                {kanSlette && (
                  <button onClick={() => onSlett(a)} aria-label={`Slett ${a.navn}`} title="Slett apparat" style={hjorneKnapp}><X size={14} /></button>
                )}
              </div>
            </div>
          )
        })}
        <button onClick={onToggleSkjema} style={{ padding: '14px', borderRadius: '14px', textAlign: 'left', border: `1.5px dashed ${tema.border}`, background: 'transparent', cursor: 'pointer', fontFamily: 'inherit', color: tema.subtekst }}>
          <div style={{ marginBottom: '6px' }}><Plus size={20} /></div>
          <div style={{ fontSize: '13px', fontWeight: 500, color: tema.subtekst }}>Legg til</div>
          <div style={{ fontSize: '11px', color: tema.subtekst }}>Eget apparat</div>
        </button>
      </div>

      {/* Tilbakestill til standardapparatene (to-trinns bekreftelse) */}
      <div style={{ marginBottom: '12px' }}>
        <button
          onClick={() => {
            if (bekreftTilbakestill) { onTilbakestill(); setBekreftTilbakestill(false) }
            else { setBekreftTilbakestill(true) }
          }}
          onBlur={() => setBekreftTilbakestill(false)}
          style={{ background: 'transparent', border: 'none', color: bekreftTilbakestill ? tema.accent : tema.subtekst, cursor: 'pointer', fontSize: '12px', fontWeight: bekreftTilbakestill ? 600 : 400, fontFamily: 'inherit', padding: '2px 0', display: 'inline-flex', alignItems: 'center', gap: '5px' }}
        >
          <RotateCcw size={13} />
          {bekreftTilbakestill ? 'Trykk en gang til for å tilbakestille til standard' : 'Tilbakestill til standard'}
        </button>
      </div>

      {visEgetSkjema && (
        <div style={{ background: tema.inputBg, borderRadius: '14px', padding: '16px', marginBottom: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <p style={{ fontSize: '13px', fontWeight: 600, color: tema.tekst, margin: '0 0 2px' }}>
            {redigererNavn ? `Endre «${redigererNavn}»` : 'Nytt apparat'}
          </p>
          <input style={inputStyle} placeholder="Navn (f.eks. Badstue)" value={egetApparat.navn} onChange={e => onEndreEget('navn', e.target.value)} />
          <input style={inputStyle} placeholder="Watt (f.eks. 3000)" type="number" value={egetApparat.watt} onChange={e => onEndreEget('watt', e.target.value)} />
          <input style={inputStyle} placeholder="Timer per gang (f.eks. 1.5)" type="number" step="0.5" value={egetApparat.timer} onChange={e => onEndreEget('timer', e.target.value)} />
          <input style={inputStyle} placeholder="Ganger per uke (f.eks. 3)" type="number" min="1" max="50" value={egetApparat.gangerPerUke} onChange={e => onEndreEget('gangerPerUke', e.target.value)} />

          <p style={{ fontSize: '12px', color: tema.subtekst, margin: '4px 0 0' }}>Velg ikon</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {APPARAT_IKONER.map(ic => {
              const valgt = egetApparat.ikon === ic
              return (
                <button key={ic} type="button" onClick={() => onEndreEget('ikon', ic)} aria-label={`Velg ikon ${ic}`} style={{ width: '38px', height: '38px', borderRadius: '11px', fontSize: '18px', cursor: 'pointer', background: valgt ? tema.accentBg : tema.cardBg, border: valgt ? `1.5px solid ${tema.accent}` : `1px solid ${tema.border}`, lineHeight: 1, fontFamily: 'inherit' }}>
                  {ic}
                </button>
              )
            })}
          </div>

          {skjemaFeil && (
            <p style={{ color: '#c0664f', fontSize: '12px', margin: '4px 0 0' }}>{skjemaFeil}</p>
          )}

          <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
            <button onClick={onLagre} style={{ flex: 1, padding: '11px', borderRadius: '12px', background: tema.tekst, color: tema.cardBg, border: 'none', cursor: 'pointer', fontSize: '14px', fontWeight: 600, fontFamily: 'inherit' }}>
              {redigererNavn ? 'Lagre endringer' : 'Legg til'}
            </button>
            <button onClick={onAvbryt} style={{ padding: '11px 16px', borderRadius: '12px', background: tema.cardBg, color: tema.subtekst, border: `1px solid ${tema.border}`, cursor: 'pointer', fontSize: '14px', fontWeight: 500, fontFamily: 'inherit' }}>
              Avbryt
            </button>
          </div>
        </div>
      )}

      {/* «Ferdig før kl. X»-planlegger */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
        <span style={{ fontSize: '13px', color: tema.subtekst, display: 'inline-flex', alignItems: 'center', gap: '5px' }}><Clock size={14} /> Ferdig før</span>
        <select value={frist} onChange={e => onEndreFrist(e.target.value)} style={{ padding: '8px 12px', borderRadius: '11px', border: `1px solid ${tema.border}`, background: tema.inputBg, color: tema.tekst, fontSize: '13px', fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' }}>
          <option value="">Når som helst</option>
          {Array.from({ length: 23 }, (_, i) => i + 1).map(h => (
            <option key={h} value={h}>{String(h).padStart(2, '0')}:00</option>
          ))}
        </select>
      </div>

      {anbefaling ? (
        <div style={{ background: tema.accentBg, borderRadius: '14px', padding: '16px' }}>
          <p style={{ color: tema.pillTekst, fontWeight: 500, margin: '0 0 4px', fontSize: '14px' }}>
            {valgtApparat.ikon} Kjør {valgtApparat.navn} kl. {anbefaling.startTime}–{anbefaling.sluttTime}
          </p>
          <p style={{ color: tema.accent, fontSize: '12px', margin: '0 0 10px' }}>
            Snitt {anbefaling.snittPris} øre/kWh · estimert kostnad {anbefaling.kostnad} kr
          </p>
          {sparingTekst && (
            <p style={{ color: tema.pillTekst, fontSize: '13px', fontWeight: 600, margin: '0 0 12px' }}>
              💰 {sparingTekst}
            </p>
          )}
          <button onClick={onDel} style={{ padding: '8px 16px', borderRadius: '12px', background: tema.accent, color: '#fff', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: 500, fontFamily: 'inherit' }}>
            {delt ? 'Kopiert!' : 'Del anbefaling'}
          </button>
        </div>
      ) : frist && Math.ceil(valgtApparat.timer) > parseInt(frist) ? (
        <div style={{ background: tema.inputBg, borderRadius: '14px', padding: '16px', fontSize: '13px', color: tema.subtekst }}>
          {valgtApparat.navn} trenger {valgtApparat.timer}t og rekker ikke å bli ferdig før kl. {String(parseInt(frist)).padStart(2, '0')}:00. Velg et senere tidspunkt.
        </div>
      ) : null}
    </div>
  )
}
