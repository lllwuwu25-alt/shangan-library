import test from 'node:test'
import assert from 'node:assert/strict'
import type { KnowledgeNode } from '../types/knowledge.ts'
import { buildTreeIndex, getDirectoryRows } from '../utils/tree.ts'

const node = (id: string, parentId: string | null, title: string, order: number, type: KnowledgeNode['type'] = 'folder'): KnowledgeNode => ({ id, parentId, title, order, type, createdAt: 1, updatedAt: 1 })
const fixture = [
  node('limit', 'calculus', '极限', 1),
  node('english', 'root', '英语', 2),
  node('algebra', 'math', '线性代数', 2),
  node('math', 'root', '数学', 1),
  node('calculus', 'math', '高数', 1, 'chapter'),
  node('root', null, '我的资料', 1, 'root'),
  node('file', 'calculus', '真题.pdf', 2, 'document'),
  { ...node('archived', 'root', '旧目录', 3), archived: true },
  node('archived-child', 'archived', '旧子目录', 1),
]

function rows(query = '', collapsed = new Set<string>()) {
  return getDirectoryRows(buildTreeIndex(fixture), query, collapsed).map(({ node, depth }) => [node.id, depth])
}

test('directory order follows parents and sibling order rather than record insertion order', () => {
  assert.deepEqual(rows(), [['root', 0], ['math', 1], ['calculus', 2], ['limit', 3], ['algebra', 2], ['english', 1]])
})

test('collapsing a directory hides only its descendants', () => {
  assert.deepEqual(rows('', new Set(['math'])), [['root', 0], ['math', 1], ['english', 1]])
  assert.deepEqual(rows('', new Set(['root'])), [['root', 0]])
})

test('search reveals matching subdirectories with ancestors even inside a collapsed branch', () => {
  assert.deepEqual(rows(' 极限 ', new Set(['math', 'root'])), [['root', 0], ['math', 1], ['calculus', 2], ['limit', 3]])
  assert.deepEqual(rows('不存在'), [])
})

test('directory rows mark only visible directory children as expandable', () => {
  const result = getDirectoryRows(buildTreeIndex(fixture), '极限')
  assert.deepEqual(result.map(({ node, hasChildren }) => [node.id, hasChildren]), [['root', true], ['math', true], ['calculus', true], ['limit', false]])
})
