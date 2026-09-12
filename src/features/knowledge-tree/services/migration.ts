import type { ResourceItem } from '../../../types.ts'
import { emptyKnowledgeData, KNOWLEDGE_ROOT_ID, KNOWLEDGE_SCHEMA_VERSION, type KnowledgeData, type KnowledgeNode, type KnowledgeNodeType, type ResourceFile } from '../types/knowledge.ts'
import { validateKnowledgeTree } from '../utils/tree.ts'

const stableId = (prefix: string, value: string) => {
  let hash = 2166136261
  for (const char of value) { hash ^= char.charCodeAt(0); hash = Math.imul(hash, 16777619) }
  return `${prefix}-${(hash >>> 0).toString(36)}`
}
const timestamp = (value: string) => Number.isFinite(Date.parse(value)) ? Date.parse(value) : 0
const fileType = (mime: string): KnowledgeNodeType => mime.startsWith('image/') ? 'image' : mime.startsWith('video/') ? 'video' : 'document'

export function migrateLegacyResources(resources: ResourceItem[], existing?: KnowledgeData) {
  if (existing?.schemaVersion === KNOWLEDGE_SCHEMA_VERSION) return { data: existing, migratedResourceCount: resources.length }
  const now = Date.now()
  const data = emptyKnowledgeData(now)
  const nodes: KnowledgeNode[] = [...data.nodes]
  const files: ResourceFile[] = []
  const categories = [...new Set(resources.map((item) => String(item.category).trim()).filter(Boolean))]
  const categoryIds = new Map<string, string>()
  categories.forEach((category, index) => {
    const id = stableId('legacy-category', category)
    categoryIds.set(category, id)
    nodes.push({ id, parentId: KNOWLEDGE_ROOT_ID, title: category, type: 'subject', order: (index + 1) * 1000, createdAt: now, updatedAt: now })
  })
  for (const [resourceIndex, resource] of resources.entries()) {
    const parentId = categoryIds.get(String(resource.category)) ?? KNOWLEDGE_ROOT_ID
    const createdAt = timestamp(resource.addedAt) || now
    const base: KnowledgeNode = {
      id: stableId('legacy-resource', resource.id), parentId, title: resource.title || '未命名资料',
      type: resource.attachments.length > 1 ? 'collection' : resource.attachments.length === 0 ? 'note' : fileType(resource.attachments[0].type),
      order: (resourceIndex + 1) * 1000, description: resource.description, learningStatus: 'unlearned',
      createdAt, updatedAt: createdAt, lastOpenedAt: resource.lastOpenedAt ? timestamp(resource.lastOpenedAt) : undefined,
      metadata: { legacyResourceId: resource.id },
    }
    nodes.push(base)
    for (const [fileIndex, attachment] of resource.attachments.entries()) {
      if (!attachment.id) throw new Error(`资料迁移失败：${resource.title} 存在无效附件标识。`)
      const fileId = stableId('legacy-file', attachment.id)
      files.push({ id: fileId, name: attachment.name, mimeType: attachment.type, size: attachment.size, localPath: attachment.sourcePath, storageKey: attachment.storageKey ?? (attachment.dataUrl ? attachment.id : undefined), createdAt, updatedAt: createdAt })
      if (resource.attachments.length === 1) base.metadata = { ...base.metadata, fileId }
      else nodes.push({ id: stableId('legacy-file-node', `${resource.id}:${attachment.id}`), parentId: base.id, title: attachment.name, type: fileType(attachment.type), order: (fileIndex + 1) * 1000, learningStatus: 'unlearned', createdAt, updatedAt: createdAt, metadata: { fileId, legacyResourceId: resource.id } })
    }
    if (resource.attachments.length === 0) base.metadata = { ...base.metadata, noteContent: resource.description }
  }
  const validation = validateKnowledgeTree(nodes)
  if (!validation.valid || files.length !== resources.flatMap((item) => item.attachments).length) throw new Error('资料迁移失败：完整性检查未通过。')
  const migrated: KnowledgeData = { ...data, nodes, files, expandedNodeIds: [KNOWLEDGE_ROOT_ID], updatedAt: now }
  return { data: migrated, migratedResourceCount: resources.length }
}
