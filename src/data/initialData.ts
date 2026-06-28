import type { AppData } from '../types'
import { defaultTimeSlots } from '../constants'

export const initialData: AppData = {
  settings: {
    examName: '',
    examDate: '',
    timeSlots: defaultTimeSlots,
    backupReminderDays: 7,
    theme: 'light',
  },
  tasks: [],
  weeklyPlan: [],
  resources: [],
  mistakes: [],
}
