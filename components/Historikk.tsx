import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { HistorikkPunkt } from '@/lib/types'
import { Tema } from '@/lib/theme'

type Props = {
  historikk: HistorikkPunkt[]
  tema: Tema
}

export default function Historikk({ historikk, tema }: Props) {
  return (
    <div style={{ background: tema.cardBg, border: `1px solid ${tema.border}`, borderRadius: '16px', padding: '20px', marginBottom: '16px' }}>
      <h2 style={{ fontSize: '16px', fontWeight: 600, color: tema.tekst, margin: '0 0 16px' }}>Snittpriser siste 7 dager</h2>
      {historikk.length === 0 ? (
        <p style={{ color: tema.subtekst, textAlign: 'center', padding: '40px 0' }}>Laster historikk...</p>
      ) : (
        <ResponsiveContainer width="100%" height={250}>
          <LineChart data={historikk} margin={{ top: 4, right: 4, left: -15, bottom: 0 }}>
            <XAxis dataKey="dato" tick={{ fontSize: 11, fill: tema.subtekst }} />
            <YAxis tick={{ fontSize: 11, fill: tema.subtekst }} domain={['auto', 'auto']} />
            <Tooltip formatter={(v) => [`${v} øre/kWh`]} contentStyle={{ background: tema.cardBg, border: `1px solid ${tema.border}`, borderRadius: '8px', fontSize: '12px', color: tema.tekst }} />
            <Line type="monotone" dataKey="snitt" stroke="#3b82f6" strokeWidth={2.5} dot={{ fill: '#3b82f6', r: 4 }} />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}
