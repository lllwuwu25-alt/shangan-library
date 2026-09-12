/// <reference types="node" />
import test from 'node:test'
import assert from 'node:assert/strict'
import type { ResourceItem } from '../../../types.ts'
import type { KnowledgeData } from '../types/knowledge.ts'
import type { KnowledgeRepository } from '../repositories/knowledgeRepository.ts'
import { KnowledgeService } from '../services/knowledgeService.ts'

class MemoryRepository implements KnowledgeRepository {
  saved: KnowledgeData | null = null
  async load() { return this.saved ? structuredClone(this.saved) : null }
  async save(data: KnowledgeData) { this.saved = structuredClone(data) }
  async clear() { this.saved = null }
}

const legacy: ResourceItem[] = [{ id: 'legacy', title: '讲义', category: '数学', description: '', addedAt: '2026-01-01', attachments: [] }]

test('initializes once from legacy resources and reloads the persisted tree', async () => {
  const repository = new MemoryRepository()
  const first = new KnowledgeService(repository, () => 10)
  const migrated = await first.initialize(legacy)
  const created = await first.createNode(migrated.selectedNodeId!, { title: '高等数学', type: 'chapter' })
  const second = new KnowledgeService(repository, () => 20)
  const reloaded = await second.initialize([])
  assert.equal(reloaded.nodes.some((item) => item.id === created.id), true)
  assert.equal(reloaded.nodes.filter((item) => item.metadata?.legacyResourceId === 'legacy').length, 1)
})

test('persists move rejection, timestamps, tags, status and favorite changes', async () => {
  const repository = new MemoryRepository()
  const service = new KnowledgeService(repository, () => 50)
  const data = await service.initialize([])
  const parent = await service.createNode(data.selectedNodeId!, { title: '数学', type: 'subject' })
  const child = await service.createNode(parent.id, { title: '极限', type: 'topic' })
  await assert.rejects(() => service.moveNode(parent.id, child.id), /子级/)
  await service.updateNode(child.id, { learningStatus: 'review', favorite: true })
  await service.setNodeTags(child.id, ['重点', '公式'])
  const current = service.getData()
  const changed = current.nodes.find((item) => item.id === child.id)!
  assert.equal(changed.updatedAt, 50)
  assert.equal(changed.learningStatus, 'review')
  assert.equal(changed.favorite, true)
  assert.deepEqual(current.nodeTags.filter((item) => item.nodeId === child.id).map((item) => current.tags.find((tag) => tag.id === item.tagId)?.name).sort(), ['公式', '重点'])
})

test('soft deletion removes active tag and node relations for the complete subtree', async () => {
  const repository = new MemoryRepository()
  const service = new KnowledgeService(repository, () => 80)
  const data = await service.initialize([])
  const parent = await service.createNode(data.selectedNodeId!, { title: '数学', type: 'subject' })
  const child = await service.createNode(parent.id, { title: '导数', type: 'topic' })
  await service.setNodeTags(child.id, ['重点'])
  await service.addRelation(parent.id, child.id, 'related')
  await service.archiveNode(parent.id)
  const current = service.getData()
  assert.equal(current.nodes.find((item) => item.id === parent.id)?.archived, true)
  assert.equal(current.nodes.find((item) => item.id === child.id)?.archived, true)
  assert.equal(current.nodeTags.some((item) => item.nodeId === child.id), false)
  assert.equal(current.relations.length, 0)
})
