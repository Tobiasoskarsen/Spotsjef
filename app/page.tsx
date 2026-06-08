'use client'
import { useEffect, useState } from 'react'
import { Pris, Apparat, Anbefaling, HistorikkPunkt } from '@/lib/types'
import { APPARATER } from '@/lib/constants'
import { lagTema } from '@/lib/theme'
import { useAnimatedNumber } from '@/lib/useAnimatedNumber'
import { hentAltData, beregnAnbefaling, prisStatistikk } from '@/lib/priser'
import PrisTicker from '@/components/PrisTicker'
import PrisGraf from '@/components/PrisGraf'
import ApparatVelger from '@/components/ApparatVelger'
import AiInnsikt from '@/components/AiInnsikt'
import Alarm from '@/components/Alarm'
import Historikk from '@/components/Historikk'
import Kalkulator from '@/components/Kalkulator'
import Tabs, { TabId } from '@/components/Tabs'

export default function Home() {
  const [priser, setPriser] = useState<Pris[]>([])
  const [morgendagPriser, setMorgendagPriser] = useState<Pris[]>([])
  const [historikk, setHistorikk] = useState<HistorikkPunkt[]>([])
  const [zone, setZone] = useState('NO1')
  const [valgtApparat, setValgtApparat] = useState<Apparat>(APPARATER[0])
  const [anbefaling, setAnbefaling] = useState<Anbefaling | null>(null)
  const [laster, setLaster] = useState(true)
  const [feil, setFeil] = useState('')
  const [visIdag, setVisIdag] = useState(true)
  const [darkMode, setDarkMode] = useState(false)
  const [egetApparat, setEgetApparat] = useState({ navn: '', watt: '', timer: '' })
  const [visEgetSkjema, setVisEgetSkjema] = useState(false)
  const [alleApparater, setAlleApparater] = useState<Apparat[]>(APPARATER)
  const [delt, setDelt] = useState(false)
  const [alarmGrense, setAlarmGrense] = useState('')
  const [alarmAktiv, setAlarmAktiv] = useState(false)
  const [aiInnsikt, setAiInnsikt] = useState('')
  const [lasterAI, setLasterAI] = useState(false)
  const [varslerAktivert, setVarslerAktivert] = useState(false)
  const [aktivTab, setAktivTab] = useState<TabId>('idag')

  const tema = lagTema(darkMode)
  const naavaerendePris = priser[new Date().getHours()]?.pris ?? 0
  const animertPris = useAnimatedNumber(naavaerendePris)

  // Last lagrede innstillinger
  useEffect(() => {
    setZone(localStorage.getItem('zone') || 'NO1')
    setDarkMode(localStorage.getItem('dark') === 'true')
  }, [])

  // Hent data når sone endres
  useEffect(() => {
    localStorage.setItem('zone', zone)
    let avbrutt = false
    setLaster(true)
    setFeil('')
    hentAltData(zone)
      .then(data => {
        if (avbrutt) return
        setPriser(data.idag)
        setMorgendagPriser(data.imorgen)
        setHistorikk(data.historikk)
        if (data.idag.length === 0) setFeil('Fikk ikke hentet dagens priser. Prøv igjen senere.')
      })
      .catch(() => !avbrutt && setFeil('Noe gikk galt under henting av priser.'))
      .finally(() => !avbrutt && setLaster(false))
    return () => { avbrutt = true }
  }, [zone])

  useEffect(() => {
    localStorage.setItem('dark', String(darkMode))
  }, [darkMode])

  // Beregn anbefaling når data eller apparat endres
  useEffect(() => {
    const data = visIdag ? priser : morgendagPriser
    setAnbefaling(beregnAnbefaling(data, valgtApparat))
  }, [priser, morgendagPriser, valgtApparat, visIdag])

  // Sjekk alarm
  useEffect(() => {
    if (!alarmAktiv || priser.length === 0 || !alarmGrense) return
    const naa = priser[new Date().getHours()]?.pris ?? 0
    if (naa < parseFloat(alarmGrense) && Notification.permission === 'granted') {
      new Notification('⚡ Spotsjef — billig strøm nå!', {
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

  function leggTilApparat() {
    if (!egetApparat.navn || !egetApparat.watt || !egetApparat.timer) return
    const nytt: Apparat = {
      navn: egetApparat.navn,
      watt: parseInt(egetApparat.watt),
      timer: parseFloat(egetApparat.timer),
      ikon: '🔌',
    }
    setAlleApparater([...alleApparater, nytt])
    setValgtApparat(nytt)
    setEgetApparat({ navn: '', watt: '', timer: '' })
    setVisEgetSkjema(false)
  }

  function delAnbefaling() {
    if (!anbefaling) return
    navigator.clipboard.writeText(
      `⚡ Spotsjef: Kjør ${valgtApparat.navn} kl. ${anbefaling.startTime}–${anbefaling.sluttTime} — snitt ${anbefaling.snittPris} øre/kWh, ca. ${anbefaling.kostnad} kr`
    )
    setDelt(true)
    setTimeout(() => setDelt(false), 2000)
  }

  async function aktiverVarsler() {
    const tillatelse = await Notification.requestPermission()
    setVarslerAktivert(tillatelse === 'granted')
  }

  const visData = visIdag ? priser : morgendagPriser
  const { min: minPris, max: maxPris, snitt: snittPris } = prisStatistikk(visData)

  return (
    <main style={{ minHeight: '100vh', background: tema.bg, padding: '16px', maxWidth: '680px', margin: '0 auto', fontFamily: 'system-ui, sans-serif', transition: 'background 0.3s' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: 700, color: tema.tekst, margin: 0 }}>⚡ Spotsjef</h1>
          <p style={{ fontSize: '14px', color: tema.subtekst, margin: '2px 0 0' }}>Finn den billigste tiden å bruke strøm</p>
        </div>
        <button onClick={() => setDarkMode(!darkMode)} style={{ padding: '8px 14px', borderRadius: '10px', border: `1px solid ${tema.border}`, background: tema.cardBg, color: tema.tekst, cursor: 'pointer', fontSize: '14px' }}>
          {darkMode ? '☀️' : '🌙'}
        </button>
      </div>

      {feil && (
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '12px', padding: '12px 16px', margin: '12px 0', color: '#b91c1c', fontSize: '13px' }}>
          {feil}
        </div>
      )}

      <PrisTicker
        naavaerendePris={naavaerendePris}
        animertPris={animertPris}
        minPris={minPris}
        maxPris={maxPris}
        snittPris={snittPris}
        zone={zone}
        onZoneChange={setZone}
        tema={tema}
      />

      <Tabs aktiv={aktivTab} onBytt={setAktivTab} tema={tema} />

      {aktivTab === 'idag' && (
        <>
          <div style={{ background: tema.cardBg, border: `1px solid ${tema.border}`, borderRadius: '16px', padding: '20px', marginBottom: '16px' }}>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
              {(['I dag', 'I morgen'] as const).map((label, i) => {
                const erValgt = visIdag ? i === 0 : i === 1
                return (
                  <button key={label} onClick={() => setVisIdag(i === 0)} style={{ padding: '6px 16px', borderRadius: '8px', border: '1px solid', cursor: 'pointer', fontSize: '13px', fontWeight: 500, transition: 'all 0.15s', ...(erValgt ? { background: '#3b82f6', color: '#fff', borderColor: '#3b82f6' } : { background: 'transparent', color: tema.subtekst, borderColor: tema.border }) }}>
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

          <ApparatVelger
            alleApparater={alleApparater}
            valgtApparat={valgtApparat}
            onVelg={setValgtApparat}
            anbefaling={anbefaling}
            visEgetSkjema={visEgetSkjema}
            onToggleSkjema={() => setVisEgetSkjema(!visEgetSkjema)}
            egetApparat={egetApparat}
            onEndreEget={(felt, verdi) => setEgetApparat({ ...egetApparat, [felt]: verdi })}
            onLeggTil={leggTilApparat}
            delt={delt}
            onDel={delAnbefaling}
            darkMode={darkMode}
            tema={tema}
          />

          <AiInnsikt
            aiInnsikt={aiInnsikt}
            lasterAI={lasterAI}
            kanAnalysere={priser.length > 0}
            onAnalyser={hentAiInnsikt}
            darkMode={darkMode}
            tema={tema}
          />

          <Alarm
            alarmGrense={alarmGrense}
            onEndreGrense={setAlarmGrense}
            alarmAktiv={alarmAktiv}
            onToggle={() => {
              if (!varslerAktivert) aktiverVarsler()
              setAlarmAktiv(!alarmAktiv)
            }}
            tema={tema}
          />
        </>
      )}

      {aktivTab === 'historikk' && <Historikk historikk={historikk} tema={tema} />}

      {aktivTab === 'kalkulator' && (
        <Kalkulator alleApparater={alleApparater} priser={priser} darkMode={darkMode} tema={tema} />
      )}

      <p style={{ textAlign: 'center', fontSize: '11px', color: tema.subtekst, marginTop: '8px' }}>
        Priser fra hvakosterstrommen.no · Oppdateres daglig
      </p>
    </main>
  )
}
