import type { AppData, FileAttachment } from '../types.ts'
import type { KnowledgeBackupBundle } from '../features/knowledge-tree/services/backup.ts'

export const BACKUP_FORMAT = 'shangan-library-backup'
export const BACKUP_VERSION = 2

export type BackupDocument = AppData & {
  format: typeof BACKUP_FORMAT
  version: typeof BACKUP_VERSION
  createdAt: string
  knowledge?: KnowledgeBackupBundle
}

export type ParsedBackup = {
  appData: AppData
  knowledge?: KnowledgeBackupBundle
  sourceVersion: number
}

const isRecord = (value: unknown): value is Record<string, unknown> => Boolean(value) && typeof value === 'object' && !Array.isArray(value)

const sanitizeKnowledgeBackup = (bundle: KnowledgeBackupBundle): KnowledgeBackupBundle => ({
  data: {
    ...bundle.data,
    files: bundle.data.files.map(({ localPath: _localPath, ...file }) => file),
  },
  fileBodies: { ...bundle.fileBodies },
})

function assertAppDataShape(value: unknown): asserts value is Partial<AppData> {
  if (!isRecord(value)) throw new Error('不是有效的上岸资料库备份')
  if (!Array.isArray(value.tasks) || !Array.isArray(value.resources) || !Array.isArray(value.mistakes) || !isRecord(value.settings)) {
    throw new Error('不是有效的上岸资料库备份：学习数据结构不完整')
  }
  for (const key of ['tasks', 'resources', 'mistakes'] as const) {
    const items = value[key]
    if (!Array.isArray(items) || items.some((item: unknown) => !isRecord(item))) throw new Error(`不是有效的上岸资料库备份：${key} 数据损坏`)
  }
}

const allLegacyAttachments = (data: AppData) => [
  ...data.resources.flatMap((resource) => resource.attachments),
  ...data.mistakes.flatMap((mistake) => mistake.attachments),
]

const assertPortableAttachment = (file: FileAttachment) => {
  if (!file.id || !file.name || !file.dataUrl?.startsWith('data:')) {
    throw new Error(`附件「${file.name || file.id || '未命名'}」正文缺失，无法完整恢复`)
  }
}

const validateKnowledgeBackup = (value: unknown) => {
  if (!isRecord(value) || !isRecord(value.data) || value.data.schemaVersion !== 2 || !Array.isArray(value.data.nodes) || !Array.isArray(value.data.files) || !isRecord(value.fileBodies)) {
    throw new Error('不是有效的上岸资料库备份：知识树数据损坏')
  }
  const bundle = value as unknown as KnowledgeBackupBundle
  const ids = new Set<string>()
  for (const file of bundle.data.files) {
    if (!file.id || ids.has(file.id)) throw new Error('知识树资料文件标识无效或重复')
    ids.add(file.id)
    const body = bundle.fileBodies[file.id]
    if (typeof body !== 'string' || !body.startsWith('data:')) {
      throw new Error(`资料文件「${file.name || file.id}」正文缺失，无法完整恢复`)
    }
  }
  return sanitizeKnowledgeBackup(bundle)
}

export const createBackupDocument = (appData: AppData, knowledge: KnowledgeBackupBundle | undefined, createdAt: string): BackupDocument => ({
  ...appData,
  format: BACKUP_FORMAT,
  version: BACKUP_VERSION,
  createdAt,
  knowledge: knowledge ? sanitizeKnowledgeBackup(knowledge) : undefined,
})

export const parseBackupDocument = (text: string): ParsedBackup => {
  let raw: unknown
  try {
    raw = JSON.parse(text)
  } catch {
    throw new Error('备份文件无法解析，请确认文件没有损坏')
  }

  if (!isRecord(raw)) throw new Error('不是有效的上岸资料库备份')

  let sourceVersion = 1
  let rawAppData: unknown = raw
  let rawKnowledge: unknown = raw.knowledge

  if ('format' in raw || 'version' in raw || 'appData' in raw) {
    if (raw.format !== BACKUP_FORMAT || raw.version !== BACKUP_VERSION) {
      throw new Error('备份格式或版本不受支持')
    }
    sourceVersion = BACKUP_VERSION
    rawAppData = isRecord(raw.appData) ? raw.appData : raw
    rawKnowledge = raw.knowledge
  }

  assertAppDataShape(rawAppData)
  const appData: AppData = {
    ...rawAppData,
    tasks: rawAppData.tasks ?? [],
    weeklyPlan: Array.isArray(rawAppData.weeklyPlan) ? rawAppData.weeklyPlan : [],
    resources: (rawAppData.resources ?? []).map((resource) => ({
      ...resource,
      attachments: Array.isArray(resource.attachments) ? resource.attachments : [],
    })) as AppData['resources'],
    mistakes: (rawAppData.mistakes ?? []).map((mistake) => ({
      ...mistake,
      attachments: Array.isArray(mistake.attachments) ? mistake.attachments : [],
    })) as AppData['mistakes'],
    pomodoroSessions: Array.isArray(rawAppData.pomodoroSessions) ? rawAppData.pomodoroSessions : [],
    settings: rawAppData.settings as AppData['settings'],
  }
  allLegacyAttachments(appData).forEach(assertPortableAttachment)

  return {
    appData,
    knowledge: rawKnowledge === undefined ? undefined : validateKnowledgeBackup(rawKnowledge),
    sourceVersion,
  }
}
