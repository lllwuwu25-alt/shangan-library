import { Download, FileStack, FileText, Paperclip, Plus, Search, Trash2, Upload, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { AttachmentList, UploadHint } from '../components/AttachmentList'
import { resourceCategories } from '../constants'
import { dataUrlToArrayBuffer, fileNameWithoutExtension, filesToAttachments, formatFileSize, isDocxFile, isLegacyWordFile } from '../lib/files'
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
                <span>上传 Word / PDF / 图片等文件</span>
                <UploadHint>支持多选，点击文件名可直接预览 PDF / 图片 / 文本等</UploadHint>
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
      {previewFile && <ResourcePreviewModal file={previewFile} onClose={() => setPreviewFile(null)} />}
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

function ResourcePreviewModal({ file, onClose }: { file: FileAttachment; onClose: () => void }) {
  const [docxHtml, setDocxHtml] = useState('')
  const [docxError, setDocxError] = useState('')

  useEffect(() => {
    let cancelled = false

    const renderDocx = async () => {
      if (!isDocxFile(file)) {
        setDocxHtml('')
        setDocxError('')
        return
      }

      setDocxHtml('')
      setDocxError('')
      try {
        const mammoth = await import('mammoth/mammoth.browser')
        const arrayBuffer = await dataUrlToArrayBuffer(file.dataUrl)
        const result = await mammoth.convertToHtml({ arrayBuffer })
        if (!cancelled) setDocxHtml(result.value)
      } catch {
        if (!cancelled) setDocxError('Word 文件解析失败，请下载后用本机 Word / WPS 打开。')
      }
    }

    void renderDocx()
    return () => {
      cancelled = true
    }
  }, [file])

  const body = (() => {
    if (file.type.startsWith('image/')) {
      return <img src={file.dataUrl} alt={file.name} className="max-h-full max-w-full object-contain" />
    }

    if (file.type === 'application/pdf') {
      return <iframe src={file.dataUrl} title={file.name} className="h-full w-full rounded-xl bg-white" />
    }

    if (file.type.startsWith('text/')) {
      return <iframe src={file.dataUrl} title={file.name} className="h-full w-full rounded-xl bg-white" />
    }

    if (file.type.startsWith('video/')) {
      return <video src={file.dataUrl} controls className="max-h-full max-w-full rounded-xl bg-black" />
    }

    if (file.type.startsWith('audio/')) {
      return (
        <div className="grid h-full place-items-center">
          <audio src={file.dataUrl} controls className="w-full max-w-xl" />
        </div>
      )
    }

    if (isDocxFile(file)) {
      if (docxError) return <UnsupportedPreview file={file} message={docxError} />
      if (!docxHtml) return <div className="grid h-full place-items-center text-sm text-slate-500">正在解析 Word 文档...</div>
      return <article className="preview-docx mx-auto max-w-3xl rounded-xl bg-white p-8 text-slate-900 shadow-sm" dangerouslySetInnerHTML={{ __html: docxHtml }} />
    }

    if (isLegacyWordFile(file)) {
      return <UnsupportedPreview file={file} message=".doc 老格式暂不支持浏览器内预览，请下载后用 Word / WPS 打开。" />
    }

    return <UnsupportedPreview file={file} message="当前文件类型暂不支持内置预览，请下载后用本机应用打开。" />
  })()

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm">
      <div className="flex h-[88vh] w-full max-w-6xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl ring-1 ring-slate-200">
        <div className="flex min-h-16 items-center justify-between gap-3 border-b border-slate-200 px-5">
          <div className="min-w-0">
            <h2 className="truncate text-base font-semibold text-slate-950">{file.name}</h2>
            <p className="mt-0.5 text-xs text-slate-500">{file.type || '未知类型'} · {formatFileSize(file.size)}</p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <a href={file.dataUrl} download={file.name} className="inline-flex h-9 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50">
              <Download size={15} />
              下载
            </a>
            <button type="button" onClick={onClose} className="flex size-9 items-center justify-center rounded-xl text-slate-500 transition hover:bg-slate-100 hover:text-slate-900" aria-label="关闭预览">
              <X size={18} />
            </button>
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-auto bg-slate-100 p-4">
          <div className="flex h-full min-h-[520px] items-center justify-center">
            {body}
          </div>
        </div>
      </div>
    </div>
  )
}

function UnsupportedPreview({ file, message }: { file: FileAttachment; message: string }) {
  return (
    <div className="max-w-md rounded-2xl bg-white p-6 text-center shadow-sm ring-1 ring-slate-200">
      <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
        <FileText size={22} />
      </div>
      <h3 className="mt-4 text-base font-semibold text-slate-950">{file.name}</h3>
      <p className="mt-2 text-sm leading-6 text-slate-500">{message}</p>
      <a href={file.dataUrl} download={file.name} className="mt-4 inline-flex h-9 items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-medium text-white transition hover:bg-blue-700">
        <Download size={15} />
        下载文件
      </a>
    </div>
  )
}
