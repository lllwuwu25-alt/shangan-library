import { BookOpen, CalendarDays, Home, Library, MessageCircle, Settings, ShieldCheck, TriangleAlert } from 'lucide-react'
import type { ReactNode } from 'react'

const navItems = [
  { path: '/dashboard', label: '首页总览', icon: Home },
  { path: '/plan', label: '学习计划', icon: CalendarDays },
  { path: '/resources', label: '资料库', icon: Library },
  { path: '/mistakes', label: '错题本', icon: TriangleAlert },
  { path: '/settings', label: '设置', icon: Settings },
  { path: '/contact', label: '联系我们', icon: MessageCircle },
]

export function Layout({ path, onNavigate, children }: { path: string; onNavigate: (path: string) => void; children: ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <aside className="fixed inset-y-0 left-0 hidden w-72 border-r border-slate-200 bg-white/95 px-4 py-5 shadow-soft lg:flex lg:flex-col">
        <div className="mb-8 flex items-center gap-3 px-2">
          <div className="flex size-11 items-center justify-center rounded-2xl bg-slate-950 text-white shadow-sm">
            <BookOpen size={22} />
          </div>
          <div>
            <p className="text-lg font-semibold tracking-tight text-slate-950">上岸资料库</p>
            <p className="text-xs text-slate-500">本地个人学习系统</p>
          </div>
        </div>
        <nav className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon
            const active = path === item.path
            return (
              <button
                key={item.path}
                type="button"
                onClick={() => onNavigate(item.path)}
                className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium transition focus:outline-none focus:ring-2 focus:ring-blue-200 ${active ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-950'}`}
              >
                <Icon size={18} />
                {item.label}
              </button>
            )
          })}
        </nav>
        <div className="mt-auto rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-200">
          <div className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-800">
            <ShieldCheck size={16} className="text-emerald-600" />
            本地优先
          </div>
          <p className="text-xs leading-5 text-slate-500">数据保存在当前浏览器，可在设置中导入导出 JSON。</p>
        </div>
      </aside>
      <div className="lg:pl-72">
        <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/85 px-4 py-3 backdrop-blur lg:hidden">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <p className="font-semibold text-slate-950">上岸资料库</p>
              <p className="text-xs text-slate-500">本地个人学习系统</p>
            </div>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {navItems.map((item) => (
              <button
                key={item.path}
                type="button"
                onClick={() => onNavigate(item.path)}
                className={`shrink-0 rounded-full px-3 py-1.5 text-sm ${path === item.path ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-700'}`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </header>
        <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">{children}</main>
      </div>
    </div>
  )
}

export function PageHeader({ title, description }: { title: string; description: string }) {
  return (
    <div className="mb-6 flex flex-col gap-3 rounded-2xl bg-white px-5 py-4 shadow-card ring-1 ring-slate-200/70 md:flex-row md:items-start md:justify-between">
      <div className="min-w-0 flex-1">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-950">{title}</h1>
        <p className="mt-1 max-w-3xl text-wrap text-sm leading-6 text-slate-600">{description}</p>
      </div>
      <span className="w-fit shrink-0 rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">本地学习工作台</span>
    </div>
  )
}
