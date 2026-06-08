import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { HistorikkPunkt } from '@/lib/types'
import { Tema } from '@/lib/theme'

type Props = {
  historikk: HistorikkPunkt[]
  tema: Tema
}

export default function Historikk({ historikk, tema }: Props) {
  return (
    <div style={{ background: tema.cardBg, borderRadius: '18px', padding: '20px', marginBottom: '14px' }}>
      <h2 style={{ fontSize: '15px', fontWeight: 500, color: tema.tekst, margin: '0 0 16px' }}>Snittpriser siste 7 dager</h2>
      {historikk.length === 0 ? (
        <p style={{ color: tema.subtekst, textAlign: 'center', padding: '40px 0' }}>Laster historikk...</p>
      ) : (
        <ResponsiveContainer width="100%" height={250}>
          <LineChart data={historikk} margin={{ top: 4, right: 4, left: -15, bottom: 0 }}>
            <XAxis dataKey="dato" tick={{ fontSize: 11, fill: tema.subtekst }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: tema.subtekst }} domain={['auto', 'auto']} axisLine={false} tickLine={false} />
            <Tooltip formatter={(v) => [`${v} øre/kWh`]} contentStyle={{ background: tema.cardBg, border: 'none', borderRadius: '12px', fontSize: '12px', color: tema.tekst, boxShadow: '0 4px 16px rgba(0,0,0,0.08)' }} />
            <Line type="monotone" dataKey="snitt" stroke={tema.accent} strokeWidth={2.5} dot={{ fill: tema.accent, r: 4 }} />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}
