import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar.jsx'
import Header from './Header.jsx'

export default function Layout() {
  return (
    <div style={{
      display: 'flex', height: '100vh',
      background: '#0a0d14', color: '#e8ecf5',
      fontFamily: 'Segoe UI, system-ui, sans-serif'
    }}>
      <Sidebar />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <Header />
        <main style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
          <Outlet />
        </main>
      </div>
    </div>
  )
}