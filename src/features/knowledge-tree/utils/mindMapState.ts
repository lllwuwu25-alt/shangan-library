import type { KnowledgeNode, KnowledgeViewMode, KnowledgeVirtualView } from '../types/knowledge.ts'

export const toggleMapBranch = (collapsed: ReadonlySet<string>, id: string) => {
  const next = new Set(collapsed)
  if (next.has(id)) next.delete(id); else next.add(id)
  return next
}

export const resolveWorkspaceMode = (mode: KnowledgeViewMode, view: KnowledgeVirtualView) => mode === 'map' && view !== 'tree' ? 'list' : mode

export const mapNodeAction = (node: KnowledgeNode) => node.metadata?.fileId
  ? { type: 'preview' as const, fileId: node.metadata.fileId }
  : { type: 'select' as const, nodeId: node.id }
