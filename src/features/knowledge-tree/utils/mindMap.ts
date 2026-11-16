import dagre from '@dagrejs/dagre'
import type { KnowledgeNode } from '../types/knowledge.ts'
import { getChildren, type TreeIndex } from './tree.ts'

export function layoutMindMap(index: TreeIndex, rootId: string, collapsed: ReadonlySet<string> = new Set()) {
  const nodes: { id: string; node: KnowledgeNode; position: { x: number; y: number }; width: number; height: number; childCount: number }[] = []
  const edges: { id: string; source: string; target: string }[] = []
  const root = index.nodeMap.get(rootId)
  if (!root || root.archived) return { nodes, edges }
  const pending = [root]
  const seen = new Set<string>()
  const graph = new dagre.graphlib.Graph().setGraph({ rankdir: 'LR', ranksep: 76, nodesep: 28, marginx: 32, marginy: 32 }).setDefaultEdgeLabel(() => ({}))
  while (pending.length) {
    const node = pending.pop()!
    if (seen.has(node.id)) continue
    seen.add(node.id)
    const children = getChildren(index, node.id)
    const width = 260
    // Reserve wrapped label space before layout; clamp very long names to six lines.
    const units = Array.from(node.title).reduce((sum, char) => sum + (char.charCodeAt(0) > 255 ? 2 : 1), 0)
    const height = 82 + Math.min(6, Math.max(1, Math.ceil(units / 25))) * 21
    nodes.push({ id: node.id, node, position: { x: 0, y: 0 }, width, height, childCount: children.length })
    graph.setNode(node.id, { width, height })
    if (collapsed.has(node.id)) continue
    for (const child of [...children].reverse()) if (!seen.has(child.id)) pending.push(child)
  }
  for (const item of nodes) {
    if (item.id !== rootId && item.node.parentId && seen.has(item.node.parentId)) {
      const source = item.node.parentId
      edges.push({ id: JSON.stringify([source, item.id]), source, target: item.id })
      graph.setEdge(source, item.id)
    }
  }
  dagre.layout(graph)
  for (const item of nodes) {
    const position = graph.node(item.id)
    item.position = { x: position.x - item.width / 2, y: position.y - item.height / 2 }
  }
  return { nodes, edges }
}
