import { useState } from 'react'
import AgentPage from './pages/AgentPage'
import LLMHubPage from './pages/LLMHubPage'
import ComparePage from './pages/ComparePage'

type Tab = 'agent' | 'llm-hub' | 'compare'

export default function App() {
  const [tab, setTab] = useState<Tab>('agent')

  const tabs: { key: Tab; label: string }[] = [
    { key: 'agent', label: 'Agent Flow' },
    { key: 'llm-hub', label: 'LLM Hub' },
    { key: 'compare', label: '비교 뷰' },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <nav style={{
        display: 'flex', alignItems: 'center', gap: 4,
        padding: '8px 16px',
        background: 'var(--surface)',
        borderBottom: '1px solid var(--border)',
        flexShrink: 0,
      }}>
        <span style={{ fontWeight: 700, fontSize: 14, marginRight: 16, color: 'var(--primary)' }}>
          TPS Simulator
        </span>
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} style={{
            background: tab === t.key ? 'var(--primary)' : 'transparent',
            color: tab === t.key ? '#fff' : 'var(--text2)',
            border: `1px solid ${tab === t.key ? 'var(--primary)' : 'transparent'}`,
            padding: '5px 14px',
            borderRadius: 'var(--radius)',
            fontWeight: tab === t.key ? 600 : 400,
          }}>
            {t.label}
          </button>
        ))}
      </nav>
      <div style={{ flex: 1, overflow: 'hidden' }}>
        {tab === 'agent' && <AgentPage />}
        {tab === 'llm-hub' && <LLMHubPage />}
        {tab === 'compare' && <ComparePage />}
      </div>
    </div>
  )
}
