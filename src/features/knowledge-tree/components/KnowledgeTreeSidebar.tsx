import { useDraggable, useDroppable } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import { ChevronRight, Clock3, FolderPlus, Heart, MoreHorizontal, Plus, RotateCcw, Search, Trash2, Upload } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import type { TreeIndex } from '../utils/tree'
import { getChildren } from '../utils/tree'
import type { KnowledgeNode, KnowledgeVirtualView } from '../types/knowledge'
import { KNOWLEDGE_ROOT_ID } from '../types/knowledge'
import { NodeIcon } from './NodeIcon'

type Props = {
  index: TreeIndex
  selectedId: string | null
  expandedIds: string[]
  virtualView: KnowledgeVirtualView
  query: string
  onQuery: (query: string) => void
  onSelect: (id: string) => void
  onToggle: (id: string) => void
  onVirtualView: (view: KnowledgeVirtualView) => void
  onCreate: (parentId: string) => void
  onUpload: (parentId: string) => void
  onRename: (id: string, title: string) => void
  onMove: (id: string) => void
  onFavorite: (node: KnowledgeNode) => void
  onDelete: (id: string) => void
  searchRef: React.RefObject<HTMLInputElement | null>
}

const quickViews: Array<{ id: KnowledgeVirtualView; label: string; icon: typeof Clock3 }> = [
  { id: 'recent', label: '最近访问', icon: Clock3 },
  { id: 'favorite', label: '我的收藏', icon: Heart },
  { id: 'unlearned', label: '未学习', icon: RotateCcw },
  { id: 'learning', label: '学习中', icon: RotateCcw },
  { id: 'review', label: '待复习', icon: RotateCcw },
  { id: 'completed', label: '已完成', icon: RotateCcw },
  { id: 'mastered', label: '已掌握', icon: RotateCcw },
]

export function KnowledgeTreeSidebar(props: Props) {
  const expanded = useMemo(() => new Set(props.expandedIds), [props.expandedIds])
  const children = getChildren(props.index, KNOWLEDGE_ROOT_ID).filter((node) => !node.archived)
  const visible = useMemo(() => flattenVisible(props.index, KNOWLEDGE_ROOT_ID, expanded), [props.index, expanded])

  const onKeyDown = (event: React.KeyboardEvent) => {
    const selectedIndex = visible.findIndex((node) => node.id === props.selectedId)
    const selected = visible[selectedIndex]
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'n') {
      event.preventDefault()
      props.onCreate(props.selectedId ?? KNOWLEDGE_ROOT_ID)
      return
    }
    if (!selected) return
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      const next = event.key === 'ArrowDown' ? visible[selectedIndex + 1] : visible[selectedIndex - 1]
      if (next) props.onSelect(next.id)
    } else if (event.key === 'ArrowRight') {
      event.preventDefault()
      if (!expanded.has(selected.id) && getChildren(props.index, selected.id).length) props.onToggle(selected.id)
    } else if (event.key === 'ArrowLeft') {
      event.preventDefault()
      if (expanded.has(selected.id)) props.onToggle(selected.id)
      else if (selected.parentId) props.onSelect(selected.parentId)
    } else if (event.key === 'Enter') {
      props.onSelect(selected.id)
    } else if (event.key === 'F2') {
      event.preventDefault()
      document.querySelector<HTMLButtonElement>(`[data-rename-node="${selected.id}"]`)?.click()
    } else if (event.key === 'Delete') {
      event.preventDefault()
      props.onDelete(selected.id)
    }
  }

  return (
    <aside className="hidden min-h-0 w-[292px] shrink-0 flex-col border-r border-slate-200 bg-white xl:flex" aria-label="知识树">
      <div className="border-b border-slate-200 p-3">
        <div className="relative">
          <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input ref={props.searchRef} value={props.query} onChange={(event) => props.onQuery(event.target.value)} placeholder="搜索资料、笔记、知识点..." className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-12 text-sm text-slate-900 outline-none transition focus:border-blue-300 focus:bg-white focus:ring-2 focus:ring-blue-100" />
          <kbd className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 rounded border border-slate-200 bg-white px-1.5 py-0.5 text-[10px] text-slate-400">⌘K</kbd>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <button type="button" onClick={() => props.onCreate(props.selectedId ?? KNOWLEDGE_ROOT_ID)} className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-blue-600 px-3 text-sm font-medium text-white transition hover:bg-blue-700"><Plus size={15} />新建</button>
          <button type="button" onClick={() => props.onUpload(props.selectedId ?? KNOWLEDGE_ROOT_ID)} className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"><Upload size={15} />导入</button>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-2 py-3" role="tree" tabIndex={0} onKeyDown={onKeyDown}>
        <button type="button" onClick={() => { props.onVirtualView('tree'); props.onSelect(KNOWLEDGE_ROOT_ID) }} className={`mb-1 flex h-9 w-full items-center gap-2 rounded-lg px-2.5 text-left text-sm font-medium transition ${props.virtualView === 'tree' && props.selectedId === KNOWLEDGE_ROOT_ID ? 'bg-blue-50 text-blue-800' : 'text-slate-700 hover:bg-slate-50'}`}>
          <NodeIcon type="root" className="text-blue-600" />我的资料
        </button>
        <div className="space-y-0.5">
          {children.map((node) => <TreeNode key={node.id} node={node} depth={0} {...props} expanded={expanded} />)}
        </div>
        {children.length === 0 && <p className="px-3 py-6 text-center text-xs leading-5 text-slate-400">还没有节点，从新建科目或导入资料开始。</p>}
      </div>

      <div className="border-t border-slate-200 p-2">
        <p className="px-2 pb-1 pt-1 text-[11px] font-medium text-slate-400">快捷视图</p>
        <div className="grid grid-cols-2 gap-1">
          {quickViews.map((view) => {
            const Icon = view.icon
            return <button key={view.id} type="button" onClick={() => props.onVirtualView(view.id)} className={`flex h-8 items-center gap-2 rounded-lg px-2 text-xs transition ${props.virtualView === view.id ? 'bg-blue-50 font-medium text-blue-700' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'}`}><Icon size={13} />{view.label}</button>
          })}
        </div>
      </div>
    </aside>
  )
}

function TreeNode({ node, depth, index, selectedId, expanded, onSelect, onToggle, onCreate, onUpload, onRename, onMove, onFavorite, onDelete }: Props & { node: KnowledgeNode; depth: number; expanded: Set<string> }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [renaming, setRenaming] = useState(false)
  const [draft, setDraft] = useState(node.title)
  const inputRef = useRef<HTMLInputElement>(null)
  const children = getChildren(index, node.id).filter((item) => !item.archived)
  const isExpanded = expanded.has(node.id)
  const { attributes, listeners, setNodeRef: setDragRef, transform, isDragging } = useDraggable({ id: node.id })
  const { setNodeRef: setDropRef, isOver } = useDroppable({ id: node.id })

  useEffect(() => {
    if (renaming) inputRef.current?.select()
  }, [renaming])

  const saveRename = () => {
    if (draft.trim() && draft.trim() !== node.title) onRename(node.id, draft)
    else setDraft(node.title)
    setRenaming(false)
  }

  return (
    <div role="treeitem" aria-expanded={children.length ? isExpanded : undefined} aria-selected={selectedId === node.id}>
      <div ref={setDropRef} style={{ paddingLeft: depth * 16 }}>
        <div ref={setDragRef} style={{ transform: CSS.Translate.toString(transform) }} className={`group relative flex min-h-9 items-center rounded-lg transition ${isDragging ? 'z-20 opacity-45' : ''} ${isOver && !isDragging ? 'scale-[1.01] bg-blue-50 ring-1 ring-blue-200' : selectedId === node.id ? 'bg-slate-100 text-slate-950' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-950'}`} onContextMenu={(event) => { event.preventDefault(); setMenuOpen(true) }}>
          <button type="button" onClick={() => children.length && onToggle(node.id)} className="flex size-7 shrink-0 items-center justify-center text-slate-400" aria-label={isExpanded ? '折叠' : '展开'}>
            {children.length > 0 && <ChevronRight size={14} className={`transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`} />}
          </button>
          <button type="button" {...listeners} {...attributes} onClick={() => onSelect(node.id)} onDoubleClick={() => setRenaming(true)} className="flex min-w-0 flex-1 items-center gap-2 py-1.5 text-left text-sm" title={node.title}>
            <NodeIcon type={node.type} size={15} className={node.type === 'folder' || node.type === 'subject' ? 'text-blue-500' : 'text-slate-400'} />
            {renaming ? <input ref={inputRef} value={draft} onChange={(event) => setDraft(event.target.value)} onBlur={saveRename} onKeyDown={(event) => { if (event.key === 'Enter') saveRename(); if (event.key === 'Escape') { setDraft(node.title); setRenaming(false) } }} onClick={(event) => event.stopPropagation()} className="h-7 min-w-0 flex-1 rounded-md border border-blue-300 bg-white px-2 outline-none ring-2 ring-blue-100" /> : <span className="truncate">{node.title}</span>}
          </button>
          <button data-rename-node={node.id} type="button" onClick={() => setRenaming(true)} className="sr-only">重命名</button>
          <button type="button" onClick={() => setMenuOpen((value) => !value)} className="mr-1 flex size-7 shrink-0 items-center justify-center rounded-md text-slate-400 opacity-0 transition hover:bg-white hover:text-slate-700 group-hover:opacity-100 focus:opacity-100" aria-label={`打开 ${node.title} 菜单`}><MoreHorizontal size={15} /></button>
          {menuOpen && <TreeMenu node={node} onClose={() => setMenuOpen(false)} onCreate={onCreate} onUpload={onUpload} onRename={() => setRenaming(true)} onMove={onMove} onFavorite={onFavorite} onDelete={onDelete} />}
        </div>
      </div>
      {children.length > 0 && isExpanded && <div role="group" className="animate-[fadeIn_.18s_ease-out]">{children.map((child) => <TreeNode key={child.id} node={child} depth={depth + 1} index={index} selectedId={selectedId} expanded={expanded} onSelect={onSelect} onToggle={onToggle} onCreate={onCreate} onUpload={onUpload} onRename={onRename} onMove={onMove} onFavorite={onFavorite} onDelete={onDelete} virtualView="tree" query="" onQuery={() => undefined} onVirtualView={() => undefined} searchRef={{ current: null }} expandedIds={[]} />)}</div>}
    </div>
  )
}

function TreeMenu({ node, onClose, onCreate, onUpload, onRename, onMove, onFavorite, onDelete }: { node: KnowledgeNode; onClose: () => void; onCreate: (id: string) => void; onUpload: (id: string) => void; onRename: () => void; onMove: (id: string) => void; onFavorite: (node: KnowledgeNode) => void; onDelete: (id: string) => void }) {
  const action = (callback: () => void) => () => { callback(); onClose() }
  return (
    <div className="absolute right-1 top-8 z-30 w-40 rounded-xl border border-slate-200 bg-white p-1.5 text-sm shadow-xl" onMouseLeave={onClose}>
      <button type="button" onClick={action(() => onCreate(node.id))} className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 hover:bg-slate-50"><FolderPlus size={14} />新建子节点</button>
      <button type="button" onClick={action(() => onUpload(node.id))} className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 hover:bg-slate-50"><Upload size={14} />上传资料</button>
      <button type="button" onClick={action(onRename)} className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 hover:bg-slate-50">重命名</button>
      <button type="button" onClick={action(() => onMove(node.id))} className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 hover:bg-slate-50">移动到...</button>
      <button type="button" onClick={action(() => onFavorite(node))} className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 hover:bg-slate-50"><Heart size={14} className={node.favorite ? 'fill-red-400 text-red-400' : ''} />{node.favorite ? '取消收藏' : '收藏'}</button>
      <button type="button" onClick={action(() => onDelete(node.id))} className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-red-600 hover:bg-red-50"><Trash2 size={14} />删除</button>
    </div>
  )
}

function flattenVisible(index: TreeIndex, parentId: string, expanded: Set<string>): KnowledgeNode[] {
  const children = getChildren(index, parentId).filter((node) => !node.archived)
  return children.flatMap((node) => [node, ...(expanded.has(node.id) ? flattenVisible(index, node.id, expanded) : [])])
}
