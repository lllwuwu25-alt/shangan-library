import { Download, FileText, Library, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { isDesktopRuntime, revealAttachmentInFolder } from '../lib/desktopFiles'
import { attachmentToArrayBufferSafe, attachmentToObjectUrlSafe, downloadAttachmentFile, formatFileSize, isDocxFile, isExcelFile, isImageFile, isLegacyWordFile, isPdfFile } from '../lib/files'
import type { FileAttachment } from '../types'

type SheetPreview = {
  name: string
  rows: string[][]
}

type PreviewMode = 'fit' | 'actual'

export function FilePreviewModal({ file, onClose }: { file: FileAttachment; onClose: () => void }) {
  const [docxHtml, setDocxHtml] = useState('')
  const [docxError, setDocxError] = useState('')
  const [sheets, setSheets] = useState<SheetPreview[]>([])
  const [activeSheet, setActiveSheet] = useState('')
  const [sheetError, setSheetError] = useState('')
  const [imageMode, setImageMode] = useState<PreviewMode>('fit')
  const [objectUrl, setObjectUrl] = useState('')
  const [loadError, setLoadError] = useState('')
  const canReveal = Boolean(file.sourcePath && isDesktopRuntime())

  useEffect(() => {
    let objectUrlToRevoke = ''
    setObjectUrl('')
    setLoadError('')

    attachmentToObjectUrlSafe(file)
      .then((url) => {
        objectUrlToRevoke = url
        setObjectUrl(url)
      })
      .catch(() => setLoadError('文件正文未找到，请重新上传该附件。'))

    return () => {
      if (objectUrlToRevoke) URL.revokeObjectURL(objectUrlToRevoke)
    }
  }, [file])

  useEffect(() => {
    let cancelled = false

    const renderDocx = async () => {
      if (!isDocxFile(file)) {
        setDocxHtml('')
        setDocxError('')
        return
      }

      setDocxHtml('')
      setDocxError('')
      try {
        const mammoth = await import('mammoth/mammoth.browser')
        const arrayBuffer = await attachmentToArrayBufferSafe(file)
        const result = await mammoth.convertToHtml({ arrayBuffer })
        if (!cancelled) setDocxHtml(result.value)
      } catch {
        if (!cancelled) setDocxError('Word 文件解析失败，请下载后用本机 Word / WPS 打开。')
      }
    }

    void renderDocx()
    return () => {
      cancelled = true
    }
  }, [file])

  useEffect(() => {
    let cancelled = false

    const renderExcel = async () => {
      if (!isExcelFile(file)) {
        setSheets([])
        setActiveSheet('')
        setSheetError('')
        return
      }

      setSheets([])
      setActiveSheet('')
      setSheetError('')
      try {
        const XLSX = await import('xlsx')
        const arrayBuffer = await attachmentToArrayBufferSafe(file)
        const workbook = XLSX.read(arrayBuffer, { type: 'array' })
        const nextSheets = workbook.SheetNames.map((name) => {
          const worksheet = workbook.Sheets[name]
          const rows = XLSX.utils.sheet_to_json<string[]>(worksheet, { header: 1, blankrows: false, defval: '' })
          return {
            name,
            rows: rows.map((row) => row.map((cell) => String(cell))),
          }
        }).filter((sheet) => sheet.rows.length > 0)

        if (!cancelled) {
          setSheets(nextSheets)
          setActiveSheet(nextSheets[0]?.name ?? '')
        }
      } catch {
        if (!cancelled) setSheetError('Excel 文件解析失败，请下载后用本机 Excel / WPS 打开。')
      }
    }

    void renderExcel()
    return () => {
      cancelled = true
    }
  }, [file])

  useEffect(() => {
    setImageMode('fit')
  }, [file])

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', closeOnEscape)
    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', closeOnEscape)
    }
  }, [onClose])

  const body = (() => {
    if (loadError) return <UnsupportedPreview file={file} message={loadError} />
    if (!objectUrl) return <LoadingPreview text="正在读取文件..." />

    if (isImageFile(file)) {
      return (
        <div className={`flex min-h-full w-full justify-center p-4 ${imageMode === 'fit' ? 'h-full items-center' : 'items-start'}`}>
          <img
            src={objectUrl}
            alt={file.name}
            className={imageMode === 'fit' ? 'h-full w-full object-contain' : 'h-auto max-w-none rounded-lg shadow-sm'}
          />
        </div>
      )
    }

    if (isPdfFile(file)) {
      return <iframe src={objectUrl} title={file.name} className="block h-full min-h-[70dvh] w-full border-0 bg-white" />
    }

    if (isDocxFile(file)) {
      if (docxError) return <UnsupportedPreview file={file} message={docxError} />
      if (!docxHtml) return <LoadingPreview text="正在解析 Word 文档..." />
      return (
        <div className="min-h-full p-4 sm:p-6">
          <article className="preview-docx mx-auto min-h-full w-full max-w-5xl rounded-2xl bg-white p-6 text-slate-900 shadow-sm ring-1 ring-slate-200 sm:p-8" dangerouslySetInnerHTML={{ __html: docxHtml }} />
        </div>
      )
    }

    if (isExcelFile(file)) {
      if (sheetError) return <UnsupportedPreview file={file} message={sheetError} />
      if (sheets.length === 0) return <LoadingPreview text="正在解析 Excel 表格..." />
      return <ExcelPreview sheets={sheets} activeSheet={activeSheet} onSelectSheet={setActiveSheet} />
    }

    if (file.type.startsWith('text/')) {
      return <iframe src={objectUrl} title={file.name} className="block h-full min-h-[70dvh] w-full border-0 bg-white" />
    }

    if (file.type.startsWith('video/')) {
      return (
        <div className="grid min-h-full place-items-center p-4">
          <video src={objectUrl} controls className="max-h-full max-w-full rounded-xl bg-black" />
        </div>
      )
    }

    if (file.type.startsWith('audio/')) {
      return (
        <div className="grid min-h-full place-items-center p-4">
          <audio src={objectUrl} controls className="w-full max-w-xl" />
        </div>
      )
    }

    if (isLegacyWordFile(file)) {
      return <UnsupportedPreview file={file} message=".doc 老格式暂不支持浏览器内预览，请下载后用 Word / WPS 打开。" />
    }

    return <UnsupportedPreview file={file} message="当前文件类型暂不支持内置预览，请下载后用本机应用打开。" />
  })()

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/65 sm:p-3" role="dialog" aria-modal="true" aria-label={`预览 ${file.name}`}>
      <div className="flex h-[100dvh] w-full flex-col overflow-hidden bg-white shadow-2xl sm:h-[calc(100dvh-1.5rem)] sm:max-w-[1600px] sm:rounded-2xl sm:ring-1 sm:ring-slate-200">
        <div className="flex min-h-16 items-center justify-between gap-3 border-b border-slate-200 px-4 sm:px-5">
          <div className="min-w-0">
            <h2 className="truncate text-base font-semibold text-slate-950">{file.name}</h2>
            <p className="mt-0.5 truncate text-xs text-slate-500">{file.type || '未知类型'} · {formatFileSize(file.size)}</p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {isImageFile(file) && (
              <button
                type="button"
                onClick={() => setImageMode((mode) => (mode === 'fit' ? 'actual' : 'fit'))}
                className="hidden h-9 items-center justify-center rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50 sm:inline-flex"
              >
                {imageMode === 'fit' ? '原始大小' : '适应窗口'}
              </button>
            )}
            {canReveal && (
              <button
                type="button"
                onClick={() => void revealAttachmentInFolder(file).catch(() => window.alert('无法定位原文件，它可能已被移动、重命名或删除。'))}
                className="inline-flex size-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 transition hover:bg-slate-50 sm:w-auto sm:gap-2 sm:px-3"
                title="在文件夹中显示"
              >
                <Library size={15} />
                <span className="hidden sm:inline">所在位置</span>
              </button>
            )}
            <button type="button" onClick={() => void downloadAttachmentFile(file)} className="inline-flex h-9 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50">
              <Download size={15} />
              下载
            </button>
            <button type="button" onClick={onClose} className="flex size-9 items-center justify-center rounded-xl text-slate-500 transition hover:bg-slate-100 hover:text-slate-900" aria-label="关闭预览">
              <X size={18} />
            </button>
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-auto overscroll-contain bg-slate-100">
          {body}
        </div>
      </div>
    </div>
  )
}

function ExcelPreview({ sheets, activeSheet, onSelectSheet }: { sheets: SheetPreview[]; activeSheet: string; onSelectSheet: (sheet: string) => void }) {
  const sheet = useMemo(() => sheets.find((item) => item.name === activeSheet) ?? sheets[0], [activeSheet, sheets])
  const maxColumns = Math.max(...sheet.rows.map((row) => row.length), 1)

  return (
    <div className="min-h-full">
      <div className="sticky top-0 z-10 flex min-h-12 items-center gap-2 overflow-x-auto border-b border-slate-200 bg-white px-4">
        {sheets.map((item) => (
          <button
            key={item.name}
            type="button"
            onClick={() => onSelectSheet(item.name)}
            className={`h-8 shrink-0 rounded-lg px-3 text-sm font-medium transition ${item.name === sheet.name ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-950'}`}
          >
            {item.name}
          </button>
        ))}
      </div>
      <div className="overflow-x-auto p-4">
        <table className="min-w-full border-separate border-spacing-0 rounded-xl bg-white text-left text-sm shadow-sm ring-1 ring-slate-200">
          <tbody>
            {sheet.rows.map((row, rowIndex) => (
              <tr key={`${sheet.name}-${rowIndex}`} className={rowIndex === 0 ? 'bg-slate-50 font-semibold text-slate-900' : 'text-slate-700'}>
                {Array.from({ length: maxColumns }).map((_, columnIndex) => (
                  <td key={`${sheet.name}-${rowIndex}-${columnIndex}`} className="max-w-[360px] whitespace-pre-wrap break-words border-b border-r border-slate-200 px-3 py-2 align-top last:border-r-0">
                    {row[columnIndex]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function LoadingPreview({ text }: { text: string }) {
  return <div className="grid min-h-full place-items-center p-6 text-sm text-slate-500">{text}</div>
}

function UnsupportedPreview({ file, message }: { file: FileAttachment; message: string }) {
  return (
    <div className="grid min-h-full place-items-center p-6">
      <div className="max-w-md rounded-2xl bg-white p-6 text-center shadow-sm ring-1 ring-slate-200">
        <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
          <FileText size={22} />
        </div>
        <h3 className="mt-4 break-words text-base font-semibold text-slate-950">{file.name}</h3>
        <p className="mt-2 text-sm leading-6 text-slate-500">{message}</p>
        <button type="button" onClick={() => void downloadAttachmentFile(file)} className="mt-4 inline-flex h-9 items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-medium text-white transition hover:bg-blue-700">
          <Download size={15} />
          下载文件
        </button>
      </div>
    </div>
  )
}
