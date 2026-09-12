import { CheckCircle2, Copy, ShieldCheck, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Card, DangerButton, GhostButton, Pill, SectionTitle } from '../../components/ui.tsx'
import { deactivateLicense, getLicenseStatus } from './licenseClient.ts'
import { licenseErrorMessage } from './messages.ts'
import { isTauriRuntime } from './runtime.ts'
import type { LicenseStatus } from './types.ts'

const APP_VERSION = '0.7.0'

export function LicenseStatusPanel() {
  const tauri = isTauriRuntime()
  const [status, setStatus] = useState<LicenseStatus | null>(null)
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(tauri)

  useEffect(() => {
    if (!tauri) return
    let active = true
    void getLicenseStatus()
      .then((nextStatus) => { if (active) setStatus(nextStatus) })
      .catch((error) => { if (active) setMessage(licenseErrorMessage(error)) })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [tauri])

  const copyId = async () => {
    if (!status?.licenseId) return
    await navigator.clipboard.writeText(status.licenseId)
    setMessage('License ID 已复制。')
  }

  const remove = async () => {
    if (!confirm('确认移除此设备上的授权？学习计划、资料、错题和附件不会被删除。')) return
    setLoading(true)
    setMessage('')
    try {
      await deactivateLicense()
      window.location.reload()
    } catch (error) {
      setMessage(licenseErrorMessage(error))
      setLoading(false)
    }
  }

  return (
    <Card>
      <SectionTitle title="授权与版本" caption="授权验证仅在当前设备本地完成。" action={<ShieldCheck size={18} className="text-blue-600" />} />
      {!tauri ? (
        <div className="rounded-xl bg-blue-50 p-4 text-sm text-blue-800 ring-1 ring-blue-100">
          当前为网页演示版，不保存或验证商业授权。桌面正式版会在首次启动时要求激活。
        </div>
      ) : loading ? (
        <div className="space-y-3" aria-live="polite">
          <div className="h-16 animate-pulse rounded-xl bg-slate-100" />
          <p className="text-xs text-slate-500">正在读取本机授权…</p>
        </div>
      ) : status?.valid ? (
        <div className="space-y-4">
          <div className="flex items-start justify-between gap-4 rounded-xl bg-emerald-50 p-4 ring-1 ring-emerald-100">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-semibold text-slate-950">上岸资料库 Pro</p>
                <Pill tone="green">已激活</Pill>
              </div>
              <p className="mt-2 text-sm text-emerald-800">永久授权</p>
            </div>
            <CheckCircle2 size={21} className="shrink-0 text-emerald-700" />
          </div>
          <dl className="grid gap-3 text-sm">
            <div className="flex items-start justify-between gap-4">
              <dt className="text-slate-500">License ID</dt>
              <dd className="max-w-[65%] break-all text-right font-medium text-slate-900">{status.licenseId}</dd>
            </div>
            <div className="flex items-center justify-between gap-4">
              <dt className="text-slate-500">版本</dt>
              <dd className="font-medium text-slate-900">{APP_VERSION}</dd>
            </div>
          </dl>
          <div className="grid gap-2 sm:grid-cols-2">
            <GhostButton onClick={() => void copyId()} disabled={!status.licenseId}><Copy size={15} />复制 License ID</GhostButton>
            <DangerButton onClick={() => void remove()}><Trash2 size={15} />移除此设备授权</DangerButton>
          </div>
        </div>
      ) : (
        <div className="flex items-start gap-3 rounded-xl bg-slate-50 p-4 ring-1 ring-slate-200/60">
          <ShieldCheck size={18} className="mt-0.5 shrink-0 text-slate-500" />
          <div>
            <p className="text-sm font-medium text-slate-900">未检测到有效授权</p>
            <p className="mt-1 text-xs leading-5 text-slate-500">重新启动应用后可返回激活页面。</p>
          </div>
        </div>
      )}
      {message && <p className="mt-3 text-xs leading-5 text-slate-600" aria-live="polite">{message}</p>}
    </Card>
  )
}
