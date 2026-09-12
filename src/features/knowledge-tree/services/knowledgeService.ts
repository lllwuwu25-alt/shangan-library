import type { FileAttachment, ResourceItem } from '../../../types.ts'
import { saveAttachmentBlob } from '../../../lib/fileStorage.ts'
import type { KnowledgeRepository } from '../repositories/knowledgeRepository.ts'
import { knowledgeRepository } from '../repositories/knowledgeRepository.ts'
import { emptyKnowledgeData, KNOWLEDGE_ROOT_ID, type KnowledgeData, type KnowledgeNode, type KnowledgeNodeType, type KnowledgeViewMode, type KnowledgeVirtualView, type LearningStatus, type NodeRelationType } from '../types/knowledge.ts'
import { migrateLegacyResources } from './migration.ts'
import { buildTreeIndex, getChildren, getDescendants, moveNode as moveTreeNode, reorderNode as reorderTreeNode, softDeleteNode, validateKnowledgeTree } from '../utils/tree.ts'

const uid = (prefix: string) => `${prefix}-${crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`}`
const attachmentType = (file: FileAttachment): KnowledgeNodeType => file.type.startsWith('image/') ? 'image' : file.type.startsWith('video/') ? 'video' : 'document'

export class KnowledgeService {
  private data: KnowledgeData | null = null
  private repository: KnowledgeRepository
  private now: () => number
  constructor(repository: KnowledgeRepository = knowledgeRepository, now: () => number = Date.now) {
    this.repository = repository
    this.now = now
  }

  getData() {
    if (!this.data) throw new Error('知识库尚未初始化')
    return this.data
  }

  async initialize(resources: ResourceItem[], fallbackData?: KnowledgeData) {
    const saved = await this.repository.load()
    if (!saved || saved.schemaVersion !== 2) {
      for (const attachment of resources.flatMap((resource) => resource.attachments)) {
        if (!attachment.dataUrl || attachment.storageKey) continue
        const blob = await fetch(attachment.dataUrl).then((response) => response.blob())
        await saveAttachmentBlob(attachment.id, blob)
      }
    }
    this.data = saved?.schemaVersion === 2 ? saved : fallbackData ?? migrateLegacyResources(resources, saved ?? undefined).data
    if (!saved || saved.schemaVersion !== 2) await this.repository.save(this.data)
    return this.data
  }

  private async commit(next: KnowledgeData) {
    const validation = validateKnowledgeTree(next.nodes)
    if (!validation.valid) throw new Error(`知识树完整性检查失败：${validation.issues[0].code}`)
    this.data = { ...next, updatedAt: this.now() }
    await this.repository.save(this.data)
    return this.data
  }

  async replace(data: KnowledgeData) { return this.commit(data) }

  async createNode(parentId: string, input: { title: string; type: KnowledgeNodeType; description?: string; metadata?: KnowledgeNode['metadata']; learningStatus?: LearningStatus }) {
    const data = this.getData()
    if (!data.nodes.some((item) => item.id === parentId && !item.archived)) throw new Error('上级节点不存在')
    const now = this.now()
    const siblings = getChildren(buildTreeIndex(data.nodes), parentId)
    const created: KnowledgeNode = { id: uid('node'), parentId, title: input.title.trim() || '未命名节点', type: input.type, description: input.description?.trim(), metadata: input.metadata, learningStatus: input.learningStatus ?? (input.type === 'root' || input.type === 'folder' || input.type === 'subject' ? undefined : 'unlearned'), order: (siblings.at(-1)?.order ?? 0) + 1000, createdAt: now, updatedAt: now }
    await this.commit({ ...data, nodes: [...data.nodes, created] })
    return created
  }

  async addAttachments(parentId: string, attachments: FileAttachment[]) {
    const created: KnowledgeNode[] = []
    for (const attachment of attachments) {
      const now = this.now()
      const fileId = uid('resource-file')
      const data = this.getData()
      const file = { id: fileId, name: attachment.name, mimeType: attachment.type, size: attachment.size, localPath: attachment.sourcePath, storageKey: attachment.storageKey ?? (attachment.dataUrl ? attachment.id : undefined), createdAt: now, updatedAt: now }
      const node = await this.createNode(parentId, { title: attachment.name, type: attachmentType(attachment), metadata: { fileId } })
      await this.commit({ ...this.getData(), files: [...data.files, file] })
      created.push(node)
    }
    return created
  }

  async updateNode(id: string, patch: Partial<Pick<KnowledgeNode, 'title' | 'description' | 'learningStatus' | 'favorite' | 'metadata'>>) {
    const data = this.getData()
    if (!data.nodes.some((item) => item.id === id)) throw new Error('节点不存在')
    return this.commit({ ...data, nodes: data.nodes.map((item) => item.id === id ? { ...item, ...patch, title: patch.title?.trim() || item.title, updatedAt: this.now() } : item) })
  }

  async moveNode(id: string, parentId: string, beforeId?: string | null) { return this.commit({ ...this.getData(), nodes: moveTreeNode(this.getData().nodes, id, parentId, beforeId) }) }
  async reorderNode(id: string, parentId: string, beforeId?: string | null) { return this.commit({ ...this.getData(), nodes: reorderTreeNode(this.getData().nodes, id, parentId, beforeId) }) }

  async archiveNode(id: string) {
    if (id === KNOWLEDGE_ROOT_ID) throw new Error('根节点不能删除')
    const data = this.getData()
    const ids = new Set([id, ...getDescendants(buildTreeIndex(data.nodes), id).map((item) => item.id)])
    return this.commit({ ...data, nodes: softDeleteNode(data.nodes, id, this.now()), nodeTags: data.nodeTags.filter((item) => !ids.has(item.nodeId)), relations: data.relations.filter((item) => !ids.has(item.sourceNodeId) && !ids.has(item.targetNodeId)), selectedNodeId: ids.has(data.selectedNodeId ?? '') ? KNOWLEDGE_ROOT_ID : data.selectedNodeId })
  }

  async setNodeTags(nodeId: string, names: string[]) {
    const data = this.getData()
    const cleaned = [...new Set(names.map((name) => name.trim()).filter(Boolean))]
    const tags = [...data.tags]
    const tagIds = cleaned.map((name) => {
      const existing = tags.find((tag) => tag.name.toLowerCase() === name.toLowerCase())
      if (existing) return existing.id
      const tag = { id: uid('tag'), name, createdAt: this.now() }
      tags.push(tag)
      return tag.id
    })
    return this.commit({ ...data, tags, nodeTags: [...data.nodeTags.filter((item) => item.nodeId !== nodeId), ...tagIds.map((tagId) => ({ nodeId, tagId }))] })
  }

  async addRelation(sourceNodeId: string, targetNodeId: string, type: NodeRelationType) {
    const data = this.getData()
    if (![sourceNodeId, targetNodeId].every((id) => data.nodes.some((item) => item.id === id))) throw new Error('关联节点不存在')
    return this.commit({ ...data, relations: [...data.relations, { id: uid('relation'), sourceNodeId, targetNodeId, type, createdAt: this.now() }] })
  }

  async selectNode(id: string) {
    const data = this.getData()
    return this.commit({ ...data, selectedNodeId: id, virtualView: 'tree', nodes: data.nodes.map((item) => item.id === id ? { ...item, lastOpenedAt: this.now() } : item) })
  }
  async setExpanded(ids: string[]) { return this.commit({ ...this.getData(), expandedNodeIds: [...new Set(ids)] }) }
  async setViewMode(viewMode: KnowledgeViewMode) { return this.commit({ ...this.getData(), viewMode }) }
  async setVirtualView(virtualView: KnowledgeVirtualView) { return this.commit({ ...this.getData(), virtualView }) }
  async clear() { await this.repository.clear(); this.data = emptyKnowledgeData(this.now()); return this.data }
}
