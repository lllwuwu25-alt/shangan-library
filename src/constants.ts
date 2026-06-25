import type { DayName, ResourceCategory, Subject, TimeSlot } from './types'

export const subjects: Subject[] = ['英语', '政治', '数学', '专业课']
export const resourceCategories: ('全部' | ResourceCategory)[] = ['全部', '英语', '政治', '数学', '专业课', '真题', '笔记', '作文模板']
export const dayNames: DayName[] = ['周一', '周二', '周三', '周四', '周五', '周六', '周日']
export const timeSlots: TimeSlot[] = ['上午', '下午', '晚上']
