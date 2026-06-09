import { Tema } from '@/lib/theme'
import { Home, Zap, BarChart3, Settings, type LucideIcon } from 'lucide-react'

export type Side = 'hjem' | 'apparater' | 'historikk' | 'mer'

const SIDER: { id: Side; label: string; Ikon: LucideIcon }[] = [
  { id: 'hjem', label: 'Hjem', Ikon: Home },
  { id: 'apparater', label: 'Apparater', Ikon: Zap },
  { id: 'historikk', label: 'AI', Ikon: BarChart3 },
  { id: 'mer', label: 'Mer', Ikon: Settings },
]

type Props = {
  aktiv: Side
  onBytt: (s: Side) => void
  tema: Tema
}

// Fast bunnmeny (som i bank-apper): store knapper med ikon + tekst.
export default function BunnMeny({ aktiv, onBytt, tema }: Props) {
  return (
    <nav
      style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 50,
        background: tema.cardBg, borderTop: `1px solid ${tema.border}`,
        boxShadow: '0 -4px 24px rgba(0,0,0,0.18)',
      }}
    >
      <div style={{ maxWidth: '680px', margin: '0 auto', display: 'flex', gap: '4px', padding: '6px 8px calc(8px + env(safe-area-inset-bottom))' }}>
        {SIDER.map(({ id, label, Ikon }) => {
          const valgt = aktiv === id
          return (
            <button
              key={id}
              onClick={() => onBytt(id)}
              aria-label={label}
              aria-current={valgt ? 'page' : undefined}
              style={{
                flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px',
                padding: '9px 4px', borderRadius: '14px', border: 'none', cursor: 'pointer',
                background: valgt ? tema.accentBg : 'transparent', fontFamily: 'inherit',
              }}
            >
              <Ikon size={21} strokeWidth={valgt ? 2.4 : 1.9} color={valgt ? tema.pillTekst : tema.subtekst} />
              <span style={{ fontSize: '11px', fontWeight: valgt ? 700 : 500, color: valgt ? tema.pillTekst : tema.subtekst }}>{label}</span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
