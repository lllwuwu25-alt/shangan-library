import {
  CalendarDays,
  Check,
  Maximize2,
  Minimize2,
  Pause,
  Play,
  RotateCcw,
  Trash2,
} from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { PageHeader } from '../components/Layout'
import { Button, Card, DangerButton, EmptyState, GhostButton, SectionTitle, Select, StatCard, TextInput } from '../components/ui'
import { todayIso, weekRange } from '../lib/date'
import { useStudyStore } from '../store/useStudyStore'
import type { PomodoroSession } from '../types'

type TimerMode = PomodoroSession['mode']

const modeOptions: Array<{ mode: TimerMode; minutes: number; label: string }> = [
  { mode: '专注', minutes: 25, label: '25 分钟专注' },
  { mode: '短休息', minutes: 5, label: '5 分钟短休息' },
  { mode: '长休息', minutes: 15, label: '15 分钟长休息' },
]

const isoFromDate = (value: string) => value.slice(0, 10)

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

  const [mode, setMode] = useState<TimerMode>('专注')
  const [customMinutes, setCustomMinutes] = useState(25)
  const [remainingSeconds, setRemainingSeconds] = useState(25 * 60)
  const [isRunning, setIsRunning] = useState(false)
  const [isFocusView, setIsFocusView] = useState(false)
  const [title, setTitle] = useState('专注学习')

  const selectedPreset = modeOptions.find((item) => item.mode === mode)

  useEffect(() => {
    if (!isRunning) return
    const timer = window.setInterval(() => {
      setRemainingSeconds((seconds) => {
        if (seconds <= 1) {
          window.clearInterval(timer)
          setIsRunning(false)
          return 0
        }
        return seconds - 1
      })
    }, 1000)
    return () => window.clearInterval(timer)
  }, [isRunning])

  useEffect(() => {
    const syncFullscreenState = () => {
      if (!document.fullscreenElement) setIsFocusView(false)
    }
    document.addEventListener('fullscreenchange', syncFullscreenState)
    return () => document.removeEventListener('fullscreenchange', syncFullscreenState)
  }, [])

  const resetTimer = (nextMode = mode, nextMinutes = customMinutes) => {
    setMode(nextMode)
    setCustomMinutes(nextMinutes)
    setRemainingSeconds(Math.max(1, nextMinutes) * 60)
    setIsRunning(false)
  }

  const changeMode = (nextMode: TimerMode) => {
    const preset = modeOptions.find((item) => item.mode === nextMode) ?? modeOptions[0]
    resetTimer(preset.mode, preset.minutes)
  }

  const changeMinutes = (value: number) => {
    const nextMinutes = Math.max(1, Math.min(240, Number.isFinite(value) ? value : 25))
    resetTimer(mode, nextMinutes)
  }

  const completeSession = () => {
    addPomodoroSession({
      title: title.trim() || '专注学习',
      minutes: customMinutes,
      mode,
    })
    resetTimer(mode, customMinutes)
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

  const today = todayIso()
  const currentWeek = weekRange(0)
  const focusSessions = sessions.filter((item) => item.mode === '专注')
  const todayFocus = focusSessions.filter((item) => isoFromDate(item.completedAt) === today)
  const weekFocus = focusSessions.filter((item) => {
    const date = isoFromDate(item.completedAt)
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
      {isFocusView ? (
        <section className="fixed inset-0 z-50 flex min-h-[100dvh] flex-col overflow-y-auto bg-slate-950 px-5 py-5 text-white sm:px-8 sm:py-7">
          <header className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-blue-300">{mode}</p>
              <h1 className="mt-1 truncate text-base font-semibold text-white sm:text-lg">{title.trim() || '专注学习'}</h1>
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
                  className={`rounded-full px-4 py-2 text-sm font-medium transition focus:outline-none focus:ring-2 focus:ring-blue-400 ${
                    mode === item.mode ? 'bg-blue-500 text-white' : 'bg-white/8 text-slate-300 hover:bg-white/12 hover:text-white'
                  }`}
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
                onClick={() => setIsRunning((value) => !value)}
                className="flex h-12 min-w-32 items-center justify-center gap-2 rounded-xl bg-blue-500 px-5 text-base font-semibold text-white transition hover:bg-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-300"
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
              <button
                type="button"
                onClick={completeSession}
                className="flex h-12 items-center justify-center gap-2 rounded-xl bg-emerald-500 px-5 text-sm font-semibold text-white transition hover:bg-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-300"
              >
                <Check size={18} />
                完成并记录
              </button>
            </div>
          </div>

          <p className="text-center text-xs text-slate-500">按 Esc 退出全屏 · 专注记录仅保存在本地</p>
        </section>
      ) : (
        <>
      <PageHeader title="番茄钟" description="用一个简单的本地计时器记录专注时长，适合刷题、背诵、整理资料和复盘。" />

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
        <Card className="overflow-hidden p-0">
          <div className="border-b border-slate-200 px-5 py-4">
            <SectionTitle title="专注计时" caption="完成后会写入本地专注记录，刷新页面也不会丢失。" />
            <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_160px_160px]">
              <TextInput value={title} onChange={(event) => setTitle(event.target.value)} placeholder="本次专注内容" />
              <Select value={mode} onChange={(event) => changeMode(event.target.value as TimerMode)}>
                {modeOptions.map((item) => <option key={item.mode} value={item.mode}>{item.label}</option>)}
              </Select>
              <TextInput type="number" min={1} max={240} value={customMinutes} onChange={(event) => changeMinutes(Number(event.target.value))} />
            </div>
          </div>

          <div className="grid place-items-center px-5 py-10 text-center">
            <div className="relative grid size-64 place-items-center rounded-full bg-slate-50 ring-1 ring-slate-200 sm:size-72">
              <div className="absolute inset-4 rounded-full border-[10px] border-blue-100" />
              <div className="absolute inset-4 rounded-full border-[10px] border-blue-600 border-l-transparent border-t-transparent" />
              <div className="relative">
                <p className="text-sm font-medium text-blue-700">{selectedPreset?.label ?? mode}</p>
                <p className="mt-3 font-mono text-6xl font-semibold tracking-tight text-slate-950 sm:text-7xl">{formatClock(remainingSeconds)}</p>
                <p className="mt-3 text-sm text-slate-500">{mode === '专注' ? '保持当前节奏' : '休息一下，下一轮更稳'}</p>
              </div>
            </div>

            <div className="mt-6 flex flex-wrap justify-center gap-2">
              <Button type="button" onClick={() => setIsRunning((value) => !value)}>
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
              <GhostButton type="button" onClick={completeSession}>
                <CalendarDays size={16} />
                完成并记录
              </GhostButton>
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
                  <p className="mt-1 text-xs text-slate-500">{formatDateTime(session.completedAt)} · {session.mode}</p>
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
