import { X } from 'lucide-react'
import { useEffect, useId, useRef, type ReactNode } from 'react'

export function Modal({ title, caption, children, onClose, actions, fullScreen = false, className = '' }: {
  title: string
  caption?: string
  children: ReactNode
  onClose: () => void
  actions?: ReactNode
  fullScreen?: boolean
  className?: string
}) {
  const ref = useRef<HTMLDialogElement>(null)
  const titleId = useId()
  const closeRef = useRef(onClose)
  closeRef.current = onClose

  useEffect(() => {
    const dialog = ref.current!
    const previousOverflow = document.body.style.overflow
    dialog.showModal()
    document.body.style.overflow = 'hidden'
    const back = (event: Event) => {
      if (document.querySelector('dialog[open]:last-of-type') !== dialog) return
      event.preventDefault()
      event.stopImmediatePropagation()
      closeRef.current()
    }
    window.addEventListener('app-back', back, true)
    return () => {
      window.removeEventListener('app-back', back, true)
      dialog.close()
      document.body.style.overflow = previousOverflow
    }
  }, [])

  return (
    <dialog ref={ref} aria-labelledby={titleId} className={`app-modal ${fullScreen ? 'app-modal--fullscreen' : ''} ${className}`} onCancel={(event) => { event.preventDefault(); onClose() }} onClick={(event) => { if (event.target === event.currentTarget) onClose() }}>
      <div className="app-modal__surface bg-white" onClick={(event) => event.stopPropagation()}>
        <header className="app-modal__header flex shrink-0 items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 py-3 sm:px-5">
          <div className="min-w-0 flex-1">
            <h2 id={titleId} className="break-words text-base font-semibold text-slate-950">{title}</h2>
            {caption && <p className="mt-1 break-words text-xs leading-5 text-slate-500">{caption}</p>}
          </div>
          <div className="flex shrink-0 items-center gap-1">
            {actions}
            <button type="button" onClick={onClose} aria-label={fullScreen ? '关闭预览' : '关闭'} className="flex size-11 shrink-0 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100"><X size={20} /></button>
          </div>
        </header>
        <div className={`app-modal__body min-h-0 flex-1 overflow-auto overscroll-contain ${fullScreen ? 'bg-slate-100' : 'p-4 sm:p-5'}`}>{children}</div>
      </div>
    </dialog>
  )
}
