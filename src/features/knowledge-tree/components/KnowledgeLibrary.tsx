import { DndContext, PointerSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core'
import { AlertCircle, Database, FolderInput, Plus, Search, Upload, X } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { FilePicker } from '../../../components/FilePicker'
import { FilePreviewModal } from '../../../components/FilePreviewModal'
import { filesToAttachments } from '../../../lib/files'
import { useStudyStore } from '../../../store/useStudyStore'
import type { FileAttachment } from '../../../types'
import { isKnowledgeDemoMode, useKnowledgeStore } from '../store/knowledgeStore'
import { KNOWLEDGE_ROOT_ID, type KnowledgeNode, type KnowledgeVirtualView, type ResourceFile } from '../types/knowledge'
import { buildTreeIndex, getChildren, getDescendants } from '../utils/tree'
import { searchKnowledge } from '../utils/search'
import { CreateNodeDialog, EditNodeDialog, MoveNodeDialog, RelationDialog, TagsDialog } from './KnowledgeDialogs'
import { KnowledgeTreeSidebar } from './KnowledgeTreeSidebar'
import { NodeIcon } from './NodeIcon'
import { NodeWorkspace } from './NodeWorkspace'

type DialogState =
  | { type: 'create'; parentId: string }
  | { type: 'upload'; parentId: string }
  | { type: 'move'; nodeId: string }
  | { type: 'edit'; nodeId: string }
  | { type: 'tags'; nodeId: string }
  | { type: 'relation'; nodeId: string }
  | null

const containerTypes = new Set(['root', 'folder', 'subject', 'chapter', 'topic', 'collection'])

export function KnowledgeLibrary() {
  const legacyResources = useStudyStore((state) => state.resources)
  const store = useKnowledgeStore()
  const [dialog, setDialog] = useState<DialogState>(null)
  const [previewFile, setPreviewFile] = useState<FileAttachment | null>(null)
  const [isFileDragging, setIsFileDragging] = useState(false)
  const searchRef = useRef<HTMLInputElement>(null)
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }))
  const initializeKnowledge = store.initialize
  const { nodes, files, tags, nodeTags: nodeTagRelations, relations, selectedNodeId, expandedNodeIds, viewMode, virtualView, schemaVersion, updatedAt, searchQuery } = store

  useEffect(() => { void initializeKnowledge(legacyResources) }, [initializeKnowledge, legacyResources])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        searchRef.current?.focus()
      }
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'n') {
        const target = document.activeElement
        if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) return
        event.preventDefault()
        setDialog({ type: 'create', parentId: selectedContainerId(nodes, selectedNodeId) })
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [nodes, selectedNodeId])

  const activeNodes = useMemo(() => nodes.filter((node) => !node.archived), [nodes])
  const index = useMemo(() => buildTreeIndex(activeNodes), [activeNodes])
  const selectedNode = index.nodeMap.get(selectedNodeId ?? '') ?? index.nodeMap.get(KNOWLEDGE_ROOT_ID)
  const searchResults = useMemo(() => searchKnowledge({ schemaVersion, nodes: activeNodes, files, tags, nodeTags: nodeTagRelations, relations, selectedNodeId, expandedNodeIds, viewMode, virtualView, updatedAt }, searchQuery), [activeNodes, expandedNodeIds, files, nodeTagRelations, relations, schemaVersion, searchQuery, selectedNodeId, tags, updatedAt, viewMode, virtualView])
  const nodeTags = useMemo(() => {
    const result = new Map<string, string[]>()
    const tagById = new Map(tags.map((tag) => [tag.id, tag.name]))
    nodeTagRelations.forEach((relation) => {
      const tag = tagById.get(relation.tagId)
      if (tag) result.set(relation.nodeId, [...(result.get(relation.nodeId) ?? []), tag])
    })
    return result
  }, [nodeTagRelations, tags])
  const relatedNodes = useMemo(() => {
    if (!selectedNode) return []
    const ids = new Set(relations.flatMap((relation) => relation.sourceNodeId === selectedNode.id ? [relation.targetNodeId] : relation.targetNodeId === selectedNode.id ? [relation.sourceNodeId] : []))
    return activeNodes.filter((node) => ids.has(node.id))
  }, [activeNodes, relations, selectedNode])

  if (store.loading || (!store.initialized && !store.error)) return <LoadingState />
  if (store.error && !store.initialized) return <MigrationError message={store.error} />
  if (!selectedNode) return <MigrationError message="知识库根节点不存在，请从设置中的备份恢复数据。" />

  const targetParent = selectedContainerId(activeNodes, selectedNode.id)
  const onFiles = async (parentId: string, files: FileAttachment[]) => {
    if (!files.length) return
    await store.addAttachments(selectedContainerId(activeNodes, parentId), files)
    setDialog(null)
  }
  const handleDrop = async (event: React.DragEvent) => {
    if (!event.dataTransfer.files.length) return
    event.preventDefault()
    setIsFileDragging(false)
    await onFiles(targetParent, await filesToAttachments(event.dataTransfer.files))
  }
  const handleNodeDrop = async ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return
    const source = index.nodeMap.get(String(active.id))
    const target = index.nodeMap.get(String(over.id))
    if (!source || !target || source.type === 'root') return
    try {
      const translated = active.rect.current.translated
      const activeCenterY = translated ? translated.top + translated.height / 2 : over.rect.top
      const relativeY = (activeCenterY - over.rect.top) / Math.max(over.rect.height, 1)
      const droppedInCenter = relativeY > 0.25 && relativeY < 0.75
      if (containerTypes.has(target.type) && droppedInCenter) {
        await store.moveNode(source.id, target.id)
        if (!store.expandedNodeIds.includes(target.id)) await store.toggleNode(target.id)
      } else if (target.parentId) {
        const siblings = getChildren(index, target.parentId).filter((node) => node.id !== source.id)
        const targetIndex = siblings.findIndex((node) => node.id === target.id)
        const beforeId = relativeY < 0.5 ? target.id : siblings[targetIndex + 1]?.id ?? null
        await store.reorderNode(source.id, target.parentId, beforeId)
      }
    } catch (error) {
      window.alert(error instanceof Error ? error.message : '无法移动节点')
    }
  }
  const deleteNode = async (id: string) => {
    const node = index.nodeMap.get(id)
    if (!node || node.type === 'root') return
    const count = getDescendants(index, id).length
    if (window.confirm(count ? `删除「${node.title}」及其下方 ${count} 项内容？资料将从知识树中移除。` : `删除「${node.title}」？`)) await store.archiveNode(id)
  }
  const select = (id: string) => { void store.revealNode(id) }

  return (
    <div className="-mx-3 -mt-4 sm:-mx-5 md:-mx-6 lg:-mx-8 lg:-my-8">
      <div className="relative flex h-[calc(100dvh-7.4rem)] min-h-[620px] overflow-hidden border-y border-slate-200 bg-white lg:h-screen lg:border-y-0" onDragEnter={(event) => { if (event.dataTransfer.types.includes('Files')) setIsFileDragging(true) }} onDragOver={(event) => { if (event.dataTransfer.types.includes('Files')) event.preventDefault() }}>
        <DndContext sensors={sensors} onDragEnd={(event) => void handleNodeDrop(event)}>
          <KnowledgeTreeSidebar index={index} selectedId={selectedNode.id} expandedIds={store.expandedNodeIds} virtualView={store.virtualView} query={store.searchQuery} onQuery={store.setSearchQuery} onSelect={select} onToggle={(id) => void store.toggleNode(id)} onVirtualView={(view) => void store.setVirtualView(view)} onCreate={(parentId) => setDialog({ type: 'create', parentId: selectedContainerId(activeNodes, parentId) })} onUpload={(parentId) => setDialog({ type: 'upload', parentId: selectedContainerId(activeNodes, parentId) })} onRename={(id, title) => void store.updateNode(id, { title })} onMove={(nodeId) => setDialog({ type: 'move', nodeId })} onFavorite={(node) => void store.updateNode(node.id, { favorite: !node.favorite })} onDelete={(id) => void deleteNode(id)} searchRef={searchRef} />
          <div className="flex min-w-0 flex-1 flex-col">
            <MobileToolbar query={store.searchQuery} onQuery={store.setSearchQuery} searchRef={searchRef} virtualView={store.virtualView} onVirtualView={(view) => void store.setVirtualView(view)} onCreate={() => setDialog({ type: 'create', parentId: targetParent })} onUpload={() => setDialog({ type: 'upload', parentId: targetParent })} />
            <NodeWorkspace index={index} nodes={activeNodes} files={store.files} selectedNode={selectedNode} virtualView={store.virtualView} viewMode={store.viewMode} nodeTags={nodeTags} relatedNodes={relatedNodes} onSelect={select} onCreate={(parentId) => setDialog({ type: 'create', parentId })} onUpload={(parentId, files) => files ? void onFiles(parentId, files) : setDialog({ type: 'upload', parentId })} onViewMode={(mode) => void store.setViewMode(mode)} onFavorite={(node) => void store.updateNode(node.id, { favorite: !node.favorite })} onRename={(node) => setDialog({ type: 'edit', nodeId: node.id })} onMove={(nodeId) => setDialog({ type: 'move', nodeId })} onDelete={(id) => void deleteNode(id)} onPreview={(file) => setPreviewFile(toAttachment(file))} onUpdateNode={(node) => setDialog({ type: 'edit', nodeId: node.id })} onSetTags={(node) => setDialog({ type: 'tags', nodeId: node.id })} onAddRelation={(node) => setDialog({ type: 'relation', nodeId: node.id })} />
          </div>
        </DndContext>

        {store.searchQuery.trim() && <SearchResults results={searchResults} onSelect={(id) => { store.setSearchQuery(''); select(id) }} onClose={() => store.setSearchQuery('')} />}
        <div className={`pointer-events-none absolute inset-3 z-30 grid place-items-center rounded-2xl border-2 border-dashed border-blue-400 bg-blue-50/90 transition-opacity ${isFileDragging ? 'opacity-100' : 'opacity-0'}`}><div className="text-center text-blue-700"><Upload className="mx-auto" size={28} /><p className="mt-2 text-sm font-semibold">导入到「{selectedNode.title}」</p></div></div>
        <div className="absolute inset-0 z-20" style={{ display: isFileDragging ? 'block' : 'none' }} onDragOver={(event) => event.preventDefault()} onDragLeave={() => setIsFileDragging(false)} onDrop={(event) => void handleDrop(event)} />
        {isKnowledgeDemoMode && <div className="pointer-events-none absolute bottom-3 right-3 z-10 rounded-full border border-blue-200 bg-white/95 px-3 py-1.5 text-xs font-medium text-blue-700 shadow-sm backdrop-blur">网页演示 · 虚拟资料</div>}
      </div>

      {store.error && <div className="fixed bottom-20 right-4 z-50 flex max-w-sm items-start gap-2 rounded-xl border border-red-200 bg-white p-3 text-sm text-red-700 shadow-xl lg:bottom-4"><AlertCircle size={17} className="mt-0.5 shrink-0" /><span>{store.error}</span></div>}
      {dialog?.type === 'create' && index.nodeMap.get(dialog.parentId) && <CreateNodeDialog parent={index.nodeMap.get(dialog.parentId)!} onClose={() => setDialog(null)} onCreate={async (input) => { const created = await store.createNode(dialog.parentId, input); await store.revealNode(created.id) }} />}
      {dialog?.type === 'upload' && index.nodeMap.get(dialog.parentId) && <UploadDialog parent={index.nodeMap.get(dialog.parentId)!} onClose={() => setDialog(null)} onFiles={(files) => onFiles(dialog.parentId, files)} />}
      {dialog?.type === 'move' && index.nodeMap.get(dialog.nodeId) && <MoveNodeDialog node={index.nodeMap.get(dialog.nodeId)!} nodes={activeNodes} index={index} onClose={() => setDialog(null)} onMove={(parentId) => store.moveNode(dialog.nodeId, parentId)} />}
      {dialog?.type === 'edit' && index.nodeMap.get(dialog.nodeId) && <EditNodeDialog node={index.nodeMap.get(dialog.nodeId)!} onClose={() => setDialog(null)} onSave={(patch) => store.updateNode(dialog.nodeId, patch)} />}
      {dialog?.type === 'tags' && index.nodeMap.get(dialog.nodeId) && <TagsDialog node={index.nodeMap.get(dialog.nodeId)!} initialTags={nodeTags.get(dialog.nodeId) ?? []} allTags={store.tags.map((tag) => tag.name)} onClose={() => setDialog(null)} onSave={(tags) => store.setNodeTags(dialog.nodeId, tags)} />}
      {dialog?.type === 'relation' && index.nodeMap.get(dialog.nodeId) && <RelationDialog node={index.nodeMap.get(dialog.nodeId)!} nodes={activeNodes} onClose={() => setDialog(null)} onSave={(targetId, type) => store.addRelation(dialog.nodeId, targetId, type)} />}
      {previewFile && <FilePreviewModal file={previewFile} onClose={() => setPreviewFile(null)} />}
    </div>
  )
}

function selectedContainerId(nodes: KnowledgeNode[], selectedId: string | null) {
  const node = nodes.find((item) => item.id === selectedId)
  if (!node) return KNOWLEDGE_ROOT_ID
  return containerTypes.has(node.type) ? node.id : node.parentId ?? KNOWLEDGE_ROOT_ID
}

function toAttachment(file: ResourceFile): FileAttachment {
  return { id: file.id, name: file.name, type: file.mimeType, size: file.size, sourcePath: file.localPath, storageKey: file.storageKey }
}

function MobileToolbar({ query, onQuery, searchRef, virtualView, onVirtualView, onCreate, onUpload }: { query: string; onQuery: (query: string) => void; searchRef: React.RefObject<HTMLInputElement | null>; virtualView: KnowledgeVirtualView; onVirtualView: (view: KnowledgeVirtualView) => void; onCreate: () => void; onUpload: () => void }) {
  return <div className="border-b border-slate-200 bg-white p-3 xl:hidden"><div className="flex items-center gap-2"><div className="relative min-w-0 flex-1"><Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input ref={searchRef} value={query} onChange={(event) => onQuery(event.target.value)} placeholder="搜索知识库" className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-3 text-sm outline-none focus:border-blue-300 focus:bg-white" /></div><button type="button" onClick={onCreate} className="flex size-9 items-center justify-center rounded-lg bg-blue-600 text-white" aria-label="新建"><Plus size={17} /></button><button type="button" onClick={onUpload} className="flex size-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600" aria-label="上传"><Upload size={16} /></button></div><select value={virtualView} onChange={(event) => onVirtualView(event.target.value as KnowledgeVirtualView)} className="mt-2 h-8 w-full rounded-lg border border-slate-200 bg-white px-2 text-xs text-slate-600 outline-none"><option value="tree">当前知识树</option><option value="recent">最近访问</option><option value="favorite">我的收藏</option><option value="unlearned">未学习</option><option value="learning">学习中</option><option value="review">待复习</option><option value="completed">已完成</option><option value="mastered">已掌握</option></select></div>
}

function SearchResults({ results, onSelect, onClose }: { results: ReturnType<typeof searchKnowledge>; onSelect: (id: string) => void; onClose: () => void }) {
  return <div className="absolute inset-x-3 top-14 z-40 max-h-[70%] overflow-y-auto rounded-2xl border border-slate-200 bg-white p-2 shadow-2xl sm:left-auto sm:right-5 sm:w-[440px] xl:left-[304px] xl:right-auto xl:top-14"><div className="flex items-center justify-between px-2 py-1"><p className="text-xs font-medium text-slate-500">找到 {results.length} 项</p><button type="button" onClick={onClose} className="flex size-7 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100"><X size={14} /></button></div>{results.map((result) => <button key={result.node.id} type="button" onClick={() => onSelect(result.node.id)} className="flex w-full items-start gap-3 rounded-xl p-3 text-left hover:bg-slate-50"><span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500"><NodeIcon type={result.node.type} size={15} /></span><span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium text-slate-900">{result.node.title}</span><span className="mt-1 block truncate text-xs text-slate-400">{result.breadcrumb.map((item) => item.type === 'root' ? '我的资料' : item.title).join(' / ')}</span></span></button>)}{results.length === 0 && <p className="p-8 text-center text-sm text-slate-400">没有找到匹配内容</p>}</div>
}

function UploadDialog({ parent, onClose, onFiles }: { parent: KnowledgeNode; onClose: () => void; onFiles: (files: FileAttachment[]) => Promise<void> }) {
  return <div className="fixed inset-0 z-50 grid place-items-end bg-slate-950/35 backdrop-blur-[2px] sm:place-items-center sm:p-4" role="dialog" aria-modal="true"><div className="w-full rounded-t-2xl bg-white p-5 shadow-2xl sm:max-w-lg sm:rounded-2xl"><div className="flex items-start justify-between"><div><h2 className="text-lg font-semibold text-slate-950">批量导入资料</h2><p className="mt-1 text-xs text-slate-500">文件会进入「{parent.title}」，每个文件自动生成一个节点。</p></div><button type="button" onClick={onClose} className="flex size-9 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100"><X size={17} /></button></div><FilePicker className="mt-5 flex min-h-40 cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-blue-200 bg-blue-50 px-5 text-center text-blue-700 transition hover:bg-blue-100 disabled:opacity-60" onFiles={(files) => void onFiles(files)}><span className="flex size-11 items-center justify-center rounded-xl bg-white shadow-sm"><FolderInput size={20} /></span><span className="mt-3 text-sm font-semibold">选择多个 Word / Excel / PDF / 图片等文件</span><span className="mt-1 text-xs leading-5 text-blue-600">桌面版保留原文件位置，网页版保存到浏览器本地</span></FilePicker></div></div>
}

function LoadingState() {
  return <div className="grid min-h-[560px] place-items-center rounded-2xl bg-white ring-1 ring-slate-200"><div className="text-center"><Database className="mx-auto animate-pulse text-blue-500" size={28} /><p className="mt-3 text-sm text-slate-500">正在建立本地知识树...</p></div></div>
}

function MigrationError({ message }: { message: string }) {
  return <div className="grid min-h-[560px] place-items-center rounded-2xl bg-white p-6 ring-1 ring-red-200"><div className="max-w-md text-center"><AlertCircle className="mx-auto text-red-500" size={30} /><h2 className="mt-4 text-lg font-semibold text-slate-950">知识库暂时无法打开</h2><p className="mt-2 text-sm leading-6 text-slate-500">{message}</p><p className="mt-3 text-xs leading-5 text-slate-400">旧资料没有被删除。请先在设置中导出备份，再联系维护人员排查。</p></div></div>
}
