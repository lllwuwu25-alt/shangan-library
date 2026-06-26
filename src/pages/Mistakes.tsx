import { FileStack, Paperclip, Plus, Search, Trash2, Upload } from 'lucide-react'
import { useMemo, useState } from 'react'
import { AttachmentList, UploadHint } from '../components/AttachmentList'
import { PageHeader } from '../components/Layout'
import { Button, Card, DangerButton, EmptyState, GhostButton, Pill, SectionTitle, Select, TextArea, TextInput } from '../components/ui'
import { subjects } from '../constants'
import { fileNameWithoutExtension, filesToAttachments } from '../lib/files'
import { useStudyStore } from '../store/useStudyStore'
import type { FileAttachment, Mistake, MistakeImportance, MistakeStatus, Subject } from '../types'

export function Mistakes() {
  const { mistakes, addMistake, addMistakes, updateMistake, deleteMistake, toggleMistake } = useStudyStore()
  const [subject, setSubject] = useState<'全部' | Subject>('全部')
  const [status, setStatus] = useState<'全部' | MistakeStatus>('全部')
  const [query, setQuery] = useState('')
  const [newSubject, setNewSubject] = useState<Subject>('数学')
  const [question, setQuestion] = useState('')
  const [answer, setAnswer] = useState('')
  const [note, setNote] = useState('')
  const [importance, setImportance] = useState<MistakeImportance>('黄')
  const [attachments, setAttachments] = useState<FileAttachment[]>([])
  const [batchSubject, setBatchSubject] = useState<Subject>('数学')
  const [batchImportance, setBatchImportance] = useState<MistakeImportance>('黄')
  const [batchMessage, setBatchMessage] = useState('')

  const filtered = useMemo(() => mistakes.filter((item) => {
    const hitSubject = subject === '全部' || item.subject === subject
    const hitStatus = status === '全部' || item.status === status
    const hitQuery = `${item.question} ${item.answer} ${item.note}`.toLowerCase().includes(query.toLowerCase())
    return hitSubject && hitStatus && hitQuery
  }), [mistakes, subject, status, query])
  const pending = mistakes.filter((item) => item.status === '待复习').length
  const mastered = mistakes.filter((item) => item.status === '已掌握').length

  return (
    <>
      <PageHeader title="错题本" description="记录错因、答案和复盘备注，用状态筛选把注意力放回待复习题目。" />
      <div className="grid gap-4 sm:grid-cols-3 xl:grid-cols-6">
        <Stat label="累计错题" value={mistakes.length} />
        <Stat label="待复习" value={pending} />
        <Stat label="已掌握" value={mastered} />
        <Stat label="红色重点" value={mistakes.filter((item) => item.importance === '红').length} />
        <Stat label="黄色巩固" value={mistakes.filter((item) => item.importance === '黄').length} />
        <Stat label="绿色普通" value={mistakes.filter((item) => item.importance === '绿').length} />
      </div>
      <div className="mt-5 grid gap-5 xl:grid-cols-[1fr_360px]">
        <Card>
          <SectionTitle title="错题列表" caption={`${filtered.length} / ${mistakes.length} 条错题`} />
          <div className="mb-4 grid gap-3 rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-200/70 md:grid-cols-[1fr_160px_160px]">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={17} />
              <TextInput value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索错题、答案或备注" className="w-full pl-9" />
            </div>
            <Select value={subject} onChange={(event) => setSubject(event.target.value as '全部' | Subject)}>
              <option>全部</option>
              {subjects.map((item) => <option key={item}>{item}</option>)}
            </Select>
            <Select value={status} onChange={(event) => setStatus(event.target.value as '全部' | MistakeStatus)}>
              <option>全部</option>
              <option>待复习</option>
              <option>已掌握</option>
            </Select>
          </div>
          <div className="space-y-3">
            {filtered.length === 0 ? <EmptyState text="没有匹配的错题。" /> : filtered.map((item) => (
              <div key={item.id} className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200/60 transition hover:bg-white hover:shadow-card">
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  <Select value={item.subject} onChange={(event) => updateMistake(item.id, { subject: event.target.value as Subject })}>{subjects.map((item) => <option key={item}>{item}</option>)}</Select>
                  <Select value={item.importance} onChange={(event) => updateMistake(item.id, { importance: event.target.value as MistakeImportance })}>
                    <option>红</option>
                    <option>黄</option>
                    <option>绿</option>
                  </Select>
                  <ImportancePill importance={item.importance} />
                  <Pill tone={item.status === '已掌握' ? 'green' : 'amber'}>{item.status}</Pill>
                  <span className="rounded-full bg-white px-2 py-1 text-xs text-slate-500 ring-1 ring-slate-200">{item.attachments.length} 个文件</span>
                  <span className="text-xs text-slate-500">{item.createdAt}</span>
                </div>
                <div className="grid gap-3">
                  <TextArea value={item.question} onChange={(event) => updateMistake(item.id, { question: event.target.value })} />
                  <TextArea value={item.answer} onChange={(event) => updateMistake(item.id, { answer: event.target.value })} />
                  <TextInput value={item.note} onChange={(event) => updateMistake(item.id, { note: event.target.value })} />
                </div>
                <MistakeAttachments item={item} updateMistake={updateMistake} />
                <div className="mt-3 flex flex-wrap gap-2">
                  <GhostButton onClick={() => toggleMistake(item.id)}>{item.status === '已掌握' ? '设为待复习' : '标记已掌握'}</GhostButton>
                  <DangerButton onClick={() => deleteMistake(item.id)}><Trash2 size={15} />删除</DangerButton>
                </div>
              </div>
            ))}
          </div>
        </Card>
        <div className="space-y-5">
          <Card>
            <SectionTitle title="新增错题" caption="用等级标记优先复习顺序。" />
            <div className="grid gap-3">
              <Select value={newSubject} onChange={(event) => setNewSubject(event.target.value as Subject)}>{subjects.map((item) => <option key={item}>{item}</option>)}</Select>
              <Select value={importance} onChange={(event) => setImportance(event.target.value as MistakeImportance)}>
                <option>红</option>
                <option>黄</option>
                <option>绿</option>
              </Select>
              <TextArea placeholder="题目或错误点" value={question} onChange={(event) => setQuestion(event.target.value)} />
              <TextArea placeholder="正确答案 / 思路" value={answer} onChange={(event) => setAnswer(event.target.value)} />
              <TextInput placeholder="复盘备注" value={note} onChange={(event) => setNote(event.target.value)} />
              <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-blue-200 bg-blue-50 px-3 py-5 text-center text-sm font-medium text-blue-700 transition hover:bg-blue-100">
                <span className="flex size-9 items-center justify-center rounded-xl bg-white text-blue-700 shadow-sm"><Upload size={17} /></span>
                <span>上传题目截图 / PDF / Word 等文件</span>
                <UploadHint>点击附件名可预览 PDF / 图片 / 文本等</UploadHint>
                <input type="file" multiple className="hidden" onChange={async (event) => {
                  if (!event.target.files) return
                  const nextFiles = await filesToAttachments(event.target.files)
                  setAttachments((current) => [...current, ...nextFiles])
                  event.target.value = ''
                }} />
              </label>
              <AttachmentList attachments={attachments} compact onRemove={(id) => setAttachments((current) => current.filter((item) => item.id !== id))} />
              <Button className="w-full" onClick={() => { if (!question.trim()) return; addMistake({ subject: newSubject, question, answer, note, status: '待复习', importance, attachments }); setQuestion(''); setAnswer(''); setNote(''); setAttachments([]); setImportance('黄') }}><Plus size={16} />新增错题</Button>
            </div>
          </Card>
          <Card>
            <SectionTitle title="批量导入错题" caption="适合一次导入截图、PDF 或 Word 题单。" />
            <div className="grid gap-3">
              <Select value={batchSubject} onChange={(event) => setBatchSubject(event.target.value as Subject)}>{subjects.map((item) => <option key={item}>{item}</option>)}</Select>
              <Select value={batchImportance} onChange={(event) => setBatchImportance(event.target.value as MistakeImportance)}>
                <option>红</option>
                <option>黄</option>
                <option>绿</option>
              </Select>
              <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-3 py-5 text-center text-sm font-medium text-slate-700 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700">
                <span className="flex size-9 items-center justify-center rounded-xl bg-white text-blue-700 shadow-sm"><FileStack size={17} /></span>
                <span>批量选择错题文件</span>
                <span className="text-xs font-normal text-slate-500">每个文件会生成一条待复习错题</span>
                <input type="file" multiple className="hidden" onChange={async (event) => {
                  if (!event.target.files?.length) return
                  const nextFiles = await filesToAttachments(event.target.files)
                  addMistakes(nextFiles.map((file) => ({
                    subject: batchSubject,
                    question: fileNameWithoutExtension(file.name),
                    answer: '',
                    note: `批量导入：${file.name}`,
                    status: '待复习',
                    importance: batchImportance,
                    attachments: [file],
                  })))
                  setBatchMessage(`已批量导入 ${nextFiles.length} 条错题。`)
                  event.target.value = ''
                }} />
              </label>
              {batchMessage && <p className="rounded-xl bg-blue-50 px-3 py-2 text-sm text-blue-800">{batchMessage}</p>}
            </div>
          </Card>
        </div>
      </div>
    </>
  )
}

function ImportancePill({ importance }: { importance: MistakeImportance }) {
  const styles = {
    红: 'bg-red-50 text-red-700 ring-red-100',
    黄: 'bg-amber-50 text-amber-800 ring-amber-100',
    绿: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
  }
  return <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ring-1 ${styles[importance]}`}>{importance}色等级</span>
}

function MistakeAttachments({ item, updateMistake }: { item: Mistake; updateMistake: ReturnType<typeof useStudyStore.getState>['updateMistake'] }) {
  return (
    <div className="mt-3">
      <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50">
        <Paperclip size={15} />
        添加文件
        <input type="file" multiple className="hidden" onChange={async (event) => {
          if (!event.target.files) return
          const nextFiles = await filesToAttachments(event.target.files)
          updateMistake(item.id, { attachments: [...item.attachments, ...nextFiles] })
          event.target.value = ''
        }} />
      </label>
      <AttachmentList attachments={item.attachments} onRemove={(id) => updateMistake(item.id, { attachments: item.attachments.filter((file) => file.id !== id) })} />
    </div>
  )
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <Card>
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-1 text-3xl font-semibold tracking-tight text-slate-950">{value}</p>
    </Card>
  )
}
