import { CalendarClock, CheckCircle2, Plus, RotateCcw, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { dayNames, defaultTimeSlots, subjects } from '../constants'
import { addDaysIso, currentDayName, dayNameFromIso, daysUntil, isoForWeekDay, todayIso, weekRange } from '../lib/date'
import { useStudyStore } from '../store/useStudyStore'
import type { DayName, Subject, Task, TimeSlot } from '../types'
import { Button, Card, DangerButton, EmptyState, GhostButton, Panel, SectionTitle, Select, TextInput } from '../components/ui'
import { PageHeader } from '../components/Layout'

export function Plan() {
  const { tasks, settings, addTask, updateTask, deleteTask, deleteTasksByDateRange, toggleTask, updateSettings } = useStudyStore()
  const [taskTitle, setTaskTitle] = useState('')
  const [taskSubject, setTaskSubject] = useState<Subject>('英语')
  const [taskDate, setTaskDate] = useState(todayIso())
  const [taskSlot, setTaskSlot] = useState<TimeSlot>('上午')
  const [taskMinutes, setTaskMinutes] = useState(60)
  const [showNextWeek, setShowNextWeek] = useState(false)
  const [newSlot, setNewSlot] = useState('')
  const todayDay = currentDayName()
  const timeSlots = settings.timeSlots.length ? settings.timeSlots : defaultTimeSlots
  const currentWeek = weekRange(0)
  const nextWeek = weekRange(1)
  const todayDate = todayIso()
  const tomorrowDate = addDaysIso(1)
  const tomorrowDay = dayNames[(dayNames.indexOf(todayDay) + 1) % dayNames.length]
  const currentWeekTasks = tasks.filter((task) => task.date >= currentWeek.start && task.date <= currentWeek.end)
  const nextWeekTasks = tasks.filter((task) => task.date >= nextWeek.start && task.date <= nextWeek.end)
  const todayTasks = tasks.filter((task) => task.date === todayDate)
  const tomorrowTasks = tasks.filter((task) => task.date === tomorrowDate)
  const countdown = daysUntil(settings.examDate)
  const selectedTaskDay = taskDate ? dayNameFromIso(taskDate) : todayDay

  const createTask = () => {
    if (!taskTitle.trim() || !taskDate || taskDate < currentWeek.start || taskDate > nextWeek.end) return
    addTask({
      title: taskTitle,
      subject: taskSubject,
      minutes: taskMinutes,
      day: selectedTaskDay,
      slot: taskSlot,
      date: taskDate,
      status: 'todo',
    })
    setTaskTitle('')
  }

  const clearCurrentWeekTasks = () => {
    if (currentWeekTasks.length === 0) return
    if (!confirm(`确认清除本周 ${currentWeek.start} 至 ${currentWeek.end} 的 ${currentWeekTasks.length} 个计划任务？下周计划不会受影响。`)) return
    deleteTasksByDateRange(currentWeek.start, currentWeek.end)
  }

  const addTimeSlot = () => {
    const slot = newSlot.trim()
    if (!slot || timeSlots.includes(slot)) return
    updateSettings({ timeSlots: [...timeSlots, slot] })
    setTaskSlot(slot)
    setNewSlot('')
  }

  const removeTimeSlot = (slot: TimeSlot) => {
    if (tasks.some((task) => task.slot === slot)) return
    const nextSlots = timeSlots.filter((item) => item !== slot)
    updateSettings({ timeSlots: nextSlots.length ? nextSlots : defaultTimeSlots })
    if (taskSlot === slot) setTaskSlot(nextSlots[0] ?? defaultTimeSlots[0])
  }

  return (
    <>
      <PageHeader title="学习计划" description="按日期新增计划，本周默认展示，下周可展开查看。" />
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-5">
          <Card className="p-4 sm:p-5">
            <SectionTitle
              title="本周学习计划表"
              caption={`仅显示本周日期内任务，今日任务会同步到首页。${currentWeek.start} 至 ${currentWeek.end}`}
              action={<DangerButton onClick={clearCurrentWeekTasks} disabled={currentWeekTasks.length === 0}><Trash2 size={15} />清除本周计划</DangerButton>}
            />
            <WeekPlanBoard
              tasks={currentWeekTasks}
              weekOffset={0}
              todayDay={todayDay}
              timeSlots={timeSlots}
              updateTask={updateTask}
              deleteTask={deleteTask}
              toggleTask={toggleTask}
            />
          </Card>
          <Card className="p-4 sm:p-5">
            <SectionTitle
              title="下周计划安排"
              caption={`提前安排下周任务；到下周会自动进入本周计划。${nextWeek.start} 至 ${nextWeek.end} · ${nextWeekTasks.length} 个任务`}
              action={<GhostButton type="button" onClick={() => setShowNextWeek((value) => !value)}>{showNextWeek ? '收起下周计划' : '展开下周计划'}</GhostButton>}
            />
            {showNextWeek && (
              <WeekPlanBoard
                tasks={nextWeekTasks}
                weekOffset={1}
                todayDay={todayDay}
                timeSlots={timeSlots}
                updateTask={updateTask}
                deleteTask={deleteTask}
                toggleTask={toggleTask}
              />
            )}
          </Card>
        </div>
        <div className="space-y-5">
          <Card>
            <SectionTitle title="新增计划" caption="选择本周或下周日期，任务会进入对应计划表。" />
            <div className="grid gap-3">
              <TextInput placeholder="任务名称" value={taskTitle} onChange={(event) => setTaskTitle(event.target.value)} />
              <div className="grid grid-cols-2 gap-3">
                <TextInput type="date" min={currentWeek.start} max={nextWeek.end} value={taskDate} onChange={(event) => setTaskDate(event.target.value)} />
                <Select value={taskSlot} onChange={(event) => setTaskSlot(event.target.value as TimeSlot)}>{timeSlots.map((slot) => <option key={slot}>{slot}</option>)}</Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Select value={taskSubject} onChange={(event) => setTaskSubject(event.target.value as Subject)}>{subjects.map((subject) => <option key={subject}>{subject}</option>)}</Select>
                <TextInput type="number" min={1} value={taskMinutes} onChange={(event) => setTaskMinutes(Number(event.target.value))} />
              </div>
              <Panel className="bg-blue-50 text-blue-800 ring-blue-100">
                <p className="text-xs">将写入 <b>{taskDate}</b> · <b>{selectedTaskDay}</b> · <b>{taskSlot}</b>。</p>
              </Panel>
              <Button onClick={createTask}><Plus size={16} />新增任务</Button>
            </div>
          </Card>
          <Card>
            <SectionTitle title="考试倒计时" />
            <div className="mb-4 flex items-center gap-3 rounded-2xl bg-slate-950 p-4 text-white">
              <div className="flex size-10 items-center justify-center rounded-xl bg-white/10"><CalendarClock size={20} /></div>
              <div>
                <p className="text-3xl font-semibold tracking-tight">{countdown === null ? '未设置' : `${countdown} 天`}</p>
                <p className="text-sm text-slate-300">{settings.examName || '请填写考试名称'} · {settings.examDate || '请填写考试日期'}</p>
              </div>
            </div>
            <div className="grid gap-3">
              <TextInput value={settings.examName} onChange={(event) => updateSettings({ examName: event.target.value })} placeholder="考试名称" />
              <TextInput type="date" value={settings.examDate} onChange={(event) => updateSettings({ examDate: event.target.value })} />
            </div>
          </Card>
          <Card>
            <SectionTitle title="学习时段管理" caption="预设早晨、上午、下午、晚上、睡前，也可以按自己的作息添加。" />
            <div className="grid gap-3">
              <div className="flex gap-2">
                <TextInput placeholder="例如 午休 / 通勤" value={newSlot} onChange={(event) => setNewSlot(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') addTimeSlot() }} />
                <Button type="button" onClick={addTimeSlot}><Plus size={16} />添加</Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {timeSlots.map((slot) => {
                  const used = tasks.some((task) => task.slot === slot)
                  return (
                    <span key={slot} className="inline-flex items-center gap-1 rounded-full bg-slate-50 px-2 py-1 text-xs font-medium text-slate-700 ring-1 ring-slate-200">
                      {slot}
                      <button
                        type="button"
                        disabled={used}
                        onClick={() => removeTimeSlot(slot)}
                        title={used ? '已有任务使用该时段，暂不能删除' : '删除时段'}
                        className="flex size-5 items-center justify-center rounded-full text-slate-400 transition hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        <Trash2 size={11} />
                      </button>
                    </span>
                  )
                })}
              </div>
              <Panel>
                <p className="text-xs leading-5 text-slate-500">删除时段不会自动删除任务。若某个时段已有任务，请先把任务移动到其他时段。</p>
              </Panel>
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

function WeekPlanBoard({
  tasks,
  weekOffset,
  todayDay,
  timeSlots,
  updateTask,
  deleteTask,
  toggleTask,
}: {
  tasks: Task[]
  weekOffset: number
  todayDay: DayName
  timeSlots: TimeSlot[]
  updateTask: ReturnType<typeof useStudyStore.getState>['updateTask']
  deleteTask: ReturnType<typeof useStudyStore.getState>['deleteTask']
  toggleTask: ReturnType<typeof useStudyStore.getState>['toggleTask']
}) {
  return (
    <div className="grid gap-4 lg:grid-cols-2 2xl:grid-cols-3">
      {dayNames.map((day) => {
        const date = isoForWeekDay(day, weekOffset)
        const isToday = weekOffset === 0 && day === todayDay && date === todayIso()
        const dayTasks = tasks.filter((task) => task.date === date)
        return (
          <div key={`${weekOffset}-${day}`} className={`rounded-2xl p-3 ring-1 ${isToday ? 'bg-blue-50/80 ring-blue-100' : 'bg-slate-50 ring-slate-200/70'}`}>
            <div className="mb-3 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className={`text-sm font-semibold ${isToday ? 'text-blue-800' : 'text-slate-900'}`}>{day}</p>
                  {isToday && <span className="rounded-full bg-blue-600 px-2 py-0.5 text-[10px] font-medium text-white">今天</span>}
                </div>
                <p className="mt-1 text-xs text-slate-500">{date} · {dayTasks.length} 个任务</p>
              </div>
            </div>
            <div className="grid gap-3">
              {timeSlots.map((slot) => {
                const cellTasks = dayTasks.filter((task) => task.slot === slot)
                return (
                  <div key={`${date}-${slot}`} className="rounded-xl bg-white p-2.5 shadow-sm ring-1 ring-slate-200/70">
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <p className="text-xs font-medium text-slate-500">{slot}</p>
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-500">{cellTasks.length}</span>
                    </div>
                    {cellTasks.length === 0 ? (
                      <p className="rounded-lg bg-slate-50 px-3 py-3 text-center text-xs text-slate-400">暂无任务</p>
                    ) : cellTasks.map((task) => (
                      <PlanTaskCard key={task.id} task={task} updateTask={updateTask} deleteTask={deleteTask} toggleTask={toggleTask} />
                    ))}
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}
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
