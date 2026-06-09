'use client'
import { lagRad } from '@/lib/rad'
import RadKort from '@/components/RadKort'
import { useEffect, useState } from 'react'
import { Pris, Apparat, Anbefaling, HistorikkPunkt } from '@/lib/types'
import { APPARATER } from '@/lib/constants'
import { lagTema } from '@/lib/theme'
import { useAnimatedNumber } from '@/lib/useAnimatedNumber'
import { hentAltData, beregnAnbefaling, prisStatistikk, kostnadForStart, lesPrisCache, skrivPrisCache } from '@/lib/priser'
import PrisTicker from '@/components/PrisTicker'
import DagsOppsummering from '@/components/DagsOppsummering'
import PrisInnstillinger from '@/components/PrisInnstillinger'
import FlytLogo from '@/components/FlytLogo'
import { abonnerPaaPush, avsluttPush, pushStottes } from '@/lib/pushClient'
import PrisGraf from '@/components/PrisGraf'
import ApparatVelger from '@/components/ApparatVelger'
import AiInnsikt from '@/components/AiInnsikt'
import Alarm from '@/components/Alarm'
import Historikk from '@/components/Historikk'
import Kalkulator from '@/components/Kalkulator'
import BunnMeny, { Side } from '@/components/BunnMeny'
import { VaerTime, hentVaer } from '@/lib/vaer'
import VaerKort from '@/components/VaerKort'


export default function Home() {
  const [priser, setPriser] = useState<Pris[]>([])
  const [morgendagPriser, setMorgendagPriser] = useState<Pris[]>([])
  const [historikk, setHistorikk] = useState<HistorikkPunkt[]>([])
  const [zone, setZone] = useState('NO1')
  const [valgtApparat, setValgtApparat] = useState<Apparat>(APPARATER[0])
  const [anbefaling, setAnbefaling] = useState<Anbefaling | null>(null)
  const [laster, setLaster] = useState(true)
  const [feil, setFeil] = useState('')
  const [sistOppdatert, setSistOppdatert] = useState<number | null>(null)
  const [hentTeller, setHentTeller] = useState(0)
  const [visIdag, setVisIdag] = useState(true)
  const [darkMode, setDarkMode] = useState(true)
  const [egetApparat, setEgetApparat] = useState({ navn: '', watt: '', timer: '', ikon: '🔌', gangerPerUke: '3' })
  const [visEgetSkjema, setVisEgetSkjema] = useState(false)
  const [redigererNavn, setRedigererNavn] = useState<string | null>(null)
  const [skjemaFeil, setSkjemaFeil] = useState('')
  const [alleApparater, setAlleApparater] = useState<Apparat[]>(APPARATER)
  const [delt, setDelt] = useState(false)
  const [alarmGrense, setAlarmGrense] = useState('')
  const [alarmAktiv, setAlarmAktiv] = useState(false)
  const [aiInnsikt, setAiInnsikt] = useState('')
  const [lasterAI, setLasterAI] = useState(false)
  const [side, setSide] = useState<Side>('hjem')
  const [frist, setFrist] = useState('')
  const [nettleie, setNettleie] = useState('')
  const [vaer, setVaer] = useState<VaerTime[]>([])
  const [lasterVaer, setLasterVaer] = useState(true)

  const tema = lagTema(darkMode)
  const naavaerendePris = priser[new Date().getHours()]?.pris ?? 0
  const animertPris = useAnimatedNumber(naavaerendePris)
  const spotNaa = priser[new Date().getHours()]?.spot ?? 0
  const nettleieOre = parseFloat(nettleie) || 0
  const nettleieKr = nettleieOre / 100

  useEffect(() => {
    setZone(localStorage.getItem('zone') || 'NO1')
    // Mørk modus er standard (matcher Flyt-logoen); kun eksplisitt 'false' gir lys
    setDarkMode(localStorage.getItem('dark') !== 'false')
    setNettleie(localStorage.getItem('nettleie') || '')
    setAlarmGrense(localStorage.getItem('alarmGrense') || '')
    setAlarmAktiv(localStorage.getItem('alarmAktiv') === 'true')
    // Last inn brukerens apparatliste. Nytt format: HELE lista under 'apparater'
    // (brukeren kan endre/slette alt). Eldre format ('egneApparater') hadde kun
    // egne apparater i tillegg til standardlista – migrer det over.
    try {
      const lagretListe = localStorage.getItem('apparater')
      if (lagretListe) {
        const liste: Apparat[] = JSON.parse(lagretListe)
        if (Array.isArray(liste) && liste.length) {
          setAlleApparater(liste)
          setValgtApparat(liste[0])
        }
      } else {
        const gamle = localStorage.getItem('egneApparater')
        const egne: Apparat[] = gamle ? JSON.parse(gamle) : []
        if (Array.isArray(egne) && egne.length) {
          const slått = [...APPARATER, ...egne]
          setAlleApparater(slått)
          localStorage.setItem('apparater', JSON.stringify(slått))
        }
      }
    } catch {
      // Ugyldig lagret data — ignorer og bruk standardlista
    }
  }, [])

  useEffect(() => {
    localStorage.setItem('zone', zone)
    let avbrutt = false
    setFeil('')

    // Vis cache umiddelbart (rask oppstart + fungerer offline)
    const cache = lesPrisCache(zone)
    if (cache) {
      setPriser(cache.data.idag)
      setMorgendagPriser(cache.data.imorgen)
      setHistorikk(cache.data.historikk)
      setSistOppdatert(cache.tid)
      setLaster(false)
    } else {
      setLaster(true)
    }

    // Hent ferske data i bakgrunnen
    hentAltData(zone)
      .then(data => {
        if (avbrutt) return
        if (data.idag.length === 0) {
          if (!cache) setFeil('Fikk ikke hentet dagens priser. Prøv igjen.')
        } else {
          setPriser(data.idag)
          setMorgendagPriser(data.imorgen)
          setHistorikk(data.historikk)
          const tid = Date.now()
          setSistOppdatert(tid)
          skrivPrisCache(zone, data, tid)
          setFeil('')
        }
      })
      .catch(() => {
        if (!avbrutt && !cache) setFeil('Noe gikk galt under henting av priser.')
      })
      .finally(() => !avbrutt && setLaster(false))
    return () => { avbrutt = true }
  }, [zone, hentTeller])

     useEffect(() => {
       let avbrutt = false
       setLasterVaer(true)
       hentVaer(zone)
         .then(v => { if (!avbrutt) setVaer(v) })
         .finally(() => { if (!avbrutt) setLasterVaer(false) })
       return () => { avbrutt = true }
     }, [zone])

  const rad = lagRad(priser, vaer, alleApparater)

  useEffect(() => {
    localStorage.setItem('dark', String(darkMode))
  }, [darkMode])

  // La området rundt/under det sentrerte innholdet følge temaet
  useEffect(() => {
    document.body.style.background = tema.bg
  }, [tema.bg])

  useEffect(() => {
    localStorage.setItem('nettleie', nettleie)
  }, [nettleie])

  useEffect(() => {
    localStorage.setItem('alarmGrense', alarmGrense)
    localStorage.setItem('alarmAktiv', String(alarmAktiv))
  }, [alarmGrense, alarmAktiv])

  // Hold push-abonnementet på serveren i synk når grense/sone endres
  useEffect(() => {
    if (!alarmAktiv || !pushStottes()) return
    const t = setTimeout(() => {
      abonnerPaaPush(parseFloat(alarmGrense) || 0, zone)
    }, 800)
    return () => clearTimeout(t)
  }, [alarmGrense, zone, alarmAktiv])

  useEffect(() => {
    const data = visIdag ? priser : morgendagPriser
    setAnbefaling(beregnAnbefaling(data, valgtApparat, frist ? parseInt(frist) : undefined, nettleieKr))
  }, [priser, morgendagPriser, valgtApparat, visIdag, frist, nettleieKr])

  useEffect(() => {
    if (!alarmAktiv || priser.length === 0 || !alarmGrense) return
    const naa = priser[new Date().getHours()]?.pris ?? 0
    if (naa < parseFloat(alarmGrense) && Notification.permission === 'granted') {
      new Notification('Flyt — billig strøm nå!', {
        body: `Prisen er nå ${naa.toFixed(1)} øre/kWh — under grensen din på ${alarmGrense} øre`,
      })
    }
  }, [priser, alarmAktiv, alarmGrense])

  async function hentAiInnsikt() {
    if (priser.length === 0) return
    setLasterAI(true)
    setAiInnsikt('')
    const { min, max, snitt } = prisStatistikk(priser)
    const billigTimer = priser.filter(p => p.pris < parseFloat(snitt)).map(p => p.time).join(', ')
    try {
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ snitt, min, max, billigTimer }),
      })
      const data = await res.json()
      setAiInnsikt(data.tekst || data.error || 'Kunne ikke hente innsikt.')
    } catch {
      setAiInnsikt('Kunne ikke hente AI-innsikt akkurat nå.')
    }
    setLasterAI(false)
  }

  // Lagrer hele apparatlista (brukerens egen) i localStorage
  function lagreApparater(liste: Apparat[]) {
    localStorage.setItem('apparater', JSON.stringify(liste))
  }

  const tomtSkjema = { navn: '', watt: '', timer: '', ikon: '🔌', gangerPerUke: '3' }

  // Åpner skjemaet for å redigere et eksisterende apparat (forhåndsutfylt)
  function startRediger(a: Apparat) {
    setEgetApparat({
      navn: a.navn,
      watt: String(a.watt),
      timer: String(a.timer),
      ikon: a.ikon || '🔌',
      gangerPerUke: String(a.gangerPerUke ?? 7),
    })
    setRedigererNavn(a.navn)
    setSkjemaFeil('')
    setVisEgetSkjema(true)
  }

  // Åpner et tomt skjema for å legge til et nytt apparat
  function startNyttApparat() {
    setEgetApparat(tomtSkjema)
    setRedigererNavn(null)
    setSkjemaFeil('')
    setVisEgetSkjema(true)
  }

  function avbrytSkjema() {
    setEgetApparat(tomtSkjema)
    setRedigererNavn(null)
    setSkjemaFeil('')
    setVisEgetSkjema(false)
  }

  // Legger til et nytt apparat, eller lagrer endringer hvis vi redigerer
  function lagreApparat() {
    if (!egetApparat.navn.trim() || !egetApparat.watt || !egetApparat.timer) {
      setSkjemaFeil('Fyll inn navn, watt og timer.')
      return
    }
    const navn = egetApparat.navn.trim()
    // Navn brukes som id, så det må være unikt
    if (alleApparater.some(a => a.navn === navn && a.navn !== redigererNavn)) {
      setSkjemaFeil(`Du har allerede et apparat som heter «${navn}».`)
      return
    }
    const apparat: Apparat = {
      navn,
      watt: parseInt(egetApparat.watt),
      timer: parseFloat(egetApparat.timer),
      ikon: egetApparat.ikon || '🔌',
      gangerPerUke: parseInt(egetApparat.gangerPerUke) || 7,
    }
    const oppdatert = redigererNavn
      ? alleApparater.map(a => (a.navn === redigererNavn ? apparat : a))
      : [...alleApparater, apparat]
    setAlleApparater(oppdatert)
    lagreApparater(oppdatert)
    setValgtApparat(apparat)
    avbrytSkjema()
  }

  function slettApparat(a: Apparat) {
    if (alleApparater.length <= 1) return // behold alltid minst ett apparat
    const oppdatert = alleApparater.filter(x => x.navn !== a.navn)
    setAlleApparater(oppdatert)
    lagreApparater(oppdatert)
    if (valgtApparat.navn === a.navn) setValgtApparat(oppdatert[0])
    if (redigererNavn === a.navn) avbrytSkjema()
  }

  // Gjenoppretter standardlista (sikkerhetsnett hvis man har slettet for mye)
  function tilbakestillApparater() {
    setAlleApparater(APPARATER)
    lagreApparater(APPARATER)
    setValgtApparat(APPARATER[0])
    avbrytSkjema()
  }

  function delAnbefaling() {
    if (!anbefaling) return
    navigator.clipboard.writeText(
      `Flyt: Kjør ${valgtApparat.navn} kl. ${anbefaling.startTime}–${anbefaling.sluttTime} — snitt ${anbefaling.snittPris} øre/kWh, ca. ${anbefaling.kostnad} kr`
    )
    setDelt(true)
    setTimeout(() => setDelt(false), 2000)
  }

  // Slår alarmen av/på. Abonnerer på ekte bakgrunns-push hvis mulig,
  // ellers faller vi tilbake på varsel mens appen er åpen.
  async function vekslAlarm() {
    if (alarmAktiv) {
      setAlarmAktiv(false)
      avsluttPush()
      return
    }
    if (pushStottes()) {
      await abonnerPaaPush(parseFloat(alarmGrense) || 0, zone)
    } else if (typeof Notification !== 'undefined') {
      await Notification.requestPermission()
    }
    setAlarmAktiv(true)
  }

  const visData = visIdag ? priser : morgendagPriser
  const { min: minPris, max: maxPris, snitt: snittPris } = prisStatistikk(visData)
  // Kostnad ved å kjøre apparatet nå (kun relevant når vi ser på i dag)
  const kjorNaaKostnad = visIdag ? kostnadForStart(visData, valgtApparat, new Date().getHours(), nettleieKr) : null

  return (
    <main style={{ minHeight: '100vh', background: tema.bgGradient, backgroundColor: tema.bg, padding: '24px 16px 104px', maxWidth: '680px', margin: '0 auto', transition: 'background 0.3s', colorScheme: darkMode ? 'dark' : 'light' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <FlytLogo size={44} />
          <div>
            <h1 style={{ fontSize: '24px', fontWeight: 700, color: tema.tekst, margin: 0, letterSpacing: '-0.03em', lineHeight: 1.1 }}>Flyt</h1>
            <p style={{ fontSize: '12.5px', color: tema.subtekst, margin: '1px 0 0' }}>Finn den billigste tiden å bruke strøm</p>
          </div>
        </div>
        <button onClick={() => setDarkMode(!darkMode)} style={{ width: '40px', height: '40px', borderRadius: '13px', border: `1px solid ${tema.border}`, background: tema.cardBg, color: tema.subtekst, cursor: 'pointer', fontSize: '16px', boxShadow: tema.skygge, flexShrink: 0 }} aria-label="Bytt mellom lys og mørk modus">
          {darkMode ? '☀' : '☾'}
        </button>
      </div>

      {feil && (
        <div style={{ background: darkMode ? 'rgba(218,138,122,0.13)' : '#f9eae5', border: `1px solid ${darkMode ? 'rgba(218,138,122,0.28)' : '#f0d6cd'}`, borderRadius: '14px', padding: '12px 16px', margin: '12px 0', color: darkMode ? '#e3a99c' : '#a35a45', fontSize: '13px', boxShadow: tema.skygge, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
          <span>{feil}</span>
          <button onClick={() => setHentTeller(t => t + 1)} disabled={laster} style={{ flexShrink: 0, padding: '7px 14px', borderRadius: '10px', border: 'none', background: tema.accentGradient, color: '#fff', cursor: laster ? 'default' : 'pointer', fontSize: '13px', fontWeight: 600, fontFamily: 'inherit', opacity: laster ? 0.6 : 1 }}>
            {laster ? 'Henter…' : 'Prøv igjen'}
          </button>
        </div>
      )}

      {side === 'hjem' && (
        <>
          <PrisTicker
            naavaerendePris={naavaerendePris}
            animertPris={animertPris}
            minPris={minPris}
            maxPris={maxPris}
            snittPris={snittPris}
            spotNaa={spotNaa}
            nettleieOre={nettleieOre}
            zone={zone}
            onZoneChange={setZone}
            tema={tema}
          />

          <DagsOppsummering priser={priser} nettleieOre={nettleieOre} tema={tema} />

          <RadKort rad={rad} tema={tema} />

          <div style={{ background: tema.cardBg, borderRadius: '18px', padding: '20px', marginBottom: '14px', boxShadow: tema.skygge, border: `1px solid ${tema.border}` }}>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
              {(['I dag', 'I morgen'] as const).map((label, i) => {
                const erValgt = (visIdag && i === 0) || (!visIdag && i === 1)
                return (
                  <button key={label} onClick={() => setVisIdag(i === 0)} style={{ padding: '7px 16px', borderRadius: '12px', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: 500, fontFamily: 'inherit', transition: 'all 0.2s', ...(erValgt ? { background: tema.accentBg, color: tema.pillTekst } : { background: tema.inputBg, color: tema.subtekst }) }}>
                    {label}
                  </button>
                )
              })}
            </div>
            <PrisGraf
              data={visData}
              minPris={minPris}
              maxPris={maxPris}
              snittPris={snittPris}
              anbefaling={anbefaling}
              valgtApparat={valgtApparat}
              laster={laster}
              tema={tema}
            />
          </div>

          <VaerKort vaer={vaer} laster={lasterVaer} tema={tema} />
        </>
      )}

      {side === 'apparater' && (
        <>
          <ApparatVelger
            alleApparater={alleApparater}
            valgtApparat={valgtApparat}
            onVelg={setValgtApparat}
            anbefaling={anbefaling}
            visEgetSkjema={visEgetSkjema}
            onToggleSkjema={startNyttApparat}
            egetApparat={egetApparat}
            onEndreEget={(felt, verdi) => setEgetApparat({ ...egetApparat, [felt]: verdi })}
            onLagre={lagreApparat}
            onRediger={startRediger}
            onSlett={slettApparat}
            redigererNavn={redigererNavn}
            onAvbryt={avbrytSkjema}
            onTilbakestill={tilbakestillApparater}
            skjemaFeil={skjemaFeil}
            delt={delt}
            onDel={delAnbefaling}
            frist={frist}
            onEndreFrist={setFrist}
            kjorNaaKostnad={kjorNaaKostnad}
            tema={tema}
          />

          <Kalkulator alleApparater={alleApparater} priser={priser} nettleie={nettleieKr} darkMode={darkMode} tema={tema} />
        </>
      )}

      {side === 'historikk' && <Historikk historikk={historikk} tema={tema} />}

      {side === 'mer' && (
        <>
          <PrisInnstillinger nettleie={nettleie} onEndre={setNettleie} tema={tema} />

          <AiInnsikt
            aiInnsikt={aiInnsikt}
            lasterAI={lasterAI}
            kanAnalysere={priser.length > 0}
            onAnalyser={hentAiInnsikt}
            tema={tema}
          />

          <Alarm
            alarmGrense={alarmGrense}
            onEndreGrense={setAlarmGrense}
            alarmAktiv={alarmAktiv}
            onToggle={vekslAlarm}
            tema={tema}
          />
        </>
      )}

      <p style={{ textAlign: 'center', fontSize: '11px', color: tema.subtekst, marginTop: '12px' }}>
        Priser fra hvakosterstrommen.no
        {sistOppdatert
          ? ` · Sist oppdatert kl. ${new Date(sistOppdatert).toLocaleTimeString('no', { hour: '2-digit', minute: '2-digit' })}`
          : ' · Oppdateres daglig'}
      </p>

      <BunnMeny aktiv={side} onBytt={setSide} tema={tema} />
    </main>
  )
}
