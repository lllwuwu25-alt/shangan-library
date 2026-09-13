/// <reference types="node" />
import test from 'node:test'
import assert from 'node:assert/strict'
import { createBackupDocument, parseBackupDocument } from './backup.ts'
import type { AppData } from '../types.ts'
import { emptyKnowledgeData } from '../features/knowledge-tree/types/knowledge.ts'
import type { KnowledgeBackupBundle } from '../features/knowledge-tree/services/backup.ts'

const appData: AppData = {
  tasks: [{ id: 'task-1', title: '背单词', subject: '英语', minutes: 30, day: '周一', slot: '早晨', date: '2026-09-14', status: 'todo' }],
  weeklyPlan: [],
  resources: [],
  mistakes: [],
  pomodoroSessions: [],
  settings: {
    examName: '研究生考试',
    examDate: '2026-12-20',
    subjects: ['英语'],
    timeSlots: ['早晨'],
    backupReminderDays: 7,
    theme: 'light',
  },
}

const createKnowledge = (): KnowledgeBackupBundle => {
  const data = emptyKnowledgeData(100)
  data.files = [{
    id: 'file-1',
    name: '讲义.pdf',
    mimeType: 'application/pdf',
    size: 4,
    storageKey: 'file-1',
    createdAt: 100,
    updatedAt: 100,
  }]
  return { data, fileBodies: { 'file-1': 'data:application/pdf;base64,VEVTVA==' } }
}

test('creates and parses a versioned complete backup document', () => {
  const createdAt = '2026-09-13T08:00:00.000Z'
  const document = createBackupDocument(appData, createKnowledge(), createdAt)
  const parsed = parseBackupDocument(JSON.stringify(document))

  assert.equal(document.format, 'shangan-library-backup')
  assert.equal(document.version, 2)
  assert.equal(document.createdAt, createdAt)
  assert.deepEqual(document.tasks, appData.tasks)
  assert.deepEqual(parsed.appData.tasks, appData.tasks)
  assert.ok(parsed.knowledge)
  assert.equal(parsed.knowledge.data.files[0].localPath, undefined)
  assert.equal(parsed.knowledge.fileBodies['file-1'], 'data:application/pdf;base64,VEVTVA==')
})

test('continues to parse the flat backup format produced by v0.7', () => {
  const legacy = { ...appData, knowledge: createKnowledge() }
  const parsed = parseBackupDocument(JSON.stringify(legacy))

  assert.deepEqual(parsed.appData.tasks, appData.tasks)
  assert.ok(parsed.knowledge)
  assert.equal(parsed.knowledge.data.files.length, 1)
})

test('rejects a knowledge backup when any file body is missing', () => {
  const knowledge = createKnowledge()
  knowledge.fileBodies = {}
  const document = createBackupDocument(appData, knowledge, '2026-09-13T08:00:00.000Z')

  assert.throws(() => parseBackupDocument(JSON.stringify(document)), /资料文件.*缺失/)
})

test('rejects incomplete or unrelated JSON documents', () => {
  assert.throws(() => parseBackupDocument('{"hello":"world"}'), /不是有效的上岸资料库备份/)
  assert.throws(() => parseBackupDocument('{broken'), /无法解析/)
})
