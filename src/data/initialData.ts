import type { AppData } from '../types'
import { defaultSubjects, defaultTimeSlots } from '../constants'

export const initialData: AppData = {
  settings: {
    examName: '',
    examDate: '',
    subjects: defaultSubjects,
    timeSlots: defaultTimeSlots,
    backupReminderDays: 7,
    theme: 'light',
  },
  tasks: [],
  weeklyPlan: [],
  resources: [],
  mistakes: [],
}
