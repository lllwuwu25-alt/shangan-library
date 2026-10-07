import { knowledgeNodeTypes, type KnowledgeNode } from '../types/knowledge.ts'
import { orderBefore } from './order.ts'

export type TreeIndex = { nodeMap: Map<string, KnowledgeNode>; childrenMap: Map<string | null, KnowledgeNode[]> }
export type TreeIssue = { code: 'duplicate-id' | 'orphan' | 'cycle' | 'invalid-order' | 'invalid-type'; nodeId: string }

export function buildTreeIndex(nodes: KnowledgeNode[]): TreeIndex {
  const nodeMap = new Map<string, KnowledgeNode>()
  const childrenMap = new Map<string | null, KnowledgeNode[]>()
  for (const node of nodes) {
    if (!nodeMap.has(node.id)) nodeMap.set(node.id, node)
    const children = childrenMap.get(node.parentId) ?? []
    children.push(node)
    childrenMap.set(node.parentId, children)
  }
  for (const children of childrenMap.values()) children.sort((a, b) => a.order - b.order || a.id.localeCompare(b.id))
  return { nodeMap, childrenMap }
}

export const getChildren = (index: TreeIndex, parentId: string | null) => (index.childrenMap.get(parentId) ?? []).filter((item) => !item.archived)

export const directoryNodeTypes = new Set(['root', 'folder', 'subject', 'chapter', 'topic', 'collection'])
export type DirectoryRow = { node: KnowledgeNode; depth: number; hasChildren: boolean }

export function getDirectoryRows(index: TreeIndex, query = '', collapsed: ReadonlySet<string> = new Set()) {
  const directories = new Set([...index.nodeMap.values()].filter((node) => !node.archived && directoryNodeTypes.has(node.type)).map((node) => node.id))
  const search = query.trim().toLowerCase()
  const visible = search ? new Set<string>() : directories
  if (search) {
    for (const id of directories) {
      const node = index.nodeMap.get(id)!
      const title = node.type === 'root' ? '我的资料' : node.title
      if (!title.toLowerCase().includes(search)) continue
      visible.add(id)
      for (const parent of getAncestors(index, id)) if (directories.has(parent.id)) visible.add(parent.id)
    }
  }
  const children = (parentId: string | null) => getChildren(index, parentId).filter((node) => visible.has(node.id))
  const pending = children(null).reverse().map((node) => ({ node, depth: 0 }))
  const rows: DirectoryRow[] = []
  const seen = new Set<string>()
  while (pending.length) {
    const entry = pending.pop()!
    if (seen.has(entry.node.id)) continue
    seen.add(entry.node.id)
    const childNodes = children(entry.node.id)
    rows.push({ ...entry, hasChildren: childNodes.length > 0 })
    // Searching reveals ancestor paths without changing the user's collapsed branches.
    if (!search && collapsed.has(entry.node.id)) continue
    for (const node of childNodes.reverse()) pending.push({ node, depth: entry.depth + 1 })
  }
  return rows
}

export function getAncestors(index: TreeIndex, nodeId: string) {
  const result: KnowledgeNode[] = []
  const seen = new Set<string>([nodeId])
  let current = index.nodeMap.get(nodeId)
  while (current?.parentId) {
    if (seen.has(current.parentId)) break
    seen.add(current.parentId)
    current = index.nodeMap.get(current.parentId)
    if (current) result.unshift(current)
  }
  return result
}

export function getDescendants(index: TreeIndex, nodeId: string) {
  const result: KnowledgeNode[] = []
  const seen = new Set<string>()
  const visit = (parentId: string) => {
    for (const child of index.childrenMap.get(parentId) ?? []) {
      if (seen.has(child.id)) continue
      seen.add(child.id)
      result.push(child)
      visit(child.id)
    }
  }
  visit(nodeId)
  return result
}

export const isDescendant = (index: TreeIndex, parentId: string, childId: string) => getDescendants(index, parentId).some((item) => item.id === childId)
export const getBreadcrumb = (index: TreeIndex, nodeId: string) => [...getAncestors(index, nodeId), index.nodeMap.get(nodeId)].filter((item): item is KnowledgeNode => Boolean(item))

export function moveNode(nodes: KnowledgeNode[], nodeId: string, targetParentId: string, beforeId?: string | null) {
  if (nodeId === targetParentId) throw new Error('无法移动：不能移动到自身。')
  const index = buildTreeIndex(nodes)
  if (!index.nodeMap.has(nodeId) || !index.nodeMap.has(targetParentId)) throw new Error('无法移动：节点不存在。')
  if (isDescendant(index, nodeId, targetParentId)) throw new Error('无法移动：目标位置属于当前节点的子级。')
  const siblings = getChildren(index, targetParentId).filter((item) => item.id !== nodeId)
  const order = orderBefore(siblings, beforeId)
  const now = Date.now()
  return nodes.map((item) => item.id === nodeId ? { ...item, parentId: targetParentId, order, updatedAt: now } : item)
}

export const reorderNode = (nodes: KnowledgeNode[], nodeId: string, parentId: string, beforeId?: string | null) => moveNode(nodes, nodeId, parentId, beforeId)

export function softDeleteNode(nodes: KnowledgeNode[], nodeId: string, now = Date.now()) {
  const ids = new Set([nodeId, ...getDescendants(buildTreeIndex(nodes), nodeId).map((item) => item.id)])
  return nodes.map((item) => ids.has(item.id) ? { ...item, archived: true, updatedAt: now } : item)
}

export function validateKnowledgeTree(nodes: KnowledgeNode[]) {
  const issues: TreeIssue[] = []
  const ids = new Set<string>()
  for (const node of nodes) {
    if (ids.has(node.id)) issues.push({ code: 'duplicate-id', nodeId: node.id })
    ids.add(node.id)
    if (!Number.isFinite(node.order)) issues.push({ code: 'invalid-order', nodeId: node.id })
    if (!knowledgeNodeTypes.includes(node.type)) issues.push({ code: 'invalid-type', nodeId: node.id })
  }
  for (const node of nodes) if (node.parentId !== null && !ids.has(node.parentId)) issues.push({ code: 'orphan', nodeId: node.id })
  const index = buildTreeIndex(nodes)
  for (const node of nodes) {
    const seen = new Set<string>([node.id])
    let current = node
    while (current.parentId) {
      if (seen.has(current.parentId)) { issues.push({ code: 'cycle', nodeId: node.id }); break }
      seen.add(current.parentId)
      const parent = index.nodeMap.get(current.parentId)
      if (!parent) break
      current = parent
    }
  }
  return { valid: issues.length === 0, issues }
}
