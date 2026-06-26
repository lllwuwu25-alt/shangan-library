import { FileStack, FileText, Paperclip, Plus, Search, Trash2, Upload } from 'lucide-react'
import { useMemo, useState } from 'react'
import { AttachmentList, UploadHint } from '../components/AttachmentList'
import { FilePreviewModal } from '../components/FilePreviewModal'
import { resourceCategories } from '../constants'
import { fileNameWithoutExtension, filesToAttachments } from '../lib/files'
import { useStudyStore } from '../store/useStudyStore'
import type { FileAttachment, ResourceCategory, ResourceItem } from '../types'
import { Button, Card, DangerButton, EmptyState, GhostButton, Pill, SectionTitle, Select, TextArea, TextInput } from '../components/ui'
import { PageHeader } from '../components/Layout'

export function Resources() {
  const { resources, addResource, addResources, updateResource, deleteResource, openResource } = useStudyStore()
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState<'全部' | ResourceCategory>('全部')
  const [title, setTitle] = useState('')
  const [newCategory, setNewCategory] = useState<ResourceCategory>('英语')
  const [batchCategory, setBatchCategory] = useState<ResourceCategory>('笔记')
  const [description, setDescription] = useState('')
  const [attachments, setAttachments] = useState<FileAttachment[]>([])
  const [batchMessage, setBatchMessage] = useState('')
  const [previewFile, setPreviewFile] = useState<FileAttachment | null>(null)

  const filtered = useMemo(() => resources.filter((item) => {
    const hitQuery = `${item.title} ${item.description}`.toLowerCase().includes(query.toLowerCase())
    const hitCategory = category === '全部' || item.category === category
    return hitQuery && hitCategory
  }), [resources, query, category])
  const recent = resources.filter((item) => item.lastOpenedAt).sort((a, b) => (b.lastOpenedAt ?? '').localeCompare(a.lastOpenedAt ?? '')).slice(0, 4)

  return (
    <>
      <PageHeader title="资料库" description="把真题、笔记、模板和科目资料放在一个本地索引里，方便检索和复盘。" />
      <div className="grid gap-5 xl:grid-cols-[1fr_360px]">
        <Card>
          <SectionTitle title="资料列表" caption={`${filtered.length} / ${resources.length} 份资料`} />
          <div className="mb-4 flex flex-col gap-3 rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-200/70 md:flex-row md:items-center">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={17} />
              <TextInput value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索资料标题或描述" className="w-full pl-9" />
            </div>
            <Select value={category} onChange={(event) => setCategory(event.target.value as '全部' | ResourceCategory)}>
              {resourceCategories.map((item) => <option key={item}>{item}</option>)}
            </Select>
          </div>
          <div className="space-y-3">
            {filtered.length === 0 ? <EmptyState text="没有匹配的资料。" /> : filtered.map((item) => (
              <div key={item.id} className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200/60 transition hover:bg-white hover:shadow-card">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <div className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700"><FileText size={16} /></div>
                      <TextInput value={item.title} onChange={(event) => updateResource(item.id, { title: event.target.value })} className="h-8 w-full max-w-md bg-white" />
                    </div>
                    <TextArea value={item.description} onChange={(event) => updateResource(item.id, { description: event.target.value })} className="mt-3 w-full" />
                    <ResourceAttachments item={item} updateResource={updateResource} openResource={openResource} setPreviewFile={setPreviewFile} />
                  </div>
                  <div className="flex shrink-0 flex-wrap gap-2 md:justify-end">
                    <Select value={item.category} onChange={(event) => updateResource(item.id, { category: event.target.value as ResourceCategory })}>{resourceCategories.filter((item) => item !== '全部').map((item) => <option key={item}>{item}</option>)}</Select>
                    <GhostButton onClick={() => openResource(item.id)}>标记打开</GhostButton>
                    <DangerButton onClick={() => deleteResource(item.id)}><Trash2 size={15} />删除</DangerButton>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                  <Pill tone="blue">{item.category}</Pill>
                  <span className="rounded-full bg-white px-2 py-1 ring-1 ring-slate-200">{item.attachments.length} 个文件</span>
                  <span>添加：{item.addedAt}</span>
                  {item.lastOpenedAt && <span>最近打开：{item.lastOpenedAt}</span>}
                </div>
              </div>
            ))}
          </div>
        </Card>
        <div className="space-y-5">
          <Card>
            <SectionTitle title="新增资料" caption="文件会保存到当前浏览器本地数据。" />
            <div className="grid gap-3">
              <TextInput placeholder="资料标题" value={title} onChange={(event) => setTitle(event.target.value)} />
              <Select value={newCategory} onChange={(event) => setNewCategory(event.target.value as ResourceCategory)}>{resourceCategories.filter((item) => item !== '全部').map((item) => <option key={item}>{item}</option>)}</Select>
              <TextArea placeholder="简短描述或本地路径备注" value={description} onChange={(event) => setDescription(event.target.value)} />
              <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-blue-200 bg-blue-50 px-3 py-5 text-center text-sm font-medium text-blue-700 transition hover:bg-blue-100">
                <span className="flex size-9 items-center justify-center rounded-xl bg-white text-blue-700 shadow-sm"><Upload size={17} /></span>
                <span>上传 Word / Excel / PDF / 图片等文件</span>
                <UploadHint>支持多选，点击文件名可直接预览 Word / Excel / PDF / 图片</UploadHint>
                <input type="file" multiple className="hidden" onChange={async (event) => {
                  if (!event.target.files) return
                  const nextFiles = await filesToAttachments(event.target.files)
                  setAttachments((current) => [...current, ...nextFiles])
                  event.target.value = ''
                }} />
              </label>
              <AttachmentList attachments={attachments} compact onOpen={setPreviewFile} onRemove={(id) => setAttachments((current) => current.filter((item) => item.id !== id))} />
              <Button className="w-full" onClick={() => { if (!title.trim()) return; addResource({ title, category: newCategory, description, attachments }); setTitle(''); setDescription(''); setAttachments([]) }}><Plus size={16} />新增资料</Button>
            </div>
          </Card>
          <Card>
            <SectionTitle title="批量导入" caption="一次选择多个文件，自动生成资料条目。" />
            <div className="grid gap-3">
              <Select value={batchCategory} onChange={(event) => setBatchCategory(event.target.value as ResourceCategory)}>{resourceCategories.filter((item) => item !== '全部').map((item) => <option key={item}>{item}</option>)}</Select>
              <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-3 py-5 text-center text-sm font-medium text-slate-700 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700">
                <span className="flex size-9 items-center justify-center rounded-xl bg-white text-blue-700 shadow-sm"><FileStack size={17} /></span>
                <span>批量选择文件并导入</span>
                <span className="text-xs font-normal text-slate-500">每个文件会生成一条资料，标题取文件名</span>
                <input type="file" multiple className="hidden" onChange={async (event) => {
                  if (!event.target.files?.length) return
                  const nextFiles = await filesToAttachments(event.target.files)
                  addResources(nextFiles.map((file) => ({
                    title: fileNameWithoutExtension(file.name),
                    category: batchCategory,
                    description: `批量导入：${file.name}`,
                    attachments: [file],
                  })))
                  setBatchMessage(`已批量导入 ${nextFiles.length} 个文件。`)
                  event.target.value = ''
                }} />
              </label>
              {batchMessage && <p className="rounded-xl bg-blue-50 px-3 py-2 text-sm text-blue-800">{batchMessage}</p>}
            </div>
          </Card>
          <Card>
            <SectionTitle title="最近打开" />
            <div className="space-y-3">
              {recent.length === 0 ? <EmptyState text="还没有打开记录。" /> : recent.map((item) => (
                <button key={item.id} type="button" onClick={() => openResource(item.id)} className="block w-full rounded-xl bg-slate-50 p-3 text-left transition hover:bg-blue-50">
                  <span className="block text-sm font-medium text-slate-900">{item.title}</span>
                  <span className="mt-1 block text-xs text-slate-500">{item.category} · {item.lastOpenedAt}</span>
                </button>
              ))}
            </div>
          </Card>
        </div>
      </div>
      {previewFile && <FilePreviewModal file={previewFile} onClose={() => setPreviewFile(null)} />}
    </>
  )
}

function ResourceAttachments({
  item,
  updateResource,
  openResource,
  setPreviewFile,
}: {
  item: ResourceItem
  updateResource: ReturnType<typeof useStudyStore.getState>['updateResource']
  openResource: ReturnType<typeof useStudyStore.getState>['openResource']
  setPreviewFile: (file: FileAttachment) => void
}) {
  return (
    <div className="mt-3">
      <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50">
        <Paperclip size={15} />
        添加文件
        <input type="file" multiple className="hidden" onChange={async (event) => {
          if (!event.target.files) return
          const nextFiles = await filesToAttachments(event.target.files)
          updateResource(item.id, { attachments: [...item.attachments, ...nextFiles] })
          event.target.value = ''
        }} />
      </label>
      <AttachmentList
        attachments={item.attachments}
        onOpen={(file) => {
          openResource(item.id)
          setPreviewFile(file)
        }}
        onRemove={(id) => updateResource(item.id, { attachments: item.attachments.filter((file) => file.id !== id) })}
      />
    </div>
  )
}
