import { useEffect, useRef, useState } from 'react'
import { getDocument, GlobalWorkerOptions, version, type PDFDocumentProxy, type RenderTask } from 'pdfjs-dist'
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'

GlobalWorkerOptions.workerSrc = workerUrl

export default function PdfPreview({ url }: { url: string }) {
  const [pdf, setPdf] = useState<PDFDocumentProxy | null>(null)
  const [error, setError] = useState('')
  const [width, setWidth] = useState(300)
  const hostRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let cancelled = false
    const assets = `${import.meta.env.BASE_URL}pdfjs/${version}/`
    const loading = getDocument({ url, cMapUrl: `${assets}cmaps/`, cMapPacked: true, standardFontDataUrl: `${assets}standard_fonts/`, wasmUrl: `${assets}wasm/` })
    loading.promise.then((document) => { if (!cancelled) setPdf(document) }).catch(() => { if (!cancelled) setError('PDF 无法读取，文件可能已损坏或需要密码。可下载后用其他阅读器打开。') })
    return () => { cancelled = true; void loading.destroy() }
  }, [url])

  useEffect(() => {
    const host = hostRef.current
    if (!host) return
    const observer = new ResizeObserver(() => setWidth(Math.max(100, host.clientWidth - 24)))
    observer.observe(host)
    return () => observer.disconnect()
  }, [])

  return <div ref={hostRef} className="min-h-full p-3" aria-label="PDF 阅读区域">
    {error ? <p role="alert" className="p-5 text-sm leading-6 text-red-600">{error}</p> : !pdf ? <p role="status" className="p-5 text-center text-sm text-slate-500">正在加载 PDF...</p> : <>
      <p className="mb-3 text-center text-xs text-slate-500">共 {pdf.numPages} 页</p>
      <div className="grid gap-3">{Array.from({ length: pdf.numPages }, (_, index) => <PdfPage key={index} pdf={pdf} pageNumber={index + 1} width={width} />)}</div>
    </>}
  </div>
}

function PdfPage({ pdf, pageNumber, width }: { pdf: PDFDocumentProxy; pageNumber: number; width: number }) {
  const hostRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [nearby, setNearby] = useState(false)
  const [ratio, setRatio] = useState(0.707)
  const [rendered, setRendered] = useState(false)
  const [text, setText] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    const host = hostRef.current!
    const observer = new IntersectionObserver(([entry]) => setNearby(entry.isIntersecting), { root: host.closest('.app-modal__body'), rootMargin: '600px 0px' })
    observer.observe(host)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (!nearby) return
    let cancelled = false
    let render: RenderTask | undefined
    const canvas = canvasRef.current!
    setRendered(false)
    setError('')
    void (async () => {
      const page = await pdf.getPage(pageNumber)
      if (cancelled) return
      const original = page.getViewport({ scale: 1 })
      setRatio(original.width / original.height)
      const viewport = page.getViewport({ scale: width / original.width })
      const scale = Math.min(window.devicePixelRatio || 1, 2)
      canvas.width = Math.ceil(viewport.width * scale)
      canvas.height = Math.ceil(viewport.height * scale)
      render = page.render({ canvas, viewport, transform: scale === 1 ? undefined : [scale, 0, 0, scale, 0, 0] })
      await render.promise
      if (cancelled) return
      setRendered(true)
      const content = await page.getTextContent()
      if (!cancelled) setText(content.items.map((item) => 'str' in item ? item.str : '').join(' '))
    })().catch((reason) => { if (!cancelled && reason?.name !== 'RenderingCancelledException') setError('此页加载失败，请下载文件后查看。') })
    return () => { cancelled = true; render?.cancel(); canvas.width = 0; canvas.height = 0 }
  }, [nearby, pdf, pageNumber, width])

  return <div ref={hostRef} className="mx-auto w-full max-w-4xl">
    <div className="relative w-full bg-white" style={{ aspectRatio: ratio }}>
      {nearby && <canvas ref={canvasRef} role="img" aria-label={`PDF 第 ${pageNumber} 页`} aria-busy={!rendered} className="block h-full w-full" />}
      {(!nearby || !rendered) && !error && <p className="absolute inset-0 grid place-items-center text-sm text-slate-500">第 {pageNumber} 页</p>}
      {error && <p role="alert" className="absolute inset-0 grid place-items-center p-4 text-sm text-red-600">{error}</p>}
      {text && <p className="sr-only">{text}</p>}
    </div>
    <p className="mt-1 text-center text-xs text-slate-500">{pageNumber}</p>
  </div>
}
