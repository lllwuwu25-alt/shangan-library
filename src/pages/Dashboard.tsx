import { ArrowRight, CheckCircle2, Clock, Database, Flame, HardDrive, TimerReset } from 'lucide-react'
import { currentDayName, daysUntil, isoForCurrentWeekDay, todayIso, weekRange } from '../lib/date'
import { useStudyStore } from '../store/useStudyStore'
import { Card, EmptyState, GhostButton, Panel, Pill, SectionTitle, StatCard } from '../components/ui'
import { PageHeader } from '../components/Layout'

export function Dashboard({ go }: { go: (path: string) => void }) {
  const { tasks, resources, settings, toggleTask } = useStudyStore()
  const todayDay = currentDayName()
  const todayDate = todayIso()
  const currentWeek = weekRange(0)
  const currentWeekTasks = tasks.filter((task) => task.date >= currentWeek.start && task.date <= currentWeek.end)
  const todayTasks = tasks.filter((task) => task.date === todayDate)
  const done = tasks.filter((task) => task.status === 'done')
  const todayDone = todayTasks.filter((task) => task.status === 'done')
  const nextTask = todayTasks.find((task) => task.status !== 'done')
  const todayMinutes = done.filter((task) => task.date === todayDate).reduce((sum, task) => sum + task.minutes, 0)
  const currentWeekDone = currentWeekTasks.filter((task) => task.status === 'done')
  const completion = currentWeekTasks.length ? Math.round((currentWeekDone.length / currentWeekTasks.length) * 100) : 0
  const dayPlan = todayTasks
  const countdown = daysUntil(settings.examDate)
  const examName = settings.examName || '考试'
  const countdownText = countdown === null ? '未设置' : `${countdown} 天`
  const subjectProgress = ['英语', '政治', '数学', '专业课'].map((subject) => {
    const subjectTasks = tasks.filter((task) => task.subject === subject)
    const doneCount = subjectTasks.filter((task) => task.status === 'done').length
    return { subject, value: subjectTasks.length ? Math.round((doneCount / subjectTasks.length) * 100) : 0 }
  })
  const heatmap = buildHeatmap(done)
  const streak = calculateStreak(heatmap.days)
  const activeDays = heatmap.days.filter((day) => day.minutes > 0).length
  const bestDay = heatmap.days.reduce((best, day) => (day.minutes > best.minutes ? day : best), heatmap.days[0])
  const currentGap = calculateCurrentGap(heatmap.days)
  const monthMinutes = done
    .filter((task) => task.date.startsWith(todayIsoMonth()))
    .reduce((sum, task) => sum + task.minutes, 0)

  return (
    <>
      <PageHeader title="首页总览" description="今天先看最该做的事，再处理资料和错题。所有数据保存在本机浏览器中。" />
      <section className="mb-5 rounded-3xl bg-slate-950 p-5 text-white shadow-soft">
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-center">
          <div>
            <p className="text-sm text-blue-200">{todayDay} · {isoForCurrentWeekDay(todayDay)}</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight">今天的学习焦点已经同步到计划表</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">
              今日共有 {todayTasks.length} 个任务，已完成 {todayDone.length} 个。{nextTask ? `下一项建议处理：${nextTask.slot}的${nextTask.title}。` : '今日任务已清空，可以进入错题本做轻量复盘。'}
            </p>
          </div>
          <div className="rounded-2xl bg-white/8 p-4 ring-1 ring-white/10">
            <p className="text-sm text-slate-300">距离 {examName}</p>
            <p className="mt-1 text-4xl font-semibold tracking-tight">{countdownText}</p>
            <button type="button" onClick={() => go('/plan')} className="mt-4 inline-flex items-center gap-2 rounded-xl bg-white px-3 py-2 text-sm font-medium text-slate-950 transition hover:bg-blue-50">
              调整今日计划
              <ArrowRight size={15} />
            </button>
          </div>
        </div>
      </section>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={<TimerReset size={18} />} label="考试倒计时" value={countdownText} detail={settings.examName || '请在设置中填写考试信息'} />
        <StatCard icon={<Clock size={18} />} label="今日学习时长" value={`${Math.floor(todayMinutes / 60)}h ${todayMinutes % 60}m`} detail={`${todayDone.length}/${todayTasks.length} 个任务完成`} tone="slate" />
        <StatCard icon={<CheckCircle2 size={18} />} label="本周完成率" value={`${completion}%`} detail="按本周计划任务计算" tone="green" />
        <StatCard icon={<Database size={18} />} label="累计资料数" value={`${resources.length} 份`} detail="含文件附件索引" tone="amber" />
      </div>
      <div className="mt-5 grid gap-5 xl:grid-cols-[1.2fr_.8fr]">
        <Card>
          <SectionTitle title={`${todayDay} 今日任务`} action={<GhostButton onClick={() => go('/plan')}>管理计划</GhostButton>} />
          <div className="space-y-3">
            {todayTasks.length === 0 ? <EmptyState text="今天还没有任务，可以去学习计划中添加。" /> : todayTasks.map((task) => (
              <div key={task.id} className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 px-3 py-3 ring-1 ring-slate-200/60 transition hover:bg-blue-50/70">
                <button type="button" onClick={() => toggleTask(task.id)} className="flex min-w-0 items-center gap-3 text-left">
                  <span className={`flex size-5 shrink-0 items-center justify-center rounded-full border ${task.status === 'done' ? 'border-blue-600 bg-blue-600' : 'border-slate-300 bg-white'}`}>
                    {task.status === 'done' && <CheckCircle2 size={13} className="text-white" />}
                  </span>
                  <span className="min-w-0">
                    <span className={`block truncate text-sm font-medium ${task.status === 'done' ? 'text-slate-400 line-through' : 'text-slate-900'}`}>{task.title}</span>
                    <span className="text-xs text-slate-500">{task.slot} · {task.subject} · {task.minutes} 分钟 · {task.date}</span>
                  </span>
                </button>
                <Pill tone={task.status === 'done' ? 'green' : 'blue'}>{task.status === 'done' ? '已完成' : '待完成'}</Pill>
              </div>
            ))}
          </div>
        </Card>
        <div className="space-y-5">
          <Card>
            <SectionTitle title="科目进度" />
            <div className="space-y-4">
              {subjectProgress.map((item) => (
                <div key={item.subject}>
                  <div className="mb-1.5 flex justify-between text-sm">
                    <span className="font-medium text-slate-700">{item.subject}</span>
                    <span className="text-slate-500">{item.value}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-100">
                    <div className="h-2 rounded-full bg-blue-500" style={{ width: `${item.value}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </Card>
          <Card>
            <SectionTitle title="本地运行状态" />
            <div className="flex items-start gap-3 rounded-xl bg-emerald-50 p-3 text-sm leading-6 text-emerald-800 ring-1 ring-emerald-100">
              <HardDrive className="mt-0.5 shrink-0" size={18} />
              <p>运行正常。当前数据通过 localStorage 保存在本机浏览器，刷新后不会丢失，不会上传到云端。</p>
            </div>
          </Card>
        </div>
      </div>
      <Card className="mt-5">
        <SectionTitle
          title="学习热力图"
          caption="按已完成任务统计最近 12 周学习强度，颜色越深代表投入越多。"
          action={<span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700 ring-1 ring-emerald-100"><Flame size={13} />连续 {streak} 天</span>}
        />
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_300px]">
          <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200/70">
            <div className="grid gap-4 lg:grid-cols-3">
              {heatmap.months.map((month) => (
                <div key={month.key} className="rounded-2xl bg-white p-3 ring-1 ring-slate-200/70">
                  <div className="mb-3 flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-slate-900">{month.label}</p>
                    <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-medium text-slate-500">{month.activeDays} 天活跃</span>
                  </div>
                  <div className="mb-2 grid grid-cols-7 gap-1 text-center text-[10px] text-slate-400">
                    {['一', '二', '三', '四', '五', '六', '日'].map((day) => <span key={day}>{day}</span>)}
                  </div>
                  <div className="grid grid-cols-7 gap-1">
                    {month.cells.map((day, index) => (
                      day ? (
                        <span
                          key={day.date}
                          title={`${day.date} · ${day.minutes} 分钟 · ${day.doneCount} 个完成任务`}
                          className={`aspect-square rounded-[5px] ring-1 ${heatLevelClass(day.minutes)}`}
                        />
                      ) : <span key={`${month.key}-empty-${index}`} className="aspect-square" />
                    ))}
                  </div>
                </div>
              ))}
              <div className="lg:col-span-3">
                <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
                  <span>近 3 个自然月活跃 {activeDays} 天</span>
                  <div className="flex items-center gap-1">
                    <span>少</span>
                    {[0, 30, 90, 180, 300].map((minutes) => <span key={minutes} className={`size-3 rounded-[3px] ring-1 ${heatLevelClass(minutes)}`} />)}
                    <span>多</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
            <Panel>
              <p className="text-xs text-slate-500">今天学了多久</p>
              <p className="mt-1 text-xl font-semibold text-slate-950">{Math.floor(todayMinutes / 60)}h {todayMinutes % 60}m</p>
            </Panel>
            <Panel>
              <p className="text-xs text-slate-500">连续打卡</p>
              <p className="mt-1 text-xl font-semibold text-slate-950">{streak} 天</p>
            </Panel>
            <Panel>
              <p className="text-xs text-slate-500">本月累计</p>
              <p className="mt-1 text-xl font-semibold text-slate-950">{(monthMinutes / 60).toFixed(1)} 小时</p>
            </Panel>
            <Panel className={currentGap > 0 ? 'bg-amber-50 text-amber-900 ring-amber-100' : 'bg-emerald-50 text-emerald-900 ring-emerald-100'}>
              <p className="text-xs">{currentGap > 0 ? '当前断档' : '今日已打卡'}</p>
              <p className="mt-1 text-xl font-semibold">{currentGap > 0 ? `${currentGap} 天` : '保持中'}</p>
            </Panel>
            <Panel>
              <p className="text-xs text-slate-500">最高投入日</p>
              <p className="mt-1 text-sm font-semibold text-slate-950">{bestDay.minutes > 0 ? `${bestDay.date} · ${bestDay.minutes} 分钟` : '暂无完成记录'}</p>
            </Panel>
          </div>
        </div>
      </Card>
      <Card className="mt-5">
        <SectionTitle title={`今日科目安排 · ${isoForCurrentWeekDay(todayDay)}`} />
        <div className="grid gap-3 md:grid-cols-3">
          {dayPlan.length === 0 ? <EmptyState text="今天还没有科目安排，可以去学习计划中添加。" /> : dayPlan.map((item) => (
            <Panel key={item.id}>
              <p className="text-xs text-slate-500">{item.slot}</p>
              <p className="mt-1 font-medium text-slate-900">{item.subject}</p>
              <p className="mt-1 text-sm text-slate-600">{item.title}</p>
            </Panel>
          ))}
        </div>
      </Card>
    </>
  )
}

function todayIsoMonth() {
  const today = new Date()
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`
}

function toIso(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

type HeatmapDay = {
  date: string
  minutes: number
  doneCount: number
}

function buildHeatmap(doneTasks: Array<{ date: string; minutes: number }>) {
  const statsByDate = new Map<string, { minutes: number; doneCount: number }>()
  doneTasks.forEach((task) => {
    const current = statsByDate.get(task.date) ?? { minutes: 0, doneCount: 0 }
    statsByDate.set(task.date, { minutes: current.minutes + task.minutes, doneCount: current.doneCount + 1 })
  })

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const monthStarts = [-2, -1, 0].map((offset) => new Date(today.getFullYear(), today.getMonth() + offset, 1))

  const months = monthStarts.map((monthStart) => {
    const year = monthStart.getFullYear()
    const month = monthStart.getMonth()
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const leadingEmptyCells = (monthStart.getDay() + 6) % 7
    const days: HeatmapDay[] = Array.from({ length: daysInMonth }, (_, index) => {
      const date = new Date(year, month, index + 1)
      const iso = toIso(date)
      const stats = statsByDate.get(iso) ?? { minutes: 0, doneCount: 0 }
      return {
        date: iso,
        minutes: stats.minutes,
        doneCount: stats.doneCount,
      }
    })
    const trailingEmptyCells = (7 - ((leadingEmptyCells + days.length) % 7)) % 7
    return {
      key: `${year}-${month + 1}`,
      label: `${year} 年 ${month + 1} 月`,
      activeDays: days.filter((day) => day.minutes > 0).length,
      days,
      cells: [
        ...Array.from<null>({ length: leadingEmptyCells }).fill(null),
        ...days,
        ...Array.from<null>({ length: trailingEmptyCells }).fill(null),
      ],
    }
  })

  const days = months.flatMap((month) => month.days).filter((day) => day.date <= toIso(today))
  return {
    days,
    months,
  }
}

function calculateStreak(days: ReturnType<typeof buildHeatmap>['days']) {
  let streak = 0
  for (let index = days.length - 1; index >= 0; index -= 1) {
    if (days[index].minutes <= 0) break
    streak += 1
  }
  return streak
}

function calculateCurrentGap(days: ReturnType<typeof buildHeatmap>['days']) {
  let gap = 0
  for (let index = days.length - 1; index >= 0; index -= 1) {
    if (days[index].minutes > 0) break
    gap += 1
  }
  return gap
}

function heatLevelClass(minutes: number) {
  if (minutes >= 300) return 'bg-emerald-700 ring-emerald-800'
  if (minutes >= 180) return 'bg-emerald-600 ring-emerald-700'
  if (minutes >= 90) return 'bg-emerald-400 ring-emerald-500'
  if (minutes > 0) return 'bg-emerald-200 ring-emerald-300'
  return 'bg-white ring-slate-200'
}
