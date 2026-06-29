import { Bell, Database, Download, HardDrive, Moon, Plus, RotateCcw, ShieldCheck, SunMedium, Trash2, Upload } from 'lucide-react'
import type { ReactNode } from 'react'
import { useRef, useState } from 'react'
import { PageHeader } from '../components/Layout'
import { Button, Card, DangerButton, GhostButton, Panel, SectionTitle, Select, TextInput } from '../components/ui'
import { defaultResourceCategories, defaultSubjects, subjectOptions } from '../constants'
import { STORAGE_KEY } from '../lib/storage'
import { useStudyStore } from '../store/useStudyStore'
import type { AppData, Subject, ThemeMode } from '../types'

export function Settings() {
  const store = useStudyStore()
  const fileRef = useRef<HTMLInputElement>(null)
  const [message, setMessage] = useState('')
  const [newSubject, setNewSubject] = useState('')

  const data: AppData = {
    tasks: store.tasks,
    weeklyPlan: store.weeklyPlan,
    resources: store.resources,
    mistakes: store.mistakes,
    settings: store.settings,
  }
  const storageBytes = getLocalStorageBytes()
  const lastBackupText = store.settings.lastBackupAt ? formatDateTime(store.settings.lastBackupAt) : '从未备份'
  const reminderStatus = getBackupReminderStatus(store.settings.lastBackupAt, store.settings.backupReminderDays)
  const subjects = subjectOptions([...store.settings.subjects, ...getUsedSubjects(data)])

  const addSubject = () => {
    const name = newSubject.trim()
    if (!name) return
    if (subjects.includes(name)) {
      setMessage('这个科目已经存在。')
      return
    }
    store.updateSettings({ subjects: [...subjects, name] })
    setNewSubject('')
    setMessage(`已新增科目：${name}`)
  }

  const removeSubject = (subject: Subject) => {
    const usageCount = getSubjectUsageCount(subject, data)
    if (usageCount > 0) {
      setMessage(`「${subject}」已被 ${usageCount} 条数据使用，暂不能删除。`)
      return
    }
    if (subjects.length <= 1) {
      setMessage('至少保留一个科目。')
      return
    }
    store.updateSettings({ subjects: subjects.filter((item) => item !== subject) })
    setMessage(`已删除科目：${subject}`)
  }

  const exportBackup = () => {
    const backedUpAt = new Date().toISOString()
    const backupData = {
      ...data,
      settings: {
        ...store.settings,
        lastBackupAt: backedUpAt,
      },
    }
    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `上岸资料库-备份-${new Date().toISOString().slice(0, 10)}.json`
    link.click()
    URL.revokeObjectURL(url)
    store.updateSettings({ lastBackupAt: backedUpAt })
    setMessage('备份已生成，并记录了本次备份时间。')
  }

  const importBackup = async (file?: File) => {
    if (!file) return
    try {
      const text = await file.text()
      const imported = JSON.parse(text) as AppData
      if (!imported.tasks || !imported.weeklyPlan || !imported.resources || !imported.mistakes || !imported.settings) {
        throw new Error('数据结构不完整')
      }
      store.importData(imported)
      setMessage('恢复成功，备份数据已写入本地。')
    } catch {
      setMessage('恢复失败，请选择上岸资料库生成的备份文件。')
    } finally {
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  return (
    <>
      <PageHeader title="设置" description="管理考试信息、数据安全、备份恢复和界面主题。" />
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="space-y-5">
          <Card>
            <SectionTitle title="数据安全中心" caption="把导入导出包装成更直观的备份和恢复流程。" />
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
              <div className="rounded-2xl bg-slate-950 p-5 text-white">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm text-slate-300">本地存储状态</p>
                    <h2 className="mt-1 text-2xl font-semibold tracking-tight">{storageBytes > 0 ? '运行正常' : '等待写入数据'}</h2>
                    <p className="mt-2 text-sm leading-6 text-slate-300">所有数据保存在当前设备。建议定期备份，换电脑或清理浏览器数据前先导出备份文件。</p>
                  </div>
                  <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-white/10">
                    <ShieldCheck size={22} />
                  </div>
                </div>
                <div className="mt-5 grid gap-3 sm:grid-cols-3">
                  <Metric label="资料" value={`${store.resources.length} 份`} />
                  <Metric label="错题" value={`${store.mistakes.length} 条`} />
                  <Metric label="计划" value={`${store.tasks.length} 个`} />
                </div>
              </div>
              <div className="grid gap-3">
                <Button className="w-full" onClick={exportBackup}><Download size={16} />立即备份</Button>
                <input ref={fileRef} type="file" accept="application/json,.json" className="hidden" onChange={(event) => importBackup(event.target.files?.[0])} />
                <GhostButton className="w-full" onClick={() => fileRef.current?.click()}><Upload size={16} />恢复备份</GhostButton>
                <Panel>
                  <p className="text-xs text-slate-500">上次备份时间</p>
                  <p className="mt-1 text-sm font-medium text-slate-900">{lastBackupText}</p>
                </Panel>
                <Panel className={reminderStatus.isDue ? 'bg-amber-50 text-amber-900 ring-amber-100' : 'bg-emerald-50 text-emerald-900 ring-emerald-100'}>
                  <div className="flex items-start gap-2">
                    <Bell size={15} className="mt-0.5 shrink-0" />
                    <p className="text-xs leading-5">{reminderStatus.text}</p>
                  </div>
                </Panel>
              </div>
            </div>
            {message && <p className="mt-4 rounded-xl bg-blue-50 px-3 py-2 text-sm text-blue-800">{message}</p>}
          </Card>

          <Card>
            <SectionTitle title="本地存储空间统计" caption="帮助用户理解当前资料库体量和备份状态。" />
            <div className="grid gap-3 md:grid-cols-5">
              <StorageStat icon={<Database size={16} />} label="资料数量" value={`${store.resources.length}`} />
              <StorageStat icon={<ShieldCheck size={16} />} label="错题数量" value={`${store.mistakes.length}`} />
              <StorageStat icon={<HardDrive size={16} />} label="学习计划" value={`${store.tasks.length}`} />
              <StorageStat icon={<Download size={16} />} label="最近备份" value={store.settings.lastBackupAt ? '已备份' : '未备份'} />
              <StorageStat icon={<Database size={16} />} label="本地占用" value={formatBytes(storageBytes)} />
            </div>
          </Card>

          <Card>
            <SectionTitle title="考试信息" caption="倒计时会同步到首页和学习计划。" />
            <div className="grid gap-4 md:grid-cols-2">
              <label className="grid gap-2 text-sm font-medium text-slate-700">
                考试名称
                <TextInput value={store.settings.examName} onChange={(event) => store.updateSettings({ examName: event.target.value })} placeholder="例如 2027 考研初试" />
              </label>
              <label className="grid gap-2 text-sm font-medium text-slate-700">
                考试日期
                <TextInput type="date" value={store.settings.examDate} onChange={(event) => store.updateSettings({ examDate: event.target.value })} />
              </label>
            </div>
          </Card>

          <Card>
            <SectionTitle title="科目管理" caption="按自己的考试科目添加，例如法硕、计算机、会计、教资、行测、申论。" />
            <div className="grid gap-4">
              <div className="flex gap-2">
                <TextInput
                  placeholder="输入新科目"
                  value={newSubject}
                  onChange={(event) => setNewSubject(event.target.value)}
                  onKeyDown={(event) => { if (event.key === 'Enter') addSubject() }}
                />
                <Button type="button" onClick={addSubject}><Plus size={16} />添加</Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {subjects.map((subject) => {
                  const usageCount = getSubjectUsageCount(subject, data)
                  return (
                    <span key={subject} className="inline-flex items-center gap-2 rounded-full bg-slate-50 px-2.5 py-1 text-sm font-medium text-slate-700 ring-1 ring-slate-200">
                      {subject}
                      {usageCount > 0 && <span className="text-xs font-normal text-slate-500">{usageCount} 条</span>}
                      <button
                        type="button"
                        disabled={usageCount > 0 || subjects.length <= 1}
                        onClick={() => removeSubject(subject)}
                        title={usageCount > 0 ? '已有数据使用该科目，暂不能删除' : '删除科目'}
                        className="flex size-6 items-center justify-center rounded-full text-slate-400 transition hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        <Trash2 size={12} />
                      </button>
                    </span>
                  )
                })}
              </div>
              <Panel>
                <p className="text-xs leading-5 text-slate-500">科目会同步到学习计划、错题本和资料库的科目分类。已有数据使用中的科目会锁定，避免误删后找不到记录。</p>
              </Panel>
              <GhostButton type="button" className="w-fit" onClick={() => store.updateSettings({ subjects: subjectOptions([...defaultSubjects, ...getUsedSubjects(data)]) })}>恢复默认科目</GhostButton>
            </div>
          </Card>
        </div>

        <div className="space-y-5">
          <Card>
            <SectionTitle title="备份提醒" caption="设置多久提醒自己备份一次。" />
            <div className="grid gap-3">
              <label className="grid gap-2 text-sm font-medium text-slate-700">
                提醒间隔
                <Select value={store.settings.backupReminderDays} onChange={(event) => store.updateSettings({ backupReminderDays: Number(event.target.value) })}>
                  <option value={3}>每 3 天</option>
                  <option value={7}>每 7 天</option>
                  <option value={14}>每 14 天</option>
                  <option value={30}>每 30 天</option>
                </Select>
              </label>
              <Panel>
                <p className="text-sm leading-6 text-slate-600">备份文件会自动命名为「上岸资料库-备份-日期.json」，用户无需理解 JSON，也能完成迁移和恢复。</p>
              </Panel>
            </div>
          </Card>

          <Card>
            <SectionTitle title="主题选择" caption="夜间模式适合晚上复盘或长时间整理资料。" />
            <div className="grid gap-3">
              <label className="grid gap-2 text-sm font-medium text-slate-700">
                界面主题
                <Select value={store.settings.theme} onChange={(event) => store.updateSettings({ theme: event.target.value as ThemeMode })}>
                  <option value="light">浅色模式</option>
                  <option value="dark">夜间模式</option>
                  <option value="system">跟随系统</option>
                </Select>
              </label>
              <div className="grid grid-cols-2 gap-3">
                <Panel className="bg-white">
                  <SunMedium size={17} className="mb-2 text-blue-600" />
                  <p className="text-xs text-slate-500">白天整理资料</p>
                </Panel>
                <Panel className="bg-slate-950 text-white ring-slate-800">
                  <Moon size={17} className="mb-2 text-blue-300" />
                  <p className="text-xs text-slate-300">夜间复盘错题</p>
                </Panel>
              </div>
            </div>
          </Card>

          <Card>
            <SectionTitle title="清空数据" caption="恢复为空白初始状态。" />
            <DangerButton className="w-full" onClick={() => { if (confirm('确认清空所有本地数据？此操作会恢复为空白初始状态。')) { store.resetData(); setMessage('已清空数据，系统已恢复为空白初始状态。') } }}><RotateCcw size={16} />清空数据</DangerButton>
          </Card>
        </div>
      </div>
      <Card className="mt-5">
        <SectionTitle title="本地运行说明" />
        <div className="grid gap-3 text-sm leading-6 text-slate-600 md:grid-cols-3">
          {[
            '本系统不包含登录、云同步或 AI 功能，所有学习数据仅保存在当前设备的本地存储中。',
            '如果更换设备、清理站点数据或使用隐私模式，数据可能不可用。建议定期点击「立即备份」。',
            '本系统可以在当前设备上独立使用，学习计划、资料索引和错题记录都会保存在本地。',
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

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-white/8 px-3 py-2 ring-1 ring-white/10">
      <p className="text-xs text-slate-300">{label}</p>
      <p className="mt-1 text-lg font-semibold text-white">{value}</p>
    </div>
  )
}

function StorageStat({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <Panel>
      <div className="mb-2 flex size-8 items-center justify-center rounded-xl bg-blue-50 text-blue-700">{icon}</div>
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-1 text-lg font-semibold text-slate-950">{value}</p>
    </Panel>
  )
}

function getLocalStorageBytes() {
  const value = localStorage.getItem(STORAGE_KEY) ?? ''
  return new Blob([value]).size
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function getBackupReminderStatus(lastBackupAt: string | undefined, reminderDays: number) {
  if (!lastBackupAt) {
    return { isDue: true, text: '还没有备份记录，建议现在点击「立即备份」。' }
  }

  const elapsedDays = Math.floor((Date.now() - new Date(lastBackupAt).getTime()) / 86400000)
  if (elapsedDays >= reminderDays) {
    return { isDue: true, text: `距离上次备份已 ${elapsedDays} 天，建议重新备份。` }
  }

  return { isDue: false, text: `备份状态良好，距离下次提醒还有 ${reminderDays - elapsedDays} 天。` }
}

function getSubjectUsageCount(subject: Subject, data: AppData) {
  return data.tasks.filter((task) => task.subject === subject).length
    + data.mistakes.filter((mistake) => mistake.subject === subject).length
    + data.resources.filter((resource) => resource.category === subject).length
}

function getUsedSubjects(data: AppData) {
  return [
    ...data.tasks.map((task) => task.subject),
    ...data.mistakes.map((mistake) => mistake.subject),
    ...data.resources.map((resource) => resource.category).filter((category) => !defaultResourceCategories.includes(category)),
  ]
}
