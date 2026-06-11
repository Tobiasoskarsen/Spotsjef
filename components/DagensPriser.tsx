import { Pris } from '@/lib/types'
import { Tema, getColor } from '@/lib/theme'
import { ArrowRight } from 'lucide-react'

// Liten, trykkbar forhåndsvisning av døgnets priser på hjem. Viser dagen på et
// blunk (billig grønt, dyrt terrakotta) og leder inn til full graf på Planlegg.
type Props = {
  priser: Pris[]
  tariffType: 'spot' | 'norgespris'
  onApne: () => void
  tema: Tema
}

export default function DagensPriser({ priser, tariffType, onApne, tema }: Props) {
  if (tariffType !== 'spot' || priser.length === 0) return null

  const min = Math.min(...priser.map(p => p.pris))
  const max = Math.max(...priser.map(p => p.pris))
  const naaTime = new Date().getHours()

  return (
    <button
      onClick={onApne}
      style={{ width: '100%', textAlign: 'left', background: tema.cardBg, borderRadius: '14px', padding: '14px 16px', boxShadow: tema.skygge, border: `1px solid ${tema.border}`, cursor: 'pointer', fontFamily: 'inherit' }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
        <span style={{ fontSize: '11px', color: tema.subtekst, textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 700 }}>Dagens priser</span>
        <span style={{ fontSize: '12px', color: tema.accent, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>Se hele <ArrowRight size={13} /></span>
      </div>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: '2px', height: '42px' }}>
        {priser.map((p, i) => (
          <div
            key={i}
            title={`kl. ${p.time}: ${p.pris.toFixed(0)} øre`}
            style={{
              flex: 1,
              height: `${Math.max(8, ((p.pris - min) / (max - min || 1)) * 100)}%`,
              background: getColor(p.pris, min, max),
              borderRadius: '2px',
              opacity: i === naaTime ? 1 : 0.6,
              outline: i === naaTime ? `1.5px solid ${tema.tekst}` : 'none',
            }}
          />
        ))}
      </div>
    </button>
  )
}
