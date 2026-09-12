/// <reference types="node" />
import test from 'node:test'
import assert from 'node:assert/strict'
import { createDemoKnowledgeBundle } from '../services/demoData.ts'
import { validateKnowledgeTree } from '../utils/tree.ts'

test('creates a useful knowledge-tree demo with folders, notes and previewable files', () => {
  const bundle = createDemoKnowledgeBundle(1_780_000_000_000)
  const activeNodes = bundle.data.nodes.filter((node) => !node.archived)

  assert.equal(validateKnowledgeTree(activeNodes).valid, true)
  assert.equal(activeNodes.some((node) => node.type === 'subject'), true)
  assert.equal(activeNodes.some((node) => node.type === 'chapter'), true)
  assert.equal(activeNodes.some((node) => node.type === 'note' && node.metadata?.noteContent), true)
  assert.equal(bundle.data.files.length >= 3, true)
  assert.equal(bundle.data.tags.length >= 4, true)
  assert.equal(bundle.data.nodeTags.length >= 4, true)
  assert.equal(bundle.data.relations.length >= 1, true)
  assert.equal(activeNodes.some((node) => node.favorite), true)
  assert.equal(activeNodes.some((node) => node.learningStatus === 'review'), true)
  assert.equal(activeNodes.some((node) => node.learningStatus === 'mastered'), true)
})

test('demo file bodies are complete, previewable and never reference a local path', () => {
  const bundle = createDemoKnowledgeBundle(1_780_000_000_000)
  const filesWithBodies = bundle.data.files.filter((file) => bundle.fileBodies[file.id])

  assert.equal(filesWithBodies.length, bundle.data.files.length)
  assert.equal(bundle.data.files.every((file) => !file.localPath), true)
  assert.equal(bundle.data.files.every((file) => file.storageKey?.startsWith('demo-')), true)
  assert.equal(Object.values(bundle.fileBodies).every((body) => body.startsWith('data:')), true)
  assert.equal(bundle.data.files.some((file) => file.mimeType === 'application/pdf'), true)
  assert.equal(bundle.data.files.some((file) => file.mimeType.startsWith('image/')), true)
  assert.equal(bundle.data.files.some((file) => file.mimeType.startsWith('text/')), true)
})
