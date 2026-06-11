'use client'
import { useState, useRef, useEffect } from 'react'
import { Tema } from '@/lib/theme'
import { Sparkles, X, ArrowUp } from 'lucide-react'

// «Spør Flyt» – samtale med den AI-baserte assistenten. Grunnet i brukerens
// data via `kontekst` (bygget av forelderen). Fullskjerm-modal, mobilvennlig.
type Melding = { role: 'user' | 'assistant'; content: string }

const FORSLAG = [
  'Når er strømmen billigst i dag?',
  'Hva skjer i dag?',
  'Bør jeg vaske klær nå eller vente?',
]

// Gjør **fet** til ekte fet skrift og fjerner enkle markdown-tegn, så svaret
// ser pent ut i stedet for å vise stjerner.
function formaterTekst(s: string): React.ReactNode[] {
  const renset = s.replace(/^#{1,6}\s+/gm, '').replace(/^\s*[-*]\s+/gm, '• ')
  return renset.split(/(\*\*[^*]+\*\*)/g).map((del, i) => {
    if (del.startsWith('**') && del.endsWith('**')) return <strong key={i}>{del.slice(2, -2)}</strong>
    return <span key={i}>{del}</span>
  })
}

export default function FlytChat({ kontekst, tema, onLukk }: { kontekst: string; tema: Tema; onLukk: () => void }) {
  const [meldinger, setMeldinger] = useState<Melding[]>([
    { role: 'assistant', content: 'Hei! Jeg er Flyt-assistenten din. Spør meg om strøm, vær, dagen din – eller hva som helst.' },
  ])
  const [input, setInput] = useState('')
  const [laster, setLaster] = useState(false)
  const [skriver, setSkriver] = useState<string | null>(null) // tekst som "skrives ut"
  const [vist, setVist] = useState(0)
  const bunnRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bunnRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [meldinger, laster, vist, skriver])

  // Skrive-effekt: avslør svaret gradvis, og legg det i historikken når ferdig
  useEffect(() => {
    if (skriver === null) return
    if (vist >= skriver.length) {
      const ferdig = skriver
      setMeldinger(m => [...m, { role: 'assistant', content: ferdig }])
      setSkriver(null)
      setVist(0)
      return
    }
    const steg = Math.max(1, Math.round(skriver.length / 100))
    const t = setTimeout(() => setVist(v => Math.min(skriver.length, v + steg)), 16)
    return () => clearTimeout(t)
  }, [skriver, vist])

  async function send(tekst: string) {
    const t = tekst.trim()
    if (!t || laster || skriver !== null) return
    const nye: Melding[] = [...meldinger, { role: 'user', content: t }]
    setMeldinger(nye)
    setInput('')
    setLaster(true)
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ meldinger: nye, kontekst }),
      })
      const data = await res.json()
      setLaster(false)
      if (res.ok && data.svar) {
        setSkriver(data.svar) // start skrive-effekten
        setVist(0)
      } else {
        setMeldinger(m => [...m, { role: 'assistant', content: data.error || 'Noe gikk galt.' }])
      }
    } catch {
      setLaster(false)
      setMeldinger(m => [...m, { role: 'assistant', content: 'Kunne ikke svare akkurat nå. Prøv igjen.' }])
    }
  }

  const opptatt = laster || skriver !== null

  const boble = (role: 'user' | 'assistant'): React.CSSProperties => ({
    maxWidth: '85%', padding: '11px 14px', borderRadius: '16px', fontSize: '14px', lineHeight: 1.55, whiteSpace: 'pre-wrap',
    background: role === 'user' ? tema.accentGradient : tema.cardBg,
    color: role === 'user' ? '#fff' : tema.tekst,
    border: role === 'user' ? 'none' : `1px solid ${tema.border}`,
    borderBottomRightRadius: role === 'user' ? '4px' : '16px',
    borderBottomLeftRadius: role === 'user' ? '16px' : '4px',
  })

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 300, background: tema.bg, display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', padding: 'calc(14px + env(safe-area-inset-top)) 16px 14px', borderBottom: `1px solid ${tema.border}`, background: tema.cardBg }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', fontSize: '16px', fontWeight: 700, color: tema.tekst }}>
          <Sparkles size={18} color={tema.accent} /> Spør Flyt
        </span>
        <button onClick={onLukk} aria-label="Lukk" style={{ width: '36px', height: '36px', borderRadius: '11px', border: `1px solid ${tema.border}`, background: tema.inputBg, color: tema.subtekst, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <X size={18} />
        </button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '16px', maxWidth: '680px', width: '100%', margin: '0 auto', boxSizing: 'border-box' }}>
        {meldinger.map((m, i) => (
          <div key={i} className="flyt-inn" style={{ display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start', marginBottom: '10px' }}>
            <div style={boble(m.role)}>{formaterTekst(m.content)}</div>
          </div>
        ))}

        {/* Svaret som skrives ut */}
        {skriver !== null && (
          <div className="flyt-inn" style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: '10px' }}>
            <div style={boble('assistant')}>
              {formaterTekst(skriver.slice(0, vist))}
              <span className="flyt-markor" />
            </div>
          </div>
        )}

        {laster && (
          <div className="flyt-inn" style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: '10px' }}>
            <div style={{ padding: '11px 14px', borderRadius: '16px', background: tema.cardBg, border: `1px solid ${tema.border}`, color: tema.subtekst, fontSize: '14px' }}>
              Flyt tenker …
            </div>
          </div>
        )}

        {meldinger.length === 1 && !opptatt && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '6px' }}>
            {FORSLAG.map(f => (
              <button key={f} onClick={() => send(f)} style={{ padding: '9px 13px', borderRadius: '999px', border: `1px solid ${tema.border}`, background: tema.cardBg, color: tema.tekst, cursor: 'pointer', fontSize: '13px', fontFamily: 'inherit' }}>
                {f}
              </button>
            ))}
          </div>
        )}
        <div ref={bunnRef} />
      </div>

      <div style={{ padding: '12px 16px calc(12px + env(safe-area-inset-bottom))', borderTop: `1px solid ${tema.border}`, background: tema.cardBg }}>
        <div style={{ display: 'flex', gap: '8px', maxWidth: '680px', margin: '0 auto' }}>
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') send(input) }}
            placeholder="Skriv et spørsmål …"
            style={{ flex: 1, padding: '13px 16px', borderRadius: '14px', border: `1px solid ${tema.border}`, background: tema.inputBg, color: tema.tekst, fontSize: '15px', fontFamily: 'inherit', outline: 'none' }}
          />
          <button onClick={() => send(input)} disabled={opptatt || !input.trim()} aria-label="Send" style={{ flexShrink: 0, width: '48px', borderRadius: '14px', border: 'none', background: tema.accentGradient, color: '#fff', cursor: opptatt || !input.trim() ? 'default' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: opptatt || !input.trim() ? 0.6 : 1 }}>
            <ArrowUp size={20} />
          </button>
        </div>
      </div>
    </div>
  )
}
