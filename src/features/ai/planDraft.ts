import { dayNameFromIso } from '../../lib/date.ts'
import type { Task } from '../../types.ts'

export const MAX_PLAN_TASKS = 42
export const MAX_PLAN_MESSAGE = 2000
export type DraftTask = Pick<Task, 'title' | 'date' | 'subject' | 'slot' | 'minutes'>
export type PlanContext = { today: string; currentWeekStart: string; nextWeekEnd: string; subjects: string[]; slots: string[] }
export type PlanMessage = { role: 'user' | 'assistant'; content: string }
export type PlanReply = { reply: string; tasks?: DraftTask[] }
const isRecord = (v: unknown): v is Record<string, unknown> => v !== null && typeof v === 'object' && !Array.isArray(v)

export function parsePlanReply(text: string): PlanReply {
  const invalid = () => new Error('AI 未返回可用的计划回复，请重试。原草稿未更改。')
  if (text.length > 60000) throw invalid()
  let value: unknown
  try { value = JSON.parse(text.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '')) } catch { throw invalid() }
  if (!isRecord(value) || typeof value.reply !== 'string' || !value.reply.trim() || value.reply.length > 6000) throw invalid()
  const reply = value.reply.trim()
  if (value.tasks === undefined) return { reply }
  if (!Array.isArray(value.tasks) || value.tasks.length > MAX_PLAN_TASKS) throw invalid()
  const tasks = value.tasks.map((entry: unknown): DraftTask => {
    if (!isRecord(entry)) throw invalid()
    const { title, date, subject, slot, minutes } = entry
    if (typeof title !== 'string' || title.length > 300 || typeof date !== 'string' || date.length > 20 || typeof subject !== 'string' || subject.length > 200 || typeof slot !== 'string' || slot.length > 200 || typeof minutes !== 'number' || !Number.isFinite(minutes)) throw invalid()
    return { title: title.trim(), date: date.trim(), subject: subject.trim(), slot: slot.trim(), minutes }
  })
  return { reply, tasks }
}

export function validateDraftTask(task: DraftTask, context: PlanContext): string | null {
  if (!task.title.trim() || task.title.trim().length > 120) return '任务名称须为 1–120 字。'
  const time = new Date(`${task.date}T00:00:00Z`)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(task.date) || !Number.isFinite(time.getTime()) || time.toISOString().slice(0, 10) !== task.date || task.date < context.currentWeekStart || task.date > context.nextWeekEnd) return '请选择本周或下周的有效日期。'
  if (!context.subjects.includes(task.subject)) return '请选择已配置的科目。'
  if (!context.slots.includes(task.slot)) return '请选择已配置的时段。'
  if (!Number.isInteger(task.minutes) || task.minutes < 1 || task.minutes > 720) return '预计时长须为 1–720 的整数分钟。'
  return null
}

const signature = (task: DraftTask) => JSON.stringify([task.date, task.subject, task.slot, task.title.trim().replace(/\s+/g, ' ').toLowerCase()])

export function preparePlanTasks(draft: DraftTask[], context: PlanContext, existing: Task[]) {
  if (!draft.length || draft.length > MAX_PLAN_TASKS) throw new Error('请选择 1–42 项任务。')
  const seen = new Set(existing.map(signature))
  const tasks: Omit<Task, 'id'>[] = []
  for (const [index, task] of draft.entries()) {
    const error = validateDraftTask(task, context)
    if (error) throw new Error(`第 ${index + 1} 项：${error}`)
    const key = signature(task)
    if (seen.has(key)) continue
    seen.add(key)
    tasks.push({ title: task.title.trim(), date: task.date, subject: task.subject, slot: task.slot, minutes: task.minutes, day: dayNameFromIso(task.date), status: 'todo' })
  }
  return { tasks, omitted: draft.length - tasks.length }
}
