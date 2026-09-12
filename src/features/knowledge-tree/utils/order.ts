import type { KnowledgeNode } from '../types/knowledge.ts'

const ORDER_STEP = 1000

export function orderBefore(nodes: KnowledgeNode[], beforeId?: string | null) {
  const sorted = [...nodes].sort((a, b) => a.order - b.order || a.id.localeCompare(b.id))
  if (!beforeId) return (sorted.at(-1)?.order ?? 0) + ORDER_STEP
  const index = sorted.findIndex((item) => item.id === beforeId)
  if (index < 0) return (sorted.at(-1)?.order ?? 0) + ORDER_STEP
  if (index === 0) return sorted[0].order - ORDER_STEP
  return (sorted[index - 1].order + sorted[index].order) / 2
}
