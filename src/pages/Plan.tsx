import { CalendarClock, CheckCircle2, Pencil, Plus, RotateCcw, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { dayNames, defaultSubjects, defaultTimeSlots, subjectOptions } from '../constants'
import { addDaysIso, currentDayName, dayNameFromIso, daysUntil, isoForWeekDay, todayIso, weekRange } from '../lib/date'
import { useStudyStore } from '../store/useStudyStore'
import type { DayName, Subject, Task, TimeSlot } from '../types'
import { Button, Card, DangerButton, EmptyState, GhostButton, Panel, SectionTitle, Select, TextInput } from '../components/ui'
import { PageHeader } from '../components/Layout'

type ComposerTarget = { date: string; slot: TimeSlot } | null

type PlanActions = {
  addTask: ReturnType<typeof useStudyStore.getState>['addTask']
  updateTask: ReturnType<typeof useStudyStore.getState>['updateTask']
  deleteTask: ReturnType<typeof useStudyStore.getState>['deleteTask']
  toggleTask: ReturnType<typeof useStudyStore.getState>['toggleTask']
}

export function Plan() {
  const { tasks, settings, addTask, updateTask, deleteTask, deleteTasksByDateRange, toggleTask, updateSettings } = useStudyStore()
  const todayDay = currentDayName()
  const timeSlots = settings.timeSlots.length ? settings.timeSlots : defaultTimeSlots
  const subjects = subjectOptions(settings.subjects)
  const todayDate = todayIso()
  const tomorrowDate = addDaysIso(1)
  const currentWeek = weekRange(0)
  const nextWeek = weekRange(1)
  const currentWeekTasks = tasks.filter((task) => task.date >= currentWeek.start && task.date <= currentWeek.end)
  const nextWeekTasks = tasks.filter((task) => task.date >= nextWeek.start && task.date <= nextWeek.end)
  const todayTasks = tasks.filter((task) => task.date === todayDate)
  const tomorrowTasks = tasks.filter((task) => task.date === tomorrowDate)
  const tomorrowDay = dayNames[(dayNames.indexOf(todayDay) + 1) % dayNames.length]
  const countdown = daysUntil(settings.examDate)
  const defaultSlot = firstSlotWithTasks(todayTasks, timeSlots)
  const [selectedDate, setSelectedDate] = useState(todayDate)
  const [expandedSlotKey, setExpandedSlotKey] = useState(`${todayDate}-${defaultSlot}`)
  const [composerTarget, setComposerTarget] = useState<ComposerTarget>(null)
  const [fullComposerOpen, setFullComposerOpen] = useState(false)
  const [showNextWeek, setShowNextWeek] = useState(false)
  const [newSlot, setNewSlot] = useState('')
  const actions = { addTask, updateTask, deleteTask, toggleTask }

  const clearCurrentWeekTasks = () => {
    if (currentWeekTasks.length === 0) return
    if (!confirm(`确认清除本周 ${currentWeek.start} 至 ${currentWeek.end} 的 ${currentWeekTasks.length} 个计划任务？下周计划不会受影响。`)) return
    deleteTasksByDateRange(currentWeek.start, currentWeek.end)
  }

  const addTimeSlot = () => {
    const slot = newSlot.trim()
    if (!slot || timeSlots.includes(slot)) return
    updateSettings({ timeSlots: [...timeSlots, slot] })
    setNewSlot('')
    setComposerTarget({ date: selectedDate, slot })
    setExpandedSlotKey(`${selectedDate}-${slot}`)
  }

  const removeTimeSlot = (slot: TimeSlot) => {
    if (tasks.some((task) => task.slot === slot)) return
    const nextSlots = timeSlots.filter((item) => item !== slot)
    updateSettings({ timeSlots: nextSlots.length ? nextSlots : defaultTimeSlots })
  }

  const openComposer = (date: string, slot = timeSlots[0] ?? defaultTimeSlots[0]) => {
    setSelectedDate(date)
    setExpandedSlotKey(`${date}-${slot}`)
    setComposerTarget({ date, slot })
  }

  return (
    <>
      <PageHeader title="学习计划" description="按日期和时段查看安排，点击时段展开详情，也可以直接在表内新增任务。" />

      <div className="xl:hidden">
        <MobilePlanView
          tasks={currentWeekTasks}
          selectedDate={selectedDate}
          setSelectedDate={setSelectedDate}
          expandedSlotKey={expandedSlotKey}
          setExpandedSlotKey={setExpandedSlotKey}
          composerTarget={composerTarget}
          setComposerTarget={setComposerTarget}
          openComposer={openComposer}
          subjects={subjects}
          timeSlots={timeSlots}
          actions={actions}
        />
        <TabletPlanView
          tasks={currentWeekTasks}
          expandedSlotKey={expandedSlotKey}
          setExpandedSlotKey={setExpandedSlotKey}
          composerTarget={composerTarget}
          setComposerTarget={setComposerTarget}
          openComposer={openComposer}
          subjects={subjects}
          timeSlots={timeSlots}
          actions={actions}
        />
      </div>

      <div className="hidden xl:block">
        <DesktopPlanView
          currentWeek={currentWeek}
          nextWeek={nextWeek}
          currentWeekTasks={currentWeekTasks}
          nextWeekTasks={nextWeekTasks}
          showNextWeek={showNextWeek}
          setShowNextWeek={setShowNextWeek}
          clearCurrentWeekTasks={clearCurrentWeekTasks}
          expandedSlotKey={expandedSlotKey}
          setExpandedSlotKey={setExpandedSlotKey}
          composerTarget={composerTarget}
          setComposerTarget={setComposerTarget}
          openComposer={openComposer}
          subjects={subjects}
          timeSlots={timeSlots}
          actions={actions}
        />
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-5">
          <TaskList title={`${todayDay} 今日任务`} tasks={todayTasks} deleteTask={deleteTask} toggleTask={toggleTask} />
          <TaskList title={`${tomorrowDay} 明日任务`} tasks={tomorrowTasks} deleteTask={deleteTask} toggleTask={toggleTask} />
        </div>
        <div className="space-y-5">
          <Card className="xl:hidden">
            <SectionTitle
              title="完整新增"
              caption="需要跨周或精确改日期时使用。日常新增建议点时段旁边的加号。"
              action={<GhostButton className="w-full sm:w-auto" onClick={() => setFullComposerOpen((value) => !value)}>{fullComposerOpen ? '收起' : '展开'}</GhostButton>}
            />
            {fullComposerOpen && (
              <FullTaskComposer
                currentWeek={currentWeek}
                nextWeek={nextWeek}
                subjects={subjects}
                timeSlots={timeSlots}
                addTask={addTask}
              />
            )}
          </Card>
          <CountdownCard settings={settings} updateSettings={updateSettings} countdown={countdown} />
          <TimeSlotManager tasks={tasks} timeSlots={timeSlots} newSlot={newSlot} setNewSlot={setNewSlot} addTimeSlot={addTimeSlot} removeTimeSlot={removeTimeSlot} />
        </div>
      </div>
    </>
  )
}

function MobilePlanView({
  tasks,
  selectedDate,
  setSelectedDate,
  expandedSlotKey,
  setExpandedSlotKey,
  composerTarget,
  setComposerTarget,
  openComposer,
  subjects,
  timeSlots,
  actions,
}: {
  tasks: Task[]
  selectedDate: string
  setSelectedDate: (date: string) => void
  expandedSlotKey: string
  setExpandedSlotKey: (key: string) => void
  composerTarget: ComposerTarget
  setComposerTarget: (target: ComposerTarget) => void
  openComposer: (date: string, slot?: TimeSlot) => void
  subjects: Subject[]
  timeSlots: TimeSlot[]
  actions: PlanActions
}) {
  const selectedTasks = tasks.filter((task) => task.date === selectedDate)
  const today = todayIso()

  return (
    <Card className="p-3 md:hidden">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-base font-semibold text-slate-950">本周计划</h2>
          <p className="mt-0.5 truncate text-xs text-slate-500">{selectedDate} · {dayNameFromIso(selectedDate)} · {selectedTasks.length} 个任务</p>
        </div>
        <button
          type="button"
          onClick={() => openComposer(selectedDate)}
          className="flex min-h-11 shrink-0 items-center gap-1.5 rounded-xl bg-blue-600 px-3 text-sm font-medium text-white shadow-sm"
        >
          <Plus size={16} />
          新增
        </button>
      </div>
      <DayStrip
        tasks={tasks}
        selectedDate={selectedDate}
        onSelect={(date) => {
          setSelectedDate(date)
          setExpandedSlotKey(`${date}-${firstSlotWithTasks(tasks.filter((task) => task.date === date), timeSlots)}`)
          setComposerTarget(null)
        }}
      />
      <div className="mt-3 space-y-2">
        {timeSlots.map((slot) => (
          <TimeSlotAccordion
            key={`${selectedDate}-${slot}`}
            date={selectedDate}
            slot={slot}
            tasks={selectedTasks.filter((task) => task.slot === slot)}
            expanded={expandedSlotKey === `${selectedDate}-${slot}`}
            onToggle={() => setExpandedSlotKey(expandedSlotKey === `${selectedDate}-${slot}` ? '' : `${selectedDate}-${slot}`)}
            onAdd={() => openComposer(selectedDate, slot)}
            composerTarget={composerTarget}
            setComposerTarget={setComposerTarget}
            subjects={subjects}
            actions={actions}
            compact
            isToday={selectedDate === today}
          />
        ))}
      </div>
    </Card>
  )
}

function TabletPlanView({
  tasks,
  expandedSlotKey,
  setExpandedSlotKey,
  composerTarget,
  setComposerTarget,
  openComposer,
  subjects,
  timeSlots,
  actions,
}: {
  tasks: Task[]
  expandedSlotKey: string
  setExpandedSlotKey: (key: string) => void
  composerTarget: ComposerTarget
  setComposerTarget: (target: ComposerTarget) => void
  openComposer: (date: string, slot?: TimeSlot) => void
  subjects: Subject[]
  timeSlots: TimeSlot[]
  actions: PlanActions
}) {
  return (
    <div className="hidden md:grid md:grid-cols-2 md:gap-4 xl:hidden">
      {dayNames.map((day) => {
        const date = isoForWeekDay(day)
        const dayTasks = tasks.filter((task) => task.date === date)
        return (
          <DayPlanCard
            key={date}
            date={date}
            day={day}
            tasks={dayTasks}
            timeSlots={timeSlots}
            expandedSlotKey={expandedSlotKey}
            setExpandedSlotKey={setExpandedSlotKey}
            composerTarget={composerTarget}
            setComposerTarget={setComposerTarget}
            openComposer={openComposer}
            subjects={subjects}
            actions={actions}
            compact
          />
        )
      })}
    </div>
  )
}

function DesktopPlanView({
  currentWeek,
  nextWeek,
  currentWeekTasks,
  nextWeekTasks,
  showNextWeek,
  setShowNextWeek,
  clearCurrentWeekTasks,
  expandedSlotKey,
  setExpandedSlotKey,
  composerTarget,
  setComposerTarget,
  openComposer,
  subjects,
  timeSlots,
  actions,
}: {
  currentWeek: { start: string; end: string }
  nextWeek: { start: string; end: string }
  currentWeekTasks: Task[]
  nextWeekTasks: Task[]
  showNextWeek: boolean
  setShowNextWeek: (value: boolean | ((value: boolean) => boolean)) => void
  clearCurrentWeekTasks: () => void
  expandedSlotKey: string
  setExpandedSlotKey: (key: string) => void
  composerTarget: ComposerTarget
  setComposerTarget: (target: ComposerTarget) => void
  openComposer: (date: string, slot?: TimeSlot) => void
  subjects: Subject[]
  timeSlots: TimeSlot[]
  actions: PlanActions
}) {
  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
      <div className="space-y-5">
        <Card className="p-4">
          <SectionTitle
            title="本周学习计划表"
            caption={`点击时段展开任务，点击加号直接写入对应日期和时段。${currentWeek.start} 至 ${currentWeek.end}`}
            action={<DangerButton className="w-full sm:w-auto" onClick={clearCurrentWeekTasks} disabled={currentWeekTasks.length === 0}><Trash2 size={15} />清除本周</DangerButton>}
          />
          <div className="grid gap-4 xl:grid-cols-2">
            {dayNames.map((day) => {
              const date = isoForWeekDay(day)
              return (
                <DayPlanCard
                  key={date}
                  date={date}
                  day={day}
                  tasks={currentWeekTasks.filter((task) => task.date === date)}
                  timeSlots={timeSlots}
                  expandedSlotKey={expandedSlotKey}
                  setExpandedSlotKey={setExpandedSlotKey}
                  composerTarget={composerTarget}
                  setComposerTarget={setComposerTarget}
                  openComposer={openComposer}
                  subjects={subjects}
                  actions={actions}
                />
              )
            })}
          </div>
        </Card>
        <Card className="p-4">
          <SectionTitle
            title="下周计划安排"
            caption={`${nextWeek.start} 至 ${nextWeek.end} · ${nextWeekTasks.length} 个任务`}
            action={<GhostButton className="w-full sm:w-auto" type="button" onClick={() => setShowNextWeek((value) => !value)}>{showNextWeek ? '收起下周计划' : '展开下周计划'}</GhostButton>}
          />
          {showNextWeek && (
            <div className="grid gap-4 xl:grid-cols-2">
              {dayNames.map((day) => {
                const date = isoForWeekDay(day, 1)
                return (
                  <DayPlanCard
                    key={date}
                    date={date}
                    day={day}
                    tasks={nextWeekTasks.filter((task) => task.date === date)}
                    timeSlots={timeSlots}
                    expandedSlotKey={expandedSlotKey}
                    setExpandedSlotKey={setExpandedSlotKey}
                    composerTarget={composerTarget}
                    setComposerTarget={setComposerTarget}
                    openComposer={openComposer}
                    subjects={subjects}
                    actions={actions}
                  />
                )
              })}
            </div>
          )}
        </Card>
      </div>
      <div className="space-y-5">
        <Card>
          <SectionTitle title="完整新增" caption="也可以直接点击计划表里的日期或时段加号。" />
          <FullTaskComposer currentWeek={currentWeek} nextWeek={nextWeek} subjects={subjects} timeSlots={timeSlots} addTask={actions.addTask} />
        </Card>
      </div>
    </div>
  )
}

function DayStrip({ tasks, selectedDate, onSelect }: { tasks: Task[]; selectedDate: string; onSelect: (date: string) => void }) {
  const today = todayIso()
  return (
    <div className="-mx-3 flex gap-2 overflow-x-auto px-3 pb-1">
      {dayNames.map((day) => {
        const date = isoForWeekDay(day)
        const dayTasks = tasks.filter((task) => task.date === date)
        const active = selectedDate === date
        return (
          <button
            key={date}
            type="button"
            onClick={() => onSelect(date)}
            className={`min-w-[4.25rem] rounded-2xl px-3 py-2 text-left ring-1 transition ${active ? 'bg-blue-600 text-white ring-blue-600 shadow-sm' : 'bg-slate-50 text-slate-700 ring-slate-200'}`}
          >
            <span className="block text-xs font-medium">{date === today ? '今天' : day}</span>
            <span className="mt-1 block text-lg font-semibold leading-none">{date.slice(8)}</span>
            <span className={`mt-1 block text-[10px] ${active ? 'text-blue-100' : 'text-slate-500'}`}>{dayTasks.length} 项</span>
          </button>
        )
      })}
    </div>
  )
}

function DayPlanCard({
  date,
  day,
  tasks,
  timeSlots,
  expandedSlotKey,
  setExpandedSlotKey,
  composerTarget,
  setComposerTarget,
  openComposer,
  subjects,
  actions,
  compact = false,
}: {
  date: string
  day: DayName
  tasks: Task[]
  timeSlots: TimeSlot[]
  expandedSlotKey: string
  setExpandedSlotKey: (key: string) => void
  composerTarget: ComposerTarget
  setComposerTarget: (target: ComposerTarget) => void
  openComposer: (date: string, slot?: TimeSlot) => void
  subjects: Subject[]
  actions: PlanActions
  compact?: boolean
}) {
  const doneCount = tasks.filter((task) => task.status === 'done').length
  const totalMinutes = tasks.reduce((sum, task) => sum + task.minutes, 0)
  const isToday = date === todayIso()

  return (
    <section className={`rounded-2xl p-3 ring-1 ${isToday ? 'bg-blue-50/80 ring-blue-100' : 'bg-white ring-slate-200/70'} ${compact ? '' : 'shadow-sm'}`}>
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className={`text-sm font-semibold ${isToday ? 'text-blue-800' : 'text-slate-950'}`}>{isToday ? '今天' : day}</h3>
            {isToday && <span className="rounded-full bg-blue-600 px-2 py-0.5 text-[10px] font-medium text-white">重点</span>}
          </div>
          <p className="mt-1 text-xs text-slate-500">{date} · {tasks.length} 项 · {doneCount} 完成 · {totalMinutes} 分钟</p>
        </div>
        <button
          type="button"
          onClick={() => openComposer(date)}
          aria-label={`${day}新增任务`}
          className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-white text-blue-700 ring-1 ring-blue-100 transition hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-200"
        >
          <Plus size={18} />
        </button>
      </div>
      <div className="space-y-2">
        {timeSlots.map((slot) => (
          <TimeSlotAccordion
            key={`${date}-${slot}`}
            date={date}
            slot={slot}
            tasks={tasks.filter((task) => task.slot === slot)}
            expanded={expandedSlotKey === `${date}-${slot}`}
            onToggle={() => setExpandedSlotKey(expandedSlotKey === `${date}-${slot}` ? '' : `${date}-${slot}`)}
            onAdd={() => openComposer(date, slot)}
            composerTarget={composerTarget}
            setComposerTarget={setComposerTarget}
            subjects={subjects}
            actions={actions}
            compact={compact}
            isToday={isToday}
          />
        ))}
      </div>
    </section>
  )
}

function TimeSlotAccordion({
  date,
  slot,
  tasks,
  expanded,
  onToggle,
  onAdd,
  composerTarget,
  setComposerTarget,
  subjects,
  actions,
  compact = false,
  isToday = false,
}: {
  date: string
  slot: TimeSlot
  tasks: Task[]
  expanded: boolean
  onToggle: () => void
  onAdd: () => void
  composerTarget: ComposerTarget
  setComposerTarget: (target: ComposerTarget) => void
  subjects: Subject[]
  actions: PlanActions
  compact?: boolean
  isToday?: boolean
}) {
  const doneCount = tasks.filter((task) => task.status === 'done').length
  const preview = tasks.length ? tasks.slice(0, 2).map((task) => task.title).join('、') : '暂无任务'
  const composerOpen = composerTarget?.date === date && composerTarget.slot === slot

  return (
    <div className={`rounded-xl ring-1 ${expanded || composerOpen ? 'bg-white ring-blue-100' : 'bg-slate-50 ring-slate-200/70'}`}>
      <div className="grid grid-cols-[minmax(0,1fr)_44px] items-stretch">
        <button type="button" onClick={onToggle} className="min-w-0 px-3 py-2.5 text-left focus:outline-none focus:ring-2 focus:ring-blue-200">
          <div className="flex min-w-0 items-center gap-2">
            <span className="flex size-4 shrink-0 items-center justify-center text-xs text-slate-400">{expanded ? '⌄' : '›'}</span>
            <span className={`shrink-0 text-sm font-semibold ${isToday ? 'text-blue-800' : 'text-slate-800'}`}>{slot}</span>
            <span className="shrink-0 rounded-full bg-white px-2 py-0.5 text-[10px] font-medium text-slate-500 ring-1 ring-slate-200">{doneCount}/{tasks.length}</span>
          </div>
          <p className="mt-1 truncate pl-6 text-xs leading-5 text-slate-500">{preview}</p>
        </button>
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation()
            onAdd()
          }}
          aria-label={`${slot}新增任务`}
          className="flex min-h-11 items-center justify-center rounded-r-xl text-blue-700 transition hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-200"
        >
          <Plus size={17} />
        </button>
      </div>
      {(expanded || composerOpen) && (
        <div className="border-t border-slate-100 px-2 pb-2 pt-2">
          {composerOpen && (
            <InlineTaskComposer
              date={date}
              slot={slot}
              subjects={subjects}
              addTask={actions.addTask}
              onDone={() => setComposerTarget(null)}
            />
          )}
          {tasks.length === 0 ? (
            <p className="rounded-lg bg-slate-50 px-3 py-3 text-center text-xs text-slate-400">这个时段还没有任务。</p>
          ) : (
            <div className={`space-y-2 ${compact ? '' : 'pt-1'}`}>
              {tasks.map((task) => (
                <CompactTaskRow key={task.id} task={task} subjects={subjects} actions={actions} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function InlineTaskComposer({ date, slot, subjects, addTask, onDone }: { date: string; slot: TimeSlot; subjects: Subject[]; addTask: PlanActions['addTask']; onDone: () => void }) {
  const [title, setTitle] = useState('')
  const [subject, setSubject] = useState<Subject>(subjects[0] ?? defaultSubjects[0])
  const [minutes, setMinutes] = useState(60)
  const safeSubject = subjects.includes(subject) ? subject : subjects[0] ?? defaultSubjects[0]

  const submit = () => {
    if (!title.trim()) return
    addTask({
      title: title.trim(),
      subject: safeSubject,
      minutes: Math.max(1, minutes || 1),
      day: dayNameFromIso(date),
      slot,
      date,
      status: 'todo',
    })
    setTitle('')
    onDone()
  }

  return (
    <div className="mb-2 rounded-xl bg-blue-50 p-2 ring-1 ring-blue-100">
      <div className="mb-2 flex flex-wrap items-center gap-2 text-xs font-medium text-blue-800">
        <span>{date}</span>
        <span>{slot}</span>
      </div>
      <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_120px_92px_auto]">
        <TextInput value={title} onChange={(event) => setTitle(event.target.value)} placeholder="任务名称" className="min-h-11" />
        <Select value={safeSubject} onChange={(event) => setSubject(event.target.value)} className="min-h-11">{subjects.map((item) => <option key={item}>{item}</option>)}</Select>
        <TextInput type="number" min={1} value={minutes} onChange={(event) => setMinutes(Number(event.target.value))} className="min-h-11" />
        <Button onClick={submit} className="min-h-11 w-full sm:w-auto"><Plus size={16} />加入</Button>
      </div>
    </div>
  )
}

function CompactTaskRow({ task, subjects, actions }: { task: Task; subjects: Subject[]; actions: PlanActions }) {
  const [editing, setEditing] = useState(false)
  const taskSubjects = subjectOptions([...subjects, task.subject])

  if (editing) {
    return (
      <div className="rounded-xl bg-slate-50 p-2 ring-1 ring-slate-200/70">
        <TextInput value={task.title} onChange={(event) => actions.updateTask(task.id, { title: event.target.value })} className="mb-2 min-h-11 w-full bg-white font-medium" />
        <div className="grid grid-cols-[minmax(0,1fr)_84px] gap-2">
          <Select value={task.subject} onChange={(event) => actions.updateTask(task.id, { subject: event.target.value })} className="min-h-11">
            {taskSubjects.map((subject) => <option key={subject}>{subject}</option>)}
          </Select>
          <TextInput type="number" min={1} value={task.minutes} onChange={(event) => actions.updateTask(task.id, { minutes: Number(event.target.value) })} className="min-h-11" />
        </div>
        <div className="mt-2 flex justify-end gap-2">
          <GhostButton onClick={() => setEditing(false)}>完成编辑</GhostButton>
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-xl bg-slate-50 p-2.5 ring-1 ring-slate-200/70">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className={`break-words text-sm font-medium ${task.status === 'done' ? 'text-slate-400 line-through' : 'text-slate-950'}`}>{task.title}</p>
          <p className="mt-1 text-xs leading-5 text-slate-500">{task.subject} · {task.minutes} 分钟</p>
        </div>
        <span className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-1 text-[10px] font-medium ring-1 ${task.status === 'done' ? 'bg-emerald-50 text-emerald-700 ring-emerald-100' : 'bg-blue-50 text-blue-700 ring-blue-100'}`}>
          {task.status === 'done' ? <CheckCircle2 size={12} /> : <span className="size-1.5 rounded-full bg-blue-500" />}
          {task.status === 'done' ? '完成' : '待办'}
        </span>
      </div>
      <div className="mt-2 grid grid-cols-3 gap-2">
        <button
          type="button"
          onClick={() => actions.toggleTask(task.id)}
          className="flex min-h-11 items-center justify-center gap-1 rounded-xl bg-white text-xs font-medium text-slate-700 ring-1 ring-slate-200 transition hover:bg-blue-50 hover:text-blue-700"
        >
          {task.status === 'done' ? <RotateCcw size={14} /> : <CheckCircle2 size={14} />}
          {task.status === 'done' ? '待办' : '完成'}
        </button>
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="flex min-h-11 items-center justify-center gap-1 rounded-xl bg-white text-xs font-medium text-slate-700 ring-1 ring-slate-200 transition hover:bg-slate-100"
        >
          <Pencil size={14} />
          编辑
        </button>
        <button
          type="button"
          onClick={() => actions.deleteTask(task.id)}
          className="flex min-h-11 items-center justify-center gap-1 rounded-xl bg-white text-xs font-medium text-red-600 ring-1 ring-red-100 transition hover:bg-red-50"
        >
          <Trash2 size={14} />
          删除
        </button>
      </div>
    </div>
  )
}

function FullTaskComposer({ currentWeek, nextWeek, subjects, timeSlots, addTask }: { currentWeek: { start: string; end: string }; nextWeek: { start: string; end: string }; subjects: Subject[]; timeSlots: TimeSlot[]; addTask: PlanActions['addTask'] }) {
  const [taskTitle, setTaskTitle] = useState('')
  const [taskSubject, setTaskSubject] = useState<Subject>(subjects[0] ?? defaultSubjects[0])
  const [taskDate, setTaskDate] = useState(todayIso())
  const [taskSlot, setTaskSlot] = useState<TimeSlot>(timeSlots[0] ?? defaultTimeSlots[0])
  const [taskMinutes, setTaskMinutes] = useState(60)
  const safeTaskSubject = subjects.includes(taskSubject) ? taskSubject : subjects[0] ?? defaultSubjects[0]
  const safeTaskSlot = timeSlots.includes(taskSlot) ? taskSlot : timeSlots[0] ?? defaultTimeSlots[0]
  const selectedTaskDay = taskDate ? dayNameFromIso(taskDate) : currentDayName()

  const createTask = () => {
    if (!taskTitle.trim() || !taskDate || taskDate < currentWeek.start || taskDate > nextWeek.end) return
    addTask({
      title: taskTitle.trim(),
      subject: safeTaskSubject,
      minutes: Math.max(1, taskMinutes || 1),
      day: selectedTaskDay,
      slot: safeTaskSlot,
      date: taskDate,
      status: 'todo',
    })
    setTaskTitle('')
  }

  return (
    <div className="grid gap-3">
      <TextInput placeholder="任务名称" value={taskTitle} onChange={(event) => setTaskTitle(event.target.value)} />
      <div className="grid gap-3 sm:grid-cols-2">
        <TextInput type="date" min={currentWeek.start} max={nextWeek.end} value={taskDate} onChange={(event) => setTaskDate(event.target.value)} />
        <Select value={safeTaskSlot} onChange={(event) => setTaskSlot(event.target.value)}>{timeSlots.map((slot) => <option key={slot}>{slot}</option>)}</Select>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Select value={safeTaskSubject} onChange={(event) => setTaskSubject(event.target.value)}>{subjects.map((subject) => <option key={subject}>{subject}</option>)}</Select>
        <TextInput type="number" min={1} value={taskMinutes} onChange={(event) => setTaskMinutes(Number(event.target.value))} />
      </div>
      <Panel className="bg-blue-50 text-blue-800 ring-blue-100">
        <p className="break-words text-xs leading-5">将写入 <b>{taskDate}</b> · <b>{selectedTaskDay}</b> · <b>{safeTaskSlot}</b>。</p>
      </Panel>
      <Button onClick={createTask}><Plus size={16} />新增任务</Button>
    </div>
  )
}

function CountdownCard({ settings, updateSettings, countdown }: { settings: ReturnType<typeof useStudyStore.getState>['settings']; updateSettings: ReturnType<typeof useStudyStore.getState>['updateSettings']; countdown: number | null }) {
  return (
    <Card>
      <SectionTitle title="考试倒计时" />
      <div className="mb-4 flex items-center gap-3 rounded-2xl bg-slate-950 p-4 text-white">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-white/10"><CalendarClock size={20} /></div>
        <div className="min-w-0">
          <p className="text-3xl font-semibold tracking-tight">{countdown === null ? '未设置' : `${countdown} 天`}</p>
          <p className="break-words text-sm leading-5 text-slate-300">{settings.examName || '请填写考试名称'} · {settings.examDate || '请填写考试日期'}</p>
        </div>
      </div>
      <div className="grid gap-3">
        <TextInput value={settings.examName} onChange={(event) => updateSettings({ examName: event.target.value })} placeholder="考试名称" />
        <TextInput type="date" value={settings.examDate} onChange={(event) => updateSettings({ examDate: event.target.value })} />
      </div>
    </Card>
  )
}

function TimeSlotManager({ tasks, timeSlots, newSlot, setNewSlot, addTimeSlot, removeTimeSlot }: { tasks: Task[]; timeSlots: TimeSlot[]; newSlot: string; setNewSlot: (value: string) => void; addTimeSlot: () => void; removeTimeSlot: (slot: TimeSlot) => void }) {
  return (
    <Card>
      <SectionTitle title="学习时段管理" caption="预设早晨、上午、下午、晚上、睡前，也可以按自己的作息添加。" />
      <div className="grid gap-3">
        <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
          <TextInput placeholder="例如 午休 / 通勤" value={newSlot} onChange={(event) => setNewSlot(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') addTimeSlot() }} />
          <Button className="w-full sm:w-auto" type="button" onClick={addTimeSlot}><Plus size={16} />添加</Button>
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
  )
}

function TaskList({ title, tasks, deleteTask, toggleTask }: { title: string; tasks: Task[]; deleteTask: ReturnType<typeof useStudyStore.getState>['deleteTask']; toggleTask: ReturnType<typeof useStudyStore.getState>['toggleTask'] }) {
  return (
    <Card>
      <SectionTitle title={title} />
      <div className="space-y-3">
        {tasks.length === 0 ? <EmptyState text="暂无任务。" /> : tasks.map((task) => (
          <Panel key={task.id}>
            <div className="mb-2 flex flex-wrap items-start justify-between gap-2">
              <p className={`min-w-0 break-words text-sm font-medium ${task.status === 'done' ? 'text-slate-400 line-through' : 'text-slate-900'}`}>{task.title}</p>
              <span className="max-w-full rounded-full bg-white px-2 py-1 text-xs text-slate-500 ring-1 ring-slate-200"><span className="block truncate">{task.slot}</span></span>
            </div>
            <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:items-center">
              <span className="min-w-0 break-words text-xs leading-5 text-slate-500">{task.subject} · {task.minutes} 分钟 · {task.date}</span>
              <GhostButton className="w-full sm:w-auto" onClick={() => toggleTask(task.id)}>{task.status === 'done' ? '设为待办' : '标记完成'}</GhostButton>
              <DangerButton className="w-full sm:w-auto" onClick={() => deleteTask(task.id)}><Trash2 size={15} />删除</DangerButton>
            </div>
          </Panel>
        ))}
      </div>
    </Card>
  )
}

function firstSlotWithTasks(tasks: Task[], timeSlots: TimeSlot[]) {
  return timeSlots.find((slot) => tasks.some((task) => task.slot === slot)) ?? timeSlots.find((slot) => slot === '上午') ?? timeSlots[0] ?? defaultTimeSlots[0]
}
