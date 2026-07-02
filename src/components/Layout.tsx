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

const mobileNavItems = [
  { path: '/dashboard', label: '首页', icon: Home },
  { path: '/plan', label: '计划', icon: CalendarDays },
  { path: '/resources', label: '资料', icon: Library },
  { path: '/mistakes', label: '错题', icon: TriangleAlert },
]

const pageTitle = (path: string) => navItems.find((item) => item.path === path)?.label ?? '首页总览'

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
        <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/95 px-4 py-2.5 backdrop-blur lg:hidden">
          <div className="flex items-center justify-between">
            <div className="min-w-0">
              <p className="truncate text-base font-semibold text-slate-950">{pageTitle(path)}</p>
              <div className="mt-0.5 flex items-center gap-1.5 text-xs text-slate-500">
                <span className="size-1.5 rounded-full bg-emerald-500" />
                本地优先
              </div>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('/settings')}
              aria-label="打开设置"
              className={`flex size-10 items-center justify-center rounded-full transition focus:outline-none focus:ring-2 focus:ring-blue-200 ${path === '/settings' ? 'bg-blue-600 text-white shadow-sm' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
            >
              <Settings size={18} />
            </button>
          </div>
        </header>
        <main className="mx-auto max-w-7xl px-3 pb-20 pt-4 sm:px-5 md:px-6 lg:px-8 lg:py-8">{children}</main>
        <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-slate-200 bg-white/95 px-3 pb-[calc(env(safe-area-inset-bottom)+0.35rem)] pt-1.5 shadow-[0_-6px_18px_rgba(15,23,42,0.05)] backdrop-blur lg:hidden">
          <div className="mx-auto grid max-w-md grid-cols-4 gap-1">
            {mobileNavItems.map((item) => {
              const Icon = item.icon
              const active = path === item.path
              return (
                <button
                  key={item.path}
                  type="button"
                  onClick={() => onNavigate(item.path)}
                  aria-current={active ? 'page' : undefined}
                  className={`flex min-h-12 flex-col items-center justify-center gap-0.5 rounded-xl px-1 text-[11px] font-medium transition focus:outline-none focus:ring-2 focus:ring-blue-200 ${active ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-950'}`}
                >
                  <Icon size={18} />
                  <span className="max-w-full truncate">{item.label}</span>
                </button>
              )
            })}
          </div>
        </nav>
      </div>
    </div>
  )
}

export function PageHeader({ title, description }: { title: string; description: string }) {
  return (
    <div className="mb-4 flex flex-col gap-2 rounded-xl bg-white px-4 py-3 ring-1 ring-slate-200/70 md:mb-6 md:flex-row md:items-start md:justify-between md:rounded-2xl md:px-5 md:py-4 md:shadow-card">
      <div className="min-w-0 flex-1">
        <h1 className="text-lg font-semibold tracking-tight text-slate-950 md:text-2xl">{title}</h1>
        <p className="mt-1 max-w-3xl text-wrap text-xs leading-5 text-slate-600 md:text-sm md:leading-6">{description}</p>
      </div>
      <span className="hidden w-fit shrink-0 rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600 md:inline-flex">本地学习工作台</span>
    </div>
  )
}
