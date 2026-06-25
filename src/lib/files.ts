import type { FileAttachment } from '../types'

export const formatFileSize = (size: number) => {
  if (size < 1024) return `${size} B`
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`
  return `${(size / 1024 / 1024).toFixed(1)} MB`
}

export const filesToAttachments = async (files: FileList | File[]): Promise<FileAttachment[]> => {
  const list = Array.from(files)
  return Promise.all(list.map((file) => new Promise<FileAttachment>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve({
      id: `file-${crypto.randomUUID?.() ?? Date.now().toString(36)}`,
      name: file.name,
      type: file.type || 'application/octet-stream',
      size: file.size,
      dataUrl: String(reader.result),
    })
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })))
}
