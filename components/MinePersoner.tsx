'use client'
import { useEffect, useState } from 'react'
import { Tema } from '@/lib/naerTema'
import { useBruker } from '@/lib/bruker'
import {
  Relasjon, NaerReminder, Kvittering,
  opprettInvitasjon, hentMineMottakere, slettRelasjon,
  hentReminderFor, leggTilReminderFor, hentSisteKvitteringer,
} from '@/lib/naer'
import { slettReminder } from '@/lib/reminders'
import { Gjentakelse } from '@/lib/tid'
import { useAutoOppdater } from '@/lib/useAutoOppdater'
import { koblBrukerTilPush, pushStottes } from '@/lib/pushClient'
import { HeartHandshake, Sparkles, BellRing } from 'lucide-react'

// Nær – «Mine personer»: pårørende kobler til en mottaker via invitasjonskode,
// legger inn påminnelser for hen, og ser kvitteringer («Levert ✓ Bekreftet ✓»).
// Kvitteringene er produktets hjerte: visshet om at det nådde frem.
export default function MinePersoner({ tema }: { tema: Tema }) {
  const { brukerId, laster: lasterBruker } = useBruker()
  const [personer, setPersoner] = useState<Relasjon[]>([])
  const [lastet, setLastet] = useState(false)
  const [visNySkjema, setVisNySkjema] = useState(false)
  const [nyttNavn, setNyttNavn] = useState('')
  const [feil, setFeil] = useState('')
  const [jobber, setJobber] = useState(false)
  const [apenPerson, setApenPerson] = useState<string | null>(null)
  const [varslerPaa, setVarslerPaa] = useState(false)

  // Uten innlogging er det ingenting å hente – men vis kortet likevel
  useEffect(() => {
    if (!lasterBruker && !brukerId) setLastet(true)
  }, [lasterBruker, brukerId])

  // Hold lista fersk: «Venter på kobling» skal bli «Tilkoblet ✓» av seg selv
  useAutoOppdater(!lasterBruker && Boolean(brukerId), 30_000, () => {
    hentMineMottakere(brukerId as string).then(p => { setPersoner(p); setLastet(true) })
  })

  const kortStil: React.CSSProperties = {
    background: tema.cardBg, borderRadius: '20px', padding: '22px', marginBottom: '14px',
    boxShadow: tema.skygge, border: `1px solid ${tema.border}`,
  }
  const merkelapp: React.CSSProperties = {
    fontSize: '11px', color: tema.subtekst, margin: '0 0 12px',
    textTransform: 'uppercase', letterSpacing: '0.12em', fontWeight: 700,
    display: 'inline-flex', alignItems: 'center', gap: '6px',
  }
  const inputStil: React.CSSProperties = {
    width: '100%', padding: '11px 13px', borderRadius: '12px', border: `1px solid ${tema.border}`,
    background: tema.inputBg, color: tema.tekst, fontSize: '14px', fontFamily: 'inherit', outline: 'none',
  }

  if (!lastet) return null

  if (!brukerId) {
    return (
      <div style={kortStil}>
        <p style={merkelapp}><HeartHandshake size={13} /> Mine personer</p>
        <p style={{ fontSize: '13px', color: tema.subtekst, margin: 0, lineHeight: 1.6 }}>
          Logg inn (under «Mer») for å hjelpe noen du er glad i med påminnelser.
        </p>
      </div>
    )
  }

  async function lagInvitasjon() {
    if (!nyttNavn.trim() || !brukerId) {
      setFeil('Skriv hva du kaller personen, f.eks. «Mamma».')
      return
    }
    setJobber(true)
    setFeil('')
    const { relasjon, feil: f } = await opprettInvitasjon(brukerId, nyttNavn.trim())
    if (relasjon) {
      setPersoner(p => [...p, relasjon])
      setNyttNavn('')
      setVisNySkjema(false)
      setApenPerson(relasjon.id)
    } else {
      setFeil(f || 'Kunne ikke lage invitasjon.')
    }
    setJobber(false)
  }

  async function fjernPerson(r: Relasjon) {
    const tekst = r.status === 'aktiv'
      ? `Koble fra ${r.mottakerNavn}? Påminnelsene deres slutter å virke.`
      : 'Slette denne invitasjonen?'
    if (!window.confirm(tekst)) return
    setPersoner(p => p.filter(x => x.id !== r.id))
    await slettRelasjon(r.id)
  }

  async function slaaPaaVarsler() {
    if (!brukerId) return
    const ok = await koblBrukerTilPush(brukerId)
    setVarslerPaa(ok)
  }

  return (
    <div style={kortStil}>
      <p style={merkelapp}><HeartHandshake size={13} /> Mine personer</p>

      {personer.length === 0 && !visNySkjema && (
        <p style={{ fontSize: '13px', color: tema.subtekst, margin: '0 0 14px', lineHeight: 1.6 }}>
          Hjelp noen du er glad i med hverdagen: legg inn påminnelser som vises
          på en enkel skjerm hos dem – og se at de blir bekreftet.
        </p>
      )}

      {personer.map(p => (
        <PersonRad
          key={p.id}
          relasjon={p}
          apen={apenPerson === p.id}
          onToggle={() => setApenPerson(apenPerson === p.id ? null : p.id)}
          onFjern={() => fjernPerson(p)}
          brukerId={brukerId}
          tema={tema}
          inputStil={inputStil}
        />
      ))}

      {visNySkjema ? (
        <div style={{ display: 'grid', gap: '8px', marginTop: personer.length ? '12px' : 0 }}>
          <input
            value={nyttNavn}
            onChange={e => setNyttNavn(e.target.value)}
            placeholder="Hva kaller du personen? F.eks. «Mamma»"
            style={inputStil}
          />
          <div style={{ display: 'flex', gap: '8px' }}>
            <button type="button" onClick={lagInvitasjon} disabled={jobber} style={{ flex: 1, padding: '12px', borderRadius: '12px', border: 'none', background: tema.accentGradient, color: '#fff', cursor: 'pointer', fontSize: '14px', fontWeight: 700, fontFamily: 'inherit', opacity: jobber ? 0.7 : 1 }}>
              {jobber ? 'Lager kode …' : 'Lag invitasjonskode'}
            </button>
            <button type="button" onClick={() => { setVisNySkjema(false); setFeil('') }} style={{ padding: '12px 16px', borderRadius: '12px', border: 'none', background: tema.inputBg, color: tema.subtekst, cursor: 'pointer', fontSize: '14px', fontFamily: 'inherit' }}>
              Avbryt
            </button>
          </div>
          {feil && <p style={{ fontSize: '12px', color: '#d1605f', margin: 0 }}>{feil}</p>}
        </div>
      ) : (
        <button type="button" onClick={() => setVisNySkjema(true)} style={{ width: '100%', padding: '12px', borderRadius: '12px', border: `1px dashed ${tema.border}`, background: 'transparent', color: tema.subtekst, cursor: 'pointer', fontSize: '14px', fontWeight: 600, fontFamily: 'inherit', marginTop: personer.length ? '12px' : 0 }}>
          + Legg til person
        </button>
      )}

      {personer.some(p => p.status === 'aktiv') && (
        <button type="button" onClick={slaaPaaVarsler} disabled={varslerPaa || !pushStottes()} style={{ width: '100%', marginTop: '12px', padding: '11px', borderRadius: '12px', border: 'none', background: tema.inputBg, color: varslerPaa ? tema.subtekst : tema.tekst, cursor: varslerPaa ? 'default' : 'pointer', fontSize: '13px', fontWeight: 600, fontFamily: 'inherit', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '7px' }}>
          <BellRing size={14} />
          {varslerPaa ? 'Du varsles hvis noe ikke bekreftes ✓' : 'Varsle meg hvis en påminnelse ikke bekreftes'}
        </button>
      )}
    </div>
  )
}

// ── Én person: status, kode (hvis venter), påminnelser + kvitteringer ────────

function PersonRad({ relasjon, apen, onToggle, onFjern, brukerId, tema, inputStil }: {
  relasjon: Relasjon
  apen: boolean
  onToggle: () => void
  onFjern: () => void
  brukerId: string
  tema: Tema
  inputStil: React.CSSProperties
}) {
  const [reminders, setReminders] = useState<NaerReminder[]>([])
  const [kvitteringer, setKvitteringer] = useState<Record<string, Kvittering>>({})
  const [tekst, setTekst] = useState('')
  const [tid, setTid] = useState('')
  const [gjentakelse, setGjentakelse] = useState<'' | Gjentakelse>('')
  const [feil, setFeil] = useState('')
  const [jobber, setJobber] = useState(false)
  const [aiTekst, setAiTekst] = useState('')
  const [aiLaster, setAiLaster] = useState(false)

  const aktiv = relasjon.status === 'aktiv'

  // Hold påminnelser + kvitteringer ferske mens raden er åpen, så
  // «venter på bekreftelse» blir «Bekreftet ✓» uten at man laster siden på nytt
  useAutoOppdater(apen && aktiv && Boolean(relasjon.mottakerId), 20_000, async () => {
    const r = await hentReminderFor(relasjon.mottakerId as string)
    setReminders(r)
    setKvitteringer(await hentSisteKvitteringer(r.map(x => x.id)))
  })

  // AI-tolkning: «medisin hver morgen kl 9» → tekst + tidspunkt ferdig utfylt
  async function tolkMedAi() {
    const t = aiTekst.trim()
    if (!t) return
    setAiLaster(true)
    setFeil('')
    try {
      const naa = new Date()
      const res = await fetch('/api/tolk-paminnelse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tekst: t,
          naa: naa.toISOString(),
          naaLesbar: naa.toLocaleString('nb-NO', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' }),
        }),
      })
      const data = await res.json()
      if (res.ok && data.lokalTid) {
        setTekst(data.tekst)
        setTid(data.lokalTid)
        // Gjenkjenn gjentakelse i råteksten (AI-routen returnerer ett tidspunkt)
        if (/hver dag|daglig|hver morgen|hver kveld/i.test(t)) setGjentakelse('daglig')
        else if (/hver uke|ukentlig|hver mandag|hver tirsdag|hver onsdag|hver torsdag|hver fredag|hver lørdag|hver søndag/i.test(t)) setGjentakelse('ukentlig')
        setAiTekst('')
      } else {
        setFeil(data.error || 'Forsto ikke helt – prøv igjen.')
      }
    } catch {
      setFeil('Kunne ikke tolke akkurat nå.')
    }
    setAiLaster(false)
  }

  async function leggTil() {
    if (!tekst.trim() || !tid || !relasjon.mottakerId) {
      setFeil('Fyll inn både tekst og tidspunkt.')
      return
    }
    setJobber(true)
    setFeil('')
    const iso = new Date(tid).toISOString()
    const { reminder, feil: f } = await leggTilReminderFor(
      brukerId, relasjon.mottakerId, tekst.trim(), iso, gjentakelse || null,
    )
    if (reminder) {
      setReminders(l => [...l, reminder].sort((a, b) => a.tid.localeCompare(b.tid)))
      setTekst(''); setTid(''); setGjentakelse('')
    } else {
      setFeil(f || 'Kunne ikke lagre.')
    }
    setJobber(false)
  }

  async function fjern(id: string) {
    setReminders(l => l.filter(r => r.id !== id))
    await slettReminder(id)
  }

  function visTid(iso: string): string {
    return new Date(iso).toLocaleString('nb-NO', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
  }
  function visKl(iso: string): string {
    return new Date(iso).toLocaleTimeString('nb-NO', { hour: '2-digit', minute: '2-digit' })
  }

  // Kvitteringsstatus i klartekst – dette er det pårørende betaler for
  function status(r: NaerReminder): { tekst: string; farge: string } {
    const k = kvitteringer[r.id]
    if (!k) {
      return { tekst: `Planlagt ${visTid(r.tid)}${r.gjentakelse ? (r.gjentakelse === 'daglig' ? ' · hver dag' : ' · hver uke') : ''}`, farge: tema.subtekst }
    }
    if (k.bekreftet) {
      return { tekst: `Bekreftet ${visKl(k.bekreftet)} ✓${k.levert ? ` · levert ${visKl(k.levert)}` : ''}`, farge: '#5b9279' }
    }
    if (k.eskalert) {
      return { tekst: `Ikke bekreftet (${visKl(k.planlagt)}) – du fikk varsel`, farge: '#c98a7a' }
    }
    if (k.levert) {
      return { tekst: `Levert ${visKl(k.levert)} ✓ · venter på bekreftelse`, farge: '#c9a85f' }
    }
    return { tekst: `Vises på skjermen – varsel nådde ikke frem ennå`, farge: '#c9a85f' }
  }

  return (
    <div style={{ background: tema.inputBg, borderRadius: '14px', padding: '14px', marginBottom: '8px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
        <button type="button" onClick={onToggle} style={{ flex: 1, textAlign: 'left', border: 'none', background: 'transparent', cursor: 'pointer', padding: 0, fontFamily: 'inherit' }}>
          <span style={{ display: 'block', fontSize: '15px', fontWeight: 700, color: tema.tekst }}>
            {relasjon.mottakerNavn} {apen ? '▾' : '▸'}
          </span>
          <span style={{ display: 'block', fontSize: '12px', color: aktiv ? '#5b9279' : tema.subtekst, marginTop: '2px' }}>
            {aktiv ? 'Tilkoblet ✓' : 'Venter på at koden tastes inn'}
          </span>
        </button>
        <button type="button" onClick={onFjern} aria-label="Fjern" style={{ flexShrink: 0, width: '30px', height: '30px', borderRadius: '9px', border: 'none', background: 'transparent', color: tema.subtekst, cursor: 'pointer', fontSize: '16px' }}>
          ✕
        </button>
      </div>

      {/* Venter: vis koden stort + hva man gjør med den */}
      {apen && !aktiv && (
        <div style={{ marginTop: '12px', textAlign: 'center', background: tema.cardBg, borderRadius: '12px', padding: '16px' }}>
          <p style={{ fontSize: '12px', color: tema.subtekst, margin: '0 0 8px' }}>
            Åpne appen på enheten til {relasjon.mottakerNavn}, gå til «Mer» og tast inn:
          </p>
          <p style={{ fontSize: '30px', fontWeight: 800, letterSpacing: '0.25em', color: tema.tekst, margin: 0 }}>
            {relasjon.kode}
          </p>
        </div>
      )}

      {/* Aktiv: påminnelser med kvitteringsstatus + nytt-skjema */}
      {apen && aktiv && (
        <div style={{ marginTop: '12px' }}>
          {reminders.length > 0 ? (
            <div style={{ display: 'grid', gap: '6px', marginBottom: '12px' }}>
              {reminders.map(r => {
                const s = status(r)
                return (
                  <div key={r.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', background: tema.cardBg, borderRadius: '11px', padding: '10px 13px' }}>
                    <div>
                      <span style={{ display: 'block', fontSize: '14px', color: tema.tekst, lineHeight: 1.3 }}>{r.tekst}</span>
                      <span style={{ display: 'block', fontSize: '12px', color: s.farge, marginTop: '2px' }}>{s.tekst}</span>
                    </div>
                    <button type="button" onClick={() => fjern(r.id)} aria-label="Slett" style={{ flexShrink: 0, width: '28px', height: '28px', borderRadius: '8px', border: 'none', background: 'transparent', color: tema.subtekst, cursor: 'pointer', fontSize: '15px' }}>
                      ✕
                    </button>
                  </div>
                )
              })}
            </div>
          ) : (
            <p style={{ fontSize: '13px', color: tema.subtekst, margin: '0 0 12px', lineHeight: 1.5 }}>
              Ingen påminnelser ennå. Legg inn den første – f.eks. medisin eller en avtale.
            </p>
          )}

          {/* AI: skriv naturlig → felter fylles ut */}
          <div style={{ background: tema.cardBg, borderRadius: '12px', padding: '11px', marginBottom: '10px' }}>
            <p style={{ fontSize: '12px', color: tema.subtekst, margin: '0 0 7px', display: 'inline-flex', alignItems: 'center', gap: '5px', fontWeight: 600 }}>
              <Sparkles size={12} /> Skriv naturlig
            </p>
            <div style={{ display: 'flex', gap: '7px' }}>
              <input
                value={aiTekst}
                onChange={e => setAiTekst(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') tolkMedAi() }}
                placeholder="f.eks. «medisin hver morgen kl 9»"
                style={{ ...inputStil, background: tema.inputBg, flex: 1 }}
              />
              <button type="button" onClick={tolkMedAi} disabled={aiLaster || !aiTekst.trim()} style={{ flexShrink: 0, padding: '0 14px', borderRadius: '11px', border: 'none', background: tema.accentGradient, color: '#fff', cursor: 'pointer', fontSize: '13px', fontWeight: 700, fontFamily: 'inherit', opacity: aiLaster || !aiTekst.trim() ? 0.6 : 1 }}>
                {aiLaster ? '…' : 'Tolk'}
              </button>
            </div>
          </div>

          <div style={{ display: 'grid', gap: '7px' }}>
            <input value={tekst} onChange={e => setTekst(e.target.value)} placeholder={`Hva skal ${relasjon.mottakerNavn} huskes på?`} style={inputStil} />
            <div style={{ display: 'flex', gap: '7px' }}>
              <input type="datetime-local" value={tid} onChange={e => setTid(e.target.value)} style={{ ...inputStil, flex: 1 }} />
              <select value={gjentakelse} onChange={e => setGjentakelse(e.target.value as '' | Gjentakelse)} style={{ ...inputStil, width: 'auto', cursor: 'pointer' }}>
                <option value="">Én gang</option>
                <option value="daglig">Hver dag</option>
                <option value="ukentlig">Hver uke</option>
              </select>
            </div>
            <button type="button" onClick={leggTil} disabled={jobber} style={{ padding: '12px', borderRadius: '11px', border: 'none', background: tema.accentBg, color: '#fff', cursor: 'pointer', fontSize: '14px', fontWeight: 700, fontFamily: 'inherit', opacity: jobber ? 0.7 : 1 }}>
              {jobber ? 'Lagrer …' : `Legg til for ${relasjon.mottakerNavn}`}
            </button>
            {feil && <p style={{ fontSize: '12px', color: '#d1605f', margin: 0 }}>{feil}</p>}
          </div>
        </div>
      )}
    </div>
  )
}
