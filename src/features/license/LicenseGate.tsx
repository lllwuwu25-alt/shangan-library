import { BookOpen, Monitor } from 'lucide-react'
import type { ReactNode } from 'react'
import { useEffect, useMemo, useState } from 'react'
import { getLicenseStatus } from './licenseClient.ts'
import { LicenseActivation } from './LicenseActivation.tsx'
import { isTauriRuntime, resolveLicenseSurface } from './runtime.ts'
import type { LicenseStatus } from './types.ts'

export function LicenseGate({ children }: { children: ReactNode }) {
  const tauri = useMemo(() => isTauriRuntime(), [])
  const demo = import.meta.env.VITE_DEMO_MODE === 'true' || import.meta.env.DEV
  const [checking, setChecking] = useState(tauri)
  const [status, setStatus] = useState<LicenseStatus | null>(null)

  useEffect(() => {
    if (!tauri) return
    let active = true
    void getLicenseStatus()
      .then((nextStatus) => { if (active) setStatus(nextStatus) })
      .catch(() => { if (active) setStatus(null) })
      .finally(() => { if (active) setChecking(false) })
    return () => { active = false }
  }, [tauri])

  const surface = resolveLicenseSurface({ tauri, demo, checking, status })

  if (surface === 'checking') return <LicenseChecking />
  if (surface === 'activation') return <LicenseActivation onActivated={setStatus} />
  if (surface === 'desktop-only') return <DesktopOnly />

  return (
    <>
      {!tauri && demo && (
        <div className="fixed bottom-4 right-4 z-40 rounded-full bg-slate-950 px-3 py-1.5 text-xs font-medium text-white ring-1 ring-white/10" role="status">
          网页演示版
        </div>
      )}
      {children}
    </>
  )
}

function LicenseChecking() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-7 shadow-soft" aria-live="polite">
        <div className="h-11 w-11 animate-pulse rounded-xl bg-slate-100" />
        <div className="mt-6 h-5 w-28 animate-pulse rounded bg-slate-100" />
        <div className="mt-3 h-4 w-full animate-pulse rounded bg-slate-100" />
        <p className="mt-6 text-sm text-slate-500">正在检查本机授权…</p>
      </div>
    </div>
  )
}

function DesktopOnly() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-8">
      <main className="w-full max-w-lg rounded-2xl bg-white p-8 text-center shadow-soft">
        <div className="mx-auto flex size-12 items-center justify-center rounded-xl bg-slate-950 text-white">
          <BookOpen size={23} />
        </div>
        <h1 className="mt-6 text-xl font-semibold text-slate-950">请使用桌面版上岸资料库</h1>
        <p className="mx-auto mt-3 max-w-[48ch] text-sm leading-6 text-slate-600">商业授权由桌面应用在本机完成验证。此 Web 构建不是公开演示环境。</p>
        <div className="mt-6 inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700">
          <Monitor size={14} /> Windows 与 macOS
        </div>
      </main>
    </div>
  )
}
