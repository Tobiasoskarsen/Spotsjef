import { Tema } from '@/lib/theme'

type Props = {
  aiInnsikt: string
  lasterAI: boolean
  kanAnalysere: boolean
  onAnalyser: () => void
  darkMode: boolean
  tema: Tema
}

export default function AiInnsikt({ aiInnsikt, lasterAI, kanAnalysere, onAnalyser, darkMode, tema }: Props) {
  return (
    <div style={{ background: tema.cardBg, borderRadius: '18px', padding: '20px', marginBottom: '14px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
        <h2 style={{ fontSize: '15px', fontWeight: 500, color: tema.tekst, margin: 0 }}>AI-innsikt</h2>
        <button onClick={onAnalyser} disabled={lasterAI || !kanAnalysere} style={{ padding: '8px 16px', borderRadius: '12px', background: tema.accentBg, color: tema.accent, border: 'none', cursor: lasterAI || !kanAnalysere ? 'default' : 'pointer', fontSize: '13px', fontWeight: 500, fontFamily: 'inherit', opacity: lasterAI || !kanAnalysere ? 0.6 : 1, transition: 'opacity 0.2s' }}>
          {lasterAI ? 'Analyserer...' : 'Analyser dagens priser'}
        </button>
      </div>
      {aiInnsikt ? (
        <p style={{ fontSize: '14px', color: tema.tekst, lineHeight: 1.7, margin: 0, background: tema.inputBg, padding: '14px', borderRadius: '14px' }}>{aiInnsikt}</p>
      ) : (
        <p style={{ fontSize: '13px', color: tema.subtekst, margin: 0 }}>Klikk for å få en smart analyse av dagens strømpriser.</p>
      )}
    </div>
  )
}
