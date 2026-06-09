import { Tema } from '@/lib/theme'

type Props = {
  aiInnsikt: string
  lasterAI: boolean
  kanAnalysere: boolean
  onAnalyser: () => void
  tema: Tema
}

export default function AiInnsikt({ aiInnsikt, lasterAI, kanAnalysere, onAnalyser, tema }: Props) {
  return (
    <div style={{ background: tema.cardBg, borderRadius: '18px', padding: '20px', marginBottom: '14px', boxShadow: tema.skygge, border: `1px solid ${tema.border}` }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
        <h2 style={{ fontSize: '15px', fontWeight: 600, color: tema.tekst, margin: 0, letterSpacing: '-0.01em' }}>AI-hjelp</h2>
        <button onClick={onAnalyser} disabled={lasterAI || !kanAnalysere} style={{ padding: '9px 16px', borderRadius: '12px', background: tema.accentGradient, color: '#fff', border: 'none', cursor: lasterAI || !kanAnalysere ? 'default' : 'pointer', fontSize: '13px', fontWeight: 600, fontFamily: 'inherit', opacity: lasterAI || !kanAnalysere ? 0.55 : 1, boxShadow: tema.skygge }}>
          {lasterAI ? 'Laster...' : 'Finn tips'}
        </button>
      </div>
      {aiInnsikt ? (
        <p style={{ fontSize: '14px', color: tema.tekst, lineHeight: 1.7, margin: 0, background: tema.inputBg, padding: '14px', borderRadius: '14px' }}>{aiInnsikt}</p>
      ) : (
        <p style={{ fontSize: '13px', color: tema.subtekst, margin: 0 }}>Klikk for å få forslag til oppgaver, påminnelser og energisparende vaner.</p>
      )}
    </div>
  )
}
