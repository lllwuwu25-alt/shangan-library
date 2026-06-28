import { useEffect, useState } from 'react'
import { Layout } from './components/Layout'
import { Dashboard } from './pages/Dashboard'
import { Contact } from './pages/Contact'
import { Mistakes } from './pages/Mistakes'
import { Plan } from './pages/Plan'
import { Resources } from './pages/Resources'
import { Settings } from './pages/Settings'
import { useStudyStore } from './store/useStudyStore'

const routes = ['/dashboard', '/plan', '/resources', '/mistakes', '/settings', '/contact']

function App() {
  const theme = useStudyStore((state) => state.settings.theme)
  const [path, setPath] = useState(() => (window.location.pathname === '/' ? '/dashboard' : window.location.pathname))

  useEffect(() => {
    const onPop = () => setPath(window.location.pathname === '/' ? '/dashboard' : window.location.pathname)
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

  useEffect(() => {
    const applyTheme = () => {
      const resolvedTheme = theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : theme === 'dark' ? 'dark' : 'light'
      document.documentElement.dataset.theme = resolvedTheme
    }
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    applyTheme()
    media.addEventListener('change', applyTheme)
    return () => media.removeEventListener('change', applyTheme)
  }, [theme])

  const navigate = (nextPath: string) => {
    window.history.pushState(null, '', nextPath)
    setPath(nextPath)
  }

  const activePath = routes.includes(path) ? path : '/dashboard'

  return (
    <Layout path={activePath} onNavigate={navigate}>
      {activePath === '/dashboard' && <Dashboard go={navigate} />}
      {activePath === '/plan' && <Plan />}
      {activePath === '/resources' && <Resources />}
      {activePath === '/mistakes' && <Mistakes />}
      {activePath === '/settings' && <Settings />}
      {activePath === '/contact' && <Contact />}
    </Layout>
  )
}

export default App
