import type { DayName, ResourceCategory, Subject, TimeSlot } from './types'

export const defaultSubjects: Subject[] = ['英语', '政治', '数学', '专业课']
export const defaultResourceCategories: ResourceCategory[] = ['真题', '笔记', '讲义', '网课', '模板', '错题资料', '高频考点', '作文素材', '面试资料']
export const subjectOptions = (subjects: Subject[] = defaultSubjects) => Array.from(new Set(subjects.map((item) => item.trim()).filter(Boolean)))
export const resourceCategoryOptions = (subjects: Subject[] = defaultSubjects): ('全部' | ResourceCategory)[] => ['全部', ...defaultResourceCategories, ...subjectOptions(subjects)]
export const dayNames: DayName[] = ['周一', '周二', '周三', '周四', '周五', '周六', '周日']
export const defaultTimeSlots: TimeSlot[] = ['早晨', '上午', '下午', '晚上', '睡前']
