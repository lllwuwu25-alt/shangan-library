import { useDraggable, useDroppable } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import { ArrowLeft, ChevronRight, ExternalLink, FilePlus2, Grid2X2, Heart, LayoutList, MoreHorizontal, Plus, Search, Upload } from 'lucide-react'
import { useMemo, useState } from 'react'
import { FilePicker } from '../../../components/FilePicker'
import type { FileAttachment } from '../../../types'
import type { TreeIndex } from '../utils/tree'
import { getBreadcrumb, getChildren } from '../utils/tree'
import type { KnowledgeNode, KnowledgeViewMode, KnowledgeVirtualView, ResourceFile } from '../types/knowledge'
import { NodeIcon } from './NodeIcon'
import { nodeTypeLabels, statusLabels } from './nodePresentation'

type Props = {
  index: TreeIndex
  nodes: KnowledgeNode[]
  files: ResourceFile[]
  selectedNode: KnowledgeNode
  virtualView: KnowledgeVirtualView
  viewMode: KnowledgeViewMode
  nodeTags: Map<string, string[]>
  relatedNodes: KnowledgeNode[]
  onSelect: (id: string) => void
  onCreate: (parentId: string) => void
  onUpload: (parentId: string, files?: FileAttachment[]) => void
  onViewMode: (mode: KnowledgeViewMode) => void
  onFavorite: (node: KnowledgeNode) => void
  onRename: (node: KnowledgeNode) => void
  onMove: (id: string) => void
  onDelete: (id: string) => void
  onPreview: (file: ResourceFile) => void
  onUpdateNode: (node: KnowledgeNode) => void
  onSetTags: (node: KnowledgeNode) => void
  onAddRelation: (node: KnowledgeNode) => void
}

const virtualLabels: Partial<Record<KnowledgeVirtualView, string>> = {
  recent: '最近访问', favorite: '我的收藏', unlearned: '未学习', learning: '学习中', review: '待复习', completed: '已完成', mastered: '已掌握',
}

const containerTypes = new Set(['root', 'folder', 'subject', 'chapter', 'topic', 'collection'])

export function NodeWorkspace(props: Props) {
  const { selectedNode, virtualView } = props
  const isVirtual = virtualView !== 'tree'
  const isContainer = containerTypes.has(selectedNode.type)
  const allActive = useMemo(() => props.nodes.filter((node) => !node.archived && node.type !== 'root'), [props.nodes])
  const content = useMemo(() => {
    if (!isVirtual) return isContainer ? getChildren(props.index, selectedNode.id).filter((node) => !node.archived) : []
    if (virtualView === 'recent') return allActive.filter((node) => node.lastOpenedAt).sort((a, b) => (b.lastOpenedAt ?? 0) - (a.lastOpenedAt ?? 0)).slice(0, 50)
    if (virtualView === 'favorite') return allActive.filter((node) => node.favorite)
    return allActive.filter((node) => node.learningStatus === virtualView)
  }, [allActive, isContainer, isVirtual, props.index, selectedNode.id, virtualView])
  const breadcrumb = getBreadcrumb(props.index, selectedNode.id)
  const childFolders = content.filter((node) => containerTypes.has(node.type)).length
  const childFiles = content.length - childFolders

  return (
    <section className="flex min-h-0 min-w-0 flex-1 flex-col bg-slate-50">
      <div className="border-b border-slate-200 bg-white px-4 py-3 sm:px-5">
        <div className="flex min-w-0 items-center gap-1 overflow-x-auto pb-0.5 text-xs text-slate-500">
          {breadcrumb.map((node, index) => <span key={node.id} className="flex shrink-0 items-center gap-1"><button type="button" onClick={() => props.onSelect(node.id)} className="max-w-40 truncate rounded-md px-1 py-0.5 transition hover:bg-slate-100 hover:text-slate-900">{node.type === 'root' ? '我的资料' : node.title}</button>{index < breadcrumb.length - 1 && <ChevronRight size={12} />}</span>)}
        </div>
        <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => selectedNode.parentId && props.onSelect(selectedNode.parentId)} className="flex size-8 shrink-0 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 xl:hidden" aria-label="返回上一级"><ArrowLeft size={17} /></button>
              <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700"><NodeIcon type={isVirtual ? 'collection' : selectedNode.type} size={18} /></div>
              <div className="min-w-0">
                <h2 className="truncate text-lg font-semibold text-slate-950 sm:text-xl">{isVirtual ? virtualLabels[virtualView] : selectedNode.title}</h2>
                <p className="mt-0.5 text-xs text-slate-500">{isVirtual ? `${content.length} 项内容` : `${childFolders} 个子节点 · ${childFiles} 份资料`}</p>
              </div>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {!isVirtual && isContainer && <>
              <button type="button" onClick={() => props.onCreate(selectedNode.id)} className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-blue-600 px-3 text-sm font-medium text-white transition hover:bg-blue-700"><Plus size={15} />新建</button>
              <FilePicker className="inline-flex h-9 cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-60" onFiles={(files) => props.onUpload(selectedNode.id, files)}><Upload size={15} /><span className="hidden sm:inline">导入资料</span></FilePicker>
            </>}
            <div className="hidden rounded-lg border border-slate-200 bg-white p-0.5 sm:flex">
              <button type="button" onClick={() => props.onViewMode('grid')} className={`flex size-8 items-center justify-center rounded-md ${props.viewMode === 'grid' ? 'bg-slate-100 text-slate-950' : 'text-slate-400 hover:text-slate-700'}`} aria-label="网格视图"><Grid2X2 size={15} /></button>
              <button type="button" onClick={() => props.onViewMode('list')} className={`flex size-8 items-center justify-center rounded-md ${props.viewMode === 'list' ? 'bg-slate-100 text-slate-950' : 'text-slate-400 hover:text-slate-700'}`} aria-label="列表视图"><LayoutList size={16} /></button>
            </div>
          </div>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-3 sm:p-5">
        {!isVirtual && !isContainer ? <NodeDetails {...props} breadcrumb={breadcrumb} /> : content.length === 0 ? <WorkspaceEmpty isVirtual={isVirtual} isRoot={selectedNode.type === 'root'} onCreate={() => props.onCreate(selectedNode.id)} onUpload={(files) => props.onUpload(selectedNode.id, files)} /> : (
          <div className={props.viewMode === 'grid' ? 'grid gap-3 sm:grid-cols-2 2xl:grid-cols-3' : 'space-y-2'}>
            {content.map((node) => <NodeCard key={node.id} node={node} file={node.metadata?.fileId ? props.files.find((file) => file.id === node.metadata?.fileId) : undefined} tags={props.nodeTags.get(node.id) ?? []} mode={props.viewMode} onSelect={props.onSelect} onPreview={props.onPreview} onFavorite={props.onFavorite} onRename={props.onRename} onMove={props.onMove} onDelete={props.onDelete} />)}
          </div>
        )}
      </div>
    </section>
  )
}

function NodeCard({ node, file, tags, mode, onSelect, onPreview, onFavorite, onRename, onMove, onDelete }: { node: KnowledgeNode; file?: ResourceFile; tags: string[]; mode: KnowledgeViewMode; onSelect: (id: string) => void; onPreview: (file: ResourceFile) => void; onFavorite: (node: KnowledgeNode) => void; onRename: (node: KnowledgeNode) => void; onMove: (id: string) => void; onDelete: (id: string) => void }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const { attributes, listeners, setNodeRef: setDragRef, transform, isDragging } = useDraggable({ id: node.id })
  const { setNodeRef: setDropRef, isOver } = useDroppable({ id: node.id })
  const open = () => {
    onSelect(node.id)
    if (file) onPreview(file)
    else if (node.metadata?.url) window.open(String(node.metadata.url), '_blank', 'noopener,noreferrer')
  }
  return (
    <article ref={setDropRef} className={`group relative min-w-0 transition ${isOver && !isDragging ? 'scale-[1.01]' : ''}`}>
      <div ref={setDragRef} style={{ transform: CSS.Translate.toString(transform) }} className={`flex min-w-0 ${mode === 'grid' ? 'min-h-32 flex-col p-4' : 'min-h-14 items-center px-3 py-2'} rounded-xl border bg-white transition ${isDragging ? 'opacity-40 shadow-xl' : isOver ? 'border-blue-300 bg-blue-50 shadow-sm' : 'border-slate-200 hover:border-slate-300 hover:shadow-sm'}`}>
        <button type="button" {...listeners} {...attributes} onClick={open} onDoubleClick={() => onRename(node)} className={`flex min-w-0 flex-1 text-left ${mode === 'grid' ? 'flex-col' : 'items-center gap-3'}`}>
          <span className={`flex shrink-0 items-center justify-center rounded-xl ${mode === 'grid' ? 'size-10' : 'size-9'} ${containerTypes.has(node.type) ? 'bg-blue-50 text-blue-600' : 'bg-slate-100 text-slate-500'}`}><NodeIcon type={node.type} size={mode === 'grid' ? 19 : 16} /></span>
          <span className={`min-w-0 ${mode === 'grid' ? 'mt-3 block w-full' : 'flex-1'}`}>
            <span className="block truncate text-sm font-medium text-slate-900">{node.title}</span>
            <span className="mt-1 block truncate text-xs text-slate-500">{nodeTypeLabels[node.type]}{node.learningStatus ? ` · ${statusLabels[node.learningStatus]}` : ''}</span>
          </span>
          {mode === 'list' && tags.length > 0 && <span className="hidden max-w-40 truncate text-xs text-slate-400 lg:block">#{tags.join(' #')}</span>}
        </button>
        <button type="button" onClick={() => setMenuOpen((value) => !value)} className="absolute right-2 top-2 flex size-8 items-center justify-center rounded-lg text-slate-400 opacity-100 transition hover:bg-slate-100 hover:text-slate-700 sm:opacity-0 sm:group-hover:opacity-100 sm:focus:opacity-100" aria-label="更多操作"><MoreHorizontal size={16} /></button>
        {node.favorite && <Heart size={13} className={`${mode === 'grid' ? 'absolute bottom-3 right-3' : 'mr-2'} fill-red-400 text-red-400`} />}
        {menuOpen && <div className="absolute right-2 top-10 z-20 w-36 rounded-xl border border-slate-200 bg-white p-1.5 text-sm shadow-xl" onMouseLeave={() => setMenuOpen(false)}>
          <button type="button" onClick={() => { open(); setMenuOpen(false) }} className="flex w-full rounded-lg px-2.5 py-2 hover:bg-slate-50">打开</button>
          <button type="button" onClick={() => { onFavorite(node); setMenuOpen(false) }} className="flex w-full rounded-lg px-2.5 py-2 hover:bg-slate-50">{node.favorite ? '取消收藏' : '收藏'}</button>
          <button type="button" onClick={() => { onRename(node); setMenuOpen(false) }} className="flex w-full rounded-lg px-2.5 py-2 hover:bg-slate-50">重命名</button>
          <button type="button" onClick={() => { onMove(node.id); setMenuOpen(false) }} className="flex w-full rounded-lg px-2.5 py-2 hover:bg-slate-50">移动到...</button>
          <button type="button" onClick={() => { onDelete(node.id); setMenuOpen(false) }} className="flex w-full rounded-lg px-2.5 py-2 text-red-600 hover:bg-red-50">删除</button>
        </div>}
      </div>
    </article>
  )
}

function NodeDetails(props: Props & { breadcrumb: KnowledgeNode[] }) {
  const node = props.selectedNode
  const file = node.metadata?.fileId ? props.files.find((item) => item.id === node.metadata?.fileId) : undefined
  const tags = props.nodeTags.get(node.id) ?? []
  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div className="flex min-w-0 items-start gap-3">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700"><NodeIcon type={node.type} size={21} /></span>
            <div className="min-w-0"><h3 className="break-words text-lg font-semibold text-slate-950">{node.title}</h3><p className="mt-1 text-sm text-slate-500">{nodeTypeLabels[node.type]}</p></div>
          </div>
          <button type="button" onClick={() => props.onFavorite(node)} className={`flex size-9 shrink-0 items-center justify-center rounded-xl border transition ${node.favorite ? 'border-red-100 bg-red-50 text-red-500' : 'border-slate-200 text-slate-500 hover:bg-slate-50'}`} aria-label="收藏"><Heart size={17} className={node.favorite ? 'fill-current' : ''} /></button>
        </div>
        {node.description && <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-slate-600">{node.description}</p>}
        {node.metadata?.noteContent && <div className="mt-4 whitespace-pre-wrap rounded-xl bg-slate-50 p-4 text-sm leading-7 text-slate-700">{String(node.metadata.noteContent)}</div>}
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <Info label="位置" value={props.breadcrumb.map((item) => item.type === 'root' ? '我的资料' : item.title).join(' / ')} />
          <Info label="学习状态" value={node.learningStatus ? statusLabels[node.learningStatus] : '不适用'} />
          <Info label="标签" value={tags.length ? tags.map((tag) => `#${tag}`).join('  ') : '暂无标签'} />
          <Info label="创建时间" value={new Date(node.createdAt).toLocaleString('zh-CN')} />
        </div>
        <div className="mt-5 flex flex-wrap gap-2">
          {file && <button type="button" onClick={() => props.onPreview(file)} className="inline-flex h-9 items-center gap-2 rounded-lg bg-blue-600 px-4 text-sm font-medium text-white hover:bg-blue-700"><ExternalLink size={15} />打开资料</button>}
          {node.metadata?.url && <button type="button" onClick={() => window.open(String(node.metadata?.url), '_blank', 'noopener,noreferrer')} className="inline-flex h-9 items-center gap-2 rounded-lg bg-blue-600 px-4 text-sm font-medium text-white hover:bg-blue-700"><ExternalLink size={15} />打开链接</button>}
          <button type="button" onClick={() => props.onUpdateNode(node)} className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 hover:bg-slate-50">编辑信息</button>
          <button type="button" onClick={() => props.onSetTags(node)} className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 hover:bg-slate-50">管理标签</button>
          <button type="button" onClick={() => props.onAddRelation(node)} className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 hover:bg-slate-50">关联内容</button>
          <button type="button" onClick={() => props.onMove(node.id)} className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 hover:bg-slate-50">移动</button>
          <button type="button" onClick={() => props.onDelete(node.id)} className="h-9 rounded-lg border border-red-200 bg-red-50 px-3 text-sm font-medium text-red-600 hover:bg-red-100">删除</button>
        </div>
      </div>
      {props.relatedNodes.length > 0 && <div className="rounded-2xl border border-slate-200 bg-white p-5"><h3 className="text-sm font-semibold text-slate-900">相关内容</h3><div className="mt-3 grid gap-2 sm:grid-cols-2">{props.relatedNodes.map((related) => <button key={related.id} type="button" onClick={() => props.onSelect(related.id)} className="flex items-center gap-2 rounded-xl bg-slate-50 p-3 text-left text-sm hover:bg-blue-50"><NodeIcon type={related.type} className="text-slate-500" /><span className="truncate">{related.title}</span></button>)}</div></div>}
    </div>
  )
}

function Info({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl bg-slate-50 px-3 py-2.5"><p className="text-[11px] font-medium text-slate-400">{label}</p><p className="mt-1 break-words text-sm text-slate-700">{value}</p></div>
}

function WorkspaceEmpty({ isVirtual, isRoot, onCreate, onUpload }: { isVirtual: boolean; isRoot: boolean; onCreate: () => void; onUpload: (files: FileAttachment[]) => void }) {
  const title = isVirtual ? '这里暂时没有匹配内容' : isRoot ? '创建你的第一棵学习知识树' : '这个节点还没有内容'
  const description = isVirtual ? '继续学习、收藏或更新状态后，内容会自动出现在这里。' : isRoot ? '把资料从堆起来，变成真正有结构、能持续使用的学习系统。' : '可以继续创建下一级知识节点，或直接导入文件。'
  return <div className="grid min-h-[360px] place-items-center"><div className="max-w-md text-center"><span className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-600"><Search size={23} /></span><h3 className="mt-4 text-base font-semibold text-slate-950">{title}</h3><p className="mt-2 text-sm leading-6 text-slate-500">{description}</p>{!isVirtual && <div className="mt-5 flex justify-center gap-2"><button type="button" onClick={onCreate} className="inline-flex h-9 items-center gap-2 rounded-lg bg-blue-600 px-4 text-sm font-medium text-white"><Plus size={15} />创建节点</button><FilePicker className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700" onFiles={onUpload}><FilePlus2 size={15} />导入资料</FilePicker></div>}</div></div>
}
