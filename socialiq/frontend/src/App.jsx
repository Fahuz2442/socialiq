import { Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/layout/Layout'
import Overview from './pages/Overview'
import Trends from './pages/Trends/index.jsx'
import Competitors from './pages/Competitors'
import ContentIdeas from './pages/ContentIdeas/index.jsx'
import Schedule from './pages/Schedule/index.jsx'
import Performance from './pages/Performance'
import TeamKPIs from './pages/TeamKPIs/index.jsx'
import Alerts from './pages/Alerts'
import PlatformsPage from './pages/Platforms/PlatformsPage'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<Navigate to="/overview" replace />} />
        <Route path="overview"           element={<Overview />} />
        <Route path="trends"             element={<Trends />} />
        <Route path="competitors"        element={<Competitors />} />
        <Route path="content"            element={<ContentIdeas />} />
        <Route path="schedule"           element={<Schedule />} />
        <Route path="performance"        element={<Performance />} />
        <Route path="team"               element={<TeamKPIs />} />
        <Route path="alerts"             element={<Alerts />} />
        <Route path="settings/platforms" element={<PlatformsPage />} />
      </Route>
    </Routes>
  )
}