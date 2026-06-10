import { useState } from 'react'
import { Apparat, Anbefaling } from '@/lib/types'
import { APPARAT_IKONER } from '@/lib/constants'
import { Tema } from '@/lib/theme'
import { Pencil, X, Plus, RotateCcw, Clock, SlidersHorizontal } from 'lucide-react'

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
  const [visModal, setVisModal] = useState(false)
  const [bekreftTilbakestill, setBekreftTilbakestill] = useState(false)
  const [bekreftSlettNavn, setBekreftSlettNavn] = useState<string | null>(null)

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '10px 14px', borderRadius: '12px', border: 'none',
    background: tema.inputBg, color: tema.tekst, fontSize: '14px', outline: 'none',
    boxSizing: 'border-box', fontFamily: 'inherit',
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

  function lukkModal() {
    if (visEgetSkjema) onAvbryt()
    setBekreftSlettNavn(null)
    setBekreftTilbakestill(false)
    setVisModal(false)
  }

  return (
    <div style={{ background: tema.cardBg, borderRadius: '18px', padding: '20px', marginBottom: '14px', boxShadow: tema.skygge, border: `1px solid ${tema.border}` }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', marginBottom: '12px' }}>
        <h2 style={{ fontSize: '15px', fontWeight: 600, color: tema.tekst, margin: 0, letterSpacing: '-0.01em' }}>Når bør jeg kjøre?</h2>
        <button
          onClick={() => setVisModal(true)}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '8px 13px', borderRadius: '11px', border: `1px solid ${tema.border}`, background: tema.inputBg, color: tema.subtekst, cursor: 'pointer', fontSize: '12.5px', fontWeight: 600, fontFamily: 'inherit', flexShrink: 0 }}
        >
          <SlidersHorizontal size={14} /> Mine apparater
        </button>
      </div>

      {/* Kun valg her – administrasjon skjer i popupen */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '14px' }}>
        {alleApparater.map(a => {
          const valgt = valgtApparat.navn === a.navn
          return (
            <button
              key={a.navn}
              onClick={() => onVelg(a)}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '6px',
                padding: '9px 14px', borderRadius: '999px', cursor: 'pointer',
                border: valgt ? `1.5px solid ${tema.accent}` : '1.5px solid transparent',
                background: valgt ? tema.accentBg : tema.inputBg,
                color: valgt ? tema.pillTekst : tema.tekst,
                fontSize: '13px', fontWeight: valgt ? 600 : 500, fontFamily: 'inherit',
                transition: 'all 0.15s',
              }}
            >
              <span style={{ fontSize: '15px', lineHeight: 1 }}>{a.ikon || '🔌'}</span>
              {a.navn}
            </button>
          )
        })}
      </div>

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
            Snitt {anbefaling.snittPris} øre/kWh · estimert kostnad {anbefaling.kostnad} kr ({valgtApparat.watt}W i {valgtApparat.timer}t)
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

      {/* ── Popup: administrer apparatene dine ─────────────────────────── */}
      {visModal && (
        <div
          onClick={lukkModal}
          style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(10,14,24,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}
        >
          <div
            onClick={e => e.stopPropagation()}
            role="dialog"
            aria-label="Mine apparater"
            style={{ background: tema.cardBg, borderRadius: '20px', padding: '20px', width: '100%', maxWidth: '440px', maxHeight: '85vh', overflowY: 'auto', boxShadow: tema.skyggeHero, border: `1px solid ${tema.border}` }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
              <h3 style={{ fontSize: '17px', fontWeight: 700, color: tema.tekst, margin: 0 }}>Mine apparater</h3>
              <button onClick={lukkModal} aria-label="Lukk" style={{ width: '34px', height: '34px', borderRadius: '11px', border: `1px solid ${tema.border}`, background: tema.inputBg, color: tema.subtekst, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <X size={17} />
              </button>
            </div>

            <p style={{ fontSize: '12.5px', color: tema.subtekst, margin: '0 0 14px', lineHeight: 1.5 }}>
              Apparatene du legger inn her kan du sjekke pris og beste tidspunkt for.
            </p>

            {/* Liste over apparatene */}
            <div style={{ display: 'grid', gap: '8px', marginBottom: '14px' }}>
              {alleApparater.map(a => {
                const bekreft = bekreftSlettNavn === a.navn
                return (
                  <div key={a.navn} style={{ display: 'flex', alignItems: 'center', gap: '10px', background: tema.inputBg, borderRadius: '12px', padding: '10px 12px' }}>
                    <span style={{ fontSize: '20px', lineHeight: 1, flexShrink: 0 }}>{a.ikon || '🔌'}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: '13.5px', fontWeight: 600, color: tema.tekst, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.navn}</p>
                      <p style={{ fontSize: '11.5px', color: tema.subtekst, margin: 0 }}>{a.watt}W · {a.timer}t{a.gangerPerUke ? ` · ${a.gangerPerUke}×/uke` : ''}</p>
                    </div>
                    <button onClick={() => { onRediger(a); setBekreftSlettNavn(null) }} aria-label={`Endre ${a.navn}`} style={{ width: '32px', height: '32px', borderRadius: '10px', border: `1px solid ${tema.border}`, background: tema.cardBg, color: tema.subtekst, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Pencil size={14} />
                    </button>
                    {kanSlette && (
                      <button
                        onClick={() => {
                          if (bekreft) { onSlett(a); setBekreftSlettNavn(null) }
                          else setBekreftSlettNavn(a.navn)
                        }}
                        aria-label={`Slett ${a.navn}`}
                        style={{ minWidth: '32px', height: '32px', borderRadius: '10px', border: `1px solid ${bekreft ? '#c0664f' : tema.border}`, background: bekreft ? 'rgba(192,102,79,0.12)' : tema.cardBg, color: bekreft ? '#c0664f' : tema.subtekst, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: '11px', fontWeight: 700, fontFamily: 'inherit', padding: bekreft ? '0 8px' : 0 }}
                      >
                        {bekreft ? 'Sikker?' : <X size={15} />}
                      </button>
                    )}
                  </div>
                )
              })}
            </div>

            {/* Legg til nytt / skjema */}
            {visEgetSkjema ? (
              <div style={{ background: tema.inputBg, borderRadius: '14px', padding: '16px', marginBottom: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <p style={{ fontSize: '13px', fontWeight: 600, color: tema.tekst, margin: '0 0 2px' }}>
                  {redigererNavn ? `Endre «${redigererNavn}»` : 'Nytt apparat'}
                </p>
                <input style={{ ...inputStyle, background: tema.cardBg }} placeholder="Navn (f.eks. Badstue)" value={egetApparat.navn} onChange={e => onEndreEget('navn', e.target.value)} />
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                  <input style={{ ...inputStyle, background: tema.cardBg }} placeholder="Watt" type="number" value={egetApparat.watt} onChange={e => onEndreEget('watt', e.target.value)} />
                  <input style={{ ...inputStyle, background: tema.cardBg }} placeholder="Timer" type="number" step="0.5" value={egetApparat.timer} onChange={e => onEndreEget('timer', e.target.value)} />
                  <input style={{ ...inputStyle, background: tema.cardBg }} placeholder="×/uke" type="number" min="1" max="50" value={egetApparat.gangerPerUke} onChange={e => onEndreEget('gangerPerUke', e.target.value)} />
                </div>

                <p style={{ fontSize: '12px', color: tema.subtekst, margin: '4px 0 0' }}>Velg ikon</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                  {APPARAT_IKONER.map(ic => {
                    const valgt = egetApparat.ikon === ic
                    return (
                      <button key={ic} type="button" onClick={() => onEndreEget('ikon', ic)} aria-label={`Velg ikon ${ic}`} style={{ width: '32px', height: '32px', borderRadius: '9px', fontSize: '15px', cursor: 'pointer', background: valgt ? tema.accentBg : tema.cardBg, border: valgt ? `1.5px solid ${tema.accent}` : `1px solid ${tema.border}`, lineHeight: 1, fontFamily: 'inherit', padding: 0 }}>
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
            ) : (
              <button
                onClick={onToggleSkjema}
                style={{ width: '100%', padding: '13px', borderRadius: '13px', border: `1.5px dashed ${tema.border}`, background: 'transparent', color: tema.subtekst, cursor: 'pointer', fontSize: '14px', fontWeight: 600, fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '7px', marginBottom: '12px' }}
              >
                <Plus size={17} /> Legg til nytt apparat
              </button>
            )}

            {/* Tilbakestill (to-trinns) */}
            <div style={{ textAlign: 'center' }}>
              <button
                onClick={() => {
                  if (bekreftTilbakestill) { onTilbakestill(); setBekreftTilbakestill(false) }
                  else setBekreftTilbakestill(true)
                }}
                onBlur={() => setBekreftTilbakestill(false)}
                style={{ background: 'transparent', border: 'none', color: bekreftTilbakestill ? tema.accent : tema.subtekst, cursor: 'pointer', fontSize: '12px', fontWeight: bekreftTilbakestill ? 600 : 400, fontFamily: 'inherit', padding: '4px 0', display: 'inline-flex', alignItems: 'center', gap: '5px' }}
              >
                <RotateCcw size={12} />
                {bekreftTilbakestill ? 'Trykk en gang til for å tilbakestille' : 'Tilbakestill til standardlista'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
