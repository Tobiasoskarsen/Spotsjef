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

  function snittForPeriode(start: number, slutt: number) {
    const periode = priser.filter(p => {
      const time = Number(p.time.split(':')[0])
      if (start <= slutt) return time >= start && time < slutt
      return time >= start || time < slutt
    })
    if (periode.length === 0) return 0
    return periode.reduce((sum, p) => sum + p.pris, 0) / periode.length
  }

  const billigste3t = priser.reduce(
    (result, _, index) => {
      if (index + 3 > priser.length) return result
      const slice = priser.slice(index, index + 3)
      const avg = slice.reduce((sum, p) => sum + p.pris, 0) / slice.length
      return avg < result.avg ? { avg, index } : result
    },
    { avg: Infinity, index: 0 },
  )

  const perioder = [
    {
      label: 'Billigste 3t',
      verdi: `${(billigste3t.avg + nettleieOre).toFixed(0)} øre`,
      tid: `kl. ${priser[billigste3t.index].time}–${String((Number(priser[billigste3t.index].time.split(':')[0]) + 3) % 24).padStart(2, '0')}:00`,
      farge: '#5b9279',
    },
    {
      label: 'Morgen 06–12',
      verdi: `${(snittForPeriode(6, 12) + nettleieOre).toFixed(0)} øre`,
      tid: '06–12',
      farge: '#7a9ec9',
    },
    {
      label: 'Ettermiddag 12–18',
      verdi: `${(snittForPeriode(12, 18) + nettleieOre).toFixed(0)} øre`,
      tid: '12–18',
      farge: '#c98a7a',
    },
    {
      label: 'Kveld 18–23',
      verdi: `${(snittForPeriode(18, 23) + nettleieOre).toFixed(0)} øre`,
      tid: '18–23',
      farge: '#d7a86b',
    },
  ]

  return (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: '8px', marginBottom: '12px' }}>
        {stats.map(s => (
          <div key={s.label} style={{ background: tema.cardBg, borderRadius: '16px', padding: '12px 10px', textAlign: 'center', boxShadow: tema.skygge, border: `1px solid ${tema.border}` }}>
            <p style={{ fontSize: '10px', color: tema.subtekst, margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>{s.label}</p>
            <p className="tnum" style={{ fontSize: '16px', fontWeight: 700, color: s.farge, margin: 0, letterSpacing: '-0.02em' }}>{s.verdi}</p>
            <p style={{ fontSize: '10px', color: tema.subtekst, margin: '3px 0 0' }}>{s.tid}</p>
          </div>
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '8px', marginBottom: '14px' }}>
        {perioder.map(p => (
          <div key={p.label} style={{ background: tema.cardBg, borderRadius: '16px', padding: '10px 10px', textAlign: 'center', boxShadow: tema.skygge, border: `1px solid ${tema.border}` }}>
            <p style={{ fontSize: '10px', color: tema.subtekst, margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>{p.label}</p>
            <p className="tnum" style={{ fontSize: '15px', fontWeight: 700, color: p.farge, margin: 0, letterSpacing: '-0.02em' }}>{p.verdi}</p>
            <p style={{ fontSize: '10px', color: tema.subtekst, margin: '3px 0 0' }}>{p.tid}</p>
          </div>
        ))}
      </div>
    </>
  )
}
