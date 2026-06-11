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

export default function FlytChat({ kontekst, tema, onLukk }: { kontekst: string; tema: Tema; onLukk: () => void }) {
  const [meldinger, setMeldinger] = useState<Melding[]>([
    { role: 'assistant', content: 'Hei! Jeg er Flyt-assistenten din. Spør meg om strøm, vær, dagen din – eller hva som helst.' },
  ])
  const [input, setInput] = useState('')
  const [laster, setLaster] = useState(false)
  const bunnRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bunnRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [meldinger, laster])

  async function send(tekst: string) {
    const t = tekst.trim()
    if (!t || laster) return
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
      setMeldinger(m => [...m, { role: 'assistant', content: res.ok ? data.svar : (data.error || 'Noe gikk galt.') }])
    } catch {
      setMeldinger(m => [...m, { role: 'assistant', content: 'Kunne ikke svare akkurat nå. Prøv igjen.' }])
    }
    setLaster(false)
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 300, background: tema.bg, display: 'flex', flexDirection: 'column' }}>
      {/* Topp */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', padding: 'calc(14px + env(safe-area-inset-top)) 16px 14px', borderBottom: `1px solid ${tema.border}`, background: tema.cardBg }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', fontSize: '16px', fontWeight: 700, color: tema.tekst }}>
          <Sparkles size={18} color={tema.accent} /> Spør Flyt
        </span>
        <button onClick={onLukk} aria-label="Lukk" style={{ width: '36px', height: '36px', borderRadius: '11px', border: `1px solid ${tema.border}`, background: tema.inputBg, color: tema.subtekst, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <X size={18} />
        </button>
      </div>

      {/* Meldinger */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px', maxWidth: '680px', width: '100%', margin: '0 auto', boxSizing: 'border-box' }}>
        {meldinger.map((m, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start', marginBottom: '10px' }}>
            <div style={{
              maxWidth: '85%', padding: '11px 14px', borderRadius: '16px', fontSize: '14px', lineHeight: 1.55, whiteSpace: 'pre-wrap',
              background: m.role === 'user' ? tema.accentGradient : tema.cardBg,
              color: m.role === 'user' ? '#fff' : tema.tekst,
              border: m.role === 'user' ? 'none' : `1px solid ${tema.border}`,
              borderBottomRightRadius: m.role === 'user' ? '4px' : '16px',
              borderBottomLeftRadius: m.role === 'user' ? '16px' : '4px',
            }}>
              {m.content}
            </div>
          </div>
        ))}

        {laster && (
          <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: '10px' }}>
            <div style={{ padding: '11px 14px', borderRadius: '16px', background: tema.cardBg, border: `1px solid ${tema.border}`, color: tema.subtekst, fontSize: '14px' }}>
              Flyt tenker …
            </div>
          </div>
        )}

        {/* Forslag (kun før første spørsmål) */}
        {meldinger.length === 1 && !laster && (
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

      {/* Skrivefelt */}
      <div style={{ padding: '12px 16px calc(12px + env(safe-area-inset-bottom))', borderTop: `1px solid ${tema.border}`, background: tema.cardBg }}>
        <div style={{ display: 'flex', gap: '8px', maxWidth: '680px', margin: '0 auto' }}>
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') send(input) }}
            placeholder="Skriv et spørsmål …"
            style={{ flex: 1, padding: '13px 16px', borderRadius: '14px', border: `1px solid ${tema.border}`, background: tema.inputBg, color: tema.tekst, fontSize: '15px', fontFamily: 'inherit', outline: 'none' }}
          />
          <button onClick={() => send(input)} disabled={laster || !input.trim()} aria-label="Send" style={{ flexShrink: 0, width: '48px', borderRadius: '14px', border: 'none', background: tema.accentGradient, color: '#fff', cursor: laster || !input.trim() ? 'default' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: laster || !input.trim() ? 0.6 : 1 }}>
            <ArrowUp size={20} />
          </button>
        </div>
      </div>
    </div>
  )
}
