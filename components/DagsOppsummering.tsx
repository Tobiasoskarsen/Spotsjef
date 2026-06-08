import { Pris } from '@/lib/types'
import { Tema } from '@/lib/theme'

type Props = {
  priser: Pris[]
  nettleieOre: number
  tema: Tema
}

// Kort med dagens hovedtall: billigst, dyrest og snitt – en rask "hjemskjerm"-oversikt
export default function DagsOppsummering({ priser, nettleieOre, tema }: Props) {
  if (priser.length === 0) return null

  const billigst = priser.reduce((a, b) => (b.pris < a.pris ? b : a))
  const dyrest = priser.reduce((a, b) => (b.pris > a.pris ? b : a))
  const snitt = priser.reduce((s, p) => s + p.pris, 0) / priser.length

  const stats = [
    { label: 'Billigst', verdi: `${(billigst.pris + nettleieOre).toFixed(0)} øre`, tid: `kl. ${billigst.time}`, farge: '#5b9279' },
    { label: 'Dyrest', verdi: `${(dyrest.pris + nettleieOre).toFixed(0)} øre`, tid: `kl. ${dyrest.time}`, farge: '#c98a7a' },
    { label: 'Snitt', verdi: `${(snitt + nettleieOre).toFixed(0)} øre`, tid: 'i dag', farge: tema.tekst },
  ]

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginBottom: '14px' }}>
      {stats.map(s => (
        <div key={s.label} style={{ background: tema.cardBg, borderRadius: '16px', padding: '14px 12px', textAlign: 'center', boxShadow: tema.skygge, border: `1px solid ${tema.border}` }}>
          <p style={{ fontSize: '10px', color: tema.subtekst, margin: '0 0 5px', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>{s.label}</p>
          <p className="tnum" style={{ fontSize: '18px', fontWeight: 700, color: s.farge, margin: 0, letterSpacing: '-0.02em' }}>{s.verdi}</p>
          <p style={{ fontSize: '11px', color: tema.subtekst, margin: '3px 0 0' }}>{s.tid}</p>
        </div>
      ))}
    </div>
  )
}
