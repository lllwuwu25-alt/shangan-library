import { initialData } from '../data/initialData'
import { defaultSubjects, defaultTimeSlots } from '../constants'
import { dayNameFromIso, isoForCurrentWeekDay, todayIso } from './date'
import type { AppData, DayName, Mistake, ResourceItem, Settings, Subject, Task, TimeSlot, WeeklyPlanItem } from '../types'

export const STORAGE_KEY = 'shangan-library-data-v1'
const isDayName = (value: unknown): value is DayName => ['周一', '周二', '周三', '周四', '周五', '周六', '周日'].includes(String(value))
const normalizeTimeSlots = (value: unknown): TimeSlot[] => {
  if (!Array.isArray(value)) return defaultTimeSlots
  const slots = value.map((item) => String(item).trim()).filter(Boolean)
  return slots.length ? Array.from(new Set(slots)) : defaultTimeSlots
}
const normalizeSubjects = (value: unknown): Subject[] => {
  if (!Array.isArray(value)) return defaultSubjects
  const subjects = value.map((item) => String(item).trim()).filter(Boolean)
  return subjects.length ? Array.from(new Set(subjects)) : defaultSubjects
}

const normalizeSettings = (settings?: Partial<Settings>): Settings => ({
  ...initialData.settings,
  ...settings,
  subjects: normalizeSubjects(settings?.subjects),
  timeSlots: normalizeTimeSlots(settings?.timeSlots),
  backupReminderDays: Math.max(1, Number(settings?.backupReminderDays ?? initialData.settings.backupReminderDays)),
  theme: settings?.theme === 'dark' || settings?.theme === 'system' ? settings.theme : 'light',
})

const normalizeTask = (task: Partial<Task>): Task => {
  const date = task.date ?? todayIso()
  const day = isDayName(task.day) ? task.day : dayNameFromIso(date)
  return {
    id: task.id ?? `task-${Date.now()}`,
    title: task.title ?? '未命名任务',
    subject: (task.subject ?? '英语') as Subject,
    minutes: Number(task.minutes ?? 60),
    day,
    slot: String(task.slot ?? '上午'),
    date: task.date ?? isoForCurrentWeekDay(day),
    status: task.status === 'done' ? 'done' : 'todo',
  }
}

const planItemToTask = (item: WeeklyPlanItem): Task => ({
  id: `task-from-${item.id}`,
  title: item.content,
  subject: item.subject,
  minutes: item.slot === '上午' ? 90 : 60,
  day: item.day,
  slot: item.slot,
  date: isoForCurrentWeekDay(item.day),
  status: 'todo',
})

export const normalizeAppData = (raw: Partial<AppData>): AppData => {
  const normalizedTasks = (raw.tasks ?? []).map(normalizeTask)
  const convertedPlanTasks = (raw.weeklyPlan ?? [])
    .filter((item) => !normalizedTasks.some((task) => task.id === `task-from-${item.id}` || (task.day === item.day && task.slot === item.slot && task.title === item.content)))
    .map(planItemToTask)

  const resources: ResourceItem[] = (raw.resources ?? []).map((item) => ({
    ...item,
    attachments: item.attachments ?? [],
  }))

  const mistakes: Mistake[] = (raw.mistakes ?? []).map((item) => ({
    ...item,
    importance: item.importance ?? '黄',
    attachments: item.attachments ?? [],
  }))

  return {
    tasks: [...normalizedTasks, ...convertedPlanTasks],
    weeklyPlan: [],
    resources,
    mistakes,
    settings: normalizeSettings(raw.settings),
  }
}

export const loadData = (): AppData => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (!saved) return initialData
    return normalizeAppData({ ...initialData, ...JSON.parse(saved) })
  } catch {
    return initialData
  }
}

export const saveData = (data: AppData) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
}

export const clearData = () => {
  localStorage.removeItem(STORAGE_KEY)
}
