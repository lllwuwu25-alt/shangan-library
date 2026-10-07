import { Check, ChevronRight, Search, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Modal } from '../../../components/Modal'
import { getBreadcrumb, getDirectoryRows, type TreeIndex } from '../utils/tree'
import { NodeIcon } from './NodeIcon'

export function DirectoryPicker({ index, selectedId, onSelect, onClose }: {
  index: TreeIndex
  selectedId: string
  onSelect: (id: string) => void
  onClose: () => void
}) {
  const [query, setQuery] = useState('')
  const [collapsed, setCollapsed] = useState<Set<string>>(() => new Set())
  const searching = Boolean(query.trim())
  const rows = useMemo(() => getDirectoryRows(index, query, collapsed), [index, query, collapsed])

  const toggle = (id: string) => setCollapsed((current) => {
    const next = new Set(current)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    return next
  })

  return <Modal title="资料目录" onClose={onClose}>
    <div className="relative mb-3">
      <Search size={17} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
      <input aria-label="搜索目录" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索目录" className="h-11 w-full rounded-lg border border-slate-200 bg-slate-50 pl-10 pr-11 text-base text-slate-900 outline-none focus:border-blue-300 focus:bg-white focus:ring-2 focus:ring-blue-100" />
      {query && <button type="button" aria-label="清空目录搜索" onClick={() => setQuery('')} className="absolute right-0 top-0 flex size-11 items-center justify-center rounded-lg text-slate-500 hover:text-slate-900"><X size={17} /></button>}
    </div>
    <ul role="list" aria-label="目录层级" className="m-0 grid list-none gap-1 p-0">
      {rows.map(({ node, depth, hasChildren }) => {
        const title = node.type === 'root' ? '我的资料' : node.title
        const path = getBreadcrumb(index, node.id).map((parent) => parent.type === 'root' ? '我的资料' : parent.title).join(' / ')
        const expanded = searching || !collapsed.has(node.id)
        const active = selectedId === node.id
        return <li key={node.id} data-directory-depth={depth} style={{ paddingLeft: Math.min(depth, 4) * 16 }}>
          <div className={`flex min-h-12 min-w-0 items-center rounded-lg ${active ? 'bg-blue-50 text-blue-700' : 'text-slate-700 hover:bg-slate-50'}`}>
            {hasChildren ? <button type="button" aria-label={`${expanded ? '收起' : '展开'}${path}`} aria-expanded={expanded} disabled={searching} onClick={() => toggle(node.id)} className="flex size-11 shrink-0 items-center justify-center rounded-lg text-slate-500 disabled:cursor-default">
              <ChevronRight size={17} className={`transition-transform duration-150 ${expanded ? 'rotate-90' : ''}`} />
            </button> : <span aria-hidden="true" className="w-11 shrink-0" />}
            <button type="button" aria-label={path} aria-current={active ? 'location' : undefined} onClick={() => onSelect(node.id)} className="flex min-h-12 min-w-0 flex-1 items-center gap-2 py-2 pr-3 text-left">
              <NodeIcon type={node.type} size={19} className="shrink-0 text-blue-600" />
              <span data-directory-title className={`min-w-0 flex-1 break-words text-sm leading-5 ${node.type === 'root' || depth === 1 ? 'font-semibold' : 'font-medium'}`}>{title}</span>
              {active && <Check size={16} className="shrink-0 text-blue-600" />}
            </button>
          </div>
        </li>
      })}
    </ul>
    {rows.length === 0 && <p role="status" className="py-6 text-center text-sm text-slate-500">没有匹配的目录</p>}
  </Modal>
}
