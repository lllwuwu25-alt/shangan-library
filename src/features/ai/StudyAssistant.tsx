import { ArrowRight, CalendarDays, Check, Plus, RotateCcw, Send, Settings as SettingsIcon, Sparkles, Trash2, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Button, GhostButton, Select, TextArea, TextInput } from '../../components/ui'
import { defaultTimeSlots, subjectOptions } from '../../constants'
import { todayIso, weekRange } from '../../lib/date'
import { useStudyStore } from '../../store/useStudyStore'
import { useAIStore } from './aiStore'
import { chatEndpoint, generatePlanReply } from './client'
import { MAX_PLAN_MESSAGE, preparePlanTasks, validateDraftTask, type DraftTask, type PlanContext, type PlanMessage } from './planDraft'

const examples = ['安排今天的数学与英语，每科 45 分钟', '帮我排下周学习计划，每天 1 小时']

function currentContext(): PlanContext {
  const { settings } = useStudyStore.getState()
  return { today: todayIso(), currentWeekStart: weekRange().start, nextWeekEnd: weekRange(1).end, subjects: subjectOptions(settings.subjects), slots: settings.timeSlots.length ? settings.timeSlots : defaultTimeSlots }
}

export function StudyAssistant({ active, go }: { active: boolean; go: (path: string) => void }) {
  const config = useAIStore(state => state.config)
  const [messages, setMessages] = useState<PlanMessage[]>([])
  const [draft, setDraft] = useState<DraftTask[]>([])
  const [input, setInput] = useState('')
  const [pending, setPending] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [draftError, setDraftError] = useState('')
  const [confirming, setConfirming] = useState(false)
  const controller = useRef<AbortController | null>(null)
  const transcript = useRef<HTMLDivElement>(null)
  const draftHeading = useRef<HTMLHeadingElement>(null)
  const busy = Boolean(pending)
  const service = `${config.baseUrl}\n${config.model}`
  const lastService = useRef(service)

  const reset = () => {
    controller.current?.abort(); controller.current = null
    setMessages([]); setDraft([]); setInput(''); setPending(''); setError(''); setNotice(''); setDraftError(''); setConfirming(false)
  }
  useEffect(() => {
    const replaced = () => reset()
    window.addEventListener('shangan-study-replaced', replaced)
    return () => { window.removeEventListener('shangan-study-replaced', replaced); controller.current?.abort(); controller.current = null }
  }, [])
  useEffect(() => {
    if (lastService.current !== service) {
      lastService.current = service
      // Never carry a conversation or its draft over to a different service.
      reset()
    }
    if (!active || !config.enabled) {
      controller.current?.abort(); controller.current = null
      setPending(''); setConfirming(false)
    }
  }, [active, config.enabled, service])
  useEffect(() => {
    if (transcript.current) transcript.current.scrollTop = transcript.current.scrollHeight
  }, [active, messages, pending])

  if (!active) return null
  const context = currentContext()
  let host = ''
  try { host = new URL(chatEndpoint(config.baseUrl)).host } catch { /* Invalid addresses do not enable sending. */ }
  const ready = config.enabled && Boolean(host && config.model.trim()) && (host !== 'api.deepseek.com' || Boolean(config.apiKey.trim()))

  const send = async () => {
    const content = input.trim()
    if (!ready || !content || content.length > MAX_PLAN_MESSAGE || controller.current) return
    const request = new AbortController()
    controller.current = request
    const history = [...messages, { role: 'user' as const, content }].slice(-19)
    setPending(content); setError(''); setNotice(''); setConfirming(false)
    try {
      const result = await generatePlanReply(config, currentContext(), history, draft, request.signal)
      const currentConfig = useAIStore.getState().config
      if (controller.current !== request || request.signal.aborted || !currentConfig.enabled || currentConfig.baseUrl !== config.baseUrl || currentConfig.model !== config.model) return
      setMessages([...history, { role: 'assistant', content: result.reply }])
      setInput('')
      if (result.tasks) { setDraft(result.tasks); setDraftError('') }
    } catch (error) {
      if (controller.current === request && !request.signal.aborted) setError(error instanceof Error ? error.message : '未能生成回复，请重试。')
    } finally {
      if (controller.current === request) { controller.current = null; setPending('') }
    }
  }

  const stop = () => {
    controller.current?.abort(); controller.current = null
    setPending('')
    setError('已停止等待。已发送内容无法撤回，服务商仍可能处理。')
  }
  const apply = () => {
    const state = useStudyStore.getState()
    try {
      const { tasks, omitted } = preparePlanTasks(draft, currentContext(), state.tasks)
      if (!tasks.length) { setDraftError('这些任务已在计划中，没有新增。'); setConfirming(false); return }
      state.addTasks(tasks)
      setDraft([]); setDraftError(''); setConfirming(false)
      setNotice(`已加入 ${tasks.length} 项学习任务${omitted ? `，跳过 ${omitted} 项重复任务` : ''}。`)
    } catch (error) {
      setDraftError(error instanceof Error ? error.message : '保存失败，请检查本地存储空间。')
      setConfirming(false)
    }
  }
  const edit = (tasks: DraftTask[]) => { setDraft(tasks); setDraftError(''); setConfirming(false); setNotice('') }
  const visibleMessages = pending ? [...messages, { role: 'user' as const, content: pending }] : messages

  return <div className="route-content min-w-0 space-y-5">
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-4">
      <div className="flex min-w-0 items-center gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-blue-50 text-blue-700"><Sparkles size={20} /></span>
        <div className="min-w-0"><h1 className="hidden text-lg font-semibold text-slate-950 lg:block">AI 协助</h1><p className="break-all text-xs text-slate-600">{ready ? config.model : '未连接 AI'}</p></div>
      </div>
      <GhostButton title="清空当前对话与草稿" aria-label="新对话" onClick={() => {
        if ((messages.length || draft.length || input.trim() || busy) && !window.confirm('清空当前对话与未保存的草稿？已加入的任务不会被删除。')) return
        reset()
      }}><RotateCcw size={16} />新对话</GhostButton>
    </div>
    {notice && <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-emerald-100 bg-emerald-50 p-3 text-sm text-emerald-700">
      <p className="flex gap-2" role="status"><Check size={18} className="shrink-0" />{notice}</p>
      <GhostButton onClick={() => go('/plan')}>查看学习计划<ArrowRight size={15} /></GhostButton>
    </div>}
    <div className="grid min-w-0 gap-5 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] xl:items-start">
      <section className="min-w-0 rounded-lg border border-slate-200 bg-white" aria-label="计划对话">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 px-4 py-3">
          <h3 className="text-sm font-semibold">计划对话</h3>
          {draft.length > 0 && <button type="button" className="text-sm text-blue-700 xl:hidden" onClick={() => { draftHeading.current?.focus({ preventScroll: true }); draftHeading.current?.scrollIntoView({ block: 'start' }) }}>查看草稿（{draft.length}）</button>}
        </div>
        <div ref={transcript} className="max-h-[48dvh] min-h-36 space-y-3 overflow-y-auto overscroll-contain p-4" role="log" aria-label="对话记录" aria-live="polite">
          {!visibleMessages.length && <div className="grid gap-2">
            <p className="font-medium text-slate-900">这周想学些什么？</p>
            {examples.map(example => <button key={example} type="button" disabled={!ready} className="min-w-0 rounded-lg border border-slate-200 px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-60" onClick={() => setInput(example)}>{example}</button>)}
          </div>}
          {visibleMessages.map(({ role, content }, index) => <div key={index} className={`max-w-[95%] rounded-lg px-3 py-2 text-sm leading-6 wrap-anywhere ${role === 'user' ? 'ml-auto bg-blue-50 text-blue-800' : 'bg-slate-50 text-slate-800'}`}>
            <p className="text-xs font-semibold">{role === 'user' ? '我' : 'AI'}</p>
            <p className="whitespace-pre-wrap">{content}</p>
          </div>)}
          {busy && <p className="text-sm text-slate-600" role="status">正在整理计划…</p>}
        </div>
        <form className="grid gap-2 border-t border-slate-200 p-4" onSubmit={event => { event.preventDefault(); void send() }}>
          {!ready && <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-slate-700"><p>{config.enabled ? '请补全接口、模型和所需密钥。' : 'AI 已关闭。'}</p><GhostButton type="button" onClick={() => go('/settings')}><SettingsIcon size={15} />打开设置</GhostButton></div>}
          <TextArea aria-label="计划需求" placeholder="例如：周三留空，其他安排不变" value={input} maxLength={MAX_PLAN_MESSAGE} disabled={!ready || busy} onChange={e => setInput(e.target.value)} className="w-full min-w-0" />
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="min-w-0 flex-1 wrap-anywhere text-xs leading-5 text-slate-600">{host ? `发送至 ${host}：仅包含近期对话、草稿和排程选项，可能产生费用。` : '未配置可用的 AI 接口。'}</p>
            {busy ? <GhostButton type="button" onClick={stop}><X size={15} />停止等待</GhostButton> : <Button type="submit" disabled={!input.trim() || !ready}><Send size={15} />发送</Button>}
          </div>
          {error && <p role="alert" className="wrap-anywhere text-sm text-red-700">{error}</p>}
        </form>
      </section>
      <section className="min-w-0 rounded-lg border border-slate-200 bg-white" aria-label="学习计划草稿">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 px-4 py-3">
          <div className="flex items-center gap-2"><CalendarDays className="text-slate-500" size={17} /><h3 ref={draftHeading} tabIndex={-1} className="scroll-mt-20 text-sm font-semibold">学习计划草稿</h3></div>
          <span className="text-xs tabular-nums text-slate-600">{draft.length} 项 · {draft.reduce((sum, task) => sum + (task.minutes > 0 && task.minutes <= 720 ? task.minutes : 0), 0)} 分钟</span>
        </div>
        {!draft.length ? <p className="p-4 text-sm text-slate-600">暂无待加入的任务</p> : <>
          <ul className="divide-y divide-slate-200 xl:max-h-[52dvh] xl:overflow-y-auto">
            {draft.map((task, index) => <DraftRow key={index} task={task} index={index} context={context} disabled={busy || confirming} update={patch => edit(draft.map((item, i) => i === index ? { ...item, ...patch } : item))} remove={() => edit(draft.filter((_, i) => i !== index))} />)}
          </ul>
          <div className="grid gap-2 border-t border-slate-200 p-4">
            {confirming ? <p className="text-sm text-slate-700">将加入以上任务，重复项会跳过；不会修改已有计划。</p> : <p className="text-xs text-slate-600">尚未写入学习计划</p>}
            <div className="flex flex-wrap gap-2">
              {confirming ? <><Button onClick={apply}><Check size={16} />确认加入学习计划</Button><GhostButton onClick={() => setConfirming(false)}>返回编辑</GhostButton></> : <Button disabled={busy} onClick={() => {
                try { preparePlanTasks(draft, currentContext(), []); setDraftError(''); setConfirming(true) }
                catch (error) { setDraftError(error instanceof Error ? error.message : '请检查草稿。') }
              }}><Plus size={16} />加入学习计划</Button>}
            </div>
            {draftError && <p role="alert" className="wrap-anywhere text-sm text-red-700">{draftError}</p>}
          </div>
        </>}
      </section>
    </div>
  </div>
}

function DraftRow({ task, index, context, disabled, update, remove }: { task: DraftTask; index: number; context: PlanContext; disabled: boolean; update: (patch: Partial<DraftTask>) => void; remove: () => void }) {
  const issue = validateDraftTask(task, context)
  const label = `第 ${index + 1} 项`
  return <li className="min-w-0 p-4">
    <fieldset disabled={disabled} aria-label={label} className="grid min-w-0 gap-2">
      <div className="flex min-w-0 items-end gap-2">
        <label className="grid min-w-0 flex-1 gap-1 text-xs font-medium text-slate-700">任务名称<TextInput aria-label={`${label}任务名称`} maxLength={120} value={task.title} onChange={e => update({ title: e.target.value })} /></label>
        <button type="button" title="移除任务" aria-label={`移除${label}`} onClick={remove} className="grid size-10 shrink-0 place-items-center rounded-lg text-slate-600 hover:bg-red-50 hover:text-red-700 disabled:opacity-50"><Trash2 size={16} /></button>
      </div>
      <div className="grid min-w-0 grid-cols-2 gap-2">
        <label className="grid min-w-0 gap-1 text-xs font-medium text-slate-700">日期<TextInput aria-label={`${label}日期`} type="date" min={context.currentWeekStart} max={context.nextWeekEnd} value={task.date} onChange={e => update({ date: e.target.value })} /></label>
        <label className="grid min-w-0 gap-1 text-xs font-medium text-slate-700">科目<Select aria-label={`${label}科目`} value={context.subjects.includes(task.subject) ? task.subject : ''} onChange={e => update({ subject: e.target.value })}>
          <option value="" disabled>选择科目</option>{context.subjects.map(subject => <option key={subject}>{subject}</option>)}
        </Select></label>
        <label className="grid min-w-0 gap-1 text-xs font-medium text-slate-700">时段<Select aria-label={`${label}时段`} value={context.slots.includes(task.slot) ? task.slot : ''} onChange={e => update({ slot: e.target.value })}>
          <option value="" disabled>选择时段</option>{context.slots.map(slot => <option key={slot}>{slot}</option>)}
        </Select></label>
        <label className="grid min-w-0 gap-1 text-xs font-medium text-slate-700">预计分钟<TextInput aria-label={`${label}预计分钟`} type="number" min={1} max={720} step={1} value={task.minutes || ''} onChange={e => update({ minutes: Number(e.target.value) })} /></label>
      </div>
      {issue && <p className="text-xs leading-5 text-red-700">{issue}</p>}
    </fieldset>
  </li>
}
