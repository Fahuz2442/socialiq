import { useLocation } from 'react-router-dom'
import { useState } from 'react'

const titles = {
  '/overview':    ['Overview Dashboard',     'Wed, Apr 8 · 5 platforms connected'],
  '/trends':      ['Trend Intelligence',      'Real-time trending across all platforms'],
  '/competitors': ['Competitor Analysis',     'Benchmarking against 4 competitors'],
  '/content':     ['Content Recommendations', 'AI-generated ideas based on trends'],
  '/schedule':    ['Posting Schedule',        'Weekly publishing calendar'],
  '/performance': ['Post Performance',        'Content-level metrics and insights'],
  '/team':        ['Team KPIs',               'Employee performance scoring'],
  '/alerts':      ['Alerts',                  '3 action items require attention'],
}

export default function Header() {
  const { pathname } = useLocation()
  const [activeFilter, setActiveFilter] = useState('Today')
  const [title, sub] = titles[pathname] || ['Dashboard', '']

  return (
    <header style={{
      padding: '18px 24px', borderBottom: '1px solid rgba(255,255,255,0.07)',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      background: '#111520', flexShrink: 0
    }}>
      <div>
        <div style={{ fontSize: 16, fontWeight: 600 }}>{title}</div>
        <div style={{ fontSize: 12, color: '#5a647a', marginTop: 2 }}>{sub}</div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        {['Today', '7 Days', '30 Days'].map(f => (
          <span key={f} onClick={() => setActiveFilter(f)} style={{
            padding: '4px 12px', borderRadius: 20, fontSize: 11, cursor: 'pointer',
            border: '1px solid rgba(255,255,255,0.12)',
            background: activeFilter === f ? '#4f8ef7' : 'transparent',
            color: activeFilter === f ? 'white' : '#8892a4',
            transition: 'all 0.15s'
          }}>{f}</span>
        ))}
        <button style={{ padding: '7px 14px', borderRadius: 8, fontSize: 12, cursor: 'pointer', background: 'transparent', color: '#8892a4', border: '1px solid rgba(255,255,255,0.12)' }}>
          ↓ Export
        </button>
        <button style={{ padding: '7px 14px', borderRadius: 8, fontSize: 12, cursor: 'pointer', background: '#4f8ef7', color: 'white', border: 'none' }}>
          + New Post
        </button>
      </div>
    </header>
  )
}