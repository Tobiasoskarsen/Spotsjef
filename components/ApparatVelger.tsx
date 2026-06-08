import { Apparat, Anbefaling } from '@/lib/types'
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
  delt: boolean
  onDel: () => void
  darkMode: boolean
  tema: Tema
}

export default function ApparatVelger({
  alleApparater, valgtApparat, onVelg, anbefaling, visEgetSkjema, onToggleSkjema,
  egetApparat, onEndreEget, onLeggTil, delt, onDel, darkMode, tema,
}: Props) {
  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '8px 12px', borderRadius: '8px', border: `1px solid ${tema.border}`,
    background: tema.cardBg, color: tema.tekst, fontSize: '14px', outline: 'none', boxSizing: 'border-box',
  }

  return (
    <div style={{ background: tema.cardBg, border: `1px solid ${tema.border}`, borderRadius: '16px', padding: '20px', marginBottom: '16px' }}>
      <h2 style={{ fontSize: '16px', fontWeight: 600, color: tema.tekst, margin: '0 0 12px' }}>Når bør jeg kjøre?</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '10px', marginBottom: '12px' }}>
        {alleApparater.map(a => {
          const valgt = valgtApparat.navn === a.navn
          return (
            <button key={a.navn} onClick={() => onVelg(a)} style={{ padding: '12px', borderRadius: '12px', textAlign: 'left', border: '1px solid', cursor: 'pointer', transition: 'all 0.15s', ...(valgt ? { borderColor: '#3b82f6', background: darkMode ? '#1e3a5f' : '#eff6ff' } : { borderColor: tema.border, background: tema.cardBg }) }}>
              <div style={{ fontSize: '20px', marginBottom: '4px' }}>{a.ikon || '🔌'}</div>
              <div style={{ fontSize: '13px', fontWeight: 500, color: valgt ? (darkMode ? '#93c5fd' : '#1d4ed8') : tema.tekst }}>{a.navn}</div>
              <div style={{ fontSize: '11px', color: tema.subtekst }}>{a.watt}W · {a.timer}t</div>
            </button>
          )
        })}
        <button onClick={onToggleSkjema} style={{ padding: '12px', borderRadius: '12px', textAlign: 'left', border: `1px dashed ${tema.border}`, background: 'transparent', cursor: 'pointer' }}>
          <div style={{ fontSize: '20px', marginBottom: '4px' }}>➕</div>
          <div style={{ fontSize: '13px', fontWeight: 500, color: tema.subtekst }}>Legg til</div>
          <div style={{ fontSize: '11px', color: tema.subtekst }}>Eget apparat</div>
        </button>
      </div>

      {visEgetSkjema && (
        <div style={{ background: tema.inputBg, borderRadius: '12px', padding: '16px', marginBottom: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <input style={inputStyle} placeholder="Navn (f.eks. Badstue)" value={egetApparat.navn} onChange={e => onEndreEget('navn', e.target.value)} />
          <input style={inputStyle} placeholder="Watt (f.eks. 3000)" type="number" value={egetApparat.watt} onChange={e => onEndreEget('watt', e.target.value)} />
          <input style={inputStyle} placeholder="Timer (f.eks. 1.5)" type="number" step="0.5" value={egetApparat.timer} onChange={e => onEndreEget('timer', e.target.value)} />
          <button onClick={onLeggTil} style={{ padding: '10px', borderRadius: '8px', background: '#3b82f6', color: '#fff', border: 'none', cursor: 'pointer', fontSize: '14px', fontWeight: 500 }}>Legg til</button>
        </div>
      )}

      {anbefaling && (
        <div style={{ background: darkMode ? '#052e16' : '#f0fdf4', border: `1px solid ${darkMode ? '#166534' : '#86efac'}`, borderRadius: '12px', padding: '16px' }}>
          <p style={{ color: darkMode ? '#86efac' : '#166534', fontWeight: 600, margin: '0 0 4px', fontSize: '15px' }}>
            {valgtApparat.ikon} Kjør {valgtApparat.navn} kl. {anbefaling.startTime}–{anbefaling.sluttTime}
          </p>
          <p style={{ color: darkMode ? '#4ade80' : '#16a34a', fontSize: '13px', margin: '0 0 12px' }}>
            Snitt {anbefaling.snittPris} øre/kWh · estimert kostnad {anbefaling.kostnad} kr
          </p>
          <button onClick={onDel} style={{ padding: '8px 16px', borderRadius: '8px', background: '#16a34a', color: '#fff', border: 'none', cursor: 'pointer', fontSize: '13px' }}>
            {delt ? '✓ Kopiert!' : '📋 Del anbefaling'}
          </button>
        </div>
      )}
    </div>
  )
}
