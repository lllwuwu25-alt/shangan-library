export type Subject = '英语' | '政治' | '数学' | '专业课'
export type ResourceCategory = Subject | '真题' | '笔记' | '讲义' | '网课' | '模板' | '错题资料' | '高频考点' | '作文素材' | '面试资料' | '作文模板'
export type TaskStatus = 'todo' | 'done'
export type MistakeStatus = '待复习' | '已掌握'
export type MistakeImportance = '红' | '黄' | '绿'
export type DayName = '周一' | '周二' | '周三' | '周四' | '周五' | '周六' | '周日'
export type TimeSlot = string
export type ThemeMode = 'light' | 'dark' | 'system'

export type FileAttachment = {
  id: string
  name: string
  type: string
  size: number
  dataUrl: string
}

export type Task = {
  id: string
  title: string
  subject: Subject
  minutes: number
  day: DayName
  slot: TimeSlot
  date: string
  status: TaskStatus
}

export type WeeklyPlanItem = {
  id: string
  day: DayName
  slot: TimeSlot
  subject: Subject
  content: string
}

export type ResourceItem = {
  id: string
  title: string
  category: ResourceCategory
  description: string
  attachments: FileAttachment[]
  addedAt: string
  lastOpenedAt?: string
}

export type Mistake = {
  id: string
  subject: Subject
  question: string
  answer: string
  note: string
  status: MistakeStatus
  importance: MistakeImportance
  attachments: FileAttachment[]
  createdAt: string
}

export type Settings = {
  examName: string
  examDate: string
  timeSlots: TimeSlot[]
  lastBackupAt?: string
  backupReminderDays: number
  theme: ThemeMode
}

export type AppData = {
  tasks: Task[]
  weeklyPlan: WeeklyPlanItem[]
  resources: ResourceItem[]
  mistakes: Mistake[]
  settings: Settings
}
