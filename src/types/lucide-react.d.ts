declare module 'lucide-react' {
  import type { ComponentType, SVGProps } from 'react'

  export type LucideProps = SVGProps<SVGSVGElement> & {
    size?: string | number
    absoluteStrokeWidth?: boolean
  }

  export type LucideIcon = ComponentType<LucideProps>

  export const AlertTriangle: LucideIcon
  export const ArrowRight: LucideIcon
  export const Bell: LucideIcon
  export const BookOpen: LucideIcon
  export const CalendarClock: LucideIcon
  export const CalendarDays: LucideIcon
  export const CheckCircle2: LucideIcon
  export const CircleAlert: LucideIcon
  export const Clock: LucideIcon
  export const Clock3: LucideIcon
  export const Copy: LucideIcon
  export const Database: LucideIcon
  export const Download: LucideIcon
  export const Eye: LucideIcon
  export const File: LucideIcon
  export const FileImage: LucideIcon
  export const FileStack: LucideIcon
  export const FileText: LucideIcon
  export const Flame: LucideIcon
  export const HardDrive: LucideIcon
  export const Home: LucideIcon
  export const Import: LucideIcon
  export const Library: LucideIcon
  export const Link: LucideIcon
  export const Mail: LucideIcon
  export const MessageCircle: LucideIcon
  export const Moon: LucideIcon
  export const Paperclip: LucideIcon
  export const Pencil: LucideIcon
  export const Plus: LucideIcon
  export const RefreshCcw: LucideIcon
  export const RotateCcw: LucideIcon
  export const Search: LucideIcon
  export const Settings: LucideIcon
  export const ShieldCheck: LucideIcon
  export const Sparkles: LucideIcon
  export const Sun: LucideIcon
  export const SunMedium: LucideIcon
  export const TimerReset: LucideIcon
  export const Trash2: LucideIcon
  export const TriangleAlert: LucideIcon
  export const Upload: LucideIcon
  export const X: LucideIcon
}
