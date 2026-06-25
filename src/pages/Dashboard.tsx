import { ArrowRight, CheckCircle2, Clock, Database, HardDrive, TimerReset } from 'lucide-react'
import { currentDayName, daysUntil, isoForCurrentWeekDay } from '../lib/date'
import { useStudyStore } from '../store/useStudyStore'
import { Card, EmptyState, GhostButton, Panel, Pill, SectionTitle, StatCard } from '../components/ui'
import { PageHeader } from '../components/Layout'

export function Dashboard({ go }: { go: (path: string) => void }) {
  const { tasks, resources, settings, toggleTask } = useStudyStore()
  const todayDay = currentDayName()
  const todayTasks = tasks.filter((task) => task.day === todayDay)
  const done = tasks.filter((task) => task.status === 'done')
  const todayDone = todayTasks.filter((task) => task.status === 'done')
  const nextTask = todayTasks.find((task) => task.status !== 'done')
  const todayMinutes = done.filter((task) => task.day === todayDay).reduce((sum, task) => sum + task.minutes, 0)
  const completion = tasks.length ? Math.round((done.length / tasks.length) * 100) : 0
  const dayPlan = tasks.filter((task) => task.day === todayDay)
  const subjectProgress = ['英语', '政治', '数学', '专业课'].map((subject) => {
    const subjectTasks = tasks.filter((task) => task.subject === subject)
    const doneCount = subjectTasks.filter((task) => task.status === 'done').length
    return { subject, value: subjectTasks.length ? Math.round((doneCount / subjectTasks.length) * 100) : 0 }
  })

  return (
    <>
      <PageHeader title="首页总览" description="今天先看最该做的事，再处理资料和错题。所有数据保存在本机浏览器中。" />
      <section className="mb-5 rounded-3xl bg-slate-950 p-5 text-white shadow-soft">
        <div className="grid gap-5 lg:grid-cols-[1fr_320px] lg:items-center">
          <div>
            <p className="text-sm text-blue-200">{todayDay} · {isoForCurrentWeekDay(todayDay)}</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight">今天的学习焦点已经同步到计划表</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">
              今日共有 {todayTasks.length} 个任务，已完成 {todayDone.length} 个。{nextTask ? `下一项建议处理：${nextTask.slot}的${nextTask.title}。` : '今日任务已清空，可以进入错题本做轻量复盘。'}
            </p>
          </div>
          <div className="rounded-2xl bg-white/8 p-4 ring-1 ring-white/10">
            <p className="text-sm text-slate-300">距离 {settings.examName}</p>
            <p className="mt-1 text-4xl font-semibold tracking-tight">{daysUntil(settings.examDate)} 天</p>
            <button type="button" onClick={() => go('/plan')} className="mt-4 inline-flex items-center gap-2 rounded-xl bg-white px-3 py-2 text-sm font-medium text-slate-950 transition hover:bg-blue-50">
              调整今日计划
              <ArrowRight size={15} />
            </button>
          </div>
        </div>
      </section>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={<TimerReset size={18} />} label="考试倒计时" value={`${daysUntil(settings.examDate)} 天`} detail={settings.examName} />
        <StatCard icon={<Clock size={18} />} label="今日学习时长" value={`${Math.floor(todayMinutes / 60)}h ${todayMinutes % 60}m`} detail={`${todayDone.length}/${todayTasks.length} 个任务完成`} tone="slate" />
        <StatCard icon={<CheckCircle2 size={18} />} label="本周完成率" value={`${completion}%`} detail="按所有计划任务计算" tone="green" />
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
        <SectionTitle title={`今日科目安排 · ${isoForCurrentWeekDay(todayDay)}`} />
        <div className="grid gap-3 md:grid-cols-3">
          {dayPlan.map((item) => (
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
