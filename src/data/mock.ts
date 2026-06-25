import { addDaysIso, currentDayName, isoForCurrentWeekDay, todayIso } from '../lib/date'
import type { AppData, DayName, Subject, TimeSlot } from '../types'

const subjects: Subject[] = ['英语', '政治', '数学', '专业课']
const days: DayName[] = ['周一', '周二', '周三', '周四', '周五', '周六', '周日']
const slots: TimeSlot[] = ['上午', '下午', '晚上']
const todayDay = currentDayName()
const tomorrowDay = days[(days.indexOf(todayDay) + 1) % days.length]

export const initialData: AppData = {
  settings: {
    examName: '2027 考研初试',
    examDate: addDaysIso(180),
  },
  tasks: [
    { id: 'task-1', title: '英语阅读精读 2 篇', subject: '英语', minutes: 90, day: todayDay, slot: '上午', date: todayIso(), status: 'todo' },
    { id: 'task-2', title: '数学强化讲义例题复盘', subject: '数学', minutes: 120, day: todayDay, slot: '下午', date: todayIso(), status: 'done' },
    { id: 'task-3', title: '政治选择题 50 题', subject: '政治', minutes: 60, day: tomorrowDay, slot: '上午', date: addDaysIso(1), status: 'todo' },
    { id: 'task-4', title: '专业课框架默写', subject: '专业课', minutes: 80, day: tomorrowDay, slot: '晚上', date: addDaysIso(1), status: 'todo' },
    ...days.flatMap((day, dayIndex) =>
      slots.map((slot, slotIndex) => {
      const subject = subjects[(dayIndex + slotIndex) % subjects.length]
      return {
        id: `task-${day}-${slot}`,
        day,
        slot,
        subject,
        title: slot === '上午' ? `${subject}主线学习` : slot === '下午' ? `${subject}刷题训练` : `${subject}复盘整理`,
        minutes: slot === '上午' ? 90 : 60,
        date: isoForCurrentWeekDay(day),
        status: 'todo' as const,
      }
      }),
    ),
  ],
  weeklyPlan: [],
  resources: [
    { id: 'res-1', title: '英语阅读同源外刊摘录', category: '英语', description: '阅读题源、长难句和生词整理。', attachments: [], addedAt: todayIso(), lastOpenedAt: todayIso() },
    { id: 'res-2', title: '政治马原易错点', category: '政治', description: '高频概念辨析和关键词。', attachments: [], addedAt: todayIso() },
    { id: 'res-3', title: '数学强化阶段公式表', category: '数学', description: '极限、导数、积分常用公式。', attachments: [], addedAt: todayIso(), lastOpenedAt: addDaysIso(-1) },
    { id: 'res-4', title: '专业课章节框架笔记', category: '笔记', description: '按章节拆分的背诵框架。', attachments: [], addedAt: todayIso() },
    { id: 'res-5', title: '近五年真题套卷清单', category: '真题', description: '按年份整理的真题入口和完成记录。', attachments: [], addedAt: todayIso() },
  ],
  mistakes: [
    { id: 'mis-1', subject: '数学', question: '函数极限中等价无穷小替换条件混淆', answer: '仅在乘除关系中直接替换，加减关系需谨慎。', note: '复盘例 3 和例 5。', status: '待复习', importance: '红', attachments: [], createdAt: todayIso() },
    { id: 'mis-2', subject: '英语', question: '阅读中 however 后转折对象判断错误', answer: '先定位转折前后主语和评价词。', note: '整理到阅读方法笔记。', status: '已掌握', importance: '绿', attachments: [], createdAt: todayIso() },
    { id: 'mis-3', subject: '政治', question: '实践和认识关系题干关键词漏看', answer: '实践是认识来源、动力、目的和检验标准。', note: '下次做题先圈主体。', status: '待复习', importance: '黄', attachments: [], createdAt: todayIso() },
  ],
}
