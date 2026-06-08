import { Apparat, Pris } from '@/lib/types'
import { Tema } from '@/lib/theme'
import { maanedskostnad } from '@/lib/priser'

type Props = {
  alleApparater: Apparat[]
  priser: Pris[]
  nettleie: number // kr/kWh
  darkMode: boolean
  tema: Tema
}

export default function Kalkulator({ alleApparater, priser, nettleie, tema }: Props) {
  const billigRaw = priser.length ? Math.min(...priser.map(p => p.raw)) : 0.3
  const snittRaw = priser.length ? priser.reduce((s, p) => s + p.raw, 0) / priser.length : 0.8

  const vanligMaaned = alleApparater.reduce((sum, a) => sum + maanedskostnad(a, snittRaw, nettleie), 0).toFixed(0)
  const maanedEstimat = alleApparater.reduce((sum, a) => sum + maanedskostnad(a, billigRaw, nettleie), 0).toFixed(0)
  const sparing = (parseFloat(vanligMaaned) - parseFloat(maanedEstimat)).toFixed(0)

  const kort = [
    { label: 'Uten optimering', verdi: `${vanligMaaned} kr`, farge: '#c98a7a' },
    { label: 'Med Flyt', verdi: `${maanedEstimat} kr`, farge: tema.accent },
    { label: 'Du sparer', verdi: `${sparing} kr`, farge: tema.tekst },
  ]

  return (
    <div style={{ background: tema.cardBg, borderRadius: '18px', padding: '20px', marginBottom: '14px' }}>
      <h2 style={{ fontSize: '15px', fontWeight: 500, color: tema.tekst, margin: '0 0 6px' }}>Månedlig sparekalkulator</h2>
      <p style={{ fontSize: '13px', color: tema.subtekst, margin: '0 0 20px' }}>Basert på apparatene dine, hvor ofte du bruker dem, og dagens priser</p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginBottom: '20px' }}>
        {kort.map(k => (
          <div key={k.label} style={{ background: tema.inputBg, borderRadius: '14px', padding: '16px', textAlign: 'center' }}>
            <p style={{ fontSize: '11px', color: tema.subtekst, margin: '0 0 6px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{k.label}</p>
            <p style={{ fontSize: '22px', fontWeight: 500, color: k.farge, margin: 0 }}>{k.verdi}</p>
          </div>
        ))}
      </div>

      <div style={{ borderTop: `1px solid ${tema.border}`, paddingTop: '16px' }}>
        <h3 style={{ fontSize: '14px', fontWeight: 500, color: tema.tekst, margin: '0 0 10px' }}>Dine apparater</h3>
        {alleApparater.map(a => (
          <div key={a.navn} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: `1px solid ${tema.border}` }}>
            <span style={{ fontSize: '13px', color: tema.tekst }}>{a.ikon || '🔌'} {a.navn} <span style={{ color: tema.subtekst }}>· {a.gangerPerUke ?? 7}×/uke</span></span>
            <div style={{ textAlign: 'right' }}>
              <span style={{ fontSize: '13px', color: '#c98a7a', textDecoration: 'line-through', marginRight: '8px' }}>{maanedskostnad(a, snittRaw, nettleie).toFixed(0)} kr</span>
              <span style={{ fontSize: '13px', color: tema.accent, fontWeight: 500 }}>{maanedskostnad(a, billigRaw, nettleie).toFixed(0)} kr</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
