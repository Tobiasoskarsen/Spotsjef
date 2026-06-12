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
//
// Har familien sendt bilder, blir hele skjermen en fotoramme: bildet i
// fullskjerm, med dato/vær og påminnelser oppå (som en pen låseskjerm).
// Lesbarhet er hellig for eldre øyne: tekst over foto ligger alltid på mørke
// gradient-soner, og selve påminnelsen + «Ferdig ✓» beholder solid hvit
// bakgrunn – det viktigste skal aldri konkurrere med et bilde.
//
// Uten bilder: rolig, varm bakgrunn som før. Offline-tolerant: siste kjente
// påminnelser caches lokalt og vises uten nett.

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
  const [bildeIndeks, setBildeIndeks] = useState(0)
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

  // Vær og strøm (rolig oppdatering – og fersk når skjermen våkner)
  useAutoOppdater(true, 30 * 60_000, () => {
    const zone = localStorage.getItem('zone') || 'NO1'
    hentVaer(zone).then(setVaer).catch(() => {})
    const cache = lesPrisCache(zone)
    if (cache) setPriser(cache.data.idag)
    hentAltData(zone).then(d => { if (d.idag.length) setPriser(d.idag) }).catch(() => {})
  })

  // Bildene blant hilsenene utgjør fotorammen; nyeste tekst-hilsen vises i fallback
  const bilder = hilsener.filter(h => h.bildeUrl)
  const harBilder = bilder.length > 0
  const visteBilde = harBilder ? bilder[bildeIndeks % bilder.length] : null

  // Bla rolig gjennom bildene (fotoramme-følelse) med myk overgang
  useEffect(() => {
    if (bilder.length < 2) return
    const t = setInterval(() => setBildeIndeks(i => (i + 1) % bilder.length), 30_000)
    return () => clearInterval(t)
  }, [bilder.length])

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

  // Farger som funker både på foto (hvit + skygge over mørke soner) og varm bakgrunn
  const tekstFarge = harBilder ? '#ffffff' : NAER.tekst
  const subFarge = harBilder ? 'rgba(255,255,255,0.88)' : NAER.subtekst
  const tekstSkygge = harBilder ? '0 1px 2px rgba(0,0,0,0.55), 0 3px 14px rgba(0,0,0,0.35)' : undefined

  const kortStil: React.CSSProperties = {
    background: NAER.kortBg, borderRadius: NAER.radius, padding: '28px',
    boxShadow: harBilder ? '0 6px 30px rgba(0,0,0,0.35)' : NAER.skygge,
    border: `1px solid ${NAER.border}`,
  }
  // Frostet, mørk flate til sekundær-info oppå foto (god kontrast for hvit tekst)
  const frostet: React.CSSProperties = {
    background: 'rgba(20,28,38,0.48)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)',
    borderRadius: '20px', border: '1px solid rgba(255,255,255,0.14)',
  }

  return (
    <main style={{
      position: 'relative', minHeight: '100vh', background: NAER.bg,
      colorScheme: 'light', fontFamily: 'inherit', overflow: 'hidden',
    }}>
      {/* Fotorammen: bildene i fullskjerm med myk kryssfading */}
      {bilder.map((b, i) => (
        // eslint-disable-next-line @next/next/no-img-element -- signerte, kortlevde URL-er; next/image krever fast domeneoppsett
        <img
          key={b.id}
          src={b.bildeUrl as string}
          alt=""
          style={{
            position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover',
            opacity: i === bildeIndeks % bilder.length ? 1 : 0, transition: 'opacity 1.8s ease',
          }}
        />
      ))}
      {/* Mørke soner øverst/nederst så tekst alltid er lesbar over foto */}
      {harBilder && (
        <>
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '34%', background: 'linear-gradient(to bottom, rgba(8,14,22,0.62), rgba(8,14,22,0.0))' }} />
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '46%', background: 'linear-gradient(to top, rgba(8,14,22,0.68), rgba(8,14,22,0.0))' }} />
        </>
      )}

      {/* Innholdet oppå */}
      <div style={{
        position: 'relative', zIndex: 1, minHeight: '100vh', maxWidth: '560px', margin: '0 auto',
        padding: '32px 20px 20px', display: 'flex', flexDirection: 'column', gap: NAER.mellomrom,
      }}>
        {/* Dato og vær – det øverste blikket */}
        <header style={{ textAlign: 'center', padding: '8px 0 4px' }}>
          <p style={{ fontSize: NAER.fontKjempe, fontWeight: 700, color: tekstFarge, margin: 0, lineHeight: 1.15, textTransform: 'capitalize', textShadow: tekstSkygge }}>
            {dagTekst}
          </p>
          {vaerNaa && vaerNaa.temp !== null && symbol && (
            <p style={{ fontSize: NAER.fontMedium, color: subFarge, margin: '10px 0 0', fontWeight: 500, textShadow: tekstSkygge }}>
              {symbol.emoji} {Math.round(vaerNaa.temp)}° · {symbol.tekst}
            </p>
          )}
        </header>

        {/* Med foto: la bildet puste – innholdet samles nederst */}
        {harBilder && <div style={{ flex: 1 }} />}

        {/* Bildetekst fra familien (over den mørke sonen nederst) */}
        {visteBilde && (
          <div style={{ textAlign: 'center', padding: '0 8px' }}>
            {visteBilde.tekst && (
              <p style={{ fontSize: NAER.fontMedium, color: tekstFarge, margin: '0 0 6px', lineHeight: 1.35, fontWeight: 600, textShadow: tekstSkygge }}>
                {visteBilde.tekst}
              </p>
            )}
            <p style={{ fontSize: NAER.fontLiten, color: subFarge, margin: 0, textShadow: tekstSkygge }}>
              Fra familien din 💙 {new Date(visteBilde.opprettet).toDateString() === naa.toDateString()
                ? 'i dag'
                : new Date(visteBilde.opprettet).toLocaleDateString('nb-NO', { weekday: 'long', day: 'numeric', month: 'long' })}
            </p>
          </div>
        )}

        {/* Hovedkortet: neste hendelse + stor Ferdig-knapp – ALLTID solid hvit */}
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
        ) : harBilder ? (
          // Med foto trenger ikke «alt ok» et stort hvitt kort – en rolig linje holder
          <div style={{ ...frostet, padding: '14px 20px', textAlign: 'center' }}>
            <p style={{ fontSize: NAER.fontNormal, fontWeight: 600, color: '#ffffff', margin: 0 }}>
              Alt er i orden ✓ · Ingen påminnelser akkurat nå
            </p>
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
          <div style={harBilder ? { ...frostet, padding: '16px 22px' } : { ...kortStil, padding: '22px 28px' }}>
            <p style={{ fontSize: NAER.fontLiten, color: harBilder ? 'rgba(255,255,255,0.78)' : NAER.subtekst, margin: '0 0 8px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Senere i dag
            </p>
            {senereIdag.map(h => (
              <p key={h.id} style={{ fontSize: NAER.fontNormal, color: harBilder ? '#ffffff' : NAER.tekst, margin: '7px 0 0', lineHeight: 1.4 }}>
                <strong>{visKl(h.tid)}</strong> · {h.tekst}
              </p>
            ))}
          </div>
        )}

        {/* Tekst-hilsen uten bilde: eget kort (kun uten fotoramme) */}
        {!harBilder && hilsener.length > 0 && (
          <div style={{ ...kortStil, padding: '22px 28px', textAlign: 'center' }}>
            <p style={{ fontSize: NAER.fontMedium, color: NAER.tekst, margin: '0 0 10px', lineHeight: 1.4, fontWeight: 500 }}>
              {hilsener[0].tekst}
            </p>
            <p style={{ fontSize: NAER.fontLiten, color: NAER.subtekst, margin: 0 }}>
              Fra familien din 💙 {new Date(hilsener[0].opprettet).toDateString() === naa.toDateString()
                ? 'i dag'
                : new Date(hilsener[0].opprettet).toLocaleDateString('nb-NO', { weekday: 'long', day: 'numeric', month: 'long' })}
            </p>
          </div>
        )}

        {/* Strøm – kun når det faktisk er nyttig å vite */}
        {stromBillig && (
          <div style={harBilder ? { ...frostet, padding: '14px 20px' } : { ...kortStil, background: NAER.gul, padding: '22px 28px' }}>
            <p style={{ fontSize: NAER.fontNormal, color: harBilder ? '#ffffff' : NAER.tekst, margin: 0, lineHeight: 1.5 }}>
              💡 Strømmen er billig nå – fint tidspunkt for vaskemaskin eller lading.
            </p>
          </div>
        )}

        {/* Rolig bunn – hvem som er med deg */}
        <footer style={{ marginTop: harBilder ? '0' : 'auto', textAlign: 'center', paddingTop: harBilder ? '0' : '12px' }}>
          <p style={{ fontSize: NAER.fontLiten, color: subFarge, margin: 0, textShadow: tekstSkygge }}>
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
              marginTop: '8px', padding: '8px 14px', borderRadius: '10px', border: 'none',
              background: 'transparent', color: subFarge, opacity: 0.55,
              fontSize: '13px', cursor: 'pointer', fontFamily: 'inherit', textShadow: tekstSkygge,
            }}
          >
            Avslutt enkel visning
          </button>
        </footer>
      </div>
    </main>
  )
}
