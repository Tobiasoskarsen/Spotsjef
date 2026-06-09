'use client'
import { useEffect, useState } from 'react'
import { Tema } from '@/lib/theme'
import { useBruker } from '@/lib/bruker'
import { Reminder, hentReminder, leggTilReminder, slettReminder } from '@/lib/reminders'

// Din egen kalender: legg inn påminnelser/hendelser. Vises i briefen og pushes
// ved forfall (cron). Krever innlogging (anonym konto holder).
export default function ReminderKort({ tema }: { tema: Tema }) {
  const { brukerId, laster: lasterBruker } = useBruker()
  const [liste, setListe] = useState<Reminder[]>([])
  const [lastet, setLastet] = useState(false)
  const [tekst, setTekst] = useState('')
  const [tid, setTid] = useState('')
  const [feil, setFeil] = useState('')
  const [jobber, setJobber] = useState(false)

  useEffect(() => {
    if (lasterBruker) return
    if (!brukerId) { setLastet(true); return }
    let aktiv = true
    hentReminder(brukerId).then(r => { if (aktiv) { setListe(r); setLastet(true) } })
    return () => { aktiv = false }
  }, [brukerId, lasterBruker])

  if (!lastet) return null

  const kortStil: React.CSSProperties = {
    background: tema.cardBg, borderRadius: '20px', padding: '22px', marginBottom: '14px',
    boxShadow: tema.skygge, border: `1px solid ${tema.border}`,
  }
  const merkelapp: React.CSSProperties = {
    fontSize: '11px', color: tema.subtekst, margin: '0 0 12px',
    textTransform: 'uppercase', letterSpacing: '0.12em', fontWeight: 700,
  }
  const inputStil: React.CSSProperties = {
    width: '100%', padding: '11px 13px', borderRadius: '12px', border: `1px solid ${tema.border}`,
    background: tema.inputBg, color: tema.tekst, fontSize: '14px', fontFamily: 'inherit', outline: 'none',
  }

  // Uten innlogging kan vi ikke lagre påminnelser
  if (!brukerId) {
    return (
      <div style={kortStil}>
        <p style={merkelapp}>Påminnelser</p>
        <p style={{ fontSize: '13px', color: tema.subtekst, margin: 0, lineHeight: 1.6 }}>
          Logg inn (under «Mer») for å legge inn egne påminnelser som følger deg på tvers av enheter.
        </p>
      </div>
    )
  }

  async function leggTil() {
    if (!tekst.trim() || !tid || !brukerId) {
      setFeil('Fyll inn både tekst og tidspunkt.')
      return
    }
    setJobber(true)
    setFeil('')
    // datetime-local tolkes i enhetens tidssone (Oslo for norske brukere)
    const iso = new Date(tid).toISOString()
    const ny = await leggTilReminder(brukerId, tekst.trim(), iso)
    if (ny) {
      setListe(l => [...l, ny].sort((a, b) => a.tid.localeCompare(b.tid)))
      setTekst('')
      setTid('')
    } else {
      setFeil('Kunne ikke lagre. Prøv igjen.')
    }
    setJobber(false)
  }

  async function fjern(id: string) {
    setListe(l => l.filter(r => r.id !== id))
    await slettReminder(id)
  }

  function vis(tidISO: string): string {
    const d = new Date(tidISO)
    return d.toLocaleString('nb-NO', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div style={kortStil}>
      <p style={merkelapp}>Påminnelser</p>

      {liste.length > 0 ? (
        <div style={{ display: 'grid', gap: '8px', marginBottom: '16px' }}>
          {liste.map(r => (
            <div key={r.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', background: tema.inputBg, borderRadius: '12px', padding: '10px 14px' }}>
              <div>
                <span style={{ display: 'block', fontSize: '14px', color: tema.tekst, lineHeight: 1.3 }}>{r.tekst}</span>
                <span style={{ display: 'block', fontSize: '12px', color: tema.subtekst }}>{vis(r.tid)}</span>
              </div>
              <button type="button" onClick={() => fjern(r.id)} aria-label="Slett" style={{ flexShrink: 0, width: '30px', height: '30px', borderRadius: '9px', border: 'none', background: 'transparent', color: tema.subtekst, cursor: 'pointer', fontSize: '16px' }}>
                ✕
              </button>
            </div>
          ))}
        </div>
      ) : (
        <p style={{ fontSize: '13px', color: tema.subtekst, margin: '0 0 16px', lineHeight: 1.6 }}>
          Ingen påminnelser ennå. Legg inn noe du vil huske – jeg minner deg på det.
        </p>
      )}

      <div style={{ display: 'grid', gap: '8px' }}>
        <input value={tekst} onChange={e => setTekst(e.target.value)} placeholder="Hva vil du huskes på?" style={inputStil} />
        <input type="datetime-local" value={tid} onChange={e => setTid(e.target.value)} style={inputStil} />
        <button type="button" onClick={leggTil} disabled={jobber} style={{ padding: '12px', borderRadius: '12px', border: 'none', background: tema.accentBg, color: '#fff', cursor: jobber ? 'default' : 'pointer', fontSize: '14px', fontWeight: 700, fontFamily: 'inherit', opacity: jobber ? 0.7 : 1 }}>
          {jobber ? 'Lagrer …' : 'Legg til påminnelse'}
        </button>
        {feil && <p style={{ fontSize: '12px', color: '#d1605f', margin: 0 }}>{feil}</p>}
      </div>

      <p style={{ fontSize: '11px', color: tema.subtekst, margin: '14px 0 0', lineHeight: 1.6 }}>
        Du får et varsel når tiden er inne (husk å slå på påminnelser i assistenten).
      </p>
    </div>
  )
}
