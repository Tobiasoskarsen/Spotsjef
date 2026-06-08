'use client'
import { useEffect, useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, LineChart, Line } from 'recharts'

const APPARATER = [
  { navn: 'Oppvaskmaskin', watt: 1800, timer: 1.5, ikon: '🍽️' },
  { navn: 'Vaskemaskin', watt: 2000, timer: 2, ikon: '👕' },
  { navn: 'Tørketrommel', watt: 2500, timer: 2, ikon: '💨' },
  { navn: 'Elbil-lading (11kW)', watt: 11000, timer: 4, ikon: '🚗' },
]

type Pris = { time: string; pris: number; raw: number }
type Apparat = { navn: string; watt: number; timer: number; ikon?: string }
type Anbefaling = { startTime: string; sluttTime: string; snittPris: string; kostnad: string; startIdx: number }

function getColor(pris: number, min: number, max: number) {
  const range = max - min || 1
  const ratio = (pris - min) / range
  if (ratio < 0.33) return '#22c55e'
  if (ratio < 0.66) return '#f59e0b'
  return '#ef4444'
}

function useAnimatedNumber(target: number, duration = 600) {
  const [display, setDisplay] = useState(0)
  useEffect(() => {
    let start: number | null = null
    const from = display
    const step = (ts: number) => {
      if (!start) start = ts
      const progress = Math.min((ts - start) / duration, 1)
      setDisplay(from + (target - from) * progress)
      if (progress < 1) requestAnimationFrame(step)
    }
    requestAnimationFrame(step)
    
  }, [target])
  return display
}

export default function Home() {
  const [priser, setPriser] = useState<Pris[]>([])
  const [morgendagPriser, setMorgendagPriser] = useState<Pris[]>([])
  const [historikk, setHistorikk] = useState<{ dato: string; snitt: number }[]>([])
  const [zone, setZone] = useState<string>('NO1')
  const [valgtApparat, setValgtApparat] = useState<Apparat>(APPARATER[0])
  const [anbefaling, setAnbefaling] = useState<Anbefaling | null>(null)
  const [laster, setLaster] = useState(true)
  const [feil, setFeil] = useState<string>('')
  const [visIdag, setVisIdag] = useState(true)
  const [darkMode, setDarkMode] = useState(false)
  const [egetApparat, setEgetApparat] = useState({ navn: '', watt: '', timer: '' })
  const [visEgetSkjema, setVisEgetSkjema] = useState(false)
  const [alleApparater, setAlleApparater] = useState<Apparat[]>(APPARATER)
  const [delt, setDelt] = useState(false)
  const [alarmGrense, setAlarmGrense] = useState<string>('')
  const [alarmAktiv, setAlarmAktiv] = useState(false)
  const [aiInnsikt, setAiInnsikt] = useState<string>('')
  const [lasterAI, setLasterAI] = useState(false)
  const [varslerAktivert, setVarslerAktivert] = useState(false)
  const [aktivTab, setAktivTab] = useState<'idag' | 'historikk' | 'kalkulator'>('idag')

  const naavaerendePris = priser[new Date().getHours()]?.pris ?? 0
  const animertPris = useAnimatedNumber(naavaerendePris)

  useEffect(() => {
    const lagretZone = localStorage.getItem('zone') || 'NO1'
    const lagretDark = localStorage.getItem('dark') === 'true'
    setZone(lagretZone)
    setDarkMode(lagretDark)
  }, [])

  useEffect(() => {
    localStorage.setItem('zone', zone)
    hentAltData(zone)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zone])

  useEffect(() => {
    localStorage.setItem('dark', String(darkMode))
  }, [darkMode])

  async function hentAltData(z: string) {
    setLaster(true)
    setFeil('')
    const now = new Date()

    const format = (d: Date) => {
      const y = d.getFullYear()
      const m = String(d.getMonth() + 1).padStart(2, '0')
      const day = String(d.getDate()).padStart(2, '0')
      return `${y}/${m}-${day}`
    }

    const datoer = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(now)
      d.setDate(d.getDate() - i)
      return d
    })

    try {
      const [resIdag, resImorgen, ...resHistorikk] = await Promise.all([
        fetch(`/api/prices?zone=${z}&date=${format(now)}`),
        fetch(`/api/prices?zone=${z}&date=${format(new Date(now.getTime() + 86400000))}`),
        ...datoer.slice(1).map(d => fetch(`/api/prices?zone=${z}&date=${format(d)}`)),
      ])

      const formater = (data: { time_start: string; NOK_per_kWh: number }[]) =>
        data.map(p => ({
          time: new Date(p.time_start).getHours() + ':00',
          pris: parseFloat((p.NOK_per_kWh * 100).toFixed(1)),
          raw: p.NOK_per_kWh,
        }))

      const dataIdag = await resIdag.json()
      const dataImorgen = await resImorgen.json()

      if (Array.isArray(dataIdag)) {
        setPriser(formater(dataIdag))
      } else {
        setFeil('Fikk ikke hentet dagens priser. Prøv igjen senere.')
      }
      if (Array.isArray(dataImorgen)) setMorgendagPriser(formater(dataImorgen))

      const hist: { dato: string; snitt: number }[] = []
      for (let i = 0; i < resHistorikk.length; i++) {
        const d = await resHistorikk[i].json()
        if (Array.isArray(d)) {
          const snitt = d.reduce((a: number, b: { NOK_per_kWh: number }) => a + b.NOK_per_kWh, 0) / d.length
          hist.push({
            dato: datoer[i + 1].toLocaleDateString('no', { weekday: 'short', day: 'numeric' }),
            snitt: parseFloat((snitt * 100).toFixed(1)),
          })
        }
      }
      setHistorikk(hist.reverse())
    } catch (e) {
      console.error(e)
      setFeil('Noe gikk galt under henting av priser. Sjekk nettforbindelsen din.')
    }
    setLaster(false)
  }

  useEffect(() => {
    const data = visIdag ? priser : morgendagPriser
    if (data.length === 0) return
    const timerNoedvendig = Math.ceil(valgtApparat.timer)
    let bestStart = 0
    let lavestSum = Infinity

    for (let i = 0; i <= data.length - timerNoedvendig; i++) {
      const sum = data.slice(i, i + timerNoedvendig).reduce((a: number, b: Pris) => a + b.raw, 0)
      if (sum < lavestSum) {
        lavestSum = sum
        bestStart = i
      }
    }

    const snittPris = ((lavestSum / timerNoedvendig) * 100).toFixed(1)
    const kostnad = ((valgtApparat.watt / 1000) * valgtApparat.timer * lavestSum / timerNoedvendig).toFixed(2)
    setAnbefaling({
      startTime: data[bestStart]?.time,
      sluttTime: data[bestStart + timerNoedvendig]?.time || '00:00',
      snittPris,
      kostnad,
      startIdx: bestStart,
    })
  }, [priser, morgendagPriser, valgtApparat, visIdag])

  useEffect(() => {
    if (!alarmAktiv || priser.length === 0 || !alarmGrense) return
    const naa = priser[new Date().getHours()]?.pris ?? 0
    if (naa < parseFloat(alarmGrense)) {
      if (Notification.permission === 'granted') {
        new Notification('⚡ Spotsjef — billig strøm nå!', {
          body: `Prisen er nå ${naa.toFixed(1)} øre/kWh — under grensen din på ${alarmGrense} øre`,
        })
      }
    }
  }, [priser, alarmAktiv, alarmGrense])

  async function aktiverVarsler() {
    const tillatelse = await Notification.requestPermission()
    setVarslerAktivert(tillatelse === 'granted')
  }

  async function hentAiInnsikt() {
    if (priser.length === 0) return
    setLasterAI(true)
    setAiInnsikt('')
    const snitt = (priser.reduce((a, b) => a + b.pris, 0) / priser.length).toFixed(1)
    const min = Math.min(...priser.map(p => p.pris))
    const max = Math.max(...priser.map(p => p.pris))
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

  const visData = visIdag ? priser : morgendagPriser
  const minPris = visData.length ? Math.min(...visData.map(p => p.pris)) : 0
  const maxPris = visData.length ? Math.max(...visData.map(p => p.pris)) : 0
  const snittPris = visData.length ? (visData.reduce((a, b) => a + b.pris, 0) / visData.length).toFixed(1) : '0'

  const maanedEstimat = alleApparater.reduce((sum, a) => {
    const billigRaw = Math.min(...(priser.length ? priser.map(p => p.raw) : [0.5]))
    return sum + (a.watt / 1000) * a.timer * 30 * billigRaw
  }, 0).toFixed(0)

  const vanligMaaned = alleApparater.reduce((sum, a) => {
    const snittRaw = priser.length ? priser.reduce((acc, b) => acc + b.raw, 0) / priser.length : 0.8
    return sum + (a.watt / 1000) * a.timer * 30 * snittRaw
  }, 0).toFixed(0)

  const sparing = (parseFloat(vanligMaaned) - parseFloat(maanedEstimat)).toFixed(0)

  const bg = darkMode ? '#0f172a' : '#f8fafc'
  const cardBg = darkMode ? '#1e293b' : '#ffffff'
  const border = darkMode ? '#334155' : '#e2e8f0'
  const tekst = darkMode ? '#f1f5f9' : '#1e293b'
  const subtekst = darkMode ? '#94a3b8' : '#64748b'

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '8px 12px',
    borderRadius: '8px',
    border: `1px solid ${border}`,
    background: cardBg,
    color: tekst,
    fontSize: '14px',
    outline: 'none',
    boxSizing: 'border-box',
  }

  return (
    <main style={{ minHeight: '100vh', background: bg, padding: '16px', maxWidth: '680px', margin: '0 auto', fontFamily: 'system-ui, sans-serif', transition: 'background 0.3s' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: '700', color: tekst, margin: 0 }}>⚡ Spotsjef</h1>
          <p style={{ fontSize: '14px', color: subtekst, margin: '2px 0 0' }}>Finn den billigste tiden å bruke strøm</p>
        </div>
        <button onClick={() => setDarkMode(!darkMode)} style={{ padding: '8px 14px', borderRadius: '10px', border: `1px solid ${border}`, background: cardBg, color: tekst, cursor: 'pointer', fontSize: '14px' }}>
          {darkMode ? '☀️' : '🌙'}
        </button>
      </div>

      {feil && (
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '12px', padding: '12px 16px', margin: '12px 0', color: '#b91c1c', fontSize: '13px' }}>
          {feil}
        </div>
      )}

      {/* Live pris-ticker */}
      {naavaerendePris > 0 && (
        <div style={{ background: cardBg, border: `1px solid ${border}`, borderRadius: '16px', padding: '16px 20px', margin: '16px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <p style={{ fontSize: '12px', color: subtekst, margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Nåværende pris</p>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
              <span style={{ fontSize: '42px', fontWeight: '700', color: getColor(naavaerendePris, minPris, maxPris), lineHeight: 1 }}>
                {animertPris.toFixed(1)}
              </span>
              <span style={{ fontSize: '16px', color: subtekst }}>øre/kWh</span>
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <p style={{ fontSize: '12px', color: subtekst, margin: '0 0 4px' }}>Snitt i dag</p>
            <p style={{ fontSize: '20px', fontWeight: '600', color: tekst, margin: 0 }}>{snittPris} øre</p>
            <select value={zone} onChange={e => setZone(e.target.value)} style={{ marginTop: '6px', padding: '4px 8px', borderRadius: '8px', border: `1px solid ${border}`, background: cardBg, color: tekst, fontSize: '12px', cursor: 'pointer' }}>
              <option value="NO1">Oslo (NO1)</option>
              <option value="NO2">Kristiansand (NO2)</option>
              <option value="NO3">Trondheim (NO3)</option>
              <option value="NO4">Tromsø (NO4)</option>
              <option value="NO5">Bergen (NO5)</option>
            </select>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
        {(['idag', 'historikk', 'kalkulator'] as const).map(tab => (
          <button key={tab} onClick={() => setAktivTab(tab)} style={{ flex: 1, padding: '8px', borderRadius: '10px', border: `1px solid`, cursor: 'pointer', fontSize: '13px', fontWeight: '500', transition: 'all 0.15s', ...(aktivTab === tab ? { background: '#3b82f6', color: '#fff', borderColor: '#3b82f6' } : { background: 'transparent', color: subtekst, borderColor: border }) }}>
            {tab === 'idag' ? '📊 I dag' : tab === 'historikk' ? '📈 Historikk' : '🧮 Kalkulator'}
          </button>
        ))}
      </div>

      {/* Tab: I dag */}
      {aktivTab === 'idag' && (
        <>
          <div style={{ background: cardBg, border: `1px solid ${border}`, borderRadius: '16px', padding: '20px', marginBottom: '16px' }}>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
              {(['I dag', 'I morgen'] as const).map((label, i) => (
                <button key={label} onClick={() => setVisIdag(i === 0)} style={{ padding: '6px 16px', borderRadius: '8px', border: '1px solid', cursor: 'pointer', fontSize: '13px', fontWeight: '500', transition: 'all 0.15s', ...((visIdag ? i === 0 : i === 1) ? { background: '#3b82f6', color: '#fff', borderColor: '#3b82f6' } : { background: 'transparent', color: subtekst, borderColor: border }) }}>
                  {label}
                </button>
              ))}
            </div>

            {laster ? (
              <div style={{ textAlign: 'center', padding: '40px', color: subtekst }}>Henter priser...</div>
            ) : visData.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px', color: subtekst }}>Priser ikke tilgjengelig ennå</div>
            ) : (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '8px', padding: '0 4px' }}>
                  <span style={{ color: '#22c55e', fontWeight: '500' }}>Min: {minPris} øre</span>
                  <span style={{ color: subtekst }}>Snitt: {snittPris} øre</span>
                  <span style={{ color: '#ef4444', fontWeight: '500' }}>Maks: {maxPris} øre</span>
                </div>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={visData} margin={{ top: 4, right: 4, left: -15, bottom: 0 }}>
                    <XAxis dataKey="time" tick={{ fontSize: 10, fill: subtekst }} interval={2} />
                    <YAxis tick={{ fontSize: 10, fill: subtekst }} domain={['auto', 'auto']} />
                    <Tooltip formatter={(v: number) => [`${v} øre/kWh`]} contentStyle={{ background: cardBg, border: `1px solid ${border}`, borderRadius: '8px', fontSize: '12px', color: tekst }} />
                    <Bar dataKey="pris" radius={[4, 4, 0, 0]}>
                      {visData.map((entry, i) => (
                        <Cell key={i} fill={getColor(entry.pris, minPris, maxPris)} opacity={anbefaling && i >= anbefaling.startIdx && i < anbefaling.startIdx + Math.ceil(valgtApparat.timer) ? 1 : 0.7} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </>
            )}
          </div>

          {/* Apparater */}
          <div style={{ background: cardBg, border: `1px solid ${border}`, borderRadius: '16px', padding: '20px', marginBottom: '16px' }}>
            <h2 style={{ fontSize: '16px', fontWeight: '600', color: tekst, margin: '0 0 12px' }}>Når bør jeg kjøre?</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '10px', marginBottom: '12px' }}>
              {alleApparater.map(a => (
                <button key={a.navn} onClick={() => setValgtApparat(a)} style={{ padding: '12px', borderRadius: '12px', textAlign: 'left', border: `1px solid`, cursor: 'pointer', transition: 'all 0.15s', ...(valgtApparat.navn === a.navn ? { borderColor: '#3b82f6', background: darkMode ? '#1e3a5f' : '#eff6ff' } : { borderColor: border, background: cardBg }) }}>
                  <div style={{ fontSize: '20px', marginBottom: '4px' }}>{a.ikon || '🔌'}</div>
                  <div style={{ fontSize: '13px', fontWeight: '500', color: valgtApparat.navn === a.navn ? (darkMode ? '#93c5fd' : '#1d4ed8') : tekst }}>{a.navn}</div>
                  <div style={{ fontSize: '11px', color: subtekst }}>{a.watt}W · {a.timer}t</div>
                </button>
              ))}
              <button onClick={() => setVisEgetSkjema(!visEgetSkjema)} style={{ padding: '12px', borderRadius: '12px', textAlign: 'left', border: `1px dashed ${border}`, background: 'transparent', cursor: 'pointer' }}>
                <div style={{ fontSize: '20px', marginBottom: '4px' }}>➕</div>
                <div style={{ fontSize: '13px', fontWeight: '500', color: subtekst }}>Legg til</div>
                <div style={{ fontSize: '11px', color: subtekst }}>Eget apparat</div>
              </button>
            </div>

            {visEgetSkjema && (
              <div style={{ background: darkMode ? '#0f172a' : '#f8fafc', borderRadius: '12px', padding: '16px', marginBottom: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <input style={inputStyle} placeholder="Navn (f.eks. Badstue)" value={egetApparat.navn} onChange={e => setEgetApparat({ ...egetApparat, navn: e.target.value })} />
                <input style={inputStyle} placeholder="Watt (f.eks. 3000)" type="number" value={egetApparat.watt} onChange={e => setEgetApparat({ ...egetApparat, watt: e.target.value })} />
                <input style={inputStyle} placeholder="Timer (f.eks. 1.5)" type="number" step="0.5" value={egetApparat.timer} onChange={e => setEgetApparat({ ...egetApparat, timer: e.target.value })} />
                <button onClick={leggTilApparat} style={{ padding: '10px', borderRadius: '8px', background: '#3b82f6', color: '#fff', border: 'none', cursor: 'pointer', fontSize: '14px', fontWeight: '500' }}>Legg til</button>
              </div>
            )}

            {anbefaling && (
              <div style={{ background: darkMode ? '#052e16' : '#f0fdf4', border: `1px solid ${darkMode ? '#166534' : '#86efac'}`, borderRadius: '12px', padding: '16px' }}>
                <p style={{ color: darkMode ? '#86efac' : '#166534', fontWeight: '600', margin: '0 0 4px', fontSize: '15px' }}>
                  {valgtApparat.ikon} Kjør {valgtApparat.navn} kl. {anbefaling.startTime}–{anbefaling.sluttTime}
                </p>
                <p style={{ color: darkMode ? '#4ade80' : '#16a34a', fontSize: '13px', margin: '0 0 12px' }}>
                  Snitt {anbefaling.snittPris} øre/kWh · estimert kostnad {anbefaling.kostnad} kr
                </p>
                <button onClick={delAnbefaling} style={{ padding: '8px 16px', borderRadius: '8px', background: '#16a34a', color: '#fff', border: 'none', cursor: 'pointer', fontSize: '13px' }}>
                  {delt ? '✓ Kopiert!' : '📋 Del anbefaling'}
                </button>
              </div>
            )}
          </div>

          {/* AI Innsikt */}
          <div style={{ background: cardBg, border: `1px solid ${border}`, borderRadius: '16px', padding: '20px', marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
              <h2 style={{ fontSize: '16px', fontWeight: '600', color: tekst, margin: 0 }}>🤖 AI-innsikt</h2>
              <button onClick={hentAiInnsikt} disabled={lasterAI || priser.length === 0} style={{ padding: '8px 16px', borderRadius: '8px', background: '#7c3aed', color: '#fff', border: 'none', cursor: lasterAI ? 'default' : 'pointer', fontSize: '13px', opacity: lasterAI || priser.length === 0 ? 0.7 : 1 }}>
                {lasterAI ? 'Analyserer...' : 'Analyser dagens priser'}
              </button>
            </div>
            {aiInnsikt ? (
              <p style={{ fontSize: '14px', color: tekst, lineHeight: '1.7', margin: 0, background: darkMode ? '#1e1b4b' : '#f5f3ff', padding: '14px', borderRadius: '10px' }}>{aiInnsikt}</p>
            ) : (
              <p style={{ fontSize: '13px', color: subtekst, margin: 0 }}>Klikk for å få en smart analyse av dagens strømpriser.</p>
            )}
          </div>

          {/* Alarm & Varsler */}
          <div style={{ background: cardBg, border: `1px solid ${border}`, borderRadius: '16px', padding: '20px', marginBottom: '16px' }}>
            <h2 style={{ fontSize: '16px', fontWeight: '600', color: tekst, margin: '0 0 12px' }}>🔔 Spotpris-alarm</h2>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '12px' }}>
              <input
                type="number"
                placeholder="Grense i øre (f.eks. 30)"
                value={alarmGrense}
                onChange={e => setAlarmGrense(e.target.value)}
                style={{ ...inputStyle, flex: 1 }}
              />
              <button
                onClick={() => {
                  if (!varslerAktivert) aktiverVarsler()
                  setAlarmAktiv(!alarmAktiv)
                }}
                style={{ padding: '8px 16px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: '500', background: alarmAktiv ? '#ef4444' : '#3b82f6', color: '#fff', whiteSpace: 'nowrap' }}
              >
                {alarmAktiv ? 'Slå av' : 'Aktiver'}
              </button>
            </div>
            {alarmAktiv && alarmGrense && (
              <p style={{ fontSize: '13px', color: '#16a34a', margin: 0 }}>✓ Du varsles når prisen går under {alarmGrense} øre/kWh</p>
            )}
          </div>
        </>
      )}

      {/* Tab: Historikk */}
      {aktivTab === 'historikk' && (
        <div style={{ background: cardBg, border: `1px solid ${border}`, borderRadius: '16px', padding: '20px', marginBottom: '16px' }}>
          <h2 style={{ fontSize: '16px', fontWeight: '600', color: tekst, margin: '0 0 16px' }}>Snittpriser siste 7 dager</h2>
          {historikk.length === 0 ? (
            <p style={{ color: subtekst, textAlign: 'center', padding: '40px 0' }}>Laster historikk...</p>
          ) : (
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={historikk} margin={{ top: 4, right: 4, left: -15, bottom: 0 }}>
                <XAxis dataKey="dato" tick={{ fontSize: 11, fill: subtekst }} />
                <YAxis tick={{ fontSize: 11, fill: subtekst }} domain={['auto', 'auto']} />
                <Tooltip formatter={(v: number) => [`${v} øre/kWh`]} contentStyle={{ background: cardBg, border: `1px solid ${border}`, borderRadius: '8px', fontSize: '12px', color: tekst }} />
                <Line type="monotone" dataKey="snitt" stroke="#3b82f6" strokeWidth={2.5} dot={{ fill: '#3b82f6', r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      )}

      {/* Tab: Kalkulator */}
      {aktivTab === 'kalkulator' && (
        <div style={{ background: cardBg, border: `1px solid ${border}`, borderRadius: '16px', padding: '20px', marginBottom: '16px' }}>
          <h2 style={{ fontSize: '16px', fontWeight: '600', color: tekst, margin: '0 0 16px' }}>Månedlig sparekalkulator</h2>
          <p style={{ fontSize: '13px', color: subtekst, margin: '0 0 20px' }}>Basert på alle apparatene dine og dagens priser</p>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '20px' }}>
            {[
              { label: 'Uten optimering', verdi: `${vanligMaaned} kr`, farge: '#ef4444' },
              { label: 'Med Spotsjef', verdi: `${maanedEstimat} kr`, farge: '#22c55e' },
              { label: 'Du sparer', verdi: `${sparing} kr`, farge: '#3b82f6' },
            ].map(k => (
              <div key={k.label} style={{ background: darkMode ? '#0f172a' : '#f8fafc', borderRadius: '12px', padding: '14px', textAlign: 'center' }}>
                <p style={{ fontSize: '11px', color: subtekst, margin: '0 0 6px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{k.label}</p>
                <p style={{ fontSize: '22px', fontWeight: '700', color: k.farge, margin: 0 }}>{k.verdi}</p>
              </div>
            ))}
          </div>

          <div style={{ borderTop: `1px solid ${border}`, paddingTop: '16px' }}>
            <h3 style={{ fontSize: '14px', fontWeight: '600', color: tekst, margin: '0 0 10px' }}>Dine apparater</h3>
            {alleApparater.map(a => {
              const billigRaw = priser.length ? Math.min(...priser.map(p => p.raw)) : 0.3
              const snittRaw = priser.length ? priser.reduce((s, p) => s + p.raw, 0) / priser.length : 0.8
              const mndVanlig = ((a.watt / 1000) * a.timer * 30 * snittRaw).toFixed(0)
              const mndOptimert = ((a.watt / 1000) * a.timer * 30 * billigRaw).toFixed(0)
              return (
                <div key={a.navn} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: `1px solid ${border}` }}>
                  <span style={{ fontSize: '13px', color: tekst }}>{a.ikon || '🔌'} {a.navn}</span>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ fontSize: '13px', color: '#ef4444', textDecoration: 'line-through', marginRight: '8px' }}>{mndVanlig} kr</span>
                    <span style={{ fontSize: '13px', color: '#22c55e', fontWeight: '600' }}>{mndOptimert} kr</span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      <p style={{ textAlign: 'center', fontSize: '11px', color: subtekst, marginTop: '8px' }}>
        Priser fra hvakosterstrommen.no · Oppdateres daglig
      </p>
    </main>
  )
}
