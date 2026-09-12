import { attachmentToDataUrl } from '../../../lib/files'
import { saveAttachmentBlob } from '../../../lib/fileStorage'
import type { FileAttachment } from '../../../types'
import type { KnowledgeData, ResourceFile } from '../types/knowledge'

export type KnowledgeBackupBundle = {
  data: KnowledgeData
  fileBodies: Record<string, string>
}

const toAttachment = (file: ResourceFile): FileAttachment => ({
  id: file.id,
  name: file.name,
  type: file.mimeType,
  size: file.size,
  storageKey: file.storageKey,
  sourcePath: file.localPath,
})

export async function createKnowledgeBackup(data: KnowledgeData): Promise<KnowledgeBackupBundle> {
  const fileBodies: Record<string, string> = {}
  for (const file of data.files) fileBodies[file.id] = await attachmentToDataUrl(toAttachment(file))
  return { data, fileBodies }
}

export async function restoreKnowledgeBackup(bundle: KnowledgeBackupBundle): Promise<KnowledgeData> {
  const files = await Promise.all(bundle.data.files.map(async (file) => {
    const body = bundle.fileBodies[file.id]
    if (!body) return file
    const storageKey = file.storageKey || file.id
    const blob = await fetch(body).then((response) => response.blob())
    await saveAttachmentBlob(storageKey, blob)
    const restored = { ...file, storageKey }
    delete restored.localPath
    return restored
  }))
  return { ...bundle.data, files }
}

export function isKnowledgeBackup(value: unknown): value is KnowledgeBackupBundle {
  if (!value || typeof value !== 'object') return false
  const candidate = value as Partial<KnowledgeBackupBundle>
  return Boolean(candidate.data && candidate.data.schemaVersion === 2 && Array.isArray(candidate.data.nodes) && Array.isArray(candidate.data.files) && candidate.fileBodies && typeof candidate.fileBodies === 'object')
}
