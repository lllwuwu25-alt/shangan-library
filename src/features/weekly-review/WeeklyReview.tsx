import { useEffect, useMemo, useRef, useState } from 'react'
import { BookOpen, CalendarDays, Download, Trash2 } from 'lucide-react'
import { Modal } from '../../components/Modal'
import { Button, Card, GhostButton, SectionTitle, Select } from '../../components/ui'
import { useStudyStore } from '../../store/useStudyStore'
import { useAIStore } from '../ai/aiStore'
import { chatEndpoint, generateWeeklyAnalysis } from '../ai/client'
import { dueForReview, normalizeReviewData, previousWeek, summarizeWeek, type WeeklyReport, type WeekSummary } from './model'

const OPEN_REVIEW = 'shangan-open-weekly-review'
const openReview = (id?: string) => window.dispatchEvent(new CustomEvent(OPEN_REVIEW, { detail: id }))
const weekdays = ['周一', '周二', '周三', '周四', '周五', '周六', '周日']

export function WeeklyReviewSettings() {
  const store = useStudyStore()
  const data = useMemo(() => normalizeReviewData(store.weeklyReview), [store.weeklyReview])
  const aiEnabled = useAIStore(state => state.config.enabled)
  const [error, setError] = useState('')
  const update = (patch: Parameters<typeof store.updateWeeklyReview>[0]) => {
    try { store.updateWeeklyReview(patch); setError('') } catch { setError('未能保存设置，请检查本地存储空间。') }
  }
  return <Card>
    <SectionTitle title="每周学习回顾" caption="回顾上一完整自然周的计划执行和专注记录。" />
    <div className="grid gap-4">
      <label className="flex min-h-11 items-center gap-3 text-sm font-medium"><input type="checkbox" checked={data.enabled} onChange={e => update({ enabled: e.target.checked })} />开启每周学习回顾提醒</label>
      {data.enabled && <>
        <label className="grid gap-1.5 text-sm">每周提醒日<Select value={data.weekday} onChange={e => update({ weekday: Number(e.target.value) })}>{weekdays.map((day, i) => <option key={day} value={i + 1}>{day}</option>)}</Select></label>
        <p className="text-xs leading-6 text-slate-600">提醒日首次打开时询问；若当天未打开，会在本周后续首次打开时补提醒。“稍后”延迟 24 小时，“本周跳过”不再提醒该周。确认前不会发送学习摘要。</p>
      </>}
      {!aiEnabled && <p className="text-sm text-slate-600">AI 当前关闭，自动提醒暂停。仍可查看已保存的报告。</p>}
      <div><GhostButton onClick={() => openReview()}><CalendarDays size={16} />回顾上周</GhostButton></div>
      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
      <div className="border-t border-slate-200 pt-3">
        <h3 className="text-sm font-semibold">历史周报 <span className="text-slate-500">{data.reports.length}</span></h3>
        {!data.reports.length ? <p className="mt-2 text-sm text-slate-600">暂无周报</p> : <ul className="mt-2 max-h-80 space-y-2 overflow-y-auto">
          {data.reports.map(report => <li key={report.id} className="flex min-w-0 items-center gap-2 border-b border-slate-100 py-2">
            <button type="button" className="flex min-w-0 flex-1 items-center gap-2 rounded-md py-2 text-left text-sm text-blue-700" onClick={() => openReview(report.id)}><BookOpen size={16} className="shrink-0" /><span className="break-words">{report.weekStart} — {report.weekEnd}</span></button>
            <button type="button" title="删除周报" aria-label={`删除周报 ${report.weekStart}`} className="flex size-11 shrink-0 items-center justify-center rounded-md text-red-600 hover:bg-red-50" onClick={() => {
              if (!window.confirm('删除这份周报？学习计划和专注记录不会被删除。')) return
              try { store.deleteWeeklyReport(report.id); setError('') } catch { setError('未能删除周报，请重试。') }
            }}><Trash2 size={16} /></button>
          </li>)}
        </ul>}
      </div>
    </div>
  </Card>
}

export function WeeklyReviewController() {
  const store = useStudyStore()
  const { config } = useAIStore()
  const [now, setNow] = useState(() => new Date())
  const [request, setRequest] = useState<{ snapshot: WeekSummary; reportId?: string } | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [pendingReport, setPendingReport] = useState<WeeklyReport | null>(null)
  const abort = useRef<AbortController | null>(null)
  const mounted = useRef(false)
  const data = useMemo(() => normalizeReviewData(store.weeklyReview), [store.weeklyReview])
  const savedReport = request?.reportId ? data.reports.find(report => report.id === request.reportId) : request ? data.reports.find(report => report.weekStart === request.snapshot.start) : undefined
  const report = pendingReport || savedReport
  let host = ''
  try { host = new URL(chatEndpoint(config.baseUrl)).host } catch { /* Configuration errors remain local until fixed. */ }
  const ready = config.enabled && Boolean(host && config.model.trim()) && (host !== 'api.deepseek.com' || Boolean(config.apiKey.trim()))
  useEffect(() => {
    mounted.current = true
    const tick = () => setNow(new Date())
    const invalidate = () => { abort.current?.abort(); abort.current = null; setBusy(false); setRequest(null); setPendingReport(null); setError('') }
    const timer = window.setInterval(tick, 60000)
    const open = (event: Event) => {
      const state = useStudyStore.getState(); const review = normalizeReviewData(state.weeklyReview)
      const id = (event as CustomEvent<string | undefined>).detail
      const saved = id ? review.reports.find(report => report.id === id) : undefined
      const snapshot = saved?.snapshot || summarizeWeek(state.tasks, state.pomodoroSessions, previousWeek())
      setRequest({ snapshot, reportId: saved?.id }); setPendingReport(null); setError('')
    }
    window.addEventListener(OPEN_REVIEW, open)
    window.addEventListener('shangan-study-replaced', invalidate)
    window.addEventListener('focus', tick)
    document.addEventListener('visibilitychange', tick)
    return () => { mounted.current = false; abort.current?.abort(); window.clearInterval(timer); window.removeEventListener(OPEN_REVIEW, open); window.removeEventListener('shangan-study-replaced', invalidate); window.removeEventListener('focus', tick); document.removeEventListener('visibilitychange', tick) }
  }, [])
  useEffect(() => {
    if (request || !dueForReview(data, config.enabled, now)) return
    const week = previousWeek(now)
    const timer = window.setTimeout(() => {
      if (document.querySelector('dialog[open]') || document.hidden) return
      const state = useStudyStore.getState()
      if (!dueForReview(normalizeReviewData(state.weeklyReview), useAIStore.getState().config.enabled, new Date())) return
      setRequest({ snapshot: summarizeWeek(state.tasks, state.pomodoroSessions, week) }); setError(''); setPendingReport(null)
    }, 1200)
    return () => window.clearTimeout(timer)
  }, [data, config.enabled, now, request])
  // Settings reset/import or AI disable invalidates in-flight results before they can be saved.
  useEffect(() => {
    return useStudyStore.subscribe((state, previous) => {
      const next = normalizeReviewData(state.weeklyReview)
      if (state.weeklyReview !== previous.weeklyReview && (abort.current || !next.enabled && !next.reports.length && !Object.keys(next.decisions).length)) {
        abort.current?.abort(); abort.current = null; setBusy(false); setRequest(null); setPendingReport(null)
      }
    })
  }, [])
  useEffect(() => { if (!config.enabled) { abort.current?.abort(); abort.current = null; setBusy(false) } }, [config.enabled])
  if (!request) return null
  const close = (action: 'later' | 'skip' = 'later') => {
    try {
      if (!report) store.decideWeeklyReview(request.snapshot.start, action)
      abort.current?.abort(); abort.current = null; setBusy(false); setRequest(null); setPendingReport(null); setError('')
    } catch { setError('未能保存提醒状态，请检查本地空间后重试。') }
  }
  const stop = () => { abort.current?.abort(); abort.current = null; setBusy(false); setError('已停止等待。已发送内容无法撤回，服务商仍可能处理并计费。') }
  const persistReport = (next: WeeklyReport) => {
    try { useStudyStore.getState().saveWeeklyReport(next); setPendingReport(null); setError('') }
    catch { setPendingReport(next); setError('报告已生成但未能保存到本地，请腾出空间后重试保存。') }
  }
  const generate = async () => {
    if (busy || abort.current || !ready || report) return
    const controller = new AbortController(); abort.current = controller; setBusy(true); setError('')
    const state = useStudyStore.getState()
    const snapshot = summarizeWeek(state.tasks, state.pomodoroSessions, { start: request.snapshot.start, end: request.snapshot.end })
    setRequest({ ...request, snapshot })
    const selectedConfig = { ...config }
    try {
      const analysis = await generateWeeklyAnalysis(selectedConfig, snapshot, controller.signal)
      if (!mounted.current || abort.current !== controller || controller.signal.aborted || !useAIStore.getState().config.enabled) return
      abort.current = null; setBusy(false)
      persistReport({ id: `review-${crypto.randomUUID()}`, weekStart: snapshot.start, weekEnd: snapshot.end, generatedAt: new Date().toISOString(), snapshot, analysis, providerHost: new URL(selectedConfig.baseUrl).host, model: selectedConfig.model })
    } catch (error) {
      if (mounted.current && abort.current === controller && !controller.signal.aborted) setError(error instanceof Error ? error.message : '生成失败，请重试。')
    } finally { if (mounted.current && abort.current === controller) { abort.current = null; setBusy(false) } }
  }
  const summary = report?.snapshot || request.snapshot
  return <Modal title={report ? '上周学习报告' : '是否回顾上周学习？'} caption={`${summary.start} — ${summary.end}`} onClose={() => close()}>
    <div className="grid gap-4">
      <SummaryStats summary={summary} />
      {report ? <>
        <p className="whitespace-pre-wrap break-words text-sm leading-7 text-slate-800">{report.analysis}</p>
        <p className="break-words text-xs leading-6 text-slate-600">{pendingReport ? '尚未保存' : '已保存到本地'} · {new Date(report.generatedAt).toLocaleString('zh-CN')} · {report.providerHost} / {report.model}。AI 分析仅供参考，以上统计为生成时的快照。</p>
        <div className="flex flex-wrap gap-2">
          {pendingReport && <Button onClick={() => persistReport(pendingReport)}>重试保存报告</Button>}
          <GhostButton onClick={() => {
            const text = `学习周报 ${summary.start} — ${summary.end}\n计划 ${summary.plannedMinutes} 分钟 · 已记录专注 ${summary.focusMinutes} 分钟\n完成 ${summary.completedTasks}/${summary.totalTasks} 项任务\n\n${report.analysis}`
            const url = URL.createObjectURL(new Blob([text], { type: 'text/plain;charset=utf-8' })); const link = document.createElement('a'); link.href = url; link.download = `上岸资料库-学习周报-${summary.start}.txt`; link.click(); window.setTimeout(() => URL.revokeObjectURL(url), 1000)
          }}><Download size={16} />导出报告</GhostButton>
          <GhostButton onClick={() => close()}>关闭报告</GhostButton>
        </div>
      </> : <>
        {!summary.hasData && <p className="text-sm text-slate-700">上周没有计划或专注记录，报告会明确说明数据不足，不推测学习情况。</p>}
        <p className="text-sm leading-6 text-slate-600">统计仅包含已保存的专注记录，不含休息；任务完成情况以当前记录为准，未记录的学习时长不作估算。</p>
        <p className="break-words text-sm leading-6 text-slate-700">开始后，将仅把上周每日、科目、计划完成情况和专注时长汇总发送至 {host || '尚未配置的 AI 服务'}，由 {config.model || '未设置模型'} 分析，可能产生费用。不发送任务正文、资料附件或错题图片。</p>
        {!ready && <p role="status" className="text-sm text-amber-800">请先在设置中开启 AI，并完成接口、模型和所需密钥配置。</p>}
        {busy ? <><p role="status" className="text-sm text-slate-700">正在生成学习报告…</p><GhostButton onClick={stop}>停止等待</GhostButton></> : <div className="flex flex-wrap gap-2"><Button disabled={!ready} onClick={() => void generate()}>{error ? '重试生成报告' : '开始回顾并生成报告'}</Button><GhostButton onClick={() => close('later')}>稍后提醒</GhostButton><GhostButton onClick={() => close('skip')}>本周跳过</GhostButton></div>}
      </>}
      {error && <p role="alert" className="break-words text-sm leading-6 text-red-700">{error}</p>}
    </div>
  </Modal>
}

function SummaryStats({ summary }: { summary: WeekSummary }) {
  return <div className="grid gap-3 border-b border-slate-200 pb-4 text-sm sm:grid-cols-2">
    <div><p className="text-slate-600">已记录专注</p><p className="mt-1 text-xl font-semibold">{summary.focusMinutes} 分钟</p></div>
    <div><p className="text-slate-600">计划完成</p><p className="mt-1 text-xl font-semibold">{summary.completedTasks} / {summary.totalTasks} 项{summary.totalTasks > 0 && <span className="ml-2 text-sm font-normal">{summary.completionRate}%</span>}</p></div>
    <p className="text-slate-600">计划安排 {summary.plannedMinutes} 分钟</p><p className="text-slate-600">{summary.focusSessions} 次专注 · {summary.activeDays} 天有记录</p>
  </div>
}
