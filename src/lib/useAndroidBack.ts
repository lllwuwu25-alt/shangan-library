import { App as NativeApp } from '@capacitor/app'
import { Capacitor } from '@capacitor/core'
import { useEffect, useRef } from 'react'

export function useAndroidBack(onHome: () => void) {
  const homeRef = useRef(onHome)
  homeRef.current = onHome
  useEffect(() => {
    if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== 'android') return
    const listener = NativeApp.addListener('backButton', ({ canGoBack }) => {
      if (document.documentElement.dataset.keyboard === 'open') {
        (document.activeElement as HTMLElement | null)?.blur()
        return
      }
      const dialogs = document.querySelectorAll<HTMLDialogElement>('dialog[open]')
      const top = dialogs[dialogs.length - 1]
      if (top) {
        top.dispatchEvent(new Event('cancel', { cancelable: true }))
        return
      }
      if (!window.dispatchEvent(new Event('app-back', { cancelable: true }))) return
      if (canGoBack) window.history.back()
      else if (window.location.pathname !== '/' && !window.location.pathname.endsWith('/dashboard')) homeRef.current()
      else void NativeApp.minimizeApp()
    })
    return () => { void listener.then((handle) => handle.remove()) }
  }, [])
}
