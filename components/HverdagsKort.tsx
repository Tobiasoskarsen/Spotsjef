import { VaerTime, nesteNedbor } from '@/lib/vaer'
import { Tema } from '@/lib/theme'

type Props = {
  vaer: VaerTime[]
  tema: Tema
}

function hentHuskeliste(ukedag: number, regnSnart: boolean) {
  const liste: string[] = []

  if (ukedag === 1 || ukedag === 4) {
    liste.push('Husk å sette ut matavfallet')
  }
  if (ukedag >= 1 && ukedag <= 5) {
    liste.push('Sjekk om treningsbagen er pakket')
  }
  if (ukedag === 5) {
    liste.push('Sjekk post og pakker før helgen')
  }
  if (regnSnart) {
    liste.push('Handle før regnet')
  }
  if (liste.length === 0) {
    liste.push('Sjekk at du har alt klart for dagen')
  }

  return liste
}

function hentAgenda(ukedag: number, regnSnart: boolean) {
  if (regnSnart) {
    return 'Dagens viktigste: Handle og dra ut ærend før regnværet kommer.'
  }
  if (ukedag === 6 || ukedag === 0) {
    return 'Dagens viktigste: Ta en rolig start på helgen og planlegg utesysler etter været.'
  }
  return 'Dagens viktigste: Få pakket treningsbagen og sjekk om matavfallet skal ut.'
}

export default function HverdagsKort({ vaer, tema }: Props) {
  const ukedag = new Date().getDay()
  const regn = vaer.length > 0 ? nesteNedbor(vaer, 6) : null
  const huskeliste = hentHuskeliste(ukedag, Boolean(regn))
  const agenda = hentAgenda(ukedag, Boolean(regn))

  return (
    <div style={{ background: tema.cardBg, borderRadius: '20px', padding: '22px', boxShadow: tema.skygge, border: `1px solid ${tema.border}` }}>
      <p style={{ fontSize: '11px', color: tema.subtekst, margin: '0 0 10px', textTransform: 'uppercase', letterSpacing: '0.12em', fontWeight: 700 }}>Hverdagsassistent</p>
      <div style={{ display: 'grid', gap: '16px' }}>
        <div>
          <p style={{ fontSize: '13px', color: tema.tekst, margin: '0 0 10px', fontWeight: 700 }}>Praktiske påminnelser</p>
          <ul style={{ margin: 0, paddingLeft: '18px', color: tema.subtekst, fontSize: '13px', lineHeight: 1.6 }}>
            {huskeliste.map((tekst, index) => (
              <li key={index} style={{ marginBottom: '6px' }}>{tekst}</li>
            ))}
          </ul>
        </div>

        <div style={{ background: tema.inputBg, borderRadius: '16px', padding: '14px 16px', color: tema.tekst }}>
          <p style={{ fontSize: '12px', color: tema.subtekst, margin: '0 0 8px', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700 }}>Dagens viktigste</p>
          <p style={{ fontSize: '14px', margin: 0, lineHeight: 1.6 }}>{agenda}</p>
        </div>
      </div>
    </div>
  )
}
