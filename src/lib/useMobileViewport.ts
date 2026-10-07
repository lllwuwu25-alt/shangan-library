import { useEffect, useState } from 'react'

export function useCompactLayout() {
  const [compact, setCompact] = useState(() => window.matchMedia('(max-width: 767px)').matches)
  useEffect(() => {
    const media = window.matchMedia('(max-width: 767px)')
    const update = () => setCompact(media.matches)
    media.addEventListener('change', update)
    return () => media.removeEventListener('change', update)
  }, [])
  return compact
}

export function useMobileViewport() {
  useEffect(() => {
    const viewport = window.visualViewport
    const root = document.documentElement
    let layoutHeight = window.innerHeight
    const update = () => {
      const height = viewport?.height ?? window.innerHeight
      const inset = Math.max(0, window.innerHeight - height - (viewport?.offsetTop ?? 0))
      const editing = document.activeElement?.matches('input:not([type="file"]), textarea, [contenteditable="true"]')
      if (!editing) layoutHeight = window.innerHeight
      root.style.setProperty('--app-viewport-height', `${height}px`)
      root.style.setProperty('--keyboard-inset', `${inset}px`)
      root.dataset.keyboard = editing && (inset > 150 || layoutHeight - height > 150) ? 'open' : 'closed'
    }
    update()
    viewport?.addEventListener('resize', update)
    viewport?.addEventListener('scroll', update)
    window.addEventListener('resize', update)
    document.addEventListener('focusin', update)
    document.addEventListener('focusout', update)
    return () => {
      viewport?.removeEventListener('resize', update)
      viewport?.removeEventListener('scroll', update)
      window.removeEventListener('resize', update)
      document.removeEventListener('focusin', update)
      document.removeEventListener('focusout', update)
      root.style.removeProperty('--app-viewport-height')
      root.style.removeProperty('--keyboard-inset')
      delete root.dataset.keyboard
    }
  }, [])
}
