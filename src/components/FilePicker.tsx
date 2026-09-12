import { useState } from 'react'
import type { ReactNode } from 'react'
import { isDesktopRuntime, pickDesktopAttachments } from '../lib/desktopFiles'
import { filesToAttachments } from '../lib/files'
import type { FileAttachment } from '../types'

type FilePickerProps = {
  children: ReactNode
  className: string
  multiple?: boolean
  onFiles: (files: FileAttachment[]) => void
}

export function FilePicker({ children, className, multiple = true, onFiles }: FilePickerProps) {
  const [isReading, setIsReading] = useState(false)

  const chooseDesktopFiles = async () => {
    setIsReading(true)
    try {
      const files = await pickDesktopAttachments(multiple)
      if (files.length > 0) onFiles(files)
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
    <label className={className}>
      {children}
      <input
        type="file"
        multiple={multiple}
        className="hidden"
        onChange={async (event) => {
          if (!event.target.files?.length) return
          const files = await filesToAttachments(event.target.files)
          onFiles(files)
          event.target.value = ''
        }}
      />
    </label>
  )
}
