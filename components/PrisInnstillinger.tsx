import { Tema } from '@/lib/theme'

type Props = {
  nettleie: string
  onEndre: (v: string) => void
  tema: Tema
}

// Lar brukeren legge inn sin egen nettleie + påslag, så tallene blir det de
// faktisk betaler. Prisene er allerede etter strømstøtte.
export default function PrisInnstillinger({ nettleie, onEndre, tema }: Props) {
  return (
    <div style={{ background: tema.cardBg, borderRadius: '16px', padding: '14px 16px', marginBottom: '14px', boxShadow: tema.skygge, border: `1px solid ${tema.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
      <div>
        <p style={{ fontSize: '13px', fontWeight: 600, color: tema.tekst, margin: 0 }}>Din nettleie + påslag</p>
        <p style={{ fontSize: '11px', color: tema.subtekst, margin: '2px 0 0' }}>Prisene vises etter strømstøtte</p>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        <input
          type="number"
          min="0"
          inputMode="decimal"
          placeholder="0"
          value={nettleie}
          onChange={e => onEndre(e.target.value)}
          aria-label="Nettleie og påslag i øre per kWh"
          style={{ width: '72px', padding: '8px 10px', borderRadius: '11px', border: `1px solid ${tema.border}`, background: tema.inputBg, color: tema.tekst, fontSize: '14px', outline: 'none', fontFamily: 'inherit', textAlign: 'right' }}
        />
        <span style={{ fontSize: '12px', color: tema.subtekst }}>øre/kWh</span>
      </div>
    </div>
  )
}
