import type { DayName } from '../types'

const localIsoDate = (date: Date) => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export const todayIso = () => localIsoDate(new Date())

export const addDaysIso = (days: number) => {
  const date = new Date()
  date.setDate(date.getDate() + days)
  return localIsoDate(date)
}

export const daysUntil = (isoDate: string) => {
  if (!isoDate) return null
  const now = new Date()
  const target = new Date(`${isoDate}T00:00:00`)
  if (Number.isNaN(target.getTime())) return null
  now.setHours(0, 0, 0, 0)
  return Math.max(0, Math.ceil((target.getTime() - now.getTime()) / 86400000))
}

export const currentDayName = (): DayName => {
  const days: DayName[] = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
  return days[new Date().getDay()]
}

const weekDays: DayName[] = ['周一', '周二', '周三', '周四', '周五', '周六', '周日']

export const dayNameFromIso = (isoDate: string): DayName => {
  const days: DayName[] = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
  return days[new Date(`${isoDate}T00:00:00`).getDay()]
}

export const isoForCurrentWeekDay = (day: DayName) => {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const mondayOffset = (today.getDay() + 6) % 7
  const monday = new Date(today)
  monday.setDate(today.getDate() - mondayOffset)
  monday.setDate(monday.getDate() + weekDays.indexOf(day))
  return localIsoDate(monday)
}
