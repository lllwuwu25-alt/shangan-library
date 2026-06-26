import { Download, FileText, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { dataUrlToArrayBuffer, formatFileSize, isDocxFile, isExcelFile, isLegacyWordFile } from '../lib/files'
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
        const arrayBuffer = await dataUrlToArrayBuffer(file.dataUrl)
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
        const arrayBuffer = await dataUrlToArrayBuffer(file.dataUrl)
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

  const body = (() => {
    if (file.type.startsWith('image/')) {
      return (
        <div className="flex min-h-full items-start justify-center p-4">
          <img
            src={file.dataUrl}
            alt={file.name}
            className={imageMode === 'fit' ? 'max-h-full max-w-full object-contain' : 'max-w-none rounded-lg shadow-sm'}
          />
        </div>
      )
    }

    if (file.type === 'application/pdf') {
      return <iframe src={file.dataUrl} title={file.name} className="h-full min-h-[720px] w-full border-0 bg-white" />
    }

    if (isDocxFile(file)) {
      if (docxError) return <UnsupportedPreview file={file} message={docxError} />
      if (!docxHtml) return <LoadingPreview text="正在解析 Word 文档..." />
      return (
        <div className="min-h-full overflow-auto p-4 sm:p-6">
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
      return <iframe src={file.dataUrl} title={file.name} className="h-full min-h-[720px] w-full border-0 bg-white" />
    }

    if (file.type.startsWith('video/')) {
      return (
        <div className="grid min-h-full place-items-center p-4">
          <video src={file.dataUrl} controls className="max-h-full max-w-full rounded-xl bg-black" />
        </div>
      )
    }

    if (file.type.startsWith('audio/')) {
      return (
        <div className="grid min-h-full place-items-center p-4">
          <audio src={file.dataUrl} controls className="w-full max-w-xl" />
        </div>
      )
    }

    if (isLegacyWordFile(file)) {
      return <UnsupportedPreview file={file} message=".doc 老格式暂不支持浏览器内预览，请下载后用 Word / WPS 打开。" />
    }

    return <UnsupportedPreview file={file} message="当前文件类型暂不支持内置预览，请下载后用本机应用打开。" />
  })()

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-3 backdrop-blur-sm sm:p-5">
      <div className="flex h-[92vh] w-full max-w-[1440px] flex-col overflow-hidden rounded-3xl bg-white shadow-2xl ring-1 ring-slate-200">
        <div className="flex min-h-16 items-center justify-between gap-3 border-b border-slate-200 px-4 sm:px-5">
          <div className="min-w-0">
            <h2 className="truncate text-base font-semibold text-slate-950">{file.name}</h2>
            <p className="mt-0.5 truncate text-xs text-slate-500">{file.type || '未知类型'} · {formatFileSize(file.size)}</p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {file.type.startsWith('image/') && (
              <button
                type="button"
                onClick={() => setImageMode((mode) => (mode === 'fit' ? 'actual' : 'fit'))}
                className="hidden h-9 items-center justify-center rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50 sm:inline-flex"
              >
                {imageMode === 'fit' ? '原始大小' : '适应窗口'}
              </button>
            )}
            <a href={file.dataUrl} download={file.name} className="inline-flex h-9 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50">
              <Download size={15} />
              下载
            </a>
            <button type="button" onClick={onClose} className="flex size-9 items-center justify-center rounded-xl text-slate-500 transition hover:bg-slate-100 hover:text-slate-900" aria-label="关闭预览">
              <X size={18} />
            </button>
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-auto bg-slate-100">
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
    <div className="flex min-h-full flex-col">
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
      <div className="flex-1 overflow-auto p-4">
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
        <a href={file.dataUrl} download={file.name} className="mt-4 inline-flex h-9 items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-medium text-white transition hover:bg-blue-700">
          <Download size={15} />
          下载文件
        </a>
      </div>
    </div>
  )
}
