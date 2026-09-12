/// <reference types="node" />
import test from 'node:test'
import assert from 'node:assert/strict'
import type { KnowledgeNode } from '../types/knowledge.ts'
import { buildTreeIndex, getAncestors, getBreadcrumb, getChildren, getDescendants, moveNode, reorderNode, softDeleteNode, validateKnowledgeTree } from '../utils/tree.ts'

const node = (id: string, parentId: string | null, order: number, title = id): KnowledgeNode => ({
  id, parentId, order, title, type: parentId === null ? 'root' : 'folder', createdAt: 1, updatedAt: 1,
})

const fixture = [node('root', null, 1000, '我的资料'), node('math', 'root', 1000, '数学'), node('english', 'root', 2000, '英语'), node('calculus', 'math', 1000, '高数'), node('limit', 'calculus', 1000, '极限')]

test('builds sorted child indexes once and resolves lineage', () => {
  const index = buildTreeIndex(fixture)
  assert.deepEqual(getChildren(index, 'root').map((item) => item.id), ['math', 'english'])
  assert.deepEqual(getAncestors(index, 'limit').map((item) => item.id), ['root', 'math', 'calculus'])
  assert.deepEqual(getDescendants(index, 'math').map((item) => item.id), ['calculus', 'limit'])
  assert.deepEqual(getBreadcrumb(index, 'limit').map((item) => item.title), ['我的资料', '数学', '高数', '极限'])
})

test('moves a node across levels and rejects cycles', () => {
  const moved = moveNode(fixture, 'english', 'calculus')
  assert.equal(moved.find((item) => item.id === 'english')?.parentId, 'calculus')
  assert.throws(() => moveNode(fixture, 'math', 'limit'), /子级/)
  assert.throws(() => moveNode(fixture, 'math', 'math'), /自身/)
})

test('reorders siblings using an order between adjacent nodes', () => {
  const reordered = reorderNode(fixture, 'english', 'root', 'math')
  const children = getChildren(buildTreeIndex(reordered), 'root')
  assert.deepEqual(children.map((item) => item.id), ['english', 'math'])
  assert.ok(children[0].order < children[1].order)
})

test('soft deletion archives a complete subtree', () => {
  const deleted = softDeleteNode(fixture, 'math', 99)
  assert.deepEqual(deleted.filter((item) => item.archived).map((item) => item.id).sort(), ['calculus', 'limit', 'math'])
  assert.equal(deleted.find((item) => item.id === 'english')?.archived, undefined)
  assert.equal(deleted.find((item) => item.id === 'math')?.updatedAt, 99)
})

test('validation reports duplicate IDs, orphans, cycles, invalid orders and types', () => {
  const invalid = [
    node('root', null, 1000),
    node('dup', 'root', Number.NaN),
    node('dup', 'missing', 2),
    { ...node('cycle-a', 'cycle-b', 1), type: 'unknown' as KnowledgeNode['type'] },
    node('cycle-b', 'cycle-a', 1),
  ]
  const result = validateKnowledgeTree(invalid)
  assert.equal(result.valid, false)
  assert.deepEqual(new Set(result.issues.map((issue) => issue.code)), new Set(['duplicate-id', 'orphan', 'cycle', 'invalid-order', 'invalid-type']))
})

test('indexes and traverses a 5000 node knowledge tree without repeated full scans', () => {
  const nodes = [node('root', null, 1000)]
  for (let index = 0; index < 5000; index += 1) {
    nodes.push(node(`node-${index}`, index < 100 ? 'root' : `node-${Math.floor((index - 100) / 10)}`, index * 1000))
  }
  const startedAt = performance.now()
  const tree = buildTreeIndex(nodes)
  const descendants = getDescendants(tree, 'root')
  assert.equal(descendants.length, 5000)
  assert.ok(performance.now() - startedAt < 1000)
})
