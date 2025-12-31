import { NavLink, Route, Routes } from 'react-router-dom'
import FocusPage from './pages/FocusPage'
import HomePage from './pages/HomePage'
import TaskDetailPage from './pages/TaskDetailPage'
import SettingsPage from './pages/SettingsPage'

const navLinks = [
  { path: '/', label: 'Home' },
  { path: '/focus', label: 'Focus' },
  { path: '/settings', label: 'Settings' },
] as const

function App() {
  return (
    <div className="app-shell">
      <main className="app-main">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/focus" element={<FocusPage />} />
          <Route path="/task/:taskId" element={<TaskDetailPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Routes>
      </main>

      <nav className="app-nav" aria-label="Primary">
        {navLinks.map((link) => (
          <NavLink
            key={link.path}
            to={link.path}
            className={({ isActive }) =>
              ['app-nav__link', isActive ? 'is-active' : '']
                .filter(Boolean)
                .join(' ')
            }
          >
            {link.label}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}

export default App
