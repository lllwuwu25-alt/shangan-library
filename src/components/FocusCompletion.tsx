import { BookOpen, CheckCircle2, Flame, Timer, X } from 'lucide-react'
import type { CSSProperties } from 'react'
import { useEffect, useRef } from 'react'

export function FocusCompletion({ minutes, title, onClose }: { minutes: number; title: string; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null
    const element = dialog.current
    element?.showModal()
    const timer = window.setTimeout(onClose, 4800)
    return () => {
      window.clearTimeout(timer)
      element?.close()
      previous?.focus()
    }
  }, [onClose])
  return (
    <dialog ref={dialog} className="focus-completion" aria-labelledby="focus-completion-title" onCancel={onClose}>
      <button className="focus-completion-close" aria-label="关闭完成动效" onClick={onClose} autoFocus><X size={22} /></button>
      <div className="focus-completion-sweep" aria-hidden="true" />
      <svg className="focus-completion-ribbons" viewBox="0 0 1000 1000" preserveAspectRatio="none" aria-hidden="true">
        <path className="focus-ribbon focus-ribbon-top" pathLength="1" d="M 1100,-180 C 490,-120 1190,180 650,260 S -220,220 -100,680" />
        <path className="focus-ribbon focus-ribbon-bottom" pathLength="1" d="M -170,630 C 140,1020 650,1020 1120,620" />
      </svg>
      <div className="focus-completion-particles" aria-hidden="true">
        {Array.from({ length: 22 }, (_, i) => {
          const Icon = [BookOpen, CheckCircle2, Flame, Timer][i % 4]
          const angle = i * 2.39996
          const radius = 38 + (i % 4) * 6
          return <span key={i} style={{
            '--x': `${50 + Math.cos(angle) * radius}%`,
            '--y': `${50 + Math.sin(angle) * radius}%`,
            '--turn': `${(i % 2 ? 1 : -1) * (15 + i * 3)}deg`,
            '--delay': `${480 + (i % 6) * 65}ms`,
            '--size': `${22 + (i % 4) * 7}px`,
          } as CSSProperties}><Icon size="100%" strokeWidth={1.6} /></span>
        })}
      </div>
      <div className="focus-completion-content">
        <p className="focus-completion-label">专注完成</p>
        <h2 id="focus-completion-title"><span>又进</span><span>一步！</span></h2>
        <p className="focus-completion-minutes">{minutes}<span>分钟，全心投入</span></p>
        <p className="focus-completion-task">{title}</p>
      </div>
    </dialog>
  )
}
