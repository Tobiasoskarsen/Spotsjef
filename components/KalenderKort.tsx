'use client'
import { useEffect, useState } from 'react'
import { Tema } from '@/lib/theme'
import { KalenderEvent, hentKalender, lesKalenderUrl, lagreKalenderUrl } from '@/lib/kalender'
import { Calendar, ChevronDown, ChevronUp, X } from 'lucide-react'

// Lar brukeren koble på kalenderen sin via en .ics-lenke (iCloud/Google/Outlook).
// Avtalene vises i appen. Lenken lagres lokalt på enheten.
const GUIDE: { tittel: string; steg: string[] }[] = [
  {
    tittel: 'iPhone / iCloud',
    steg: [
      'Åpne Kalender-appen på Mac, eller iCloud.com → Kalender.',
      'Hold over kalenderen → trykk del-ikonet.',
      'Skru på «Offentlig kalender» og kopier lenken (webcal://…).',
      'Lim den inn her.',
    ],
  },
  {
    tittel: 'Google Kalender',
    steg: [
      'Åpne Google Kalender på PC.',
      'Hold over kalenderen → de tre prikkene → «Innstillinger og deling».',
      'Under «Integrer kalender»: kopier «Hemmelig adresse i iCal-format».',
      'Lim den inn her.',
    ],
  },
  {
    tittel: 'Outlook',
    steg: [
      'Outlook.com → Innstillinger → Kalender → «Delte kalendere».',
      'Publiser kalenderen og velg «Kan vise alle detaljer».',
      'Kopier ICS-lenken.',
      'Lim den inn her.',
    ],
  },
]

export default function KalenderKort({ tema }: { tema: Tema }) {
  const [url, setUrl] = useState('')
  const [events, setEvents] = useState<KalenderEvent[]>([])
  const [laster, setLaster] = useState(false)
  const [feil, setFeil] = useState('')
  const [tilkoblet, setTilkoblet] = useState(false)
  const [visGuide, setVisGuide] = useState(false)

  useEffect(() => {
    const lagret = lesKalenderUrl()
    if (lagret) {
      setUrl(lagret)
      setTilkoblet(true)
      void oppdater(lagret)
    }
  }, [])

  async function oppdater(adresse: string) {
    setLaster(true)
    setFeil('')
    const { events, feil } = await hentKalender(adresse)
    if (feil) setFeil(feil)
    else setEvents(events)
    setLaster(false)
  }

  async function koble() {
    const adresse = url.trim()
    if (!adresse) { setFeil('Lim inn en kalender-lenke først.'); return }
    setLaster(true)
    setFeil('')
    const { events, feil } = await hentKalender(adresse)
    if (feil) {
      setFeil(feil)
      setLaster(false)
      return
    }
    lagreKalenderUrl(adresse)
    setTilkoblet(true)
    setEvents(events)
    setLaster(false)
  }

  function koateFra() {
    lagreKalenderUrl('')
    setTilkoblet(false)
    setEvents([])
    setUrl('')
    setFeil('')
  }

  const kortStil: React.CSSProperties = {
    background: tema.cardBg, borderRadius: '18px', padding: '18px', marginBottom: '14px',
    boxShadow: tema.skygge, border: `1px solid ${tema.border}`,
  }
  const inputStil: React.CSSProperties = {
    width: '100%', padding: '12px 14px', borderRadius: '12px', border: `1px solid ${tema.border}`,
    background: tema.inputBg, color: tema.tekst, fontSize: '13px', fontFamily: 'inherit',
    outline: 'none', boxSizing: 'border-box',
  }

  function vis(tidISO: string): string {
    const d = new Date(tidISO)
    return d.toLocaleString('nb-NO', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div style={kortStil}>
      <p style={{ fontSize: '11px', color: tema.subtekst, margin: '0 0 12px', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
        <Calendar size={13} /> Kalender
      </p>

      {tilkoblet ? (
        <>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', marginBottom: '12px' }}>
            <span style={{ fontSize: '13px', color: tema.tekst, fontWeight: 600 }}>Kalender tilkoblet ✓</span>
            <button onClick={koateFra} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: 'transparent', border: 'none', color: tema.subtekst, cursor: 'pointer', fontSize: '12px', fontFamily: 'inherit' }}>
              <X size={13} /> Koble fra
            </button>
          </div>

          {laster ? (
            <p style={{ fontSize: '13px', color: tema.subtekst, margin: 0 }}>Henter avtaler …</p>
          ) : events.length > 0 ? (
            <div style={{ display: 'grid', gap: '8px' }}>
              {events.slice(0, 8).map((e, i) => (
                <div key={i} style={{ background: tema.inputBg, borderRadius: '10px', padding: '9px 12px' }}>
                  <p style={{ fontSize: '13px', color: tema.tekst, margin: 0 }}>{e.tekst}</p>
                  <p style={{ fontSize: '11.5px', color: tema.subtekst, margin: 0 }}>{vis(e.tid)}</p>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ fontSize: '13px', color: tema.subtekst, margin: 0 }}>Ingen kommende avtaler de neste 30 dagene.</p>
          )}
          {feil && <p style={{ fontSize: '12px', color: '#d1605f', margin: '10px 0 0' }}>{feil}</p>}
        </>
      ) : (
        <>
          <p style={{ fontSize: '13px', color: tema.subtekst, margin: '0 0 12px', lineHeight: 1.6 }}>
            Lim inn en kalender-lenke (.ics), så viser Flyt avtalene dine. Funker med iPhone, Google og Outlook.
          </p>
          <input value={url} onChange={e => setUrl(e.target.value)} placeholder="https://… eller webcal://…" style={inputStil} />
          <button
            onClick={koble}
            disabled={laster}
            style={{ width: '100%', marginTop: '10px', padding: '12px', borderRadius: '12px', border: 'none', background: tema.accentGradient, color: '#fff', cursor: laster ? 'default' : 'pointer', fontSize: '14px', fontWeight: 700, fontFamily: 'inherit', opacity: laster ? 0.7 : 1 }}
          >
            {laster ? 'Kobler til …' : 'Koble til kalender'}
          </button>
          {feil && <p style={{ fontSize: '12px', color: '#d1605f', margin: '10px 0 0' }}>{feil}</p>}
        </>
      )}

      {/* Slik setter du det opp */}
      <button
        onClick={() => setVisGuide(v => !v)}
        style={{ width: '100%', marginTop: '14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'transparent', border: 'none', color: tema.tekst, cursor: 'pointer', fontSize: '13px', fontWeight: 600, fontFamily: 'inherit', padding: '4px 0' }}
      >
        Slik setter du det opp
        {visGuide ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </button>

      {visGuide && (
        <div style={{ marginTop: '10px', display: 'grid', gap: '14px' }}>
          {GUIDE.map(g => (
            <div key={g.tittel} style={{ background: tema.inputBg, borderRadius: '12px', padding: '14px' }}>
              <p style={{ fontSize: '13px', fontWeight: 700, color: tema.tekst, margin: '0 0 8px' }}>{g.tittel}</p>
              <ol style={{ margin: 0, paddingLeft: '18px', color: tema.subtekst, fontSize: '12.5px', lineHeight: 1.7 }}>
                {g.steg.map((s, i) => <li key={i}>{s}</li>)}
              </ol>
            </div>
          ))}
          <p style={{ fontSize: '11.5px', color: tema.subtekst, margin: 0, lineHeight: 1.6 }}>
            Tips: Det er en «kun lese»-lenke. Flyt kan se avtalene, men aldri endre kalenderen din.
          </p>
        </div>
      )}
    </div>
  )
}
