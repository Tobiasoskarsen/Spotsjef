'use client'
import { useState } from 'react'
import { Tema } from '@/lib/theme'
import { Apparat } from '@/lib/types'
import { APPARATER } from '@/lib/constants'
import FlytLogo from '@/components/FlytLogo'
import { Check } from 'lucide-react'

// Førstegangs velkomst i to steg:
// 1) Hva er Flyt? 2) Hvilke apparater har du? (ingenting er forhåndsvalgt –
// appen antar ikke at du har elbil eller badstue, den spør.)
// Valget blir apparatlista di; flere kan legges til senere under Planlegg.
const PUNKTER = [
  { emoji: '⚡', tittel: 'Billig strøm', tekst: 'Se når på dagen strømmen er billigst – og få varsel når den stuper.' },
  { emoji: '🌦️', tittel: 'Vær som betyr noe', tekst: 'Beskjed når regnet kommer, så du rekker det du må ute.' },
  { emoji: '📌', tittel: 'Påminnelser', tekst: 'Tømmedag og dine egne huskelapper – levert som varsel til riktig tid.' },
]

type Props = {
  tema: Tema
  onStart: (apparater: Apparat[]) => void
}

export default function Intro({ tema, onStart }: Props) {
  const [steg, setSteg] = useState(0)
  const [valgte, setValgte] = useState<string[]>([])

  function veksle(navn: string) {
    setValgte(v => (v.includes(navn) ? v.filter(n => n !== navn) : [...v, navn]))
  }

  function fullfor() {
    onStart(APPARATER.filter(a => valgte.includes(a.navn)))
  }

  const knappStil: React.CSSProperties = {
    width: '100%', padding: '16px', borderRadius: '16px', border: 'none',
    background: tema.accentGradient, color: '#fff', cursor: 'pointer',
    fontSize: '16px', fontWeight: 700, fontFamily: 'inherit', boxShadow: tema.skyggeHero,
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 100, background: tema.bgGradient, backgroundColor: tema.bg, overflowY: 'auto' }}>
      <div style={{ maxWidth: '480px', margin: '0 auto', minHeight: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '40px 24px calc(40px + env(safe-area-inset-bottom))' }}>

        {steg === 0 && (
          <>
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

            <button type="button" onClick={() => setSteg(1)} style={knappStil}>
              Kom i gang
            </button>
            <p style={{ fontSize: '11px', color: tema.subtekst, textAlign: 'center', margin: '16px 0 0', lineHeight: 1.6 }}>
              Gratis. Ingen pålogging nødvendig for å begynne.
            </p>
          </>
        )}

        {steg === 1 && (
          <>
            <div style={{ textAlign: 'center', marginBottom: '24px' }}>
              <h1 style={{ fontSize: '26px', fontWeight: 700, color: tema.tekst, margin: 0, letterSpacing: '-0.02em', lineHeight: 1.25 }}>
                Hvilke apparater har du?
              </h1>
              <p style={{ fontSize: '14px', color: tema.subtekst, margin: '10px 0 0', lineHeight: 1.6 }}>
                Velg de du har hjemme, så finner Flyt det billigste tidspunktet å bruke dem. Du kan også hoppe over og legge dem til senere.
              </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '24px' }}>
              {APPARATER.map(a => {
                const erValgt = valgte.includes(a.navn)
                return (
                  <button
                    key={a.navn}
                    type="button"
                    onClick={() => veksle(a.navn)}
                    aria-pressed={erValgt}
                    style={{
                      position: 'relative', textAlign: 'left', padding: '14px',
                      borderRadius: '14px', cursor: 'pointer', fontFamily: 'inherit',
                      border: erValgt ? `1.5px solid ${tema.accent}` : `1.5px solid ${tema.border}`,
                      background: erValgt ? tema.accentBg : tema.cardBg,
                      transition: 'all 0.15s',
                    }}
                  >
                    {erValgt && (
                      <span style={{ position: 'absolute', top: '10px', right: '10px', width: '20px', height: '20px', borderRadius: '50%', background: tema.accent, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Check size={13} strokeWidth={3} />
                      </span>
                    )}
                    <span style={{ fontSize: '22px', display: 'block', marginBottom: '6px' }}>{a.ikon}</span>
                    <span style={{ fontSize: '13.5px', fontWeight: 600, color: erValgt ? tema.pillTekst : tema.tekst, display: 'block', paddingRight: '20px' }}>{a.navn}</span>
                  </button>
                )
              })}
            </div>

            <button type="button" onClick={fullfor} style={knappStil}>
              {valgte.length === 0 ? 'Hopp over for nå' : `Start appen (${valgte.length} valgt)`}
            </button>
            <button
              type="button"
              onClick={() => setSteg(0)}
              style={{ marginTop: '14px', background: 'transparent', border: 'none', color: tema.subtekst, cursor: 'pointer', fontSize: '13px', fontFamily: 'inherit', textDecoration: 'underline' }}
            >
              Tilbake
            </button>
          </>
        )}
      </div>
    </div>
  )
}
