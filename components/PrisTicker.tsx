import { Tema, getColorSterk } from '@/lib/theme'
import { SONER } from '@/lib/constants'

type Props = {
  naavaerendePris: number
  animertPris: number
  minPris: number
  maxPris: number
  snittPris: string
  spotNaa: number // pris før strømstøtte (øre)
  nettleieOre: number // nettleie + påslag (øre/kWh)
  zone: string
  onZoneChange: (zone: string) => void
  tema: Tema
}

// Tekst-etikett basert på hvor prisen ligger i dagens spenn
function prisEtikett(pris: number, min: number, max: number): string {
  const range = max - min || 1
  const ratio = (pris - min) / range
  if (ratio < 0.33) return 'Billig akkurat nå'
  if (ratio < 0.66) return 'Middels pris nå'
  return 'Dyrt akkurat nå'
}

export default function PrisTicker({
  naavaerendePris, animertPris, minPris, maxPris, snittPris, spotNaa, nettleieOre, zone, onZoneChange, tema,
}: Props) {
  if (naavaerendePris <= 0) return null

  const farge = getColorSterk(naavaerendePris, minPris, maxPris)
  const totalNaa = animertPris + nettleieOre
  const totalSnitt = (parseFloat(snittPris) + nettleieOre).toFixed(0)
  const stotteAktiv = spotNaa > naavaerendePris + 1 // strømstøtte trekker fra nå
  const harNettleie = nettleieOre > 0

  return (
    <div style={{ position: 'relative', overflow: 'hidden', background: tema.cardBg, borderRadius: '22px', padding: '22px', margin: '16px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: tema.skyggeHero, border: `1px solid ${tema.border}` }}>
      {/* Mykt fargeskjær i hjørnet, tonet etter dagens prisnivå */}
      <div style={{ position: 'absolute', top: '-60px', right: '-40px', width: '200px', height: '200px', borderRadius: '50%', background: farge, opacity: 0.13, filter: 'blur(36px)', pointerEvents: 'none' }} />
      <div style={{ position: 'relative' }}>
        <p style={{ fontSize: '11px', color: tema.subtekst, margin: '0 0 6px', textTransform: 'uppercase', letterSpacing: '0.07em', fontWeight: 600 }}>{harNettleie ? 'Totalpris nå' : 'Nåværende pris'}</p>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
          <span className="tnum" style={{ fontSize: '50px', fontWeight: 700, color: farge, lineHeight: 1, letterSpacing: '-0.03em' }}>
            {totalNaa.toFixed(1)}
          </span>
          <span style={{ fontSize: '15px', color: tema.subtekst }}>øre/kWh</span>
        </div>
        {(stotteAktiv || harNettleie) && (
          <p style={{ fontSize: '11px', color: tema.subtekst, margin: '5px 0 0' }}>
            {stotteAktiv && <>Spot <span className="tnum">{spotNaa.toFixed(0)}</span> øre · strømstøtte trukket fra</>}
            {stotteAktiv && harNettleie && ' · '}
            {harNettleie && <>inkl. nettleie {nettleieOre} øre</>}
          </p>
        )}
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', marginTop: '10px', fontSize: '12px', fontWeight: 600, color: tema.pillTekst, background: tema.pillBg, padding: '4px 11px', borderRadius: '20px' }}>
          <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: farge }} />
          {prisEtikett(naavaerendePris, minPris, maxPris)}
        </span>
      </div>
      <div style={{ position: 'relative', textAlign: 'right' }}>
        <p style={{ fontSize: '11px', color: tema.subtekst, margin: '0 0 4px' }}>Snitt i dag</p>
        <p className="tnum" style={{ fontSize: '19px', fontWeight: 600, color: tema.tekst, margin: '0 0 10px' }}>{totalSnitt} øre</p>
        <select value={zone} onChange={e => onZoneChange(e.target.value)} style={{ padding: '7px 12px', borderRadius: '11px', border: `1px solid ${tema.border}`, background: tema.inputBg, color: tema.tekst, fontSize: '12px', fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' }}>
          {SONER.map(s => <option key={s.kode} value={s.kode}>{s.navn}</option>)}
        </select>
      </div>
    </div>
  )
}
