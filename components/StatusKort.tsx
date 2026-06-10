import { Pris } from '@/lib/types'
import { Tema } from '@/lib/theme'

// Trafikklys-kortet: forsiden sier i klartekst om strømmen er billig, normal
// eller dyr AKKURAT NÅ – med farge. Tallet står lite under for de som vil ha
// det. Prinsipp: en 90-åring skal forstå kortet uten å kunne ordet «spotpris».
type Props = {
  priser: Pris[]
  nettleieOre: number
  tariffType: 'spot' | 'norgespris'
  laster: boolean
  tema: Tema
}

// Dempet trafikklys-palett (faste farger, leselig i både lys og mørk modus)
const NIVAA = {
  billig: { bg: '#9ec9b0', tekst: '#16331f', sub: '#2e5239' },
  normal: { bg: '#e6cf9a', tekst: '#473511', sub: '#6a5526' },
  dyr: { bg: '#dab3a6', tekst: '#46211a', sub: '#6b392f' },
  noytral: { bg: 'transparent', tekst: '', sub: '' },
}

export default function StatusKort({ priser, nettleieOre, tariffType, laster, tema }: Props) {
  const kortBase: React.CSSProperties = {
    borderRadius: '20px', padding: '24px', marginBottom: '14px',
    boxShadow: tema.skygge, border: `1px solid ${tema.border}`,
  }

  if (tariffType === 'norgespris') {
    return (
      <div style={{ ...kortBase, background: tema.cardBg }}>
        <p style={{ fontSize: '22px', fontWeight: 700, color: tema.tekst, margin: 0, lineHeight: 1.3 }}>
          Fast strømpris hele døgnet
        </p>
        <p style={{ fontSize: '14px', color: tema.subtekst, margin: '8px 0 0' }}>
          Norgespris: 50 øre/kWh – du trenger ikke tenke på tidspunkt.
        </p>
      </div>
    )
  }

  if (laster && priser.length === 0) {
    return (
      <div style={{ ...kortBase, background: tema.cardBg }}>
        <p style={{ fontSize: '16px', color: tema.subtekst, margin: 0 }}>Henter dagens strømpriser …</p>
      </div>
    )
  }

  if (priser.length === 0) {
    return (
      <div style={{ ...kortBase, background: tema.cardBg }}>
        <p style={{ fontSize: '16px', color: tema.subtekst, margin: 0 }}>Fikk ikke hentet strømprisene akkurat nå.</p>
      </div>
    )
  }

  const time = new Date().getHours()
  const naaSpot = priser[time]?.pris ?? 0
  const naa = naaSpot + nettleieOre
  const min = Math.min(...priser.map(p => p.pris))
  const max = Math.max(...priser.map(p => p.pris))
  const ratio = (naaSpot - min) / (max - min || 1)

  // Billigste time som fortsatt er igjen av døgnet (til «vent til kl. X»-hintet)
  const kommende = priser.slice(time + 1)
  const billigste = kommende.length > 0
    ? kommende.reduce((a, b) => (b.pris < a.pris ? b : a))
    : null

  let nivaa: { bg: string; tekst: string; sub: string }
  let tittel: string
  let raad: string
  if (ratio < 0.33) {
    nivaa = NIVAA.billig
    tittel = 'Strømmen er billig nå'
    raad = 'Fin tid for vask, oppvask og lading.'
  } else if (ratio < 0.66) {
    nivaa = NIVAA.normal
    tittel = 'Strømmen er midt på treet'
    raad = billigste && billigste.pris < naaSpot * 0.85
      ? `Billigere kl. ${billigste.time} hvis du kan vente.`
      : 'Helt greit å bruke strøm nå.'
  } else {
    nivaa = NIVAA.dyr
    tittel = 'Strømmen er dyr nå'
    raad = billigste && billigste.pris < naaSpot
      ? `Vent til kl. ${billigste.time} med det strømkrevende.`
      : 'Vent med det strømkrevende hvis du kan.'
  }

  return (
    <div style={{ ...kortBase, background: nivaa.bg, border: 'none' }}>
      <p style={{ fontSize: '24px', fontWeight: 700, color: nivaa.tekst, margin: 0, lineHeight: 1.25, letterSpacing: '-0.01em' }}>
        {tittel}
      </p>
      <p style={{ fontSize: '15px', fontWeight: 500, color: nivaa.sub, margin: '8px 0 0', lineHeight: 1.5 }}>
        {raad}
      </p>
      <p className="tnum" style={{ fontSize: '13px', color: nivaa.sub, margin: '12px 0 0' }}>
        {naa.toFixed(0)} øre/kWh nå{nettleieOre > 0 ? ' (med nettleie)' : ''}
      </p>
    </div>
  )
}
