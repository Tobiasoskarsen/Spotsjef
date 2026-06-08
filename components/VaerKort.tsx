import { VaerTime, tolkSymbol, nesteNedbor } from '@/lib/vaer'
import { Tema } from '@/lib/theme'

type Props = {
  vaer: VaerTime[]
  laster: boolean
  tema: Tema
}

export default function VaerKort({ vaer, laster, tema }: Props) {
  if (laster) {
    return (
      <div style={{ background: tema.cardBg, borderRadius: '18px', padding: '20px', marginBottom: '14px', textAlign: 'center', color: tema.subtekst, boxShadow: tema.skygge, border: `1px solid ${tema.border}` }}>
        Henter vær...
      </div>
    )
  }
  if (vaer.length === 0) return null

  const naa = vaer[0]
  const naaVaer = tolkSymbol(naa.symbol)
  const regn = nesteNedbor(vaer, 6)

  return (
    <div style={{ background: tema.cardBg, borderRadius: '18px', padding: '20px', marginBottom: '14px', boxShadow: tema.skygge, border: `1px solid ${tema.border}` }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <span style={{ fontSize: '40px', lineHeight: 1 }}>{naaVaer.emoji}</span>
          <div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
              <span style={{ fontSize: '32px', fontWeight: 500, color: tema.tekst, lineHeight: 1 }}>
                {naa.temp !== null ? Math.round(naa.temp) : '–'}
              </span>
              <span style={{ fontSize: '16px', color: tema.subtekst }}>°C</span>
            </div>
            <p style={{ fontSize: '13px', color: tema.subtekst, margin: '4px 0 0' }}>{naaVaer.tekst}</p>
          </div>
        </div>
        {naa.vind !== null && (
          <div style={{ textAlign: 'right' }}>
            <p style={{ fontSize: '11px', color: tema.subtekst, margin: '0 0 2px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Vind</p>
            <p style={{ fontSize: '16px', fontWeight: 500, color: tema.tekst, margin: 0 }}>{Math.round(naa.vind)} m/s</p>
          </div>
        )}
      </div>

      {regn && (
        <div style={{ background: tema.inputBg, borderRadius: '12px', padding: '12px 14px', fontSize: '13px', color: tema.tekst }}>
          🌧️ Nedbør ventet rundt kl. {new Date(regn.tid).getHours()}:00 ({regn.nedbor.toFixed(1)} mm)
        </div>
      )}

      {/* Time-for-time rad de neste 8 timene */}
      <div style={{ display: 'flex', gap: '4px', marginTop: '16px', overflowX: 'auto' }}>
        {vaer.slice(0, 8).map((t, i) => {
          const v = tolkSymbol(t.symbol)
          return (
            <div key={i} style={{ flex: 1, minWidth: '44px', textAlign: 'center' }}>
              <div style={{ fontSize: '11px', color: tema.subtekst }}>{new Date(t.tid).getHours()}</div>
              <div style={{ fontSize: '18px', margin: '4px 0' }}>{v.emoji}</div>
              <div style={{ fontSize: '12px', color: tema.tekst, fontWeight: 500 }}>{t.temp !== null ? Math.round(t.temp) + '°' : '–'}</div>
            </div>
          )
        })}
      </div>

      <p style={{ fontSize: '10px', color: tema.subtekst, margin: '14px 0 0', textAlign: 'center' }}>
        Værdata fra MET / Yr
      </p>
    </div>
  )
}
