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
const basePath = import.meta.env.BASE_URL.endsWith('/') ? import.meta.env.BASE_URL.slice(0, -1) : import.meta.env.BASE_URL

function toAppPath(pathname: string) {
  const withoutBase = basePath && pathname.startsWith(basePath) ? pathname.slice(basePath.length) || '/' : pathname
  return withoutBase === '/' ? '/dashboard' : withoutBase
}

function toBrowserPath(path: string) {
  return `${basePath}${path}`
}

function App() {
  const theme = useStudyStore((state) => state.settings.theme)
  const [path, setPath] = useState(() => toAppPath(window.location.pathname))

  useEffect(() => {
    const onPop = () => setPath(toAppPath(window.location.pathname))
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
    window.history.pushState(null, '', toBrowserPath(nextPath))
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
