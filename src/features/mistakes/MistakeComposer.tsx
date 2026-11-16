import { Paperclip, Sparkles, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { AttachmentList } from '../../components/AttachmentList'
import { FilePicker } from '../../components/FilePicker'
import { Modal } from '../../components/Modal'
import { Button, GhostButton, Select, TextArea, TextInput } from '../../components/ui'
import { attachmentToDataUrl } from '../../lib/files'
import type { FileAttachment, Mistake, MistakeImportance, MistakeStatus } from '../../types'
import { useAIStore } from '../ai/aiStore'
import { recognizeMistake, type RecognitionDraft } from '../ai/client'

export type MistakeDraft = Omit<Mistake, 'id' | 'createdAt'>

export function MistakeComposer({ initial, subjects, onClose, onSave, onPreview }: {
  initial?: Mistake
  subjects: string[]
  onClose: () => void
  onSave: (draft: MistakeDraft) => void
  onPreview: (file: FileAttachment) => void
}) {
  const { config } = useAIStore()
  const [draft, setDraft] = useState<MistakeDraft>(() => initial ? { subject: initial.subject, question: initial.question, answer: initial.answer, note: initial.note, importance: initial.importance, status: initial.status, attachments: [...initial.attachments] } : { subject: subjects.includes('数学') ? '数学' : subjects[0] ?? '数学', question: '', answer: '', note: '', importance: '黄', status: '待复习', attachments: [] })
  const [imageId, setImageId] = useState('')
  const [consent, setConsent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [feedback, setFeedback] = useState('')
  const [result, setResult] = useState<RecognitionDraft | null>(null)
  const [error, setError] = useState('')
  const request = useRef<AbortController | null>(null)
  const alive = useRef(true)
  useEffect(() => { alive.current = true; return () => { alive.current = false; request.current?.abort(); request.current = null } }, [])
  const patch = (value: Partial<MistakeDraft>) => setDraft((current) => ({ ...current, ...value }))
  const images = draft.attachments.filter((file) => /^image\/(png|jpeg|webp)$/i.test(file.type) || (!file.type || file.type === 'application/octet-stream') && /\.(png|jpe?g|webp)$/i.test(file.name))
  let host = ''
  try { host = new URL(config.baseUrl).host } catch { /* Invalid configuration stays manual-only. */ }
  const cancel = () => {
    const wasWaiting = Boolean(request.current)
    request.current?.abort()
    request.current = null
    setLoading(false)
    if (wasWaiting) setFeedback('已停止等待 AI 结果。已发送内容无法撤回，服务商仍可能处理并计费。')
  }
  const recognize = async () => {
    const file = images.find((item) => item.id === imageId)
    if (!file || !config.enabled || !host || loading) return
    setConsent(false)
    setResult(null)
    setFeedback('正在等待 AI 结果。发送后无法撤回，服务商仍可能处理并计费。')
    setLoading(true)
    const controller = new AbortController()
    request.current = controller
    const timer = setTimeout(() => {
      if (request.current !== controller) return
      controller.abort()
      request.current = null
      setLoading(false)
      setFeedback('识别超时，请重试或手动录入。')
    }, 60000)
    try {
      const dataUrl = await attachmentToDataUrl(file)
      if (controller.signal.aborted) return
      const next = await recognizeMistake({ ...config }, dataUrl, controller.signal)
      if (!alive.current || request.current !== controller || controller.signal.aborted) return
      setResult(next)
      setFeedback('识别完成，等待核对。')
    } catch (error) {
      if (alive.current && request.current === controller && !controller.signal.aborted) setFeedback(error instanceof Error ? error.message : '识别失败，请检查设置或图片后重试，也可手动录入。')
    } finally {
      clearTimeout(timer)
      if (alive.current && request.current === controller) { request.current = null; setLoading(false) }
    }
  }
  const availableSubjects = [...new Set([...subjects, draft.subject])]
  return <Modal title={initial ? '编辑错题' : '新增错题'} onClose={() => { cancel(); onClose() }}>
    <form className="grid min-w-0 grid-cols-1 gap-4" noValidate onSubmit={(event) => {
      event.preventDefault()
      if (!draft.question.trim()) { setError('请填写题目。'); return }
      if (!draft.subject.trim()) { setError('请选择科目。'); return }
      onSave({ ...draft, question: draft.question.trim() })
    }}>
      <FilePicker className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-slate-300 px-3 py-4 text-sm text-slate-700" onFiles={(files) => { if (alive.current) setDraft((current) => ({ ...current, attachments: [...current.attachments, ...files] })) }}><Paperclip size={16} />上传截图 / 添加附件</FilePicker>
      <AttachmentList attachments={draft.attachments} compact onOpen={onPreview} />
      {draft.attachments.length > 0 && <div className="flex flex-wrap gap-2">{draft.attachments.map((file) => <GhostButton key={file.id} type="button" className="max-w-full" aria-label={`移除附件 ${file.name}`} onClick={() => { cancel(); setResult(null); setConsent(false); patch({ attachments: draft.attachments.filter((item) => item.id !== file.id) }); if (imageId === file.id) setImageId('') }}><span className="truncate">{file.name}</span><X size={14} className="shrink-0" /></GhostButton>)}</div>}
      <div className="grid gap-2 border-y border-slate-200 py-3">
        {config.enabled ? <>
          <label className="grid gap-1 text-sm font-medium">识别图片<Select value={imageId} disabled={loading} onChange={(event) => { setImageId(event.target.value); setConsent(false) }}><option value="">请选择一张 PNG / JPEG / WebP</option>{images.map((file) => <option key={file.id} value={file.id}>{file.name}</option>)}</Select></label>
          <GhostButton type="button" disabled={loading || !images.some((file) => file.id === imageId) || !host || !config.model.trim()} onClick={() => setConsent(true)}><Sparkles size={16} />AI 识别</GhostButton>
          {(!host || !config.model.trim()) && <p className="text-sm text-slate-600">请在设置中完成 AI 地址与模型配置。</p>}
          {consent && <div className="grid gap-2" role="group" aria-label="确认发送图片"><p className="break-words text-sm text-slate-700">将仅发送所选图片「{images.find((file) => file.id === imageId)?.name}」至 {host}。识别结果不会自动保存。</p><div className="flex flex-wrap gap-2"><Button type="button" onClick={() => void recognize()}>确认发送并识别</Button><GhostButton type="button" onClick={() => setConsent(false)}>暂不发送</GhostButton></div></div>}
        </> : <p className="text-sm text-slate-600">AI 未开启。可在设置中配置 AI 服务，或直接手动录入。</p>}
        {feedback && <p role="status" className="text-sm text-slate-700">{feedback}</p>}
        {loading && <GhostButton type="button" onClick={cancel}>停止等待</GhostButton>}
        {result && <div className="grid gap-2">
          <h3 className="text-sm font-semibold">识别草稿</h3>
          <dl className="grid gap-2 break-words text-sm">{([['题目', result.question], ['答案', result.answer], ['备注', result.note], ['科目', result.subject]]).map(([label, value]) => <div key={label}><dt className="font-medium">{label}</dt><dd className="whitespace-pre-wrap">{value || '未识别'}</dd></div>)}</dl>
          <div className="flex flex-wrap gap-2"><GhostButton type="button" onClick={() => { if (window.confirm('用识别草稿替换当前题目、答案和备注？当前手动内容将被替换。')) { patch({ question: result.question, answer: result.answer, note: result.note, ...(result.subject.trim() ? { subject: result.subject.trim() } : {}) }); setResult(null) } }}>应用到编辑区</GhostButton><GhostButton type="button" onClick={() => setResult(null)}>丢弃识别草稿</GhostButton></div>
        </div>}
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="grid gap-1 text-sm font-medium">科目（必填）<Select required value={draft.subject} onChange={(event) => patch({ subject: event.target.value })}>{availableSubjects.map((item) => <option key={item}>{item}</option>)}</Select></label>
        <label className="grid gap-1 text-sm font-medium">重要程度<Select value={draft.importance} onChange={(event) => patch({ importance: event.target.value as MistakeImportance })}><option value="红">红 · 重点</option><option value="黄">黄 · 巩固</option><option value="绿">绿 · 普通</option></Select></label>
        <label className="grid gap-1 text-sm font-medium">复习状态<Select value={draft.status} onChange={(event) => patch({ status: event.target.value as MistakeStatus })}><option>待复习</option><option>已掌握</option></Select></label>
      </div>
      <label className="grid gap-1 text-sm font-medium">题目（必填）<TextArea required aria-invalid={Boolean(error)} aria-describedby={error ? 'mistake-error' : undefined} value={draft.question} onChange={(event) => { patch({ question: event.target.value }); setError('') }} /></label>
      {error && <p id="mistake-error" role="alert" className="text-sm text-red-700">{error}</p>}
      <label className="grid gap-1 text-sm font-medium">正确答案 / 思路<TextArea value={draft.answer} onChange={(event) => patch({ answer: event.target.value })} /></label>
      <label className="grid gap-1 text-sm font-medium">复盘备注<TextInput value={draft.note} onChange={(event) => patch({ note: event.target.value })} /></label>
      <div className="flex flex-wrap justify-end gap-2 border-t border-slate-200 bg-white py-3"><GhostButton type="button" onClick={() => { cancel(); onClose() }}>取消</GhostButton><Button type="submit">保存错题</Button></div>
    </form>
  </Modal>
}
