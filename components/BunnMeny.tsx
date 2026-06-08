import { Tema } from '@/lib/theme'

export type Side = 'hjem' | 'apparater' | 'historikk' | 'mer'

const SIDER: { id: Side; label: string; ikon: string }[] = [
  { id: 'hjem', label: 'Hjem', ikon: '🏠' },
  { id: 'apparater', label: 'Apparater', ikon: '🔌' },
  { id: 'historikk', label: 'Historikk', ikon: '📊' },
  { id: 'mer', label: 'Mer', ikon: '⚙️' },
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
        {SIDER.map(s => {
          const valgt = aktiv === s.id
          return (
            <button
              key={s.id}
              onClick={() => onBytt(s.id)}
              aria-label={s.label}
              aria-current={valgt ? 'page' : undefined}
              style={{
                flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px',
                padding: '9px 4px', borderRadius: '14px', border: 'none', cursor: 'pointer',
                background: valgt ? tema.accentBg : 'transparent', fontFamily: 'inherit',
              }}
            >
              <span style={{ fontSize: '21px', lineHeight: 1, opacity: valgt ? 1 : 0.7 }}>{s.ikon}</span>
              <span style={{ fontSize: '11px', fontWeight: valgt ? 700 : 500, color: valgt ? tema.pillTekst : tema.subtekst }}>{s.label}</span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
