'use client'
import { useEffect, useState } from 'react'
import { lagNaerTema, NAER } from '@/lib/naerTema'
import { erMottakerEnhet } from '@/lib/naer'
import NaerLogo from '@/components/NaerLogo'
import NaerMeny, { NaerSide } from '@/components/NaerMeny'
import MinePersoner from '@/components/MinePersoner'
import NaerOppsett from '@/components/NaerOppsett'
import MottakerSkjerm from '@/components/MottakerSkjerm'
import Konto from '@/components/Konto'

// Nær – trygghet for familien. Én app, to opplevelser:
//
//  • Mottakeren får ÉN rolig skjerm (MottakerSkjerm) – aktiveres med
//    invitasjonskode + samtykke under «Mer».
//  • Den pårørende (denne visningen) får KUN administrasjon: koble til sine
//    personer, legge inn påminnelser og se at de blir bekreftet.
//
// Motoren (vær, strømpriser, push, AI-tolkning) jobber i kulissene,
// men er ikke synlig som egne funksjoner – Nær har én jobb.
export default function Home() {
  const [side, setSide] = useState<NaerSide>('personer')
  // null = ikke avklart ennå (unngår hydration-hopp før localStorage er lest)
  const [mottakerModus, setMottakerModus] = useState<boolean | null>(null)
  const tema = lagNaerTema()

  useEffect(() => {
    setMottakerModus(erMottakerEnhet())
  }, [])

  useEffect(() => {
    document.body.style.background = NAER.bg
  }, [])

  if (mottakerModus === null) return null
  if (mottakerModus) {
    return <MottakerSkjerm onAvslutt={() => setMottakerModus(false)} />
  }

  const kortStil: React.CSSProperties = {
    background: tema.cardBg, borderRadius: '20px', padding: '22px', marginBottom: '14px',
    boxShadow: tema.skygge, border: `1px solid ${tema.border}`,
  }

  return (
    <main style={{
      minHeight: '100vh', background: tema.bgGradient, backgroundColor: tema.bg,
      padding: '24px 16px 104px', maxWidth: '680px', margin: '0 auto', colorScheme: 'light',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '18px' }}>
        <NaerLogo size={46} />
        <div>
          <h1 style={{ fontSize: '26px', fontWeight: 800, color: NAER.navn, margin: 0, letterSpacing: '-0.02em', lineHeight: 1.1 }}>nær</h1>
          <p style={{ fontSize: '13px', color: tema.subtekst, margin: '2px 0 0' }}>Vær nær – selv på avstand</p>
        </div>
      </div>

      {side === 'personer' && (
        <>
          <MinePersoner tema={tema} />

          <div style={kortStil}>
            <p style={{ fontSize: '11px', color: tema.subtekst, margin: '0 0 10px', textTransform: 'uppercase', letterSpacing: '0.12em', fontWeight: 700 }}>
              Slik virker det
            </p>
            <ol style={{ fontSize: '13.5px', color: tema.subtekst, margin: 0, paddingLeft: '18px', lineHeight: 1.8 }}>
              <li>Legg til personen du vil hjelpe – du får en kode.</li>
              <li>Tast koden på personens telefon eller nettbrett (under «Mer»). Personen godtar selv koblingen.</li>
              <li>Enheten blir en rolig skjerm med store bokstaver: dato, vær og dagens påminnelser.</li>
              <li>Når personen trykker «Ferdig ✓», ser du det her – og du varsles hvis noe ikke bekreftes.</li>
            </ol>
          </div>
        </>
      )}

      {side === 'mer' && (
        <>
          <Konto tema={tema} />

          <NaerOppsett tema={tema} onAktiver={() => setMottakerModus(true)} />

          <div style={kortStil}>
            <p style={{ fontSize: '11px', color: tema.subtekst, margin: '0 0 10px', textTransform: 'uppercase', letterSpacing: '0.12em', fontWeight: 700 }}>
              Om Nær
            </p>
            <p style={{ fontSize: '13.5px', color: tema.tekst, margin: '0 0 10px', lineHeight: 1.7 }}>
              Nær lar deg hjelpe noen du er glad i med hverdagen – påminnelser,
              vær og praktiske beskjeder på en skjerm de faktisk forstår – og gir
              deg visshet om at det når frem.
            </p>
            <p style={{ fontSize: '13px', color: tema.subtekst, margin: 0, lineHeight: 1.7 }}>
              Personvern er utgangspunktet: ingen posisjon, ingen sporing, ingen
              annonser. Mottakeren godtar selv koblingen og kan når som helst
              koble fra. Det eneste som deles, er påminnelsene du legger inn – og
              bekreftelsene tilbake.
            </p>
          </div>
        </>
      )}

      <p style={{ textAlign: 'center', fontSize: '11px', color: tema.subtekst, marginTop: '12px' }}>
        Nær · vær fra Yr (MET) · strømpriser fra hvakosterstrommen.no
      </p>

      <NaerMeny aktiv={side} onBytt={setSide} tema={tema} />
    </main>
  )
}
