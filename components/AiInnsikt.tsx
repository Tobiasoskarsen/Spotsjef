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
    <div style={{ background: tema.cardBg, border: `1px solid ${tema.border}`, borderRadius: '16px', padding: '20px', marginBottom: '16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
        <h2 style={{ fontSize: '16px', fontWeight: 600, color: tema.tekst, margin: 0 }}>🤖 AI-innsikt</h2>
        <button onClick={onAnalyser} disabled={lasterAI || !kanAnalysere} style={{ padding: '8px 16px', borderRadius: '8px', background: '#7c3aed', color: '#fff', border: 'none', cursor: lasterAI || !kanAnalysere ? 'default' : 'pointer', fontSize: '13px', opacity: lasterAI || !kanAnalysere ? 0.7 : 1 }}>
          {lasterAI ? 'Analyserer...' : 'Analyser dagens priser'}
        </button>
      </div>
      {aiInnsikt ? (
        <p style={{ fontSize: '14px', color: tema.tekst, lineHeight: 1.7, margin: 0, background: darkMode ? '#1e1b4b' : '#f5f3ff', padding: '14px', borderRadius: '10px' }}>{aiInnsikt}</p>
      ) : (
        <p style={{ fontSize: '13px', color: tema.subtekst, margin: 0 }}>Klikk for å få en smart analyse av dagens strømpriser.</p>
      )}
    </div>
  )
}
