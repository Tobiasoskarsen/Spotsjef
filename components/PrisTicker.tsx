import { Tema, getColorSterk } from '@/lib/theme'
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

// Tekst-etikett basert på hvor prisen ligger i dagens spenn
function prisEtikett(pris: number, min: number, max: number): string {
  const range = max - min || 1
  const ratio = (pris - min) / range
  if (ratio < 0.33) return 'Billig akkurat nå'
  if (ratio < 0.66) return 'Middels pris nå'
  return 'Dyrt akkurat nå'
}

export default function PrisTicker({
  naavaerendePris, animertPris, minPris, maxPris, snittPris, zone, onZoneChange, tema,
}: Props) {
  if (naavaerendePris <= 0) return null

  const farge = getColorSterk(naavaerendePris, minPris, maxPris)

  return (
    <div style={{ background: tema.cardBg, borderRadius: '18px', padding: '20px', margin: '16px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <div>
        <p style={{ fontSize: '11px', color: tema.subtekst, margin: '0 0 6px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Nåværende pris</p>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
          <span style={{ fontSize: '44px', fontWeight: 500, color: farge, lineHeight: 1 }}>
            {animertPris.toFixed(1)}
          </span>
          <span style={{ fontSize: '15px', color: tema.subtekst }}>øre/kWh</span>
        </div>
        <span style={{ display: 'inline-block', marginTop: '8px', fontSize: '12px', color: tema.pillTekst, background: tema.pillBg, padding: '3px 10px', borderRadius: '20px' }}>
          {prisEtikett(naavaerendePris, minPris, maxPris)}
        </span>
      </div>
      <div style={{ textAlign: 'right' }}>
        <p style={{ fontSize: '11px', color: tema.subtekst, margin: '0 0 4px' }}>Snitt i dag</p>
        <p style={{ fontSize: '18px', fontWeight: 500, color: tema.tekst, margin: '0 0 8px' }}>{snittPris} øre</p>
        <select value={zone} onChange={e => onZoneChange(e.target.value)} style={{ padding: '5px 10px', borderRadius: '10px', border: 'none', background: tema.inputBg, color: tema.tekst, fontSize: '12px', cursor: 'pointer', fontFamily: 'inherit' }}>
          {SONER.map(s => <option key={s.kode} value={s.kode}>{s.navn}</option>)}
        </select>
      </div>
    </div>
  )
}
