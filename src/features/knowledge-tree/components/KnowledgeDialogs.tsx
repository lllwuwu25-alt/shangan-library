import { Link2, Plus, Tag, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Button, GhostButton, Select, TextArea, TextInput } from '../../../components/ui'
import type { TreeIndex } from '../utils/tree'
import { getBreadcrumb, getDescendants } from '../utils/tree'
import type { KnowledgeNode, KnowledgeNodeType, LearningStatus, NodeRelationType } from '../types/knowledge'
import { nodeTypeLabels, statusLabels } from './nodePresentation'

const createTypes: KnowledgeNodeType[] = ['subject', 'chapter', 'topic', 'folder', 'note', 'link']
const statuses: LearningStatus[] = ['unlearned', 'learning', 'review', 'completed', 'mastered']

export function CreateNodeDialog({ parent, onClose, onCreate }: { parent: KnowledgeNode; onClose: () => void; onCreate: (input: { title: string; type: KnowledgeNodeType; description?: string; metadata?: KnowledgeNode['metadata'] }) => Promise<void> }) {
  const [type, setType] = useState<KnowledgeNodeType>('topic')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [url, setUrl] = useState('')
  const [saving, setSaving] = useState(false)
  return <Dialog title="新建内容" caption={`将创建在「${parent.title}」中`} onClose={onClose}>
    <form className="grid gap-3" onSubmit={async (event) => { event.preventDefault(); if (!title.trim()) return; setSaving(true); await onCreate({ title, type, description, metadata: type === 'link' ? { url } : type === 'note' ? { noteContent: description } : undefined }); setSaving(false); onClose() }}>
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">{createTypes.map((item) => <button key={item} type="button" onClick={() => setType(item)} className={`min-h-16 rounded-xl border px-2 py-2 text-xs font-medium transition ${type === item ? 'border-blue-300 bg-blue-50 text-blue-700 ring-2 ring-blue-100' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'}`}>{nodeTypeLabels[item]}</button>)}</div>
      <label className="grid gap-1.5 text-sm font-medium text-slate-700">名称<TextInput autoFocus value={title} onChange={(event) => setTitle(event.target.value)} placeholder={`例如：${type === 'subject' ? '考研数学' : type === 'chapter' ? '高等数学' : type === 'link' ? '课程主页' : '极限与连续'}`} /></label>
      {type === 'link' && <label className="grid gap-1.5 text-sm font-medium text-slate-700">链接地址<TextInput type="url" value={url} onChange={(event) => setUrl(event.target.value)} placeholder="https://" required /></label>}
      <label className="grid gap-1.5 text-sm font-medium text-slate-700">{type === 'note' ? '笔记内容' : '说明（可选）'}<TextArea value={description} onChange={(event) => setDescription(event.target.value)} placeholder="补充用途、范围或复习提醒" className="w-full" /></label>
      <div className="mt-2 flex justify-end gap-2"><GhostButton type="button" onClick={onClose}>取消</GhostButton><Button type="submit" disabled={!title.trim() || saving}><Plus size={15} />{saving ? '正在创建...' : '创建'}</Button></div>
    </form>
  </Dialog>
}

export function MoveNodeDialog({ node, nodes, index, onClose, onMove }: { node: KnowledgeNode; nodes: KnowledgeNode[]; index: TreeIndex; onClose: () => void; onMove: (parentId: string) => Promise<void> }) {
  const [query, setQuery] = useState('')
  const blocked = new Set([node.id, ...getDescendants(index, node.id).map((item) => item.id)])
  const options = nodes.filter((item) => !item.archived && !blocked.has(item.id) && ['root', 'folder', 'subject', 'chapter', 'topic', 'collection'].includes(item.type) && item.title.toLowerCase().includes(query.toLowerCase()))
  return <Dialog title="移动节点" caption={`为「${node.title}」选择新的位置`} onClose={onClose}>
    <TextInput autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索目标位置" />
    <div className="mt-3 max-h-80 space-y-1 overflow-y-auto rounded-xl border border-slate-200 p-1.5">{options.map((target) => <button key={target.id} type="button" onClick={async () => { await onMove(target.id); onClose() }} className="block w-full rounded-lg px-3 py-2 text-left hover:bg-slate-50"><span className="block truncate text-sm font-medium text-slate-800">{target.type === 'root' ? '我的资料' : target.title}</span><span className="mt-0.5 block truncate text-xs text-slate-400">{getBreadcrumb(index, target.id).map((item) => item.type === 'root' ? '我的资料' : item.title).join(' / ')}</span></button>)}{options.length === 0 && <p className="p-6 text-center text-sm text-slate-400">没有可移动到的位置</p>}</div>
  </Dialog>
}

export function EditNodeDialog({ node, onClose, onSave }: { node: KnowledgeNode; onClose: () => void; onSave: (patch: { title: string; description: string; learningStatus?: LearningStatus; metadata?: KnowledgeNode['metadata'] }) => Promise<void> }) {
  const [title, setTitle] = useState(node.title)
  const [description, setDescription] = useState(node.description ?? '')
  const [status, setStatus] = useState<LearningStatus | ''>(node.learningStatus ?? '')
  const [url, setUrl] = useState(String(node.metadata?.url ?? ''))
  const [note, setNote] = useState(String(node.metadata?.noteContent ?? ''))
  return <Dialog title="编辑信息" caption={nodeTypeLabels[node.type]} onClose={onClose}>
    <form className="grid gap-3" onSubmit={async (event) => { event.preventDefault(); await onSave({ title, description, learningStatus: status || undefined, metadata: { ...node.metadata, ...(node.type === 'link' ? { url } : {}), ...(node.type === 'note' ? { noteContent: note } : {}) } }); onClose() }}>
      <label className="grid gap-1.5 text-sm font-medium text-slate-700">名称<TextInput value={title} onChange={(event) => setTitle(event.target.value)} /></label>
      <label className="grid gap-1.5 text-sm font-medium text-slate-700">说明<TextArea value={description} onChange={(event) => setDescription(event.target.value)} className="w-full" /></label>
      {node.type === 'link' && <label className="grid gap-1.5 text-sm font-medium text-slate-700">链接<TextInput value={url} onChange={(event) => setUrl(event.target.value)} /></label>}
      {node.type === 'note' && <label className="grid gap-1.5 text-sm font-medium text-slate-700">笔记内容<TextArea value={note} onChange={(event) => setNote(event.target.value)} className="min-h-40 w-full" /></label>}
      {node.learningStatus && <label className="grid gap-1.5 text-sm font-medium text-slate-700">学习状态<Select value={status} onChange={(event) => setStatus(event.target.value as LearningStatus)}>{statuses.map((item) => <option key={item} value={item}>{statusLabels[item]}</option>)}</Select></label>}
      <div className="mt-2 flex justify-end gap-2"><GhostButton type="button" onClick={onClose}>取消</GhostButton><Button type="submit" disabled={!title.trim()}>保存修改</Button></div>
    </form>
  </Dialog>
}

export function TagsDialog({ node, initialTags, allTags, onClose, onSave }: { node: KnowledgeNode; initialTags: string[]; allTags: string[]; onClose: () => void; onSave: (tags: string[]) => Promise<void> }) {
  const [value, setValue] = useState(initialTags.join('、'))
  const parsed = value.split(/[、,，#\n]/).map((item) => item.trim()).filter(Boolean)
  return <Dialog title="管理标签" caption={`为「${node.title}」添加独立标签`} onClose={onClose}>
    <div className="rounded-xl bg-blue-50 p-3 text-xs leading-5 text-blue-700">标签不会改变资料所在位置，移动节点后仍会保留。</div>
    <label className="mt-3 grid gap-1.5 text-sm font-medium text-slate-700">标签<TextArea autoFocus value={value} onChange={(event) => setValue(event.target.value)} placeholder="重点、公式、二刷（用逗号分隔）" className="w-full" /></label>
    {allTags.length > 0 && <div className="mt-3 flex flex-wrap gap-2">{allTags.map((tag) => <button key={tag} type="button" onClick={() => !parsed.includes(tag) && setValue((current) => current ? `${current}、${tag}` : tag)} className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-600 hover:bg-blue-50 hover:text-blue-700"><Tag size={11} />{tag}</button>)}</div>}
    <div className="mt-5 flex justify-end gap-2"><GhostButton onClick={onClose}>取消</GhostButton><Button onClick={async () => { await onSave([...new Set(parsed)]); onClose() }}>保存标签</Button></div>
  </Dialog>
}

export function RelationDialog({ node, nodes, onClose, onSave }: { node: KnowledgeNode; nodes: KnowledgeNode[]; onClose: () => void; onSave: (targetId: string, type: NodeRelationType) => Promise<void> }) {
  const options = nodes.filter((item) => !item.archived && item.id !== node.id && item.type !== 'root')
  const [targetId, setTargetId] = useState(options[0]?.id ?? '')
  const [type, setType] = useState<NodeRelationType>('related')
  return <Dialog title="关联内容" caption="建立引用关系，不会复制或移动资料" onClose={onClose}>
    <div className="grid gap-3">
      <label className="grid gap-1.5 text-sm font-medium text-slate-700">目标内容<Select value={targetId} onChange={(event) => setTargetId(event.target.value)}>{options.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}</Select></label>
      <label className="grid gap-1.5 text-sm font-medium text-slate-700">关系类型<Select value={type} onChange={(event) => setType(event.target.value as NodeRelationType)}><option value="related">相关资料</option><option value="reference">引用</option><option value="derived">衍生内容</option><option value="mistake">关联错题</option><option value="note">关联笔记</option><option value="course">关联课程</option></Select></label>
      <div className="mt-2 flex justify-end gap-2"><GhostButton onClick={onClose}>取消</GhostButton><Button disabled={!targetId} onClick={async () => { await onSave(targetId, type); onClose() }}><Link2 size={15} />建立关联</Button></div>
    </div>
  </Dialog>
}

function Dialog({ title, caption, children, onClose }: { title: string; caption?: string; children: React.ReactNode; onClose: () => void }) {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => event.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onClose])
  return <div className="fixed inset-0 z-50 grid place-items-end bg-slate-950/35 p-0 backdrop-blur-[2px] sm:place-items-center sm:p-4" role="dialog" aria-modal="true"><div className="max-h-[92dvh] w-full overflow-y-auto rounded-t-2xl bg-white p-4 shadow-2xl sm:max-w-xl sm:rounded-2xl sm:p-5"><div className="mb-4 flex items-start justify-between gap-3"><div className="min-w-0"><h2 className="text-lg font-semibold text-slate-950">{title}</h2>{caption && <p className="mt-1 truncate text-xs text-slate-500">{caption}</p>}</div><button type="button" onClick={onClose} className="flex size-9 shrink-0 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100" aria-label="关闭"><X size={17} /></button></div>{children}</div></div>
}
