'use client'
import { useCallback, useEffect, useState } from 'react'
import { NAER } from '@/lib/naerTema'
import { useBruker } from '@/lib/bruker'
import {
  NaerReminder, Kvittering, Hilsen, hentMineHendelser, hentVentendeKvitteringer,
  bekreftKvittering, bekreftReminderTidlig, hentMinKobling, hentHilsener, settMottakerEnhet,
} from '@/lib/naer'
import { VaerTime, hentVaer, tolkSymbol } from '@/lib/vaer'
import { hentAltData, prisStatistikk, lesPrisCache } from '@/lib/priser'
import { Pris } from '@/lib/types'
import { useAutoOppdater } from '@/lib/useAutoOppdater'

// Nær – mottakerskjermen. ÉN skjerm, ingen menyer, umulig å rote seg bort.
// Viser dato + vær, neste hendelse med stor «Ferdig ✓»-knapp, og praktiske
// kort kun når de er relevante. Alt i stor skrift og høy kontrast.
//
// Offline-tolerant: siste kjente påminnelser caches lokalt og vises uten nett.

const CACHE_NOKKEL = 'naer:hendelser'

type Hovedkort =
  | { type: 'kvittering'; kvittering: Kvittering }
  | { type: 'reminder'; reminder: NaerReminder }
  | null

export default function MottakerSkjerm({ onAvslutt }: { onAvslutt: () => void }) {
  const { brukerId, laster: lasterBruker } = useBruker()
  const [hendelser, setHendelser] = useState<NaerReminder[]>([])
  const [ventende, setVentende] = useState<Kvittering[]>([])
  const [vaer, setVaer] = useState<VaerTime[]>([])
  const [priser, setPriser] = useState<Pris[]>([])
  const [koblingNavn, setKoblingNavn] = useState('')
  const [hilsener, setHilsener] = useState<Hilsen[]>([])
  const [hilsenIndeks, setHilsenIndeks] = useState(0)
  const [naa, setNaa] = useState(new Date())
  const [nettopBekreftet, setNettopBekreftet] = useState(false)
  const [jobber, setJobber] = useState(false)

  // Klokka og «i dag» skal alltid stemme – oppdater hvert minutt
  useEffect(() => {
    const t = setInterval(() => setNaa(new Date()), 60_000)
    return () => clearInterval(t)
  }, [])

  const lastData = useCallback(async (uid: string) => {
    const [h, v] = await Promise.all([hentMineHendelser(uid), hentVentendeKvitteringer(uid)])
    // Nådde vi databasen, oppdater cache; ellers beholdes siste kjente
    if (h.length > 0 || v.length === 0) {
      try { localStorage.setItem(CACHE_NOKKEL, JSON.stringify(h)) } catch {}
    }
    setHendelser(h)
    setVentende(v)
  }, [])

  // Uten nett/innlogging: vis siste kjente påminnelser fra cache
  useEffect(() => {
    if (lasterBruker || brukerId) return
    try {
      const c = localStorage.getItem(CACHE_NOKKEL)
      if (c) setHendelser(JSON.parse(c))
    } catch {}
  }, [brukerId, lasterBruker])

  // Hvem har satt opp skjermen (én gang er nok)
  useEffect(() => {
    if (!brukerId) return
    hentMinKobling(brukerId).then(r => { if (r) setKoblingNavn(r.mottakerNavn) })
  }, [brukerId])

  // Påminnelser + kvitteringer: jevnlig, og STRAKS skjermen våkner/får fokus –
  // nye påminnelser fra familien skal dukke opp av seg selv
  useAutoOppdater(!lasterBruker && Boolean(brukerId), 30_000, () => {
    lastData(brukerId as string)
  })

  // Hilsener fra familien (sjekk hvert 2. min – og når skjermen våkner)
  useAutoOppdater(!lasterBruker && Boolean(brukerId), 2 * 60_000, () => {
    hentHilsener(brukerId as string).then(setHilsener)
  })

  // Bla rolig gjennom hilsenene, én om gangen (fotoramme-følelse)
  useEffect(() => {
    if (hilsener.length < 2) return
    const t = setInterval(() => setHilsenIndeks(i => (i + 1) % hilsener.length), 20_000)
    return () => clearInterval(t)
  }, [hilsener.length])

  // Vær og strøm (rolig oppdatering – og fersk når skjermen våkner)
  useAutoOppdater(true, 30 * 60_000, () => {
    const zone = localStorage.getItem('zone') || 'NO1'
    hentVaer(zone).then(setVaer).catch(() => {})
    const cache = lesPrisCache(zone)
    if (cache) setPriser(cache.data.idag)
    hentAltData(zone).then(d => { if (d.idag.length) setPriser(d.idag) }).catch(() => {})
  })

  // Hovedkortet: eldste ubekreftede kvittering, ellers neste hendelse som ikke
  // er håndtert (også nylig forfalte – de skal vises selv om cron-en henger etter)
  const hovedkort: Hovedkort = ventende.length > 0
    ? { type: 'kvittering', kvittering: ventende[0] }
    : (() => {
        const neste = hendelser.find(h => !h.varslet)
        return neste ? { type: 'reminder', reminder: neste } : null
      })()

  // Resten av dagens hendelser (uten den som vises i hovedkortet)
  const hovedId = hovedkort?.type === 'reminder' ? hovedkort.reminder.id : null
  const senereIdag = hendelser.filter(h => {
    const d = new Date(h.tid)
    return !h.varslet && h.id !== hovedId && d > naa && d.toDateString() === naa.toDateString()
  })

  // Strømkortet vises KUN når det faktisk er et godt tidspunkt
  const time = naa.getHours()
  const prisNaa = priser[time]?.pris
  const { snitt } = prisStatistikk(priser)
  const stromBillig = prisNaa !== undefined && priser.length === 24 && prisNaa < parseFloat(snitt) * 0.7

  async function trykkFerdig() {
    if (!hovedkort || jobber) return
    setJobber(true)
    let ok = false
    if (hovedkort.type === 'kvittering') {
      ok = await bekreftKvittering(hovedkort.kvittering.id)
    } else if (brukerId) {
      ok = await bekreftReminderTidlig(brukerId, hovedkort.reminder)
    }
    if (ok) {
      setNettopBekreftet(true)
      setTimeout(() => setNettopBekreftet(false), 4000)
      if (brukerId) await lastData(brukerId)
    }
    setJobber(false)
  }

  function visKl(iso: string): string {
    return new Date(iso).toLocaleTimeString('nb-NO', { hour: '2-digit', minute: '2-digit' })
  }

  const dagTekst = naa.toLocaleDateString('nb-NO', { weekday: 'long', day: 'numeric', month: 'long' })
  const vaerNaa = vaer[0]
  const symbol = vaerNaa ? tolkSymbol(vaerNaa.symbol) : null

  const kortStil: React.CSSProperties = {
    background: NAER.kortBg, borderRadius: NAER.radius, padding: '28px',
    boxShadow: NAER.skygge, border: `1px solid ${NAER.border}`,
  }

  return (
    <main style={{
      minHeight: '100vh', background: NAER.bg, padding: '32px 20px 24px',
      maxWidth: '560px', margin: '0 auto', display: 'flex', flexDirection: 'column',
      gap: NAER.mellomrom, colorScheme: 'light',
      fontFamily: 'inherit',
    }}>
      {/* Dato og vær – det øverste blikket */}
      <header style={{ textAlign: 'center', padding: '8px 0 4px' }}>
        <p style={{ fontSize: NAER.fontKjempe, fontWeight: 700, color: NAER.tekst, margin: 0, lineHeight: 1.15, textTransform: 'capitalize' }}>
          {dagTekst}
        </p>
        {vaerNaa && vaerNaa.temp !== null && symbol && (
          <p style={{ fontSize: NAER.fontMedium, color: NAER.subtekst, margin: '10px 0 0', fontWeight: 500 }}>
            {symbol.emoji} {Math.round(vaerNaa.temp)}° · {symbol.tekst}
          </p>
        )}
      </header>

      {/* Hovedkortet: neste hendelse + stor Ferdig-knapp */}
      {nettopBekreftet ? (
        <div style={{ ...kortStil, background: NAER.gronnLys, textAlign: 'center' }}>
          <p style={{ fontSize: NAER.fontStor, fontWeight: 700, color: NAER.gronn, margin: 0 }}>
            Notert! Godt jobbet ✓
          </p>
        </div>
      ) : hovedkort ? (
        <div style={kortStil}>
          <p style={{ fontSize: NAER.fontStor, fontWeight: 700, color: NAER.tekst, margin: 0, lineHeight: 1.3 }}>
            {hovedkort.type === 'kvittering' ? hovedkort.kvittering.tekst : hovedkort.reminder.tekst}
          </p>
          <p style={{ fontSize: NAER.fontMedium, color: NAER.subtekst, margin: '12px 0 22px', fontWeight: 500 }}>
            {hovedkort.type === 'kvittering'
              ? `Kl. ${visKl(hovedkort.kvittering.planlagt)}`
              : new Date(hovedkort.reminder.tid).toDateString() === naa.toDateString()
                ? `I dag kl. ${visKl(hovedkort.reminder.tid)}`
                : new Date(hovedkort.reminder.tid).toLocaleString('nb-NO', { weekday: 'long', hour: '2-digit', minute: '2-digit' })}
          </p>
          <button
            type="button"
            onClick={trykkFerdig}
            disabled={jobber}
            style={{
              width: '100%', height: NAER.knappHoyde, borderRadius: '18px', border: 'none',
              background: NAER.gronn, color: '#ffffff', fontSize: NAER.fontMedium,
              fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
              opacity: jobber ? 0.7 : 1,
            }}
          >
            {jobber ? 'Lagrer …' : 'Ferdig ✓'}
          </button>
        </div>
      ) : (
        <div style={{ ...kortStil, textAlign: 'center' }}>
          <p style={{ fontSize: NAER.fontStor, fontWeight: 700, color: NAER.tekst, margin: 0 }}>
            Alt er i orden ✓
          </p>
          <p style={{ fontSize: NAER.fontNormal, color: NAER.subtekst, margin: '10px 0 0' }}>
            Ingen flere påminnelser akkurat nå.
          </p>
        </div>
      )}

      {/* Senere i dag – kun tekst, ingen knapper */}
      {senereIdag.length > 0 && (
        <div style={{ ...kortStil, padding: '22px 28px' }}>
          <p style={{ fontSize: NAER.fontLiten, color: NAER.subtekst, margin: '0 0 10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Senere i dag
          </p>
          {senereIdag.map(h => (
            <p key={h.id} style={{ fontSize: NAER.fontNormal, color: NAER.tekst, margin: '8px 0 0', lineHeight: 1.4 }}>
              <strong>{visKl(h.tid)}</strong> · {h.tekst}
            </p>
          ))}
        </div>
      )}

      {/* Hilsen fra familien – skjermen som fotoramme når den ellers er rolig */}
      {hilsener.length > 0 && (() => {
        const h = hilsener[hilsenIndeks % hilsener.length]
        const d = new Date(h.opprettet)
        const erIdag = d.toDateString() === naa.toDateString()
        return (
          <div style={{ ...kortStil, padding: '20px', textAlign: 'center' }}>
            {h.bildeUrl && (
              // eslint-disable-next-line @next/next/no-img-element -- signert, kortlevd URL; next/image krever fast domeneoppsett
              <img
                src={h.bildeUrl}
                alt="Bilde fra familien"
                style={{ width: '100%', borderRadius: '16px', display: 'block', marginBottom: h.tekst ? '14px' : '10px' }}
              />
            )}
            {h.tekst && (
              <p style={{ fontSize: NAER.fontMedium, color: NAER.tekst, margin: '0 0 10px', lineHeight: 1.4, fontWeight: 500 }}>
                {h.tekst}
              </p>
            )}
            <p style={{ fontSize: NAER.fontLiten, color: NAER.subtekst, margin: 0 }}>
              Fra familien din 💙 {erIdag ? 'i dag' : d.toLocaleDateString('nb-NO', { weekday: 'long', day: 'numeric', month: 'long' })}
            </p>
          </div>
        )
      })()}

      {/* Strøm – kun når det faktisk er nyttig å vite */}
      {stromBillig && (
        <div style={{ ...kortStil, background: NAER.gul, padding: '22px 28px' }}>
          <p style={{ fontSize: NAER.fontNormal, color: NAER.tekst, margin: 0, lineHeight: 1.5 }}>
            💡 Strømmen er billig nå – fint tidspunkt for vaskemaskin eller lading.
          </p>
        </div>
      )}

      {/* Rolig bunn – hvem som er med deg */}
      <footer style={{ marginTop: 'auto', textAlign: 'center', paddingTop: '12px' }}>
        <p style={{ fontSize: NAER.fontLiten, color: NAER.subtekst, margin: 0 }}>
          {koblingNavn ? 'Familien din har satt opp denne skjermen for deg 💙' : 'Nær'}
        </p>
        <button
          type="button"
          onClick={() => {
            if (window.confirm('Vil du avslutte den enkle visningen på denne enheten?')) {
              settMottakerEnhet(false)
              onAvslutt()
            }
          }}
          style={{
            marginTop: '10px', padding: '8px 14px', borderRadius: '10px', border: 'none',
            background: 'transparent', color: NAER.subtekst, opacity: 0.55,
            fontSize: '13px', cursor: 'pointer', fontFamily: 'inherit',
          }}
        >
          Avslutt enkel visning
        </button>
      </footer>
    </main>
  )
}
