'use client'
import { Tema } from '@/lib/theme'
import FlytLogo from '@/components/FlytLogo'

// Førstegangs velkomst. Ærlig og kort: forklarer hva Flyt er og leder rett inn
// i appen/oppsettet. Vises kun til man trykker «Kom i gang» (lagres lokalt).
const PUNKTER = [
  { emoji: '⚡', tittel: 'Billig strøm', tekst: 'Se når på dagen strømmen er billigst – og få varsel når den stuper.' },
  { emoji: '🌦️', tittel: 'Vær som betyr noe', tekst: 'Beskjed når regnet kommer, så du rekker det du må ute.' },
  { emoji: '📌', tittel: 'Påminnelser', tekst: 'Tømmedag og dine egne huskelapper – levert som varsel til riktig tid.' },
]

export default function Intro({ tema, onStart }: { tema: Tema; onStart: () => void }) {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 100, background: tema.bgGradient, backgroundColor: tema.bg, overflowY: 'auto' }}>
      <div style={{ maxWidth: '480px', margin: '0 auto', minHeight: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '40px 24px calc(40px + env(safe-area-inset-bottom))' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', marginBottom: '32px' }}>
          <FlytLogo size={72} />
          <h1 style={{ fontSize: '34px', fontWeight: 700, color: tema.tekst, margin: '18px 0 0', letterSpacing: '-0.03em' }}>Flyt</h1>
          <p style={{ fontSize: '16px', color: tema.subtekst, margin: '10px 0 0', lineHeight: 1.6, maxWidth: '340px' }}>
            Din ærlige hverdagsassistent. Strøm, vær og påminnelser samlet på ett sted – og den sier bare ifra om ting den faktisk vet.
          </p>
        </div>

        <div style={{ display: 'grid', gap: '12px', marginBottom: '32px' }}>
          {PUNKTER.map(p => (
            <div key={p.tittel} style={{ display: 'flex', gap: '14px', alignItems: 'flex-start', background: tema.cardBg, borderRadius: '16px', padding: '16px 18px', boxShadow: tema.skygge, border: `1px solid ${tema.border}` }}>
              <span style={{ fontSize: '24px', lineHeight: 1.2 }}>{p.emoji}</span>
              <span>
                <span style={{ display: 'block', fontSize: '15px', fontWeight: 700, color: tema.tekst }}>{p.tittel}</span>
                <span style={{ display: 'block', fontSize: '13px', color: tema.subtekst, marginTop: '2px', lineHeight: 1.5 }}>{p.tekst}</span>
              </span>
            </div>
          ))}
        </div>

        <button type="button" onClick={onStart} style={{ width: '100%', padding: '16px', borderRadius: '16px', border: 'none', background: tema.accentGradient, color: '#fff', cursor: 'pointer', fontSize: '16px', fontWeight: 700, fontFamily: 'inherit', boxShadow: tema.skyggeHero }}>
          Kom i gang
        </button>
        <p style={{ fontSize: '11px', color: tema.subtekst, textAlign: 'center', margin: '16px 0 0', lineHeight: 1.6 }}>
          Gratis. Ingen pålogging nødvendig for å begynne.
        </p>
      </div>
    </div>
  )
}
