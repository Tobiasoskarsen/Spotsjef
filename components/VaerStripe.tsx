import { VaerTime, tolkSymbol, nesteNedbor } from '@/lib/vaer'
import { Tema } from '@/lib/theme'

// Slank værglimt på hjem: bare det viktigste – grad, vær nå, og evt. neste regn.
// (Ikke det store værkortet – assistenten gir værråd, dette gir et raskt blikk.)
type Props = {
  vaer: VaerTime[]
  tema: Tema
}

export default function VaerStripe({ vaer, tema }: Props) {
  if (vaer.length === 0) return null

  const naa = vaer[0]
  const v = tolkSymbol(naa.symbol)
  const regn = nesteNedbor(vaer, 8)

  const tekst = naa.temp !== null
    ? `${Math.round(naa.temp)}°, ${v.tekst.toLowerCase()}`
    : v.tekst

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', background: tema.cardBg, borderRadius: '14px', padding: '12px 16px', marginBottom: '14px', boxShadow: tema.skygge, border: `1px solid ${tema.border}` }}>
      <span style={{ fontSize: '26px', lineHeight: 1 }}>{v.emoji}</span>
      <span style={{ fontSize: '14px', color: tema.tekst }}>
        {tekst}
        {regn && (
          <span style={{ color: tema.subtekst }}> · regn fra kl. {new Date(regn.tid).getHours()}</span>
        )}
      </span>
    </div>
  )
}
