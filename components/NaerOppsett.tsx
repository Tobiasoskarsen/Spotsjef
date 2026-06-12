'use client'
import { useState } from 'react'
import { Tema } from '@/lib/naerTema'
import { useBruker } from '@/lib/bruker'
import { aksepterInvitasjon, settMottakerEnhet } from '@/lib/naer'
import { koblBrukerTilPush, pushStottes } from '@/lib/pushClient'
import { HeartHandshake } from 'lucide-react'

// Nær – gjør denne enheten til en mottaker-skjerm. Vanligvis er det den
// pårørende som sitter med mottakerens telefon/nettbrett og gjør dette.
// Samtykket er eksplisitt: vi forklarer i klartekst hva koblingen betyr,
// og mottakeren (eller den som hjelper) må aktivt godta.
export default function NaerOppsett({ tema, onAktiver }: { tema: Tema; onAktiver: () => void }) {
  const { brukerId } = useBruker()
  const [kode, setKode] = useState('')
  const [steg, setSteg] = useState<'kode' | 'samtykke'>('kode')
  const [feil, setFeil] = useState('')
  const [jobber, setJobber] = useState(false)

  const kortStil: React.CSSProperties = {
    background: tema.cardBg, borderRadius: '18px', padding: '18px', marginBottom: '14px',
    boxShadow: tema.skygge, border: `1px solid ${tema.border}`,
  }

  async function godta() {
    if (!brukerId) {
      setFeil('Ingen tilkobling til konto. Sjekk nettet og prøv igjen.')
      return
    }
    setJobber(true)
    setFeil('')
    const { ok, feil: f } = await aksepterInvitasjon(kode)
    if (!ok) {
      setFeil(f || 'Noe gikk galt. Prøv igjen.')
      setSteg('kode')
      setJobber(false)
      return
    }
    // Slå på varsler så påminnelsene faktisk når frem (best effort – skjermen
    // viser dem uansett)
    if (pushStottes()) await koblBrukerTilPush(brukerId)
    settMottakerEnhet(true)
    setJobber(false)
    onAktiver()
  }

  return (
    <div style={kortStil}>
      <p style={{ fontSize: '11px', color: tema.subtekst, margin: '0 0 10px', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
        <HeartHandshake size={13} /> Nær – enkel skjerm
      </p>

      {steg === 'kode' && (
        <>
          <p style={{ fontSize: '13px', color: tema.subtekst, margin: '0 0 12px', lineHeight: 1.6 }}>
            Skal denne enheten brukes av den som mottar påminnelser? Tast inn
            koden fra den i familien som har satt opp Nær.
          </p>
          <div style={{ display: 'flex', gap: '8px' }}>
            <input
              value={kode}
              onChange={e => { setKode(e.target.value.toUpperCase()); setFeil('') }}
              placeholder="F.eks. K7M2PA"
              maxLength={6}
              autoCapitalize="characters"
              style={{ flex: 1, padding: '12px 14px', borderRadius: '12px', border: `1px solid ${tema.border}`, background: tema.inputBg, color: tema.tekst, fontSize: '18px', fontFamily: 'inherit', letterSpacing: '0.2em', fontWeight: 700, textAlign: 'center', outline: 'none' }}
            />
            <button
              type="button"
              onClick={() => { if (kode.trim().length >= 4) setSteg('samtykke'); else setFeil('Tast inn hele koden.') }}
              style={{ flexShrink: 0, padding: '0 18px', borderRadius: '12px', border: 'none', background: tema.accentGradient, color: '#fff', cursor: 'pointer', fontSize: '14px', fontWeight: 700, fontFamily: 'inherit' }}
            >
              Neste
            </button>
          </div>
          {feil && <p style={{ fontSize: '12px', color: '#d1605f', margin: '10px 0 0' }}>{feil}</p>}
        </>
      )}

      {steg === 'samtykke' && (
        <>
          <p style={{ fontSize: '15px', color: tema.tekst, margin: '0 0 10px', fontWeight: 600, lineHeight: 1.5 }}>
            Før vi kobler til – dette betyr det:
          </p>
          <ul style={{ fontSize: '13.5px', color: tema.subtekst, margin: '0 0 14px', paddingLeft: '18px', lineHeight: 1.7 }}>
            <li>Den som ga deg koden kan legge inn påminnelser som vises på denne skjermen.</li>
            <li>Når du trykker «Ferdig ✓» på en påminnelse, kan de se at du har bekreftet den – og når.</li>
            <li>Ingenting annet deles: ikke posisjon, ikke hva du ellers gjør på enheten.</li>
            <li>Du kan når som helst koble fra igjen.</li>
          </ul>
          <div style={{ display: 'grid', gap: '8px' }}>
            <button
              type="button"
              onClick={godta}
              disabled={jobber}
              style={{ padding: '14px', borderRadius: '12px', border: 'none', background: tema.accentGradient, color: '#fff', cursor: jobber ? 'default' : 'pointer', fontSize: '15px', fontWeight: 700, fontFamily: 'inherit', opacity: jobber ? 0.7 : 1 }}
            >
              {jobber ? 'Kobler til …' : 'Det er greit – koble til'}
            </button>
            <button
              type="button"
              onClick={() => setSteg('kode')}
              style={{ padding: '10px', borderRadius: '12px', border: 'none', background: 'transparent', color: tema.subtekst, cursor: 'pointer', fontSize: '13px', fontFamily: 'inherit' }}
            >
              Avbryt
            </button>
          </div>
          {feil && <p style={{ fontSize: '12px', color: '#d1605f', margin: '10px 0 0' }}>{feil}</p>}
        </>
      )}
    </div>
  )
}
