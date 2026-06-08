import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { Pris, Apparat, Anbefaling } from '@/lib/types'
import { Tema, getColor, getColorSterk } from '@/lib/theme'

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
    // Skeleton: pulserende plassholdere mens prisene hentes
    return (
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '14px', padding: '0 4px' }}>
          {[60, 70, 64].map((w, i) => (
            <div key={i} className="skjelett" style={{ width: w, height: '12px', borderRadius: '6px', background: tema.inputBg }} />
          ))}
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: '4px', height: '220px', padding: '0 4px' }}>
          {Array.from({ length: 24 }).map((_, i) => (
            <div
              key={i}
              className="skjelett"
              style={{ flex: 1, height: `${30 + ((i * 37) % 60)}%`, borderRadius: '5px 5px 0 0', background: tema.inputBg, animationDelay: `${(i % 6) * 0.1}s` }}
            />
          ))}
        </div>
      </div>
    )
  }
  if (data.length === 0) {
    return <div style={{ textAlign: 'center', padding: '40px', color: tema.subtekst }}>Priser ikke tilgjengelig ennå</div>
  }

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '14px', padding: '0 4px' }}>
        <span style={{ color: getColorSterk(minPris, minPris, maxPris) }}>Min {minPris} øre</span>
        <span style={{ color: tema.subtekst }}>Snitt {snittPris} øre</span>
        <span style={{ color: getColorSterk(maxPris, minPris, maxPris) }}>Maks {maxPris} øre</span>
      </div>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data} margin={{ top: 4, right: 4, left: -15, bottom: 0 }}>
          <XAxis dataKey="time" tick={{ fontSize: 10, fill: tema.subtekst }} interval={2} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 10, fill: tema.subtekst }} domain={['auto', 'auto']} axisLine={false} tickLine={false} />
          <Tooltip formatter={(v) => [`${v} øre/kWh`]} contentStyle={{ background: tema.cardBg, border: 'none', borderRadius: '12px', fontSize: '12px', color: tema.tekst, boxShadow: '0 4px 16px rgba(0,0,0,0.08)' }} cursor={{ fill: 'rgba(0,0,0,0.03)' }} />
          <Bar dataKey="pris" radius={[5, 5, 0, 0]}>
            {data.map((entry, i) => {
              const iVindu = anbefaling && i >= anbefaling.startIdx && i < anbefaling.startIdx + Math.ceil(valgtApparat.timer)
              return <Cell key={i} fill={getColor(entry.pris, minPris, maxPris)} opacity={iVindu ? 1 : 0.55} />
            })}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </>
  )
}
