/// <reference types="node" />
import test from 'node:test'
import assert from 'node:assert/strict'
import type { ResourceItem } from '../../../types.ts'
import { migrateLegacyResources } from '../services/migration.ts'

const legacy: ResourceItem[] = [
  { id: 'one', title: '极限公式', category: '数学', description: '常用公式', addedAt: '2026-01-01', attachments: [{ id: 'a', name: '极限.pdf', type: 'application/pdf', size: 12, storageKey: 'a' }] },
  { id: 'many', title: '英语作文', category: '英语', description: '模板合集', addedAt: '2026-01-02', attachments: [{ id: 'b', name: '模板.docx', type: 'application/docx', size: 22, sourcePath: '/tmp/b.docx' }, { id: 'c', name: '例文.jpg', type: 'image/jpeg', size: 33, storageKey: 'c' }] },
  { id: 'note', title: '政治笔记', category: '政治', description: '文字摘要', addedAt: '2026-01-03', attachments: [] },
]

test('migrates categories, single files, collections and notes without changing file references', () => {
  const result = migrateLegacyResources(legacy)
  assert.equal(result.data.schemaVersion, 2)
  assert.equal(result.migratedResourceCount, 3)
  assert.equal(result.data.files.length, 3)
  assert.equal(result.data.nodes.filter((item) => item.type === 'subject').length, 3)
  assert.equal(result.data.nodes.find((item) => item.title === '英语作文')?.type, 'collection')
  assert.equal(result.data.nodes.find((item) => item.title === '政治笔记')?.type, 'note')
  assert.equal(result.data.files.find((item) => item.name === '模板.docx')?.localPath, '/tmp/b.docx')
  assert.equal(result.data.files.find((item) => item.name === '极限.pdf')?.storageKey, 'a')
})

test('repeated migration returns the existing version without duplicate nodes', () => {
  const first = migrateLegacyResources(legacy)
  const second = migrateLegacyResources(legacy, first.data)
  assert.deepEqual(second.data, first.data)
  assert.equal(new Set(second.data.nodes.map((item) => item.id)).size, second.data.nodes.length)
})

test('does not produce schema version 2 when generated data fails integrity checks', () => {
  const malformed = [{ ...legacy[0], attachments: [{ ...legacy[0].attachments[0], id: '' }] }]
  assert.throws(() => migrateLegacyResources(malformed), /迁移失败/)
})
