import { NavLink } from 'react-router-dom'

const nav = [
  { label: 'Overview',      path: '/overview',     icon: '◈', section: 'Analytics' },
  { label: 'Trends',        path: '/trends',       icon: '↗', badge: '12' },
  { label: 'Competitors',   path: '/competitors',  icon: '⊕' },
  { label: 'Content Ideas', path: '/content',      icon: '✦' },
  { label: 'Schedule',      path: '/schedule',     icon: '⊟', section: 'Operations' },
  { label: 'Performance',   path: '/performance',  icon: '◎' },
  { label: 'Team KPIs',     path: '/team',         icon: '◉' },
  { label: 'Alerts',        path: '/alerts',       icon: '◬', badge: '3', badgeAmber: true, section: 'System' },
]

export default function Sidebar() {
  return (
    <aside style={{
      width: 220, background: '#111520',
      borderRight: '1px solid rgba(255,255,255,0.07)',
      display: 'flex', flexDirection: 'column', flexShrink: 0
    }}>
      <div style={{ padding: '20px 18px 16px', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#4f8ef7', letterSpacing: '0.08em', textTransform: 'uppercase' }}>⬡ SocialIQ</div>
        <div style={{ fontSize: 10, color: '#5a647a', marginTop: 2 }}>Intelligence Dashboard</div>
      </div>

      <nav style={{ flex: 1, padding: '12px 0', overflowY: 'auto' }}>
        {nav.map(item => (
          <div key={item.path}>
            {item.section && (
              <div style={{ padding: '16px 18px 6px', fontSize: 10, color: '#5a647a', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                {item.section}
              </div>
            )}
            <NavLink to={item.path} style={({ isActive }) => ({
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '9px 18px', textDecoration: 'none', fontSize: 13,
              color: isActive ? '#4f8ef7' : '#8892a4',
              background: isActive ? 'rgba(79,142,247,0.08)' : 'transparent',
              borderLeft: isActive ? '2px solid #4f8ef7' : '2px solid transparent',
              transition: 'all 0.15s'
            })}>
              <span style={{ fontSize: 15, width: 18, textAlign: 'center' }}>{item.icon}</span>
              <span>{item.label}</span>
              {item.badge && (
                <span style={{
                  marginLeft: 'auto', fontSize: 10, padding: '1px 6px',
                  borderRadius: 10, fontWeight: 600, color: 'white',
                  background: item.badgeAmber ? '#f5a623' : '#ff6b6b'
                }}>{item.badge}</span>
              )}
            </NavLink>
          </div>
        ))}
      </nav>

      <div style={{ padding: '12px 18px', borderTop: '1px solid rgba(255,255,255,0.07)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 11, color: '#5a647a' }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#22d3a0', display: 'inline-block' }} />
          Live sync active
        </div>
        <div style={{ fontSize: 10, color: '#5a647a', marginTop: 4 }}>Last updated: 2 min ago</div>
      </div>
    </aside>
  )
}