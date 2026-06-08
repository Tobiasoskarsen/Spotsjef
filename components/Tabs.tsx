import { Tema } from '@/lib/theme'

export type TabId = 'idag' | 'historikk' | 'kalkulator'

type Props = {
  aktiv: TabId
  onBytt: (tab: TabId) => void
  tema: Tema
}

const TABS: { id: TabId; label: string }[] = [
  { id: 'idag', label: 'I dag' },
  { id: 'historikk', label: 'Historikk' },
  { id: 'kalkulator', label: 'Kalkulator' },
]

export default function Tabs({ aktiv, onBytt, tema }: Props) {
  return (
    <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
      {TABS.map(tab => {
        const erAktiv = aktiv === tab.id
        return (
          <button key={tab.id} onClick={() => onBytt(tab.id)} style={{ flex: 1, padding: '11px', borderRadius: '14px', cursor: 'pointer', fontSize: '13px', fontWeight: 600, fontFamily: 'inherit', ...(erAktiv ? { background: tema.accentGradient, color: '#fff', border: '1px solid transparent', boxShadow: tema.skygge } : { background: tema.cardBg, color: tema.subtekst, border: `1px solid ${tema.border}`, boxShadow: tema.skygge }) }}>
            {tab.label}
          </button>
        )
      })}
    </div>
  )
}
