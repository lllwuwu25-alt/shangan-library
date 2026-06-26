import { Download, HardDrive, RotateCcw, Upload } from 'lucide-react'
import { useRef, useState } from 'react'
import { PageHeader } from '../components/Layout'
import { Button, Card, DangerButton, GhostButton, SectionTitle, TextInput } from '../components/ui'
import { useStudyStore } from '../store/useStudyStore'
import type { AppData } from '../types'

export function Settings() {
  const store = useStudyStore()
  const fileRef = useRef<HTMLInputElement>(null)
  const [message, setMessage] = useState('')

  const data: AppData = {
    tasks: store.tasks,
    weeklyPlan: store.weeklyPlan,
    resources: store.resources,
    mistakes: store.mistakes,
    settings: store.settings,
  }

  const exportJson = () => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `上岸资料库-${new Date().toISOString().slice(0, 10)}.json`
    link.click()
    URL.revokeObjectURL(url)
    setMessage('已导出当前数据 JSON。')
  }

  const importJson = async (file?: File) => {
    if (!file) return
    try {
      const text = await file.text()
      const imported = JSON.parse(text) as AppData
      if (!imported.tasks || !imported.weeklyPlan || !imported.resources || !imported.mistakes || !imported.settings) {
        throw new Error('数据结构不完整')
      }
      store.importData(imported)
      setMessage('导入成功，数据已写入本地存储。')
    } catch {
      setMessage('导入失败，请确认 JSON 来自上岸资料库导出文件。')
    } finally {
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  return (
    <>
      <PageHeader title="设置" description="配置考试信息，导入导出本地数据，或在需要时重置系统。" />
      <div className="grid gap-5 xl:grid-cols-[1fr_360px]">
        <Card>
          <SectionTitle title="考试信息" caption="倒计时会同步到首页和学习计划。" />
          <div className="grid gap-4 md:grid-cols-2">
            <label className="grid gap-2 text-sm font-medium text-slate-700">
              考试名称
              <TextInput value={store.settings.examName} onChange={(event) => store.updateSettings({ examName: event.target.value })} />
            </label>
            <label className="grid gap-2 text-sm font-medium text-slate-700">
              考试日期
              <TextInput type="date" value={store.settings.examDate} onChange={(event) => store.updateSettings({ examDate: event.target.value })} />
            </label>
          </div>
        </Card>
        <Card>
          <SectionTitle title="数据管理" caption="建议在重要更新后导出备份。" />
          <div className="grid gap-3">
            <Button className="w-full" onClick={exportJson}><Download size={16} />导出数据 JSON</Button>
            <input ref={fileRef} type="file" accept="application/json,.json" className="hidden" onChange={(event) => importJson(event.target.files?.[0])} />
            <GhostButton className="w-full" onClick={() => fileRef.current?.click()}><Upload size={16} />导入数据 JSON</GhostButton>
            <DangerButton className="w-full" onClick={() => { if (confirm('确认清空所有本地数据？此操作会恢复为空白初始状态。')) { store.resetData(); setMessage('已清空数据，系统已恢复为空白初始状态。') } }}><RotateCcw size={16} />清空数据</DangerButton>
            {message && <p className="rounded-xl bg-blue-50 px-3 py-2 text-sm text-blue-800">{message}</p>}
          </div>
        </Card>
      </div>
      <Card className="mt-5">
        <SectionTitle title="本地运行说明" />
        <div className="grid gap-3 text-sm leading-6 text-slate-600 md:grid-cols-3">
          {[
            '本系统不包含登录、云同步或 AI 功能，所有学习数据仅保存在当前浏览器的 localStorage 中。',
            '如果更换浏览器、清理站点数据或使用隐私模式，数据可能不可用。建议定期导出 JSON 备份。',
            '第二版可以继续扩展 IndexedDB 文件索引、番茄钟、批量导入、统计图和多考试档案。',
          ].map((text) => (
            <div key={text} className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200/70">
              <HardDrive size={17} className="mb-2 text-emerald-600" />
              <p>{text}</p>
            </div>
          ))}
        </div>
      </Card>
    </>
  )
}
