import type { KnowledgeNodeType, LearningStatus } from '../types/knowledge'

export const statusLabels: Record<LearningStatus, string> = {
  unlearned: '未学习',
  learning: '学习中',
  review: '待复习',
  completed: '已完成',
  mastered: '已掌握',
}

export const nodeTypeLabels: Record<KnowledgeNodeType, string> = {
  root: '资料根目录',
  folder: '文件夹',
  subject: '科目',
  chapter: '章节',
  topic: '知识点',
  document: '文件',
  note: '笔记',
  image: '图片',
  video: '视频',
  link: '链接',
  mistake: '错题',
  collection: '资料集',
}
