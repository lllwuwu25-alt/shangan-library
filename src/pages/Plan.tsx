import { CalendarClock, CheckCircle2, Plus, RotateCcw, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { dayNames, subjects, timeSlots } from '../constants'
import { currentDayName, daysUntil, isoForCurrentWeekDay } from '../lib/date'
import { useStudyStore } from '../store/useStudyStore'
import type { DayName, Subject, Task, TimeSlot } from '../types'
import { Button, Card, DangerButton, EmptyState, GhostButton, Panel, SectionTitle, Select, TextInput } from '../components/ui'
import { PageHeader } from '../components/Layout'

export function Plan() {
  const { tasks, settings, addTask, updateTask, deleteTask, toggleTask, updateSettings } = useStudyStore()
  const [taskTitle, setTaskTitle] = useState('')
  const [taskSubject, setTaskSubject] = useState<Subject>('英语')
  const [taskDay, setTaskDay] = useState<DayName>(currentDayName())
  const [taskSlot, setTaskSlot] = useState<TimeSlot>('上午')
  const [taskMinutes, setTaskMinutes] = useState(60)
  const todayDay = currentDayName()
  const tomorrowDay = dayNames[(dayNames.indexOf(todayDay) + 1) % dayNames.length]
  const todayTasks = tasks.filter((task) => task.day === todayDay)
  const tomorrowTasks = tasks.filter((task) => task.day === tomorrowDay)

  const createTask = () => {
    if (!taskTitle.trim()) return
    addTask({
      title: taskTitle,
      subject: taskSubject,
      minutes: taskMinutes,
      day: taskDay,
      slot: taskSlot,
      status: 'todo',
    })
    setTaskTitle('')
  }

  return (
    <>
      <PageHeader title="学习计划" description="任务就是周计划表的内容。新增任务后会进入对应星期和时段，首页今日任务按当天星期同步。" />
      <div className="grid gap-5 xl:grid-cols-[1fr_360px]">
        <Card className="p-4 sm:p-5">
          <SectionTitle title="本周学习计划表" caption="单元格内任务会同步到首页今日任务。" />
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1180px] table-fixed border-separate border-spacing-0 text-sm">
              <thead>
                <tr>
                  <th className="w-20 pb-3 text-left font-medium text-slate-500">时段</th>
                  {dayNames.map((day) => (
                    <th key={day} className={`w-40 pb-3 text-left font-medium ${day === todayDay ? 'text-blue-700' : 'text-slate-500'}`}>
                      <span className="inline-flex items-center gap-2">
                        {day}
                        {day === todayDay && <span className="rounded-full bg-blue-600 px-2 py-0.5 text-xs font-medium text-white">今天</span>}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {timeSlots.map((slot) => (
                  <tr key={slot}>
                    <td className="border-t border-slate-100 py-3 pr-3 align-top">
                      <div className="sticky left-0 rounded-xl bg-white px-2 py-2 font-medium text-slate-700">{slot}</div>
                    </td>
                    {dayNames.map((day) => {
                      const cellTasks = tasks.filter((task) => task.day === day && task.slot === slot)
                      return (
                        <td key={`${day}-${slot}`} className="border-t border-slate-100 py-3 pr-3 align-top">
                          <div className={`min-h-32 rounded-2xl p-2 ${day === todayDay ? 'bg-blue-50/80 ring-1 ring-blue-100' : 'bg-slate-50 ring-1 ring-slate-200/50'}`}>
                            {cellTasks.length === 0 ? (
                              <p className="px-2 py-8 text-center text-xs text-slate-400">暂无任务</p>
                            ) : cellTasks.map((task) => (
                              <PlanTaskCard key={task.id} task={task} updateTask={updateTask} deleteTask={deleteTask} toggleTask={toggleTask} />
                            ))}
                          </div>
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
        <div className="space-y-5">
          <Card>
            <SectionTitle title="新增任务到计划表" caption="选择星期和时段后，任务会进入对应格子。" />
            <div className="grid gap-3">
              <TextInput placeholder="任务名称" value={taskTitle} onChange={(event) => setTaskTitle(event.target.value)} />
              <div className="grid grid-cols-2 gap-3">
                <Select value={taskDay} onChange={(event) => setTaskDay(event.target.value as DayName)}>{dayNames.map((day) => <option key={day}>{day}</option>)}</Select>
                <Select value={taskSlot} onChange={(event) => setTaskSlot(event.target.value as TimeSlot)}>{timeSlots.map((slot) => <option key={slot}>{slot}</option>)}</Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Select value={taskSubject} onChange={(event) => setTaskSubject(event.target.value as Subject)}>{subjects.map((subject) => <option key={subject}>{subject}</option>)}</Select>
                <TextInput type="number" min={1} value={taskMinutes} onChange={(event) => setTaskMinutes(Number(event.target.value))} />
              </div>
              <Panel className="bg-blue-50 text-blue-800 ring-blue-100">
                <p className="text-xs">将写入 <b>{taskDay}</b> · <b>{taskSlot}</b>，本周日期为 {isoForCurrentWeekDay(taskDay)}。</p>
              </Panel>
              <Button onClick={createTask}><Plus size={16} />新增任务</Button>
            </div>
          </Card>
          <Card>
            <SectionTitle title="考试倒计时" />
            <div className="mb-4 flex items-center gap-3 rounded-2xl bg-slate-950 p-4 text-white">
              <div className="flex size-10 items-center justify-center rounded-xl bg-white/10"><CalendarClock size={20} /></div>
              <div>
                <p className="text-3xl font-semibold tracking-tight">{daysUntil(settings.examDate)} 天</p>
                <p className="text-sm text-slate-300">{settings.examName} · {settings.examDate}</p>
              </div>
            </div>
            <div className="grid gap-3">
              <TextInput value={settings.examName} onChange={(event) => updateSettings({ examName: event.target.value })} placeholder="考试名称" />
              <TextInput type="date" value={settings.examDate} onChange={(event) => updateSettings({ examDate: event.target.value })} />
            </div>
          </Card>
        </div>
      </div>
      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <TaskList title={`${todayDay} 今日任务`} tasks={todayTasks} deleteTask={deleteTask} toggleTask={toggleTask} />
        <TaskList title={`${tomorrowDay} 明日任务`} tasks={tomorrowTasks} deleteTask={deleteTask} toggleTask={toggleTask} />
      </div>
    </>
  )
}

function PlanTaskCard({ task, updateTask, deleteTask, toggleTask }: { task: Task; updateTask: ReturnType<typeof useStudyStore.getState>['updateTask']; deleteTask: ReturnType<typeof useStudyStore.getState>['deleteTask']; toggleTask: ReturnType<typeof useStudyStore.getState>['toggleTask'] }) {
  return (
    <div className="mb-2 rounded-xl bg-white p-2.5 shadow-sm ring-1 ring-slate-200/70 transition hover:ring-blue-200">
      <TextInput value={task.title} onChange={(event) => updateTask(task.id, { title: event.target.value })} className="mb-2 h-8 w-full border-transparent bg-slate-50 font-medium hover:border-slate-200" />
      <div className="flex flex-wrap gap-2">
        <Select value={task.subject} onChange={(event) => updateTask(task.id, { subject: event.target.value as Subject })} className="h-8 flex-1">
          {subjects.map((subject) => <option key={subject}>{subject}</option>)}
        </Select>
        <TextInput type="number" min={1} value={task.minutes} onChange={(event) => updateTask(task.id, { minutes: Number(event.target.value) })} className="h-8 w-20" />
      </div>
      <div className="mt-2 grid gap-2">
        <span className={`inline-flex h-7 w-fit max-w-full items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 text-xs font-medium ring-1 ${task.status === 'done' ? 'bg-emerald-50 text-emerald-700 ring-emerald-100' : 'bg-blue-50 text-blue-700 ring-blue-100'}`}>
          {task.status === 'done' ? <CheckCircle2 size={13} /> : <span className="size-1.5 rounded-full bg-blue-500" />}
          {task.status === 'done' ? '已完成' : '待完成'}
        </span>
        <div className="flex w-full items-center justify-end gap-1 rounded-lg bg-slate-50 px-1 py-1">
          <button
            type="button"
            title={task.status === 'done' ? '设为待办' : '标记完成'}
            onClick={() => toggleTask(task.id)}
            className={`flex size-8 items-center justify-center rounded-lg transition focus:outline-none focus:ring-2 focus:ring-blue-200 ${task.status === 'done' ? 'text-slate-500 hover:bg-slate-100' : 'text-blue-700 hover:bg-blue-50'}`}
            aria-label={task.status === 'done' ? '设为待办' : '标记完成'}
          >
            {task.status === 'done' ? <RotateCcw size={15} /> : <CheckCircle2 size={16} />}
          </button>
          <button
            type="button"
            title="删除任务"
            onClick={() => deleteTask(task.id)}
            className="flex size-8 items-center justify-center rounded-lg text-red-600 transition hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-200"
            aria-label="删除任务"
          >
            <Trash2 size={15} />
          </button>
        </div>
      </div>
    </div>
  )
}

function TaskList({ title, tasks, deleteTask, toggleTask }: { title: string; tasks: Task[]; deleteTask: ReturnType<typeof useStudyStore.getState>['deleteTask']; toggleTask: ReturnType<typeof useStudyStore.getState>['toggleTask'] }) {
  return (
    <Card>
      <SectionTitle title={title} />
      <div className="space-y-3">
        {tasks.length === 0 ? <EmptyState text="暂无任务。" /> : tasks.map((task) => (
          <Panel key={task.id}>
            <div className="mb-2 flex items-center justify-between gap-3">
              <p className={`text-sm font-medium ${task.status === 'done' ? 'text-slate-400 line-through' : 'text-slate-900'}`}>{task.title}</p>
              <span className="rounded-full bg-white px-2 py-1 text-xs text-slate-500 ring-1 ring-slate-200">{task.slot}</span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-slate-500">{task.subject} · {task.minutes} 分钟 · {task.date}</span>
              <GhostButton onClick={() => toggleTask(task.id)}>{task.status === 'done' ? '设为待办' : '标记完成'}</GhostButton>
              <DangerButton onClick={() => deleteTask(task.id)}><Trash2 size={15} />删除</DangerButton>
            </div>
          </Panel>
        ))}
      </div>
    </Card>
  )
}
