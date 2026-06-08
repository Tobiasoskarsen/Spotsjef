import { Tema } from '@/lib/theme'

export type TabId = 'idag' | 'historikk' | 'kalkulator'

type Props = {
  aktiv: TabId
  onBytt: (tab: TabId) => void
  tema: Tema
}

const TABS: { id: TabId; label: string }[] = [
  { id: 'idag', label: '📊 I dag' },
  { id: 'historikk', label: '📈 Historikk' },
  { id: 'kalkulator', label: '🧮 Kalkulator' },
]

export default function Tabs({ aktiv, onBytt, tema }: Props) {
  return (
    <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
      {TABS.map(tab => {
        const erAktiv = aktiv === tab.id
        return (
          <button key={tab.id} onClick={() => onBytt(tab.id)} style={{ flex: 1, padding: '8px', borderRadius: '10px', border: '1px solid', cursor: 'pointer', fontSize: '13px', fontWeight: 500, transition: 'all 0.15s', ...(erAktiv ? { background: '#3b82f6', color: '#fff', borderColor: '#3b82f6' } : { background: 'transparent', color: tema.subtekst, borderColor: tema.border }) }}>
            {tab.label}
          </button>
        )
      })}
    </div>
  )
}
