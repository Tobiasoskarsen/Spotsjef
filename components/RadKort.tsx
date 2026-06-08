import { Rad } from '@/lib/rad'
import { Tema } from '@/lib/theme'

type Props = {
  rad: Rad[]
  tema: Tema
}

export default function RadKort({ rad, tema }: Props) {
  if (rad.length === 0) return null

  return (
    <div style={{ background: tema.cardBg, borderRadius: '18px', padding: '20px', marginBottom: '14px', boxShadow: tema.skygge, border: `1px solid ${tema.border}` }}>
      <h2 style={{ fontSize: '15px', fontWeight: 600, color: tema.tekst, margin: '0 0 14px', letterSpacing: '-0.01em' }}>Anbefalinger nå</h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {rad.map((r, i) => (
          <div key={i} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', background: tema.inputBg, borderRadius: '14px', padding: '14px' }}>
            <span style={{ fontSize: '22px', lineHeight: 1.2, flexShrink: 0 }}>{r.emoji}</span>
            <div>
              <p style={{ fontSize: '14px', fontWeight: 500, color: tema.tekst, margin: '0 0 3px' }}>{r.tittel}</p>
              <p style={{ fontSize: '13px', color: tema.subtekst, margin: 0, lineHeight: 1.5 }}>{r.detalj}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
