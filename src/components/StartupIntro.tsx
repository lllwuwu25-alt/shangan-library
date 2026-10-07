import { BookOpen } from 'lucide-react'
import { useEffect, useState } from 'react'

// Mount once beside the license gate, so navigation and activation never replay it.
export function StartupIntro() {
  const [visible, setVisible] = useState(() => !window.matchMedia('(prefers-reduced-motion: reduce)').matches)

  useEffect(() => {
    if (!visible) return
    const dismiss = () => setVisible(false)
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)')
    const onMotionChange = () => { if (motion.matches) dismiss() }
    const onVisibility = () => { if (document.hidden) dismiss() }
    // A timer is also a fallback if CSS animations are interrupted by the WebView.
    const timer = window.setTimeout(dismiss, 1000)
    window.addEventListener('pointerdown', dismiss, { once: true })
    window.addEventListener('keydown', dismiss, { once: true })
    window.addEventListener('focusin', dismiss, { once: true })
    document.addEventListener('visibilitychange', onVisibility)
    motion.addEventListener('change', onMotionChange)
    return () => {
      window.clearTimeout(timer)
      window.removeEventListener('pointerdown', dismiss)
      window.removeEventListener('keydown', dismiss)
      window.removeEventListener('focusin', dismiss)
      document.removeEventListener('visibilitychange', onVisibility)
      motion.removeEventListener('change', onMotionChange)
    }
  }, [visible])

  if (!visible) return null

  return (
    <div className="startup-intro" aria-hidden="true" onAnimationEnd={(event) => {
      if (event.target === event.currentTarget) setVisible(false)
    }}>
      <div className="startup-intro__brand">
        <div className="startup-intro__mark"><BookOpen size={34} strokeWidth={1.7} /></div>
        <p className="startup-intro__name">上岸资料库</p>
        <p className="startup-intro__subtitle">本地个人学习系统</p>
      </div>
    </div>
  )
}
