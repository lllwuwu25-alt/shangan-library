import { useEffect, useState } from 'react'
import { Layout } from './components/Layout'
import { Dashboard } from './pages/Dashboard'
import { Mistakes } from './pages/Mistakes'
import { Plan } from './pages/Plan'
import { Resources } from './pages/Resources'
import { Settings } from './pages/Settings'

const routes = ['/dashboard', '/plan', '/resources', '/mistakes', '/settings']

function App() {
  const [path, setPath] = useState(() => (window.location.pathname === '/' ? '/dashboard' : window.location.pathname))

  useEffect(() => {
    const onPop = () => setPath(window.location.pathname === '/' ? '/dashboard' : window.location.pathname)
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

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
    </Layout>
  )
}

export default App
