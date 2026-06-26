import type { FileAttachment } from '../types'

const previewableTypes = ['image/', 'application/pdf', 'text/', 'audio/', 'video/']

export const formatFileSize = (size: number) => {
  if (size < 1024) return `${size} B`
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`
  return `${(size / 1024 / 1024).toFixed(1)} MB`
}

export const fileNameWithoutExtension = (name: string) => name.replace(/\.[^/.]+$/, '')

export const isPreviewableFile = (file: FileAttachment) => previewableTypes.some((type) => file.type.startsWith(type))

export const isDocxFile = (file: FileAttachment) => {
  const lowerName = file.name.toLowerCase()
  return file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || lowerName.endsWith('.docx')
}

export const isLegacyWordFile = (file: FileAttachment) => {
  const lowerName = file.name.toLowerCase()
  return file.type === 'application/msword' || lowerName.endsWith('.doc')
}

export const dataUrlToArrayBuffer = async (dataUrl: string) => {
  const response = await fetch(dataUrl)
  return response.arrayBuffer()
}

export const openAttachment = (file: FileAttachment) => {
  const win = window.open('', '_blank', 'noopener,noreferrer')
  if (!win) return false

  win.document.title = file.name
  const safeName = file.name.replace(/[&<>"']/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[char] ?? char)
  const downloadLink = `<a href="${file.dataUrl}" download="${safeName}">下载文件</a>`

  if (file.type.startsWith('image/')) {
    win.document.body.innerHTML = `<style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}.bar{position:fixed;top:16px;right:16px;background:white;border:1px solid #e2e8f0;border-radius:12px;padding:8px 12px;box-shadow:0 8px 24px rgba(15,23,42,.08)}img{max-width:100vw;max-height:100vh;object-fit:contain}</style><div class="bar">${downloadLink}</div><img src="${file.dataUrl}" alt="${safeName}" />`
    return true
  }

  if (file.type === 'application/pdf' || file.type.startsWith('text/') || file.type.startsWith('audio/') || file.type.startsWith('video/')) {
    win.location.href = file.dataUrl
    return true
  }

  win.document.body.innerHTML = `<style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#f8fafc;color:#0f172a;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}.card{max-width:520px;margin:24px;border:1px solid #e2e8f0;border-radius:18px;background:white;padding:24px;box-shadow:0 20px 50px rgba(15,23,42,.08)}h1{font-size:20px;margin:0 0 8px}p{color:#64748b;line-height:1.7}a{display:inline-flex;margin-top:12px;border-radius:12px;background:#2563eb;color:white;padding:10px 14px;text-decoration:none}</style><main class="card"><h1>${safeName}</h1><p>当前文件类型暂不支持浏览器内预览。Word、Excel 等 Office 文件可以下载后用本机应用打开。</p>${downloadLink}</main>`
  return false
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
