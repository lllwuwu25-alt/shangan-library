import { isDesktopRuntime } from './desktopFiles.ts'

export const saveBackupText = async (text: string, fileName: string) => {
  if (isDesktopRuntime()) {
    const [{ save }, { writeTextFile }] = await Promise.all([
      import('@tauri-apps/plugin-dialog'),
      import('@tauri-apps/plugin-fs'),
    ])
    const path = await save({
      title: '保存上岸资料库备份',
      defaultPath: fileName,
      filters: [{ name: 'JSON 备份文件', extensions: ['json'] }],
    })
    if (!path) return false
    await writeTextFile(path, text)
    return true
  }

  const blob = new Blob([text], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  link.style.display = 'none'
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
  return true
}

export const pickDesktopBackupText = async () => {
  if (!isDesktopRuntime()) return null
  const [{ open }, { readTextFile }] = await Promise.all([
    import('@tauri-apps/plugin-dialog'),
    import('@tauri-apps/plugin-fs'),
  ])
  const path = await open({
    title: '选择上岸资料库备份',
    multiple: false,
    directory: false,
    filters: [{ name: 'JSON 备份文件', extensions: ['json'] }],
  })
  if (!path || Array.isArray(path)) return null
  return readTextFile(path)
}
