import { Tema, getColor } from '@/lib/theme'
import { SONER } from '@/lib/constants'

type Props = {
  naavaerendePris: number
  animertPris: number
  minPris: number
  maxPris: number
  snittPris: string
  zone: string
  onZoneChange: (zone: string) => void
  tema: Tema
}

export default function PrisTicker({
  naavaerendePris, animertPris, minPris, maxPris, snittPris, zone, onZoneChange, tema,
}: Props) {
  if (naavaerendePris <= 0) return null

  return (
    <div style={{ background: tema.cardBg, border: `1px solid ${tema.border}`, borderRadius: '16px', padding: '16px 20px', margin: '16px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <div>
        <p style={{ fontSize: '12px', color: tema.subtekst, margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Nåværende pris</p>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
          <span style={{ fontSize: '42px', fontWeight: 700, color: getColor(naavaerendePris, minPris, maxPris), lineHeight: 1 }}>
            {animertPris.toFixed(1)}
          </span>
          <span style={{ fontSize: '16px', color: tema.subtekst }}>øre/kWh</span>
        </div>
      </div>
      <div style={{ textAlign: 'right' }}>
        <p style={{ fontSize: '12px', color: tema.subtekst, margin: '0 0 4px' }}>Snitt i dag</p>
        <p style={{ fontSize: '20px', fontWeight: 600, color: tema.tekst, margin: 0 }}>{snittPris} øre</p>
        <select value={zone} onChange={e => onZoneChange(e.target.value)} style={{ marginTop: '6px', padding: '4px 8px', borderRadius: '8px', border: `1px solid ${tema.border}`, background: tema.cardBg, color: tema.tekst, fontSize: '12px', cursor: 'pointer' }}>
          {SONER.map(s => <option key={s.kode} value={s.kode}>{s.navn}</option>)}
        </select>
      </div>
    </div>
  )
}
