import { Download, Eye, FileText, Paperclip, X } from 'lucide-react'
import type { ReactNode } from 'react'
import { formatFileSize, isDocxFile, isExcelFile, isPreviewableFile } from '../lib/files'
import type { FileAttachment } from '../types'

type AttachmentListProps = {
  attachments: FileAttachment[]
  onRemove?: (id: string) => void
  onOpen?: (file: FileAttachment) => void
  compact?: boolean
}

export function AttachmentList({ attachments, onRemove, onOpen, compact = false }: AttachmentListProps) {
  if (attachments.length === 0) return null

  return (
    <div className={compact ? 'mt-3 flex flex-wrap gap-2' : 'mt-3 grid gap-2'}>
      {attachments.map((file) => {
        const previewable = isPreviewableFile(file) || isDocxFile(file) || isExcelFile(file)

        return (
          <div
            key={file.id}
            className="flex min-w-0 items-center gap-2 rounded-2xl bg-white px-3 py-2 text-xs text-slate-600 ring-1 ring-slate-200"
          >
            <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-slate-50 text-slate-500">
              {previewable ? <Eye size={14} /> : <FileText size={14} />}
            </span>
            <button
              type="button"
              onClick={() => onOpen?.(file)}
              disabled={!onOpen}
              className="min-w-0 flex-1 text-left"
              title={previewable ? '预览文件' : '打开文件'}
            >
              <span className="block truncate font-medium text-slate-800 hover:text-blue-700">{file.name}</span>
              <span className="mt-0.5 block text-slate-400">{formatFileSize(file.size)}</span>
            </button>
            <a
              href={file.dataUrl}
              download={file.name}
              className="flex size-8 shrink-0 items-center justify-center rounded-xl text-slate-500 transition hover:bg-blue-50 hover:text-blue-700"
              title="下载"
            >
              <Download size={14} />
            </a>
            {onRemove && (
              <button
                type="button"
                onClick={() => onRemove(file.id)}
                className="flex size-8 shrink-0 items-center justify-center rounded-xl text-red-500 transition hover:bg-red-50"
                aria-label={`移除 ${file.name}`}
                title="移除"
              >
                <X size={14} />
              </button>
            )}
          </div>
        )
      })}
    </div>
  )
}

export function UploadHint({ children }: { children: ReactNode }) {
  return (
    <span className="flex items-center gap-1 text-xs font-normal text-blue-600">
      <Paperclip size={12} />
      {children}
    </span>
  )
}
