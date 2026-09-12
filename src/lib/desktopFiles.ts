import type { FileAttachment } from '../types'

const mimeTypes: Record<string, string> = {
  bmp: 'image/bmp',
  csv: 'text/csv',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  gif: 'image/gif',
  jpeg: 'image/jpeg',
  jpg: 'image/jpeg',
  mp3: 'audio/mpeg',
  mp4: 'video/mp4',
  pdf: 'application/pdf',
  png: 'image/png',
  svg: 'image/svg+xml',
  txt: 'text/plain',
  webp: 'image/webp',
  xls: 'application/vnd.ms-excel',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
}

export const isDesktopRuntime = () => typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window

const fileNameFromPath = (path: string) => path.split(/[\\/]/).pop() || '未命名文件'

const mimeTypeFromName = (name: string) => {
  const extension = name.split('.').pop()?.toLowerCase() ?? ''
  return mimeTypes[extension] ?? 'application/octet-stream'
}

export const pickDesktopAttachments = async (multiple = true): Promise<FileAttachment[]> => {
  if (!isDesktopRuntime()) return []

  const [{ open }, { stat }] = await Promise.all([
    import('@tauri-apps/plugin-dialog'),
    import('@tauri-apps/plugin-fs'),
  ])
  const selected = await open({ multiple, directory: false })
  if (!selected) return []

  const paths = Array.isArray(selected) ? selected : [selected]
  return Promise.all(paths.map(async (path) => {
    const name = fileNameFromPath(path)
    const metadata = await stat(path)
    return {
      id: `file-${crypto.randomUUID?.() ?? Date.now().toString(36)}`,
      name,
      type: mimeTypeFromName(name),
      size: metadata.size,
      sourcePath: path,
    }
  }))
}

export const revealAttachmentInFolder = async (file: FileAttachment) => {
  if (!file.sourcePath || !isDesktopRuntime()) throw new Error('该附件没有可用的原始文件位置')
  const { revealItemInDir } = await import('@tauri-apps/plugin-opener')
  await revealItemInDir(file.sourcePath)
}
