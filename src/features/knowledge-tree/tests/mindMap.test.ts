/// <reference types="node" />
import test from 'node:test'
import assert from 'node:assert/strict'
import type { KnowledgeNode } from '../types/knowledge.ts'
import { buildTreeIndex } from '../utils/tree.ts'
import { layoutMindMap } from '../utils/mindMap.ts'
import { mapNodeAction, resolveWorkspaceMode, toggleMapBranch } from '../utils/mindMapState.ts'

const node = (id: string, parentId: string | null, order = 1): KnowledgeNode => ({ id, parentId, order, title: id, type: parentId ? 'folder' : 'root', createdAt: 1, updatedAt: 1 })
const fixture = [node('root', null), node('a', 'root'), node('b', 'root', 2), node('a1', 'a'), { ...node('hidden', 'a'), archived: true }, node('hidden-child', 'hidden')]

test('map renders only the selected active subtree with real parent edges', () => {
  const result = layoutMindMap(buildTreeIndex(fixture), 'a')
  assert.deepEqual(result.nodes.map((item) => item.id), ['a', 'a1'])
  assert.deepEqual(result.edges.map(({ source, target }) => [source, target]), [['a', 'a1']])
  assert.deepEqual(layoutMindMap(buildTreeIndex(fixture), 'missing').nodes, [])
})

test('branch collapse hides descendants and restores them without modifying hierarchy', () => {
  const before = structuredClone(fixture)
  const collapsed = toggleMapBranch(new Set(), 'a')
  assert.deepEqual(layoutMindMap(buildTreeIndex(fixture), 'root', collapsed).nodes.map((item) => item.id), ['root', 'a', 'b'])
  assert.equal(layoutMindMap(buildTreeIndex(fixture), 'root', toggleMapBranch(collapsed, 'a')).nodes.length, 4)
  assert.deepEqual(fixture, before)
  assert.equal(collapsed.has('a'), true)
})

test('layout is deterministic, non-overlapping and left-to-right regardless of input order', () => {
  const first = layoutMindMap(buildTreeIndex(fixture), 'root')
  assert.deepEqual(first, layoutMindMap(buildTreeIndex([...fixture].reverse()), 'root'))
  for (const edge of first.edges) {
    const source = first.nodes.find((item) => item.id === edge.source)!
    const target = first.nodes.find((item) => item.id === edge.target)!
    assert.ok(target.position.x > source.position.x + source.width)
  }
  for (const a of first.nodes) for (const b of first.nodes) {
    if (a.id === b.id) continue
    assert.ok(a.position.x + a.width <= b.position.x || b.position.x + b.width <= a.position.x || a.position.y + a.height <= b.position.y || b.position.y + b.height <= a.position.y)
  }
})

test('long titles reserve enough label height and corrupt cycles terminate', () => {
  const long = { ...node('long', 'root'), title: '很长的资料名称'.repeat(50) }
  const result = layoutMindMap(buildTreeIndex([node('root', null), long]), 'root')
  assert.ok(result.nodes[1].height > 80)
  assert.ok(result.nodes[1].height < 300)
  assert.equal(layoutMindMap(buildTreeIndex([node('a', 'b'), node('b', 'a')]), 'a').nodes.length, 2)
})

test('map click previews files but selects folders locally; virtual collections fall back to list', () => {
  assert.deepEqual(mapNodeAction({ ...node('file', 'a'), type: 'document', metadata: { fileId: 'pdf' } }), { type: 'preview', fileId: 'pdf' })
  assert.deepEqual(mapNodeAction(node('a', 'root')), { type: 'select', nodeId: 'a' })
  assert.equal(resolveWorkspaceMode('map', 'favorite'), 'list')
  assert.equal(resolveWorkspaceMode('map', 'tree'), 'map')
  assert.equal(resolveWorkspaceMode('grid', 'recent'), 'grid')
})
