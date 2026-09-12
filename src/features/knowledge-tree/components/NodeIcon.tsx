import { BookOpen, Boxes, File, FileImage, FileText, Folder, GraduationCap, Link2, NotebookPen, PlaySquare, TriangleAlert } from 'lucide-react'
import type { KnowledgeNodeType } from '../types/knowledge'

const icons = {
  root: BookOpen,
  folder: Folder,
  subject: GraduationCap,
  chapter: BookOpen,
  topic: Boxes,
  document: File,
  note: NotebookPen,
  image: FileImage,
  video: PlaySquare,
  link: Link2,
  mistake: TriangleAlert,
  collection: FileText,
} satisfies Record<KnowledgeNodeType, typeof File>

export function NodeIcon({ type, size = 16, className = '' }: { type: KnowledgeNodeType; size?: number; className?: string }) {
  const Icon = icons[type]
  return <Icon size={size} className={className} />
}
