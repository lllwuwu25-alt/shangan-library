import {
  CalendarDays,
  ListTodo,
  Maximize2,
  Minimize2,
  Pause,
  Play,
  RotateCcw,
  Trash2,
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { FocusCompletion } from '../components/FocusCompletion'
import { PageHeader } from '../components/Layout'
import { Button, Card, DangerButton, EmptyState, GhostButton, SectionTitle, Select, StatCard, TextInput } from '../components/ui'
import { defaultSubjects, subjectOptions } from '../constants'
import { localIsoFromDateTime, todayIso, weekRange } from '../lib/date'
import { useStudyStore } from '../store/useStudyStore'
import type { PomodoroSession, Subject } from '../types'

type TimerMode = PomodoroSession['mode']

const modeOptions: Array<{ mode: TimerMode; minutes: number; label: string }> = [
  { mode: '专注', minutes: 25, label: '25 分钟专注' },
  { mode: '短休息', minutes: 5, label: '5 分钟短休息' },
  { mode: '长休息', minutes: 15, label: '15 分钟长休息' },
]

const focusPresets = [25, 45, 60, 90, 120]
const maxTimerMinutes = 12 * 60

const formatClock = (seconds: number) => {
  const minutes = Math.floor(seconds / 60)
  const rest = seconds % 60
  return `${String(minutes).padStart(2, '0')}:${String(rest).padStart(2, '0')}`
}

const formatDateTime = (iso: string) => {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return iso
  return `${date.getMonth() + 1}月${date.getDate()}日 ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

const totalMinutes = (sessions: PomodoroSession[]) => sessions.reduce((sum, item) => sum + item.minutes, 0)

export function Pomodoro() {
  const pageRef = useRef<HTMLDivElement>(null)
  const sessions = useStudyStore((state) => state.pomodoroSessions)
  const addPomodoroSession = useStudyStore((state) => state.addPomodoroSession)
  const deletePomodoroSession = useStudyStore((state) => state.deletePomodoroSession)
  const clearPomodoroSessions = useStudyStore((state) => state.clearPomodoroSessions)
  const tasks = useStudyStore((state) => state.tasks)
  const settings = useStudyStore((state) => state.settings)

  const [mode, setMode] = useState<TimerMode>('专注')
  const [customMinutes, setCustomMinutes] = useState(25)
  const [remainingSeconds, setRemainingSeconds] = useState(25 * 60)
  const [isRunning, setIsRunning] = useState(false)
  const [hasStarted, setHasStarted] = useState(false)
  const [isFocusView, setIsFocusView] = useState(false)
  const [title, setTitle] = useState('专注学习')
  const [subject, setSubject] = useState<Subject>(settings.subjects[0] ?? defaultSubjects[0])
  const [selectedTaskId, setSelectedTaskId] = useState('')
  const [showCompletion, setShowCompletion] = useState(false)
  const completedRound = useRef(false)
  const remainingSecondsRef = useRef(25 * 60)
  const closeCompletion = useCallback(() => setShowCompletion(false), [])

  const today = todayIso()
  const todayTasks = tasks.filter((task) => task.date === today)
  const subjects = subjectOptions([...settings.subjects, ...tasks.map((task) => task.subject)])
  const safeSubject = subjects.includes(subject) ? subject : subjects[0] ?? defaultSubjects[0]

  const recordCompletedSession = useCallback(() => {
    addPomodoroSession({
      title: title.trim() || '专注学习',
      minutes: customMinutes,
      mode,
      subject: mode === '专注' ? safeSubject : undefined,
      taskId: mode === '专注' && selectedTaskId ? selectedTaskId : undefined,
    })
  }, [addPomodoroSession, customMinutes, mode, safeSubject, selectedTaskId, title])

  useEffect(() => {
    if (!isRunning) return
    const deadline = Date.now() + remainingSecondsRef.current * 1000
    const timer = window.setInterval(() => {
      const seconds = Math.max(0, Math.ceil((deadline - Date.now()) / 1000))
      remainingSecondsRef.current = seconds
      setRemainingSeconds(seconds)
      if (seconds === 0) {
        window.clearInterval(timer)
        setIsRunning(false)
        if (!completedRound.current) {
          completedRound.current = true
          recordCompletedSession()
          if (mode === '专注') setShowCompletion(true)
        }
      }
    }, 250)
    return () => window.clearInterval(timer)
  }, [isRunning, mode, recordCompletedSession])

  useEffect(() => {
    const syncFullscreenState = () => {
      if (!document.fullscreenElement) setIsFocusView(false)
    }
    document.addEventListener('fullscreenchange', syncFullscreenState)
    return () => document.removeEventListener('fullscreenchange', syncFullscreenState)
  }, [])

  const resetTimer = (nextMode = mode, nextMinutes = customMinutes) => {
    completedRound.current = false
    setMode(nextMode)
    setCustomMinutes(nextMinutes)
    const nextSeconds = Math.max(1, nextMinutes) * 60
    remainingSecondsRef.current = nextSeconds
    setRemainingSeconds(nextSeconds)
    setIsRunning(false)
    setHasStarted(false)
  }

  const changeMode = (nextMode: TimerMode) => {
    const preset = modeOptions.find((item) => item.mode === nextMode) ?? modeOptions[0]
    resetTimer(preset.mode, preset.minutes)
  }

  const changeMinutes = (value: number) => {
    const nextMinutes = Math.max(1, Math.min(maxTimerMinutes, Number.isFinite(value) ? value : 25))
    resetTimer(mode, nextMinutes)
  }

  const toggleTimer = () => {
    if (remainingSeconds === 0) return
    if (!hasStarted) {
      completedRound.current = false
      setHasStarted(true)
    }
    setIsRunning((value) => !value)
  }

  const selectTask = (taskId: string) => {
    setSelectedTaskId(taskId)
    const task = todayTasks.find((item) => item.id === taskId)
    if (!task) return
    setTitle(task.title)
    setSubject(task.subject)
  }

  const enterFocusView = async () => {
    setIsFocusView(true)
    try {
      await pageRef.current?.requestFullscreen()
    } catch {
      // The fixed focus view remains available when the browser blocks native fullscreen.
    }
  }

  const exitFocusView = async () => {
    setIsFocusView(false)
    if (document.fullscreenElement) await document.exitFullscreen()
  }

  const currentWeek = weekRange(0)
  const focusSessions = sessions.filter((item) => item.mode === '专注')
  const todayFocus = focusSessions.filter((item) => localIsoFromDateTime(item.completedAt) === today)
  const weekFocus = focusSessions.filter((item) => {
    const date = localIsoFromDateTime(item.completedAt)
    return date >= currentWeek.start && date <= currentWeek.end
  })

  const stats = useMemo(() => ({
    todayMinutes: totalMinutes(todayFocus),
    weekMinutes: totalMinutes(weekFocus),
    totalMinutes: totalMinutes(focusSessions),
    focusCount: focusSessions.length,
  }), [focusSessions, todayFocus, weekFocus])

  const progress = Math.max(0, Math.min(100, (remainingSeconds / (customMinutes * 60)) * 100))

  return (
    <div ref={pageRef} className={isFocusView ? 'min-h-screen bg-slate-950' : 'space-y-5'}>
      {showCompletion && <FocusCompletion minutes={customMinutes} title={title.trim() || '专注学习'} onClose={closeCompletion} />}
      {isFocusView ? (
        <section className="fixed inset-0 z-50 flex min-h-[100dvh] flex-col overflow-y-auto bg-slate-950 px-5 py-5 text-white sm:px-8 sm:py-7">
          <header className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-blue-300">{mode}</p>
              <h1 className="mt-1 truncate text-base font-semibold text-white sm:text-lg">{title.trim() || '专注学习'}</h1>
              {mode === '专注' && <p className="mt-1 truncate text-xs text-slate-400">{safeSubject}{selectedTaskId ? ' · 已关联今日任务' : ' · 独立专注'}</p>}
            </div>
            <button
              type="button"
              onClick={exitFocusView}
              className="flex h-10 shrink-0 items-center gap-2 rounded-xl bg-white/10 px-3 text-sm font-medium text-white transition hover:bg-white/15 focus:outline-none focus:ring-2 focus:ring-blue-400"
            >
              <Minimize2 size={17} />
              <span className="hidden sm:inline">退出全屏</span>
            </button>
          </header>

          <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col items-center justify-center py-8 text-center">
            <div className="mb-7 flex flex-wrap justify-center gap-2">
              {modeOptions.map((item) => (
                <button
                  key={item.mode}
                  type="button"
                  onClick={() => changeMode(item.mode)}
                  disabled={hasStarted}
                  className={`rounded-full px-4 py-2 text-sm font-medium transition focus:outline-none focus:ring-2 focus:ring-blue-400 ${
                    mode === item.mode ? 'bg-blue-500 text-white' : 'bg-white/8 text-slate-300 hover:bg-white/12 hover:text-white'
                  } disabled:cursor-not-allowed disabled:opacity-55`}
                >
                  {item.mode}
                </button>
              ))}
            </div>

            <div
              className="relative grid size-[min(72vw,58vh,34rem)] min-h-64 min-w-64 place-items-center rounded-full p-3"
              style={{ background: `conic-gradient(rgb(59 130 246) ${progress}%, rgb(30 41 59) ${progress}% 100%)` }}
              aria-label={`剩余时间 ${formatClock(remainingSeconds)}`}
            >
              <div className="absolute inset-3 rounded-full bg-slate-950" />
              <div className="relative">
                <p className="font-mono text-6xl font-semibold text-white sm:text-8xl lg:text-9xl">{formatClock(remainingSeconds)}</p>
                <p className="mt-4 text-sm text-slate-400 sm:text-base">
                  {isRunning ? '正在专注，请保持当前节奏' : remainingSeconds === 0 ? '本轮计时已完成' : '准备好后开始计时'}
                </p>
              </div>
            </div>

            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <button
                type="button"
                disabled={remainingSeconds === 0}
                onClick={toggleTimer}
                className="flex h-12 min-w-32 items-center justify-center gap-2 rounded-xl bg-blue-500 px-5 text-base font-semibold text-white transition hover:bg-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-300 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isRunning ? <Pause size={19} /> : <Play size={19} />}
                {isRunning ? '暂停' : '开始'}
              </button>
              <button
                type="button"
                onClick={() => resetTimer()}
                className="flex h-12 items-center justify-center gap-2 rounded-xl bg-white/10 px-5 text-sm font-medium text-white transition hover:bg-white/15 focus:outline-none focus:ring-2 focus:ring-blue-400"
              >
                <RotateCcw size={18} />
                重置
              </button>
            </div>
          </div>

          <p className="text-center text-xs text-slate-500">按 Esc 退出全屏 · 倒计时结束后自动记录到本地</p>
        </section>
      ) : (
        <>
      <PageHeader title="番茄钟" description="用一个简单的本地计时器记录专注时长，适合刷题、背诵、整理资料和复盘。" />

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
        <Card className="overflow-hidden p-0">
          <div className="border-b border-slate-200 px-5 py-4">
            <SectionTitle title="专注计时" caption="倒计时归零后自动写入本地记录，刷新页面也不会丢失。" />
            <div className="grid gap-3 md:grid-cols-2">
              <TextInput value={title} onChange={(event) => setTitle(event.target.value)} placeholder="本次专注内容" disabled={hasStarted} />
              <Select value={mode} onChange={(event) => changeMode(event.target.value as TimerMode)} disabled={hasStarted}>
                {modeOptions.map((item) => <option key={item.mode} value={item.mode}>{item.label}</option>)}
              </Select>
              <Select value={selectedTaskId} onChange={(event) => selectTask(event.target.value)} disabled={mode !== '专注' || hasStarted}>
                <option value="">不关联任务</option>
                {todayTasks.map((task) => <option key={task.id} value={task.id}>{task.slot} · {task.title}</option>)}
              </Select>
              <div className="grid grid-cols-[minmax(0,1fr)_120px] gap-3">
                <Select value={safeSubject} onChange={(event) => setSubject(event.target.value)} disabled={mode !== '专注' || hasStarted}>
                  {subjects.map((item) => <option key={item}>{item}</option>)}
                </Select>
                <TextInput type="number" min={1} max={maxTimerMinutes} value={customMinutes} onChange={(event) => changeMinutes(Number(event.target.value))} aria-label="计时分钟数" disabled={hasStarted} />
              </div>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2" aria-label="常用计时时长">
              <span className="mr-1 text-xs text-slate-500">快捷时长</span>
              {focusPresets.map((minutes) => (
                <button
                  key={minutes}
                  type="button"
                  disabled={hasStarted}
                  onClick={() => changeMinutes(minutes)}
                  className={`h-8 rounded-lg px-3 text-xs font-medium transition disabled:cursor-not-allowed disabled:opacity-50 ${customMinutes === minutes ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-blue-50 hover:text-blue-700'}`}
                >
                  {minutes} 分钟
                </button>
              ))}
              <span className="text-xs text-slate-400">最长 12 小时</span>
            </div>
            <p className="mt-3 flex items-start gap-2 text-xs leading-5 text-slate-500">
              <ListTodo size={14} className="mt-0.5 shrink-0" />
              首次开始后会锁定本轮设置；归零时自动记录，但不会自动把关联任务标记为完成。
            </p>
          </div>

          <div className="grid place-items-center px-5 py-10 text-center">
            <div className="relative grid size-64 place-items-center rounded-full bg-slate-50 ring-1 ring-slate-200 sm:size-72">
              <div className="absolute inset-4 rounded-full border-[10px] border-blue-100" />
              <div className="absolute inset-4 rounded-full border-[10px] border-blue-600 border-l-transparent border-t-transparent" />
              <div className="relative">
                <p className="text-sm font-medium text-blue-700">{customMinutes} 分钟{mode}</p>
                <p className="mt-3 font-mono text-6xl font-semibold tracking-tight text-slate-950 sm:text-7xl">{formatClock(remainingSeconds)}</p>
                <p className="mt-3 text-sm text-slate-500">{mode === '专注' ? '保持当前节奏' : '休息一下，下一轮更稳'}</p>
              </div>
            </div>

            <div className="mt-6 flex flex-wrap justify-center gap-2">
              <Button type="button" disabled={remainingSeconds === 0} onClick={toggleTimer}>
                {isRunning ? '暂停' : '开始'}
              </Button>
              <GhostButton type="button" onClick={enterFocusView}>
                <Maximize2 size={16} />
                全屏专注
              </GhostButton>
              <GhostButton type="button" onClick={() => resetTimer()}>
                <RotateCcw size={16} />
                重置
              </GhostButton>
              <GhostButton type="button" onClick={() => setShowCompletion(true)}>预览完成动效</GhostButton>
            </div>
          </div>
        </Card>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
          <StatCard label="今日专注" value={`${Math.round(stats.todayMinutes / 60 * 10) / 10} 小时`} detail={`${stats.todayMinutes} 分钟`} icon={<CalendarDays size={18} />} tone="blue" />
          <StatCard label="本周专注" value={`${Math.round(stats.weekMinutes / 60 * 10) / 10} 小时`} detail={`${currentWeek.start} 至 ${currentWeek.end}`} icon={<CalendarDays size={18} />} tone="green" />
          <StatCard label="累计专注" value={`${Math.round(stats.totalMinutes / 60 * 10) / 10} 小时`} detail={`${stats.totalMinutes} 分钟`} icon={<CalendarDays size={18} />} tone="amber" />
          <StatCard label="专注次数" value={stats.focusCount} detail="只统计专注模式" icon={<CalendarDays size={18} />} tone="slate" />
        </div>
      </div>

      <Card>
        <SectionTitle
          title="专注记录"
          caption="最近完成的番茄钟会保存在本地，可用于回看学习节奏。"
          action={sessions.length > 0 && (
            <DangerButton type="button" onClick={() => window.confirm('确定清空所有番茄钟记录吗？') && clearPomodoroSessions()}>
              <Trash2 size={15} />
              清空记录
            </DangerButton>
          )}
        />
        {sessions.length === 0 ? (
          <EmptyState text="还没有专注记录，完成一次番茄钟后会出现在这里。" />
        ) : (
          <div className="grid gap-2">
            {sessions.slice(0, 20).map((session) => (
              <div key={session.id} className="grid gap-3 rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-200 sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:items-center">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-950">{session.title}</p>
                  <p className="mt-1 text-xs text-slate-500">{formatDateTime(session.completedAt)} · {session.mode}{session.subject ? ` · ${session.subject}` : ''}{session.taskId ? ' · 已关联任务' : ''}</p>
                </div>
                <span className="w-fit rounded-full bg-white px-3 py-1 text-xs font-medium text-slate-700 ring-1 ring-slate-200">{session.minutes} 分钟</span>
                <button type="button" onClick={() => deletePomodoroSession(session.id)} className="flex size-9 items-center justify-center rounded-xl text-red-500 transition hover:bg-red-50" aria-label="删除番茄钟记录">
                  <Trash2 size={15} />
                </button>
              </div>
            ))}
          </div>
        )}
      </Card>
        </>
      )}
    </div>
  )
}
