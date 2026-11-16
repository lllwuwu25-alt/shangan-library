import { Eye, FileStack, Pencil, Plus, Search, Trash2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { AttachmentList } from '../components/AttachmentList'
import { FilePicker } from '../components/FilePicker'
import { FilePreviewModal } from '../components/FilePreviewModal'
import { PageHeader } from '../components/Layout'
import { Modal } from '../components/Modal'
import { Button, DangerButton, EmptyState, GhostButton, Pill, SectionTitle, Select, TextInput } from '../components/ui'
import { defaultSubjects, subjectOptions } from '../constants'
import { MistakeComposer } from '../features/mistakes/MistakeComposer'
import { fileNameWithoutExtension } from '../lib/files'
import { useStudyStore } from '../store/useStudyStore'
import type { FileAttachment, Mistake, MistakeImportance, MistakeStatus } from '../types'

export function Mistakes() {
  const { mistakes, settings, addMistake, addMistakes, updateMistake, deleteMistake } = useStudyStore()
  const [subject, setSubject] = useState('全部')
  const [status, setStatus] = useState<'全部' | MistakeStatus>('全部')
  const [query, setQuery] = useState('')
  const [composer, setComposer] = useState<Mistake | 'new' | null>(null)
  const [batchOpen, setBatchOpen] = useState(false)
  const [batchSubject, setBatchSubject] = useState('数学')
  const [batchImportance, setBatchImportance] = useState<MistakeImportance>('黄')
  const [batchMessage, setBatchMessage] = useState('')
  const [previewFile, setPreviewFile] = useState<FileAttachment | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [reviewIds, setReviewIds] = useState<string[]>([])
  const [revealed, setRevealed] = useState<string[]>([])
  const [reviewRevealed, setReviewRevealed] = useState(false)
  const subjects = subjectOptions([...settings.subjects, ...mistakes.map((item) => item.subject)])
  const safeBatchSubject = subjects.includes(batchSubject) ? batchSubject : subjects[0] ?? defaultSubjects[0]
  const filtered = useMemo(() => mistakes.filter((item) =>
    (subject === '全部' || item.subject === subject) && (status === '全部' || item.status === status) &&
    `${item.question} ${item.answer} ${item.note}`.toLowerCase().includes(query.toLowerCase()),
  ), [mistakes, subject, status, query])
  const reviewItem = reviewIds.map((id) => mistakes.find((item) => item.id === id)).find((item) => item !== undefined)
  const startReview = (ids: string[]) => { setReviewIds(ids); setReviewRevealed(false) }
  const nextReview = (nextStatus: MistakeStatus) => {
    if (!reviewItem) return
    updateMistake(reviewItem.id, { status: nextStatus })
    setReviewIds((ids) => ids.slice(ids.indexOf(reviewItem.id) + 1))
    setReviewRevealed(false)
  }
  return <>
    <PageHeader title="错题本" description="记录错题，回顾思路，逐题巩固。" />
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-4">
      <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-slate-600"><span>累计 <strong className="text-slate-950">{mistakes.length}</strong></span><span>待复习 <strong className="text-slate-950">{mistakes.filter((item) => item.status === '待复习').length}</strong></span><span>已掌握 <strong className="text-emerald-700">{mistakes.filter((item) => item.status === '已掌握').length}</strong></span></div>
      <div className="flex flex-wrap gap-2"><GhostButton onClick={() => { setBatchOpen(true); setBatchMessage('') }}><FileStack size={16} />批量导入</GhostButton><Button onClick={() => setComposer('new')}><Plus size={16} />新增错题</Button></div>
    </div>
    <section className="mt-5">
      <SectionTitle title="错题列表" caption={`${filtered.length} / ${mistakes.length} 条错题`} action={<GhostButton disabled={!filtered.length} onClick={() => startReview(filtered.map((item) => item.id))}><Eye size={16} />开始复习</GhostButton>} />
      <div className="mb-4 grid gap-3 md:grid-cols-[minmax(0,1fr)_160px_160px]">
        <div className="relative"><Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={17} /><TextInput aria-label="搜索错题" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索错题、答案或备注" className="pl-9" /></div>
        <Select aria-label="筛选科目" value={subject} onChange={(event) => setSubject(event.target.value)}><option>全部</option>{subjects.map((item) => <option key={item}>{item}</option>)}</Select>
        <Select aria-label="筛选状态" value={status} onChange={(event) => setStatus(event.target.value as '全部' | MistakeStatus)}><option>全部</option><option>待复习</option><option>已掌握</option></Select>
      </div>
      <div className="space-y-3">
        {!filtered.length ? <EmptyState text={mistakes.length ? '没有匹配的错题。' : '暂无错题。'} /> : filtered.map((item) => <article key={item.id} className="min-w-0 rounded-lg border border-slate-200 bg-white p-4">
          <div className="flex flex-wrap items-center gap-2"><Pill>{item.subject}</Pill><ImportancePill importance={item.importance} /><Pill tone={item.status === '已掌握' ? 'green' : 'amber'}>{item.status}</Pill><time className="break-all text-xs text-slate-600">{item.createdAt}</time></div>
          <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-7 text-slate-950">{item.question}</p>
          {revealed.includes(item.id) && <Answer item={item} />}
          <AttachmentList attachments={item.attachments} onOpen={setPreviewFile} />
          <div className="mt-3 flex flex-wrap gap-2">
            <GhostButton aria-expanded={revealed.includes(item.id)} onClick={() => setRevealed((ids) => ids.includes(item.id) ? ids.filter((id) => id !== item.id) : [...ids, item.id])}><Eye size={15} />{revealed.includes(item.id) ? '隐藏答案' : '显示答案'}</GhostButton>
            <GhostButton onClick={() => startReview([item.id])}>复习</GhostButton>
            <GhostButton onClick={() => setComposer(item)}><Pencil size={15} />编辑</GhostButton>
            <DangerButton onClick={() => setDeleteId(item.id)}><Trash2 size={15} />删除</DangerButton>
          </div>
        </article>)}
      </div>
    </section>
    {composer && <MistakeComposer key={composer === 'new' ? 'new' : composer.id} initial={composer === 'new' ? undefined : composer} subjects={subjects} onClose={() => setComposer(null)} onPreview={setPreviewFile} onSave={(draft) => { if (composer === 'new') addMistake(draft); else updateMistake(composer.id, draft); setComposer(null) }} />}
    {reviewItem && <Modal title="复习错题" onClose={() => setReviewIds([])}><div className="grid gap-4"><p className="text-sm text-slate-600">{reviewItem.subject} · 剩余 {reviewIds.length} 题</p><p className="whitespace-pre-wrap break-words text-sm leading-7">{reviewItem.question}</p><AttachmentList attachments={reviewItem.attachments} onOpen={setPreviewFile} />{reviewRevealed ? <><Answer item={reviewItem} /><div className="flex flex-wrap gap-2"><Button onClick={() => nextReview('已掌握')}>已掌握</Button><GhostButton onClick={() => nextReview('待复习')}>仍需复习</GhostButton></div></> : <Button onClick={() => setReviewRevealed(true)}>显示答案</Button>}</div></Modal>}
    {deleteId && <Modal title="删除错题？" onClose={() => setDeleteId(null)}><p className="text-sm text-slate-700">删除后无法恢复此条错题。</p><div className="mt-4 flex flex-wrap justify-end gap-2"><GhostButton onClick={() => setDeleteId(null)}>取消</GhostButton><DangerButton onClick={() => { deleteMistake(deleteId); setDeleteId(null) }}>确认删除</DangerButton></div></Modal>}
    {batchOpen && <Modal title="批量导入错题" onClose={() => setBatchOpen(false)}><div className="grid gap-3"><label className="grid gap-1 text-sm font-medium">导入科目<Select value={safeBatchSubject} onChange={(event) => setBatchSubject(event.target.value)}>{subjects.map((item) => <option key={item}>{item}</option>)}</Select></label><label className="grid gap-1 text-sm font-medium">导入重要程度<Select value={batchImportance} onChange={(event) => setBatchImportance(event.target.value as MistakeImportance)}><option>红</option><option>黄</option><option>绿</option></Select></label><FilePicker className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-slate-300 px-3 py-5 text-sm font-medium text-slate-700" onFiles={(files) => {
      addMistakes(files.map((file) => ({ subject: safeBatchSubject, question: fileNameWithoutExtension(file.name), answer: '', note: `批量导入：${file.name}`, status: '待复习', importance: batchImportance, attachments: [file] })))
      setBatchMessage(`已批量导入 ${files.length} 条错题。`)
    }}><FileStack size={16} />批量选择错题文件</FilePicker>{batchMessage && <p role="status" className="text-sm text-blue-800">{batchMessage}</p>}</div></Modal>}
    {previewFile && <FilePreviewModal file={previewFile} onClose={() => setPreviewFile(null)} />}
  </>
}

function Answer({ item }: { item: Mistake }) {
  return <div className="mt-3 grid gap-3 border-t border-slate-200 pt-3 text-sm leading-7"><div><h3 className="font-semibold text-slate-900">正确答案 / 思路</h3><p className="whitespace-pre-wrap break-words text-slate-700">{item.answer || '尚未填写答案'}</p></div>{item.note && <div><h3 className="font-semibold text-slate-900">复盘备注</h3><p className="whitespace-pre-wrap break-words text-slate-700">{item.note}</p></div>}</div>
}

function ImportancePill({ importance }: { importance: MistakeImportance }) {
  const styles = { 红: 'bg-red-50 text-red-700 ring-red-100', 黄: 'bg-amber-50 text-amber-800 ring-amber-100', 绿: 'bg-emerald-50 text-emerald-700 ring-emerald-100' }
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ring-1 ${styles[importance]}`}>{importance}色等级</span>
}
