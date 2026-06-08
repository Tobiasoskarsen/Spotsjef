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
    width: '100%', padding: '8px 12px', borderRadius: '8px', border: `1px solid ${tema.border}`,
    background: tema.cardBg, color: tema.tekst, fontSize: '14px', outline: 'none', boxSizing: 'border-box', flex: 1,
  }

  return (
    <div style={{ background: tema.cardBg, border: `1px solid ${tema.border}`, borderRadius: '16px', padding: '20px', marginBottom: '16px' }}>
      <h2 style={{ fontSize: '16px', fontWeight: 600, color: tema.tekst, margin: '0 0 12px' }}>🔔 Spotpris-alarm</h2>
      <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '12px' }}>
        <input type="number" placeholder="Grense i øre (f.eks. 30)" value={alarmGrense} onChange={e => onEndreGrense(e.target.value)} style={inputStyle} />
        <button onClick={onToggle} style={{ padding: '8px 16px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: 500, background: alarmAktiv ? '#ef4444' : '#3b82f6', color: '#fff', whiteSpace: 'nowrap' }}>
          {alarmAktiv ? 'Slå av' : 'Aktiver'}
        </button>
      </div>
      {alarmAktiv && alarmGrense && (
        <p style={{ fontSize: '13px', color: '#16a34a', margin: 0 }}>✓ Du varsles når prisen går under {alarmGrense} øre/kWh</p>
      )}
    </div>
  )
}
