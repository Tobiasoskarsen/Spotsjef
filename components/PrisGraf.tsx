import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { Pris, Apparat, Anbefaling } from '@/lib/types'
import { Tema, getColor } from '@/lib/theme'

type Props = {
  data: Pris[]
  minPris: number
  maxPris: number
  snittPris: string
  anbefaling: Anbefaling | null
  valgtApparat: Apparat
  laster: boolean
  tema: Tema
}

export default function PrisGraf({ data, minPris, maxPris, snittPris, anbefaling, valgtApparat, laster, tema }: Props) {
  if (laster) {
    return <div style={{ textAlign: 'center', padding: '40px', color: tema.subtekst }}>Henter priser...</div>
  }
  if (data.length === 0) {
    return <div style={{ textAlign: 'center', padding: '40px', color: tema.subtekst }}>Priser ikke tilgjengelig ennå</div>
  }

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '8px', padding: '0 4px' }}>
        <span style={{ color: '#22c55e', fontWeight: 500 }}>Min: {minPris} øre</span>
        <span style={{ color: tema.subtekst }}>Snitt: {snittPris} øre</span>
        <span style={{ color: '#ef4444', fontWeight: 500 }}>Maks: {maxPris} øre</span>
      </div>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data} margin={{ top: 4, right: 4, left: -15, bottom: 0 }}>
          <XAxis dataKey="time" tick={{ fontSize: 10, fill: tema.subtekst }} interval={2} />
          <YAxis tick={{ fontSize: 10, fill: tema.subtekst }} domain={['auto', 'auto']} />
          <Tooltip formatter={(v) => [`${v} øre/kWh`]} contentStyle={{ background: tema.cardBg, border: `1px solid ${tema.border}`, borderRadius: '8px', fontSize: '12px', color: tema.tekst }} />
          <Bar dataKey="pris" radius={[4, 4, 0, 0]}>
            {data.map((entry, i) => (
              <Cell key={i} fill={getColor(entry.pris, minPris, maxPris)} opacity={anbefaling && i >= anbefaling.startIdx && i < anbefaling.startIdx + Math.ceil(valgtApparat.timer) ? 1 : 0.7} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </>
  )
}
