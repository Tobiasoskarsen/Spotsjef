'use client'
import { useEffect, useState } from 'react'
import { Pris, Apparat, Anbefaling, HistorikkPunkt } from '@/lib/types'
import { APPARATER, soneForKoordinater, soneForStedsdata } from '@/lib/constants'
import { lagTema } from '@/lib/theme'
import { useAnimatedNumber } from '@/lib/useAnimatedNumber'
import { hentAltData, beregnAnbefaling, prisStatistikk, kostnadForStart, lesPrisCache, skrivPrisCache } from '@/lib/priser'
import PrisTicker from '@/components/PrisTicker'
import DagsOppsummering from '@/components/DagsOppsummering'
import PrisInnstillinger from '@/components/PrisInnstillinger'
import FlytLogo from '@/components/FlytLogo'
import { abonnerPaaPush, avsluttPush, pushStottes } from '@/lib/pushClient'
import { Sun, Moon } from 'lucide-react'
import PrisGraf from '@/components/PrisGraf'
import ApparatVelger from '@/components/ApparatVelger'
import AiInnsikt from '@/components/AiInnsikt'
import Alarm from '@/components/Alarm'
import Historikk from '@/components/Historikk'
import Kalkulator from '@/components/Kalkulator'
import BunnMeny, { Side } from '@/components/BunnMeny'
import { VaerTime, hentVaer } from '@/lib/vaer'
import VaerKort from '@/components/VaerKort'
import AssistentKort from '@/components/AssistentKort'
import ReminderKort from '@/components/ReminderKort'
import Konto from '@/components/Konto'
import Intro from '@/components/Intro'


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
  const [visKr, setVisKr] = useState(false)
  const [tariffType, setTariffType] = useState<'spot' | 'norgespris'>('spot')
  const [darkMode, setDarkMode] = useState(true)
  const [adresseTekst, setAdresseTekst] = useState('')
  const [adresseLoading, setAdresseLoading] = useState(false)
  const [adresseFeilTekst, setAdresseFeilTekst] = useState('')
  const [adresseSoneInfo, setAdresseSoneInfo] = useState('')
  const [adresseLat, setAdresseLat] = useState<number | null>(null)
  const [adresseLon, setAdresseLon] = useState<number | null>(null)
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
  const [visIntro, setVisIntro] = useState(false)
  const [frist, setFrist] = useState('')
  const [nettleie, setNettleie] = useState('')
  const [vaer, setVaer] = useState<VaerTime[]>([])
  const [lasterVaer, setLasterVaer] = useState(true)

  // Vis introen kun første gang (til man trykker «Kom i gang»)
  useEffect(() => {
    if (localStorage.getItem('flyt:introSett') !== '1') setVisIntro(true)
  }, [])

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
    setAdresseTekst(localStorage.getItem('adresseTekst') || '')
    setAdresseLat(localStorage.getItem('adresseLat') ? parseFloat(localStorage.getItem('adresseLat')!) : null)
    setAdresseLon(localStorage.getItem('adresseLon') ? parseFloat(localStorage.getItem('adresseLon')!) : null)
    setTariffType(localStorage.getItem('tariffType') === 'norgespris' ? 'norgespris' : 'spot')
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
       hentVaer(zone, adresseLat ?? undefined, adresseLon ?? undefined)
         .then(v => { if (!avbrutt) setVaer(v) })
         .finally(() => { if (!avbrutt) setLasterVaer(false) })
       return () => { avbrutt = true }
     }, [zone, adresseLat, adresseLon])


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
    localStorage.setItem('adresseTekst', adresseTekst)
  }, [adresseTekst])

  useEffect(() => {
    if (adresseLat !== null) {
      localStorage.setItem('adresseLat', adresseLat.toString())
    } else {
      localStorage.removeItem('adresseLat')
    }
  }, [adresseLat])

  useEffect(() => {
    if (adresseLon !== null) {
      localStorage.setItem('adresseLon', adresseLon.toString())
    } else {
      localStorage.removeItem('adresseLon')
    }
  }, [adresseLon])

  useEffect(() => {
    localStorage.setItem('tariffType', tariffType)
  }, [tariffType])

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

  async function finnSoneVedAdresse() {
    if (!adresseTekst.trim()) {
      setAdresseFeilTekst('Skriv inn postnummer eller adresse for å finne sone.')
      return
    }
    setAdresseLoading(true)
    setAdresseFeilTekst('')
    try {
      const params = new URLSearchParams({
        q: adresseTekst.trim(),
        countrycodes: 'no',
        format: 'json',
        addressdetails: '1',
        limit: '1',
      })
      const res = await fetch(`https://nominatim.openstreetmap.org/search?${params.toString()}`)
      const data = await res.json()
      if (!Array.isArray(data) || data.length === 0) {
        throw new Error('Fant ingen treff.')
      }
      const match = data[0] as any
      const lat = parseFloat(match.lat)
      const lon = parseFloat(match.lon)
      if (Number.isNaN(lat) || Number.isNaN(lon)) {
        throw new Error('Ugyldig posisjon.')
      }
      const sone = soneForStedsdata(match.address || {}) || soneForKoordinater(lat, lon)
      setZone(sone)
      setAdresseLat(lat)
      setAdresseLon(lon)
      setAdresseSoneInfo(match.display_name || adresseTekst.trim())
      setAdresseFeilTekst('')
    } catch {
      setAdresseFeilTekst('Kunne ikke finne sone for dette postnummeret eller adressen.')
    } finally {
      setAdresseLoading(false)
    }
  }

  function endreZone(nyZone: string) {
    setZone(nyZone)
    setAdresseLat(null)
    setAdresseLon(null)
    setAdresseSoneInfo('')
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
  const norgesprisOre = 50
  const prisNaa = tariffType === 'norgespris' ? norgesprisOre : naavaerendePris + nettleieOre
  const prisKortDisplay = visKr ? (prisNaa / 100).toFixed(2) : prisNaa.toFixed(0)
  const prisKortEnhet = visKr ? 'kr/kWh' : 'øre/kWh'
  const prisKortTittel = tariffType === 'norgespris' ? 'Fastpris nå' : 'Nåværende pris'
  const spotmerknad = tariffType === 'norgespris'
    ? 'Du bruker Norgespris på 50 øre/kWh. Spot-anbefalinger er mindre relevant.'
    : 'Spotpris vises for valgt sone og time.'

  function visTimepris() {
    if (tariffType === 'norgespris') {
      setSide('mer')
      return
    }
    const graf = document.getElementById('prisgraf')
    if (graf) graf.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
   <>
    {visIntro && <Intro tema={tema} onStart={() => { localStorage.setItem('flyt:introSett', '1'); setVisIntro(false) }} />}
    <main style={{ minHeight: '100vh', background: tema.bgGradient, backgroundColor: tema.bg, padding: '24px 16px 104px', maxWidth: '680px', margin: '0 auto', transition: 'background 0.3s', colorScheme: darkMode ? 'dark' : 'light' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <FlytLogo size={44} />
          <div>
            <h1 style={{ fontSize: '24px', fontWeight: 700, color: tema.tekst, margin: 0, letterSpacing: '-0.03em', lineHeight: 1.1 }}>Flyt</h1>
            <p style={{ fontSize: '12.5px', color: tema.subtekst, margin: '1px 0 0' }}>Finn den billigste tiden å bruke strøm</p>
          </div>
        </div>
        <button onClick={() => setDarkMode(!darkMode)} style={{ width: '40px', height: '40px', borderRadius: '13px', border: `1px solid ${tema.border}`, background: tema.cardBg, color: tema.subtekst, cursor: 'pointer', boxShadow: tema.skygge, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }} aria-label="Bytt mellom lys og mørk modus">
          {darkMode ? <Sun size={18} strokeWidth={2} /> : <Moon size={18} strokeWidth={2} />}
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
          <div style={{ display: 'grid', gap: '14px', marginBottom: '18px' }}>
            <div style={{ background: tema.cardBg, borderRadius: '20px', padding: '24px', boxShadow: tema.skygge, border: `1px solid ${tema.border}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '18px', flexWrap: 'wrap' }}>
                <div>
                  <p style={{ fontSize: '11px', color: tema.subtekst, margin: '0 0 10px', textTransform: 'uppercase', letterSpacing: '0.12em', fontWeight: 700 }}>Aktuell pris</p>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', flexWrap: 'wrap' }}>
                    <span className="tnum" style={{ fontSize: '46px', fontWeight: 700, color: tema.tekst, lineHeight: 1 }}>{prisKortDisplay}</span>
                    <span style={{ fontSize: '16px', color: tema.subtekst, marginTop: '4px' }}>{prisKortEnhet}</span>
                  </div>
                  <p style={{ fontSize: '13px', color: tema.subtekst, margin: '14px 0 0', lineHeight: 1.6 }}>{spotmerknad}</p>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', minWidth: '180px' }}>
                  <button type="button" onClick={() => setVisKr(prev => !prev)} style={{ padding: '14px 16px', borderRadius: '16px', border: `1px solid ${tema.border}`, background: tema.inputBg, color: tema.tekst, cursor: 'pointer', fontSize: '13px', fontWeight: 700, textTransform: 'uppercase' }}>
                    {visKr ? 'Vis i øre' : 'Vis i kr'}
                  </button>
                  <button type="button" onClick={visTimepris} style={{ padding: '14px 16px', borderRadius: '16px', border: 'none', background: tema.accentBg, color: '#fff', cursor: 'pointer', fontSize: '13px', fontWeight: 700, textTransform: 'uppercase' }}>
                    {tariffType === 'norgespris' ? 'Endre tariff' : 'Se timepris'}
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gap: '14px' }}>
            <div style={{ background: tema.cardBg, borderRadius: '20px', padding: '22px', boxShadow: tema.skygge, border: `1px solid ${tema.border}` }}>
              <p style={{ fontSize: '11px', color: tema.subtekst, margin: '0 0 10px', textTransform: 'uppercase', letterSpacing: '0.12em', fontWeight: 700 }}>Dagens anbefaling</p>
              {tariffType === 'spot' && anbefaling ? (
                <>
                  <p style={{ fontSize: '18px', fontWeight: 700, color: tema.tekst, margin: '0 0 10px' }}>Kjør {valgtApparat.navn} mellom kl. {anbefaling.startTime}–{anbefaling.sluttTime}</p>
                  <p style={{ fontSize: '13px', color: tema.subtekst, margin: '0 0 12px', lineHeight: 1.6 }}>Snittpris: {anbefaling.snittPris} øre/kWh · anslått kostnad: {anbefaling.kostnad} kr</p>
                  <p style={{ fontSize: '13px', color: tema.subtekst, margin: 0, lineHeight: 1.6 }}>Dette tidsvinduet gir deg lavest strømregning for utstyret ditt i dag.</p>
                </>
              ) : tariffType === 'spot' ? (
                <p style={{ fontSize: '13px', color: tema.subtekst, margin: 0 }}>Innsikt lastes inn for å finne beste tid å bruke strøm.</p>
              ) : (
                <p style={{ fontSize: '13px', color: tema.subtekst, margin: 0 }}>Med Norgespris viser vi fast pris. Spot-anbefalinger er fortsatt tilgjengelig under Mer.</p>
              )}
            </div>

            <VaerKort vaer={vaer} laster={lasterVaer} tema={tema} naavaerendePris={naavaerendePris} tariffType={tariffType} />
            <AssistentKort vaer={vaer} priser={priser} apparater={alleApparater} tema={tema} />
            <ReminderKort tema={tema} />

            <div style={{ background: tema.cardBg, borderRadius: '20px', padding: '22px', boxShadow: tema.skygge, border: `1px solid ${tema.border}` }}>
              <p style={{ fontSize: '11px', color: tema.subtekst, margin: '0 0 10px', textTransform: 'uppercase', letterSpacing: '0.12em', fontWeight: 700 }}>Markedsoverblikk</p>
              <div style={{ marginBottom: tariffType === 'spot' ? '10px' : '0' }}>
                <PrisTicker
                  naavaerendePris={naavaerendePris}
                  animertPris={animertPris}
                  minPris={minPris}
                  maxPris={maxPris}
                  snittPris={snittPris}
                  spotNaa={spotNaa}
                  nettleieOre={nettleieOre}
                  zone={zone}
                  visKr={visKr}
                  onToggleVisKr={() => setVisKr(prev => !prev)}
                  onZoneChange={endreZone}
                  tema={tema}
                />
              </div>
              {tariffType === 'spot' && <DagsOppsummering priser={priser} nettleieOre={nettleieOre} tema={tema} />}
            </div>

            {tariffType === 'spot' ? (
              <>
                <div id="prisgraf" style={{ background: tema.cardBg, borderRadius: '20px', padding: '20px', boxShadow: tema.skygge, border: `1px solid ${tema.border}` }}>
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
              </>
            ) : (
              <div style={{ background: tema.cardBg, borderRadius: '20px', padding: '22px', boxShadow: tema.skygge, border: `1px solid ${tema.border}` }}>
                <p style={{ fontSize: '13px', color: tema.tekst, margin: '0 0 10px', fontWeight: 700 }}>Fastpris valgt</p>
                <p style={{ fontSize: '13px', color: tema.subtekst, margin: 0, lineHeight: 1.6 }}>Du bruker Norgespris med fast 50 øre/kWh. Det betyr at timepris-detaljer ikke lenger er hovedfokus her.</p>
              </div>
            )}
          </div>
        </>
      )}

      {side === 'apparater' && (
        <>
          <div style={{ display: 'grid', gap: '14px', marginBottom: '16px' }}>
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

            <div style={{ background: tema.cardBg, borderRadius: '18px', padding: '20px', boxShadow: tema.skygge, border: `1px solid ${tema.border}` }}>
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

            <Kalkulator alleApparater={alleApparater} priser={priser} nettleie={nettleieKr} darkMode={darkMode} tema={tema} />
          </div>
        </>
      )}

      {side === 'historikk' && (
        <div style={{ display: 'grid', gap: '14px' }}>
          <div style={{ background: tema.cardBg, borderRadius: '18px', padding: '18px', boxShadow: tema.skygge, border: `1px solid ${tema.border}` }}>
            <p style={{ fontSize: '11px', color: tema.subtekst, margin: '0 0 8px', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 700 }}>AI-hjelper</p>
            <h2 style={{ fontSize: '22px', color: tema.tekst, margin: '0 0 10px', lineHeight: 1.25 }}>Planlegg dagen smartere</h2>
            <p style={{ fontSize: '14px', color: tema.subtekst, margin: 0, lineHeight: 1.7 }}>Få hverdagslige tips, strømvennlige gjøremål og påminnelser basert på tidspunkt, vær og pris.</p>
          </div>

          <AiInnsikt
            aiInnsikt={aiInnsikt}
            lasterAI={lasterAI}
            kanAnalysere={priser.length > 0}
            onAnalyser={hentAiInnsikt}
            tema={tema}
          />

          <div style={{ background: tema.cardBg, borderRadius: '18px', padding: '18px', boxShadow: tema.skygge, border: `1px solid ${tema.border}` }}>
            <p style={{ fontSize: '11px', color: tema.subtekst, margin: '0 0 8px', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 700 }}>Slik kan AI hjelpe</p>
            <ul style={{ margin: 0, paddingLeft: '18px', color: tema.tekst, lineHeight: 1.8, fontSize: '14px' }}>
              <li>Få forslag til når du bør starte vaskemaskin eller oppvask.</li>
              <li>Husk å slå av standby-apparater når strømmen er dyr.</li>
              <li>Planlegg daglige energivaner ut fra vær og strømpris.</li>
            </ul>
          </div>

          <div style={{ background: tema.cardBg, borderRadius: '18px', padding: '18px', boxShadow: tema.skygge, border: `1px solid ${tema.border}` }}>
            <p style={{ fontSize: '11px', color: tema.subtekst, margin: '0 0 8px', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 700 }}>Trenger du en påminnelse?</p>
            <p style={{ fontSize: '14px', color: tema.subtekst, margin: 0, lineHeight: 1.7 }}>Bruk AI for å finne praktiske gjøremål og huskelister du kan gjøre i dag, i morgen eller når strømmen er billig.</p>
          </div>
        </div>
      )}

      {side === 'mer' && (
        <>
          <Konto tema={tema} />

          <div style={{ background: tema.cardBg, borderRadius: '18px', padding: '18px', marginBottom: '14px', boxShadow: tema.skygge, border: `1px solid ${tema.border}` }}>
            <p style={{ fontSize: '11px', color: tema.subtekst, margin: '0 0 10px', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 700 }}>Din sone og tariff</p>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
              <div>
                <p style={{ fontSize: '24px', fontWeight: 700, color: tema.tekst, margin: '0 0 6px' }}>{zone}</p>
                <p style={{ fontSize: '14px', color: tema.subtekst, margin: 0 }}>{tariffType === 'norgespris' ? 'Norgespris - fast 50 øre/kWh' : 'Spotpris - timepris i valgt sone'}</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  const el = document.getElementById('adresseInput')
                  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' })
                }}
                style={{ padding: '12px 16px', borderRadius: '14px', border: 'none', background: tema.accentBg, color: '#fff', cursor: 'pointer', fontSize: '13px', fontWeight: 700, textTransform: 'uppercase' }}
              >
                Endre sone
              </button>
            </div>
            <p style={{ fontSize: '13px', color: tema.subtekst, margin: '16px 0 0', lineHeight: 1.6 }}>Her kan du oppdatere din sone og tariff. Bruk adressen under for å få mer nøyaktig vær og sonevalg.</p>
          </div>

          <div style={{ background: tema.cardBg, borderRadius: '18px', padding: '18px', marginBottom: '14px', boxShadow: tema.skygge, border: `1px solid ${tema.border}` }}>
            <div style={{ display: 'grid', gap: '12px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <p style={{ fontSize: '12px', color: tema.subtekst, margin: '0 0 6px', fontWeight: 600 }}>Tariff</p>
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                  {(['spot', 'norgespris'] as const).map(type => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setTariffType(type)}
                      style={{
                        flex: 1,
                        minWidth: '140px',
                        padding: '12px 14px',
                        borderRadius: '14px',
                        border: `1px solid ${tariffType === type ? tema.accentBg : tema.border}`,
                        background: tariffType === type ? tema.accentBg : tema.inputBg,
                        color: tariffType === type ? '#fff' : tema.tekst,
                        cursor: 'pointer',
                        fontWeight: 600,
                        fontFamily: 'inherit',
                      }}
                    >
                      {type === 'spot' ? 'Spotpris' : 'Norgespris'}
                    </button>
                  ))}
                </div>
                <p style={{ margin: 0, fontSize: '12px', color: tema.subtekst }}>
                  {tariffType === 'norgespris'
                    ? 'Norgespris er fast 50 øre/kWh. Spotpris-data blir bare referanse.'
                    : 'Spotpris viser timepris for valgt sone.'}
                </p>
              </div>
            </div>
          </div>

          <div style={{ background: tema.cardBg, borderRadius: '18px', padding: '18px', marginBottom: '14px', boxShadow: tema.skygge, border: `1px solid ${tema.border}` }}>
            <div style={{ display: 'grid', gap: '12px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div>
                  <p style={{ fontSize: '12px', color: tema.subtekst, margin: '0 0 6px', fontWeight: 600 }}>Postnummer eller adresse</p>
                  <input
                    id="adresseInput"
                    value={adresseTekst}
                    onChange={e => setAdresseTekst(e.target.value)}
                    placeholder="Skriv inn adresse eller postnummer"
                    style={{ width: '100%', padding: '12px 14px', borderRadius: '14px', border: `1px solid ${tema.border}`, background: tema.inputBg, color: tema.tekst, fontSize: '14px', fontFamily: 'inherit' }}
                  />
                </div>
                <button type="button" onClick={finnSoneVedAdresse} disabled={adresseLoading} style={{ padding: '12px 0', borderRadius: '14px', border: 'none', background: tema.accentBg, color: '#fff', fontWeight: 700, cursor: adresseLoading ? 'default' : 'pointer', fontSize: '14px' }}>
                  {adresseLoading ? 'Oppdaterer…' : 'Oppdater sone'}
                </button>
                {adresseFeilTekst ? (
                  <p style={{ margin: 0, fontSize: '12px', color: '#d1605f' }}>{adresseFeilTekst}</p>
                ) : adresseSoneInfo ? (
                  <p style={{ margin: 0, fontSize: '12px', color: tema.subtekst }}>Sone funnet: <strong>{zone}</strong> · {adresseSoneInfo}</p>
                ) : (
                  <p style={{ margin: 0, fontSize: '12px', color: tema.subtekst }}>Søk på postnummer eller adresse for å finne riktig spot-sone.</p>
                )}
              </div>
            </div>
          </div>

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
   </>
  )
}
