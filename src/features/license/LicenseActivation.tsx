import { ArrowRight, BookOpen, Check, ShieldCheck } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { Button } from '../../components/ui.tsx'
import { activateLicense } from './licenseClient.ts'
import { licenseErrorMessage } from './messages.ts'
import type { LicenseStatus } from './types.ts'

export function LicenseActivation({ onActivated }: { onActivated: (status: LicenseStatus) => void }) {
  const [license, setLicense] = useState('')
  const [activated, setActivated] = useState<LicenseStatus | null>(null)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const activate = async () => {
    const normalized = license.trim()
    if (!normalized) {
      setError('请先粘贴购买后获得的完整授权码。')
      return
    }
    setSubmitting(true)
    setError('')
    try {
      const status = await activateLicense(normalized)
      if (!status.valid) throw new Error('Activation did not return a valid status')
      setActivated(status)
    } catch (activationError) {
      setError(licenseErrorMessage(activationError))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <LicenseFrame>
      {activated ? (
        <div className="flex min-h-[420px] flex-col justify-center">
          <div className="flex size-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100">
            <Check size={24} strokeWidth={2.5} />
          </div>
          <h1 className="mt-6 text-2xl font-semibold text-slate-950">激活成功</h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">这台设备现在可以完整使用上岸资料库。</p>
          <div className="mt-7 flex items-center justify-between gap-4 rounded-xl bg-slate-50 p-4 ring-1 ring-slate-200/60">
            <div>
              <p className="text-xs text-slate-500">上岸资料库 Pro</p>
              <p className="mt-1 text-sm font-semibold text-slate-950">永久授权</p>
            </div>
            <ShieldCheck size={22} className="shrink-0 text-emerald-600" />
          </div>
          <Button className="mt-7 w-full" onClick={() => onActivated(activated)}>
            开始使用 <ArrowRight size={16} />
          </Button>
        </div>
      ) : (
        <div className="flex min-h-[420px] flex-col justify-center">
          <div className="flex size-11 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
            <ShieldCheck size={21} />
          </div>
          <h1 className="mt-6 text-2xl font-semibold text-slate-950">激活产品</h1>
          <p className="mt-2 max-w-[56ch] text-sm leading-6 text-slate-600">感谢购买上岸资料库。请粘贴购买后获得的完整授权码。</p>

          <label className="mt-7 grid gap-2 text-sm font-medium text-slate-700">
            授权码
            <textarea
              autoFocus
              autoComplete="off"
              spellCheck={false}
              value={license}
              onChange={(event) => {
                setLicense(event.target.value)
                if (error) setError('')
              }}
              placeholder="SL1.粘贴完整授权码"
              className="min-h-36 w-full resize-y overflow-auto rounded-xl border border-slate-200 bg-white px-3 py-3 font-mono text-sm leading-6 text-slate-900 outline-none transition placeholder:font-sans placeholder:text-slate-500 hover:border-slate-300 focus:border-blue-300 focus:ring-3 focus:ring-blue-100"
            />
          </label>
          <div aria-live="polite" className="min-h-7 pt-2">
            {error && <p className="text-sm leading-5 text-red-700">{error}</p>}
          </div>
          <Button className="mt-2 w-full" disabled={submitting || !license.trim()} onClick={() => void activate()}>
            {submitting ? '正在本地验证…' : '激活'}
          </Button>
          <p className="mt-4 text-center text-xs leading-5 text-slate-500">无需联网，授权验证不会上传任何个人资料。</p>
        </div>
      )}
    </LicenseFrame>
  )
}

function LicenseFrame({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-8 sm:px-6">
      <main className="grid w-full max-w-4xl overflow-hidden rounded-2xl bg-white shadow-soft lg:grid-cols-[320px_minmax(0,1fr)]">
        <section className="flex flex-col justify-between bg-slate-950 p-7 text-white sm:p-9">
          <div>
            <div className="flex size-12 items-center justify-center rounded-xl bg-white/10">
              <BookOpen size={24} />
            </div>
            <p className="mt-6 text-xl font-semibold text-white">上岸资料库</p>
            <p className="mt-2 text-sm text-slate-300">本地个人学习系统</p>
          </div>
          <div className="mt-12">
            <div className="flex items-center gap-2 text-sm font-medium text-emerald-300">
              <ShieldCheck size={17} /> 完全离线授权
            </div>
            <p className="mt-3 text-sm leading-6 text-slate-300">授权和学习数据都留在当前设备。无需注册账户，也不连接授权服务器。</p>
          </div>
        </section>
        <section className="p-7 sm:p-10">{children}</section>
      </main>
    </div>
  )
}
