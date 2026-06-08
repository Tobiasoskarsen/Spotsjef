import { Apparat, Anbefaling } from '@/lib/types'
import { APPARATER } from '@/lib/constants'
import { Tema } from '@/lib/theme'

type Props = {
  alleApparater: Apparat[]
  valgtApparat: Apparat
  onVelg: (a: Apparat) => void
  anbefaling: Anbefaling | null
  visEgetSkjema: boolean
  onToggleSkjema: () => void
  egetApparat: { navn: string; watt: string; timer: string }
  onEndreEget: (felt: 'navn' | 'watt' | 'timer', verdi: string) => void
  onLeggTil: () => void
  onSlett: (a: Apparat) => void
  delt: boolean
  onDel: () => void
  darkMode: boolean
  tema: Tema
}

export default function ApparatVelger({
  alleApparater, valgtApparat, onVelg, anbefaling, visEgetSkjema, onToggleSkjema,
  egetApparat, onEndreEget, onLeggTil, onSlett, delt, onDel, darkMode, tema,
}: Props) {
  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '10px 14px', borderRadius: '12px', border: 'none',
    background: tema.cardBg, color: tema.tekst, fontSize: '14px', outline: 'none',
    boxSizing: 'border-box', fontFamily: 'inherit',
  }

  return (
    <div style={{ background: tema.cardBg, borderRadius: '18px', padding: '20px', marginBottom: '14px' }}>
      <h2 style={{ fontSize: '15px', fontWeight: 500, color: tema.tekst, margin: '0 0 14px' }}>Når bør jeg kjøre?</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '10px', marginBottom: '12px' }}>
        {alleApparater.map(a => {
          const valgt = valgtApparat.navn === a.navn
          const erEget = !APPARATER.some(d => d.navn === a.navn)
          return (
            <div key={a.navn} style={{ position: 'relative' }}>
              <button onClick={() => onVelg(a)} style={{ width: '100%', padding: '14px', borderRadius: '14px', textAlign: 'left', border: valgt ? `1.5px solid ${tema.accent}` : '1.5px solid transparent', cursor: 'pointer', transition: 'all 0.2s', background: valgt ? tema.accentBg : tema.inputBg, fontFamily: 'inherit' }}>
                <div style={{ fontSize: '20px', marginBottom: '6px' }}>{a.ikon || '🔌'}</div>
                <div style={{ fontSize: '13px', fontWeight: 500, color: valgt ? tema.pillTekst : tema.tekst }}>{a.navn}</div>
                <div style={{ fontSize: '11px', color: tema.subtekst }}>{a.watt}W · {a.timer}t</div>
              </button>
              {erEget && (
                <button onClick={() => onSlett(a)} aria-label={`Slett ${a.navn}`} title="Slett apparat" style={{ position: 'absolute', top: '8px', right: '8px', width: '22px', height: '22px', borderRadius: '7px', border: 'none', background: tema.cardBg, color: tema.subtekst, cursor: 'pointer', fontSize: '13px', lineHeight: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'inherit' }}>
                  ✕
                </button>
              )}
            </div>
          )
        })}
        <button onClick={onToggleSkjema} style={{ padding: '14px', borderRadius: '14px', textAlign: 'left', border: `1.5px dashed ${tema.border}`, background: 'transparent', cursor: 'pointer', fontFamily: 'inherit' }}>
          <div style={{ fontSize: '20px', marginBottom: '6px', color: tema.subtekst }}>+</div>
          <div style={{ fontSize: '13px', fontWeight: 500, color: tema.subtekst }}>Legg til</div>
          <div style={{ fontSize: '11px', color: tema.subtekst }}>Eget apparat</div>
        </button>
      </div>

      {visEgetSkjema && (
        <div style={{ background: tema.inputBg, borderRadius: '14px', padding: '16px', marginBottom: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <input style={inputStyle} placeholder="Navn (f.eks. Badstue)" value={egetApparat.navn} onChange={e => onEndreEget('navn', e.target.value)} />
          <input style={inputStyle} placeholder="Watt (f.eks. 3000)" type="number" value={egetApparat.watt} onChange={e => onEndreEget('watt', e.target.value)} />
          <input style={inputStyle} placeholder="Timer (f.eks. 1.5)" type="number" step="0.5" value={egetApparat.timer} onChange={e => onEndreEget('timer', e.target.value)} />
          <button onClick={onLeggTil} style={{ padding: '11px', borderRadius: '12px', background: tema.tekst, color: tema.cardBg, border: 'none', cursor: 'pointer', fontSize: '14px', fontWeight: 500, fontFamily: 'inherit' }}>Legg til</button>
        </div>
      )}

      {anbefaling && (
        <div style={{ background: tema.accentBg, borderRadius: '14px', padding: '16px' }}>
          <p style={{ color: tema.pillTekst, fontWeight: 500, margin: '0 0 4px', fontSize: '14px' }}>
            {valgtApparat.ikon} Kjør {valgtApparat.navn} kl. {anbefaling.startTime}–{anbefaling.sluttTime}
          </p>
          <p style={{ color: tema.accent, fontSize: '12px', margin: '0 0 12px' }}>
            Snitt {anbefaling.snittPris} øre/kWh · estimert kostnad {anbefaling.kostnad} kr
          </p>
          <button onClick={onDel} style={{ padding: '8px 16px', borderRadius: '12px', background: tema.accent, color: '#fff', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: 500, fontFamily: 'inherit' }}>
            {delt ? 'Kopiert!' : 'Del anbefaling'}
          </button>
        </div>
      )}
    </div>
  )
}
