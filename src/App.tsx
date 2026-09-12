import { useEffect, useRef, useState } from 'react'
import { flushSync } from 'react-dom'
import { Layout } from './components/Layout'
import { Dashboard } from './pages/Dashboard'
import { Contact } from './pages/Contact'
import { Mistakes } from './pages/Mistakes'
import { Plan } from './pages/Plan'
import { Pomodoro } from './pages/Pomodoro'
import { Resources } from './pages/Resources'
import { Settings } from './pages/Settings'
import { useStudyStore } from './store/useStudyStore'
import { startPageTransition } from './lib/pageTransition'
import { LicenseGate } from './features/license/LicenseGate'

const routes = ['/dashboard', '/plan', '/pomodoro', '/resources', '/mistakes', '/settings', '/contact']
const basePath = import.meta.env.BASE_URL.endsWith('/') ? import.meta.env.BASE_URL.slice(0, -1) : import.meta.env.BASE_URL

type NavigationOrigin = { x: number; y: number }

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
  const transitionRef = useRef<ReturnType<typeof startPageTransition> | null>(null)
  const isNavigating = useRef(false)

  useEffect(() => {
    const onPop = () => {
      transitionRef.current?.cancel()
      isNavigating.current = false
      setPath(toAppPath(window.location.pathname))
    }
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

  useEffect(() => () => {
    transitionRef.current?.cancel()
  }, [])

  const navigate = (nextPath: string, origin?: NavigationOrigin) => {
    if (nextPath === path || isNavigating.current) return
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    if (reducedMotion) {
      window.history.pushState(null, '', toBrowserPath(nextPath))
      setPath(nextPath)
      return
    }

    isNavigating.current = true
    const transition = startPageTransition(() => {
      window.history.pushState(null, '', toBrowserPath(nextPath))
      flushSync(() => setPath(nextPath))
      window.scrollTo(0, 0)
    }, origin)
    transitionRef.current = transition
    void transition.finished.finally(() => {
      if (transitionRef.current === transition) isNavigating.current = false
    })
  }

  const activePath = routes.includes(path) ? path : '/dashboard'

  return (
    <LicenseGate>
      <Layout path={activePath} onNavigate={navigate}>
        <div key={activePath} className="route-content">
          {activePath === '/dashboard' && <Dashboard go={navigate} />}
          {activePath === '/plan' && <Plan />}
          {activePath === '/pomodoro' && <Pomodoro />}
          {activePath === '/resources' && <Resources />}
          {activePath === '/mistakes' && <Mistakes />}
          {activePath === '/settings' && <Settings />}
          {activePath === '/contact' && <Contact />}
        </div>
      </Layout>
    </LicenseGate>
  )
}

export default App
