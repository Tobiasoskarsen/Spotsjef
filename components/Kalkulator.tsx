import { Apparat, Pris } from '@/lib/types'
import { Tema } from '@/lib/theme'
import { maanedskostnad } from '@/lib/priser'

type Props = {
  alleApparater: Apparat[]
  priser: Pris[]
  darkMode: boolean
  tema: Tema
}

export default function Kalkulator({ alleApparater, priser, darkMode, tema }: Props) {
  const billigRaw = priser.length ? Math.min(...priser.map(p => p.raw)) : 0.3
  const snittRaw = priser.length ? priser.reduce((s, p) => s + p.raw, 0) / priser.length : 0.8

  const vanligMaaned = alleApparater.reduce((sum, a) => sum + maanedskostnad(a, snittRaw), 0).toFixed(0)
  const maanedEstimat = alleApparater.reduce((sum, a) => sum + maanedskostnad(a, billigRaw), 0).toFixed(0)
  const sparing = (parseFloat(vanligMaaned) - parseFloat(maanedEstimat)).toFixed(0)

  const kort = [
    { label: 'Uten optimering', verdi: `${vanligMaaned} kr`, farge: '#ef4444' },
    { label: 'Med Spotsjef', verdi: `${maanedEstimat} kr`, farge: '#22c55e' },
    { label: 'Du sparer', verdi: `${sparing} kr`, farge: '#3b82f6' },
  ]

  return (
    <div style={{ background: tema.cardBg, border: `1px solid ${tema.border}`, borderRadius: '16px', padding: '20px', marginBottom: '16px' }}>
      <h2 style={{ fontSize: '16px', fontWeight: 600, color: tema.tekst, margin: '0 0 16px' }}>Månedlig sparekalkulator</h2>
      <p style={{ fontSize: '13px', color: tema.subtekst, margin: '0 0 20px' }}>Basert på alle apparatene dine og dagens priser</p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '20px' }}>
        {kort.map(k => (
          <div key={k.label} style={{ background: tema.inputBg, borderRadius: '12px', padding: '14px', textAlign: 'center' }}>
            <p style={{ fontSize: '11px', color: tema.subtekst, margin: '0 0 6px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{k.label}</p>
            <p style={{ fontSize: '22px', fontWeight: 700, color: k.farge, margin: 0 }}>{k.verdi}</p>
          </div>
        ))}
      </div>

      <div style={{ borderTop: `1px solid ${tema.border}`, paddingTop: '16px' }}>
        <h3 style={{ fontSize: '14px', fontWeight: 600, color: tema.tekst, margin: '0 0 10px' }}>Dine apparater</h3>
        {alleApparater.map(a => (
          <div key={a.navn} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: `1px solid ${tema.border}` }}>
            <span style={{ fontSize: '13px', color: tema.tekst }}>{a.ikon || '🔌'} {a.navn}</span>
            <div style={{ textAlign: 'right' }}>
              <span style={{ fontSize: '13px', color: '#ef4444', textDecoration: 'line-through', marginRight: '8px' }}>{maanedskostnad(a, snittRaw).toFixed(0)} kr</span>
              <span style={{ fontSize: '13px', color: '#22c55e', fontWeight: 600 }}>{maanedskostnad(a, billigRaw).toFixed(0)} kr</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
