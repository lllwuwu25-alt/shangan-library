import { useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { isDesktopRuntime, pickDesktopAttachments } from '../lib/desktopFiles'
import { filesToAttachments } from '../lib/files'
import type { FileAttachment } from '../types'

type FilePickerProps = {
  children: ReactNode
  className: string
  multiple?: boolean
  onFiles: (files: FileAttachment[]) => void | Promise<void>
}

export function FilePicker({ children, className, multiple = true, onFiles }: FilePickerProps) {
  const [isReading, setIsReading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const chooseDesktopFiles = async () => {
    setIsReading(true)
    try {
      const files = await pickDesktopAttachments(multiple)
      if (files.length > 0) await onFiles(files)
    } catch (error) {
      window.alert(error instanceof Error ? `读取文件失败：${error.message}` : '读取文件失败，请重试。')
    } finally {
      setIsReading(false)
    }
  }

  if (isDesktopRuntime()) {
    return (
      <button type="button" className={className} disabled={isReading} onClick={() => void chooseDesktopFiles()}>
        {isReading ? <span className="text-sm font-medium">正在读取文件...</span> : children}
      </button>
    )
  }

  return (
    <label className={className} role="button" tabIndex={isReading ? -1 : 0} aria-disabled={isReading} aria-busy={isReading} onClick={(event) => { if (isReading) event.preventDefault() }} onKeyDown={(event) => { if (!isReading && (event.key === 'Enter' || event.key === ' ')) { event.preventDefault(); inputRef.current?.click() } }}>
      {isReading ? <span className="text-sm font-medium">正在导入文件...</span> : children}
      <input
        ref={inputRef}
        type="file"
        multiple={multiple}
        className="hidden"
        disabled={isReading}
        onChange={async (event) => {
          if (!event.target.files?.length) return
          const input = event.target
          setIsReading(true)
          try {
            const files = await filesToAttachments(input.files!)
            await onFiles(files)
          } catch (error) {
            window.alert(error instanceof Error ? `导入失败：${error.message}` : '文件导入失败，请检查设备可用空间后重试。')
          } finally {
            input.value = ''
            setIsReading(false)
          }
        }}
      />
    </label>
  )
}
