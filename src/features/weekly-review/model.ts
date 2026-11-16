import type { Task, PomodoroSession } from '../../types.ts'

export type WeekPeriod = { start: string; end: string }
export type WeekDayStats = { date: string; plannedMinutes: number; focusMinutes: number; totalTasks: number; completedTasks: number }
export type SubjectStats = Omit<WeekDayStats, 'date'> & { subject: string }
export type WeekSummary = WeekPeriod & { totalTasks: number; completedTasks: number; completionRate: number; plannedMinutes: number; focusMinutes: number; focusSessions: number; activeDays: number; hasData: boolean; days: WeekDayStats[]; subjects: SubjectStats[] }
export type WeeklyReport = { id: string; weekStart: string; weekEnd: string; generatedAt: string; snapshot: WeekSummary; analysis: string; providerHost: string; model: string }
export type ReviewDecision = { action: 'later' | 'skip' | 'reviewed'; at: string }
export type WeeklyReviewData = { enabled: boolean; weekday: number; decisions: Record<string, ReviewDecision>; reports: WeeklyReport[] }
export const dateIso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
const shift = (date: Date, days: number) => { const d = new Date(date); d.setDate(d.getDate() + days); return d }
const validDate = (v: unknown): v is string => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) && dateIso(new Date(`${v}T12:00:00`)) === v
const record = (v: unknown): Record<string, unknown> => v && typeof v === 'object' && !Array.isArray(v) ? v as Record<string, unknown> : {}
const minutes = (n: number) => Number.isFinite(n) && n > 0 ? n : 0
export function previousWeek(now = new Date()): WeekPeriod {
  const monday = shift(now, -((now.getDay() + 6) % 7) - 7)
  return { start: dateIso(monday), end: dateIso(shift(monday, 6)) }
}
export function summarizeWeek(tasks: Task[], sessions: PomodoroSession[], period: WeekPeriod): WeekSummary {
  const days: WeekDayStats[] = Array.from({ length: 7 }, (_, i) => ({ date: dateIso(shift(new Date(`${period.start}T12:00:00`), i)), plannedMinutes: 0, focusMinutes: 0, totalTasks: 0, completedTasks: 0 }))
  const byDay = new Map(days.map(d => [d.date, d]))
  const bySubject = new Map<string, SubjectStats>()
  const subject = (name: string) => { const key = name?.trim() || '未分类'; if (!bySubject.has(key)) bySubject.set(key, { subject: key, plannedMinutes: 0, focusMinutes: 0, totalTasks: 0, completedTasks: 0 }); return bySubject.get(key)! }
  for (const task of tasks) {
    const day = byDay.get(task.date)
    if (!day) continue
    for (const stats of [day, subject(task.subject)]) { stats.totalTasks++; stats.completedTasks += Number(task.status === 'done'); stats.plannedMinutes += minutes(task.minutes) }
  }
  let focusSessions = 0
  const taskSubjects = new Map(tasks.map(task => [task.id, task.subject]))
  for (const session of sessions) {
    if (session.mode !== '专注' || !minutes(session.minutes)) continue
    const completed = new Date(session.completedAt)
    if (!Number.isFinite(completed.getTime())) continue
    const day = byDay.get(dateIso(completed))
    if (!day) continue
    focusSessions++
    for (const stats of [day, subject(session.subject || taskSubjects.get(session.taskId || '') || '未分类')]) stats.focusMinutes += minutes(session.minutes)
  }
  const sum = (key: keyof Omit<WeekDayStats, 'date'>) => days.reduce((n, day) => n + day[key], 0)
  const totalTasks = sum('totalTasks'); const completedTasks = sum('completedTasks')
  return { ...period, totalTasks, completedTasks, completionRate: totalTasks ? Math.round(completedTasks / totalTasks * 100) : 0, plannedMinutes: sum('plannedMinutes'), focusMinutes: sum('focusMinutes'), focusSessions, activeDays: days.filter(d => d.focusMinutes > 0).length, hasData: totalTasks > 0 || focusSessions > 0, days, subjects: [...bySubject.values()].sort((a, b) => b.focusMinutes - a.focusMinutes || a.subject.localeCompare(b.subject, 'zh-CN')) }
}
function cleanSummary(raw: unknown): WeekSummary | null {
  const v = record(raw)
  if (!validDate(v.start) || !validDate(v.end) || !Array.isArray(v.days) || v.days.length !== 7 || !Array.isArray(v.subjects)) return null
  const keys = ['plannedMinutes', 'focusMinutes', 'totalTasks', 'completedTasks'] as const
  const stats = (raw: unknown) => { const value = record(raw); return Object.fromEntries(keys.map(k => [k, typeof value[k] === 'number' && Number.isFinite(value[k]) && value[k] >= 0 ? value[k] : 0])) as Omit<WeekDayStats, 'date'> }
  const days = v.days.map(raw => ({ ...stats(raw), date: String(record(raw).date) }))
  if (days.some((d, i) => !validDate(d.date) || d.date !== dateIso(shift(new Date(`${v.start}T12:00:00`), i))) || days[6].date !== v.end) return null
  const subjects = v.subjects.map(raw => ({ ...stats(raw), subject: String(record(raw).subject || '未分类').slice(0, 200) }))
  const totalTasks = days.reduce((n,d) => n + d.totalTasks, 0); const completedTasks = days.reduce((n,d) => n + d.completedTasks, 0)
  return { start: v.start, end: v.end, days, subjects, totalTasks, completedTasks, completionRate: totalTasks ? Math.round(completedTasks / totalTasks * 100) : 0, plannedMinutes: days.reduce((n,d) => n+d.plannedMinutes,0), focusMinutes: days.reduce((n,d) => n+d.focusMinutes,0), focusSessions: typeof v.focusSessions === 'number' && Number.isFinite(v.focusSessions) ? Math.max(0, Math.floor(v.focusSessions)) : 0, activeDays: days.filter(d => d.focusMinutes > 0).length, hasData: totalTasks > 0 || days.some(d => d.focusMinutes > 0) }
}
export function normalizeReviewData(raw: unknown): WeeklyReviewData {
  const value = record(raw); const decisions: Record<string, ReviewDecision> = {}
  for (const [key, rawDecision] of Object.entries(record(value.decisions))) {
    const decision = record(rawDecision)
    if (validDate(key) && (decision.action === 'later' || decision.action === 'skip' || decision.action === 'reviewed') && typeof decision.at === 'string' && Number.isFinite(new Date(decision.at).getTime())) decisions[key] = { action: decision.action, at: decision.at }
  }
  const reports: WeeklyReport[] = []
  for (const rawReport of Array.isArray(value.reports) ? value.reports : []) {
    const r = record(rawReport); const snapshot = cleanSummary(r.snapshot)
    if (!snapshot || r.weekStart !== snapshot.start || r.weekEnd !== snapshot.end || typeof r.analysis !== 'string' || !r.analysis.trim() || typeof r.generatedAt !== 'string' || !Number.isFinite(new Date(r.generatedAt).getTime())) continue
    if (reports.some(report => report.weekStart === r.weekStart)) continue
    reports.push({ id: String(r.id || snapshot.start).slice(0, 100), weekStart: snapshot.start, weekEnd: snapshot.end, generatedAt: r.generatedAt, snapshot, analysis: r.analysis.slice(0, 50000), providerHost: String(r.providerHost || '').slice(0, 256), model: String(r.model || '').slice(0, 256) })
  }
  return { enabled: value.enabled === true, weekday: Number.isInteger(value.weekday) && Number(value.weekday) >= 1 && Number(value.weekday) <= 7 ? Number(value.weekday) : 1, decisions, reports: reports.sort((a,b) => b.weekStart.localeCompare(a.weekStart)) }
}
export function dueForReview(data: WeeklyReviewData, aiEnabled: boolean, now = new Date()) {
  if (!data.enabled || !aiEnabled || ((now.getDay() + 6) % 7) + 1 < data.weekday) return false
  const { start } = previousWeek(now)
  if (data.reports.some(r => r.weekStart === start)) return false
  const decision = data.decisions[start]
  if (decision?.action === 'skip' || decision?.action === 'reviewed') return false
  if (decision?.action === 'later' && now.getTime() - new Date(decision.at).getTime() < 86400000) return false
  return true
}
