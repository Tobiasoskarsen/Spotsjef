import { Tema } from '@/lib/theme'

type Props = {
  alarmGrense: string
  onEndreGrense: (v: string) => void
  alarmAktiv: boolean
  onToggle: () => void
  tema: Tema
}

export default function Alarm({ alarmGrense, onEndreGrense, alarmAktiv, onToggle, tema }: Props) {
  const inputStyle: React.CSSProperties = {
    flex: 1, padding: '10px 14px', borderRadius: '12px', border: 'none',
    background: tema.inputBg, color: tema.tekst, fontSize: '14px', outline: 'none',
    boxSizing: 'border-box', fontFamily: 'inherit',
  }

  return (
    <div style={{ background: tema.cardBg, borderRadius: '18px', padding: '20px', marginBottom: '14px' }}>
      <h2 style={{ fontSize: '15px', fontWeight: 500, color: tema.tekst, margin: '0 0 12px' }}>Spotpris-alarm</h2>
      <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '12px' }}>
        <input type="number" placeholder="Grense i øre (f.eks. 30)" value={alarmGrense} onChange={e => onEndreGrense(e.target.value)} style={inputStyle} />
        <button onClick={onToggle} style={{ padding: '10px 18px', borderRadius: '12px', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: 500, fontFamily: 'inherit', background: alarmAktiv ? '#dab3a6' : tema.tekst, color: alarmAktiv ? '#5a3328' : tema.cardBg, whiteSpace: 'nowrap', transition: 'all 0.2s' }}>
          {alarmAktiv ? 'Slå av' : 'Aktiver'}
        </button>
      </div>
      {alarmAktiv && alarmGrense && (
        <p style={{ fontSize: '13px', color: tema.accent, margin: 0 }}>Du varsles når prisen går under {alarmGrense} øre/kWh</p>
      )}
    </div>
  )
}
