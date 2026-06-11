import { Tema } from '@/lib/theme'
import { Users, Settings, type LucideIcon } from 'lucide-react'

export type NaerSide = 'personer' | 'mer'

const SIDER: { id: NaerSide; label: string; Ikon: LucideIcon }[] = [
  { id: 'personer', label: 'Mine personer', Ikon: Users },
  { id: 'mer', label: 'Mer', Ikon: Settings },
]

// Nær har ÉN jobb, så menyen har bare to faner: personene dine og innstillinger.
export default function NaerMeny({ aktiv, onBytt, tema }: {
  aktiv: NaerSide
  onBytt: (s: NaerSide) => void
  tema: Tema
}) {
  return (
    <nav
      style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 50,
        background: tema.cardBg, borderTop: `1px solid ${tema.border}`,
        boxShadow: '0 -4px 24px rgba(31,42,58,0.08)',
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
                background: valgt ? tema.pillBg : 'transparent', fontFamily: 'inherit',
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
