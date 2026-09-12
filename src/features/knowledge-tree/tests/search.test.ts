import assert from 'node:assert/strict'
import test from 'node:test'
import type { KnowledgeData, KnowledgeNode } from '../types/knowledge.ts'
import { searchKnowledge } from '../utils/search.ts'

const node = (input: Partial<KnowledgeNode> & Pick<KnowledgeNode, 'id' | 'parentId' | 'title' | 'type'>): KnowledgeNode => ({
  order: 1000,
  createdAt: 1,
  updatedAt: 1,
  ...input,
})

const data: KnowledgeData = {
  schemaVersion: 2,
  nodes: [
    node({ id: 'root', parentId: null, title: '我的资料', type: 'root' }),
    node({ id: 'math', parentId: 'root', title: '数学', type: 'subject' }),
    node({ id: 'limits', parentId: 'math', title: '极限讲义', description: '洛必达法则', type: 'document', metadata: { fileId: 'f1' } }),
    node({ id: 'note', parentId: 'math', title: '复习记录', type: 'note' }),
  ],
  files: [{ id: 'f1', name: '高数强化.pdf', mimeType: 'application/pdf', size: 12, createdAt: 1, updatedAt: 1 }],
  tags: [{ id: 'tag1', name: '高频', createdAt: 1 }],
  nodeTags: [{ nodeId: 'note', tagId: 'tag1' }],
  relations: [],
  selectedNodeId: 'root',
  expandedNodeIds: ['root'],
  viewMode: 'grid',
  virtualView: 'tree',
  updatedAt: 1,
}

test('searches node title and description', () => {
  assert.deepEqual(searchKnowledge(data, '洛必达').map((item) => item.node.id), ['limits'])
})

test('searches tag and attached filename and includes breadcrumbs', () => {
  const fileHit = searchKnowledge(data, '高数强化')[0]
  assert.equal(fileHit.node.id, 'limits')
  assert.deepEqual(fileHit.breadcrumb.map((item) => item.title), ['我的资料', '数学', '极限讲义'])
  assert.deepEqual(searchKnowledge(data, '高频').map((item) => item.node.id), ['note'])
})

test('ignores archived nodes and returns an empty list for blank input', () => {
  const archived = { ...data, nodes: data.nodes.map((item) => item.id === 'note' ? { ...item, archived: true } : item) }
  assert.deepEqual(searchKnowledge(archived, '高频'), [])
  assert.deepEqual(searchKnowledge(data, '  '), [])
})
