import type { KnowledgeData, KnowledgeNode } from '../types/knowledge.ts'
import { buildTreeIndex, getBreadcrumb } from './tree.ts'

export type KnowledgeSearchResult = {
  node: KnowledgeNode
  breadcrumb: KnowledgeNode[]
  matchedBy: 'title' | 'description' | 'tag' | 'file'
}

export function searchKnowledge(data: KnowledgeData, rawQuery: string): KnowledgeSearchResult[] {
  const query = rawQuery.trim().toLocaleLowerCase()
  if (!query) return []

  const index = buildTreeIndex(data.nodes)
  const tagsByNode = new Map<string, string[]>()
  for (const relation of data.nodeTags) {
    const tag = data.tags.find((item) => item.id === relation.tagId)
    if (!tag) continue
    tagsByNode.set(relation.nodeId, [...(tagsByNode.get(relation.nodeId) ?? []), tag.name])
  }
  const fileById = new Map(data.files.map((file) => [file.id, file]))

  return data.nodes
    .filter((node) => !node.archived && node.type !== 'root')
    .map((node): KnowledgeSearchResult | null => {
      const fileName = node.metadata?.fileId ? fileById.get(String(node.metadata.fileId))?.name ?? '' : ''
      const tags = tagsByNode.get(node.id)?.join(' ') ?? ''
      const fields: Array<[KnowledgeSearchResult['matchedBy'], string]> = [
        ['title', node.title],
        ['description', node.description ?? ''],
        ['tag', tags],
        ['file', fileName],
      ]
      const matchedBy = fields.find(([, value]) => value.toLocaleLowerCase().includes(query))?.[0]
      return matchedBy ? { node, breadcrumb: getBreadcrumb(index, node.id), matchedBy } : null
    })
    .filter((item): item is KnowledgeSearchResult => Boolean(item))
    .sort((a, b) => {
      const priority = { title: 0, tag: 1, file: 2, description: 3 }
      return priority[a.matchedBy] - priority[b.matchedBy] || b.node.updatedAt - a.node.updatedAt
    })
}
