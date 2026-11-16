import { ArrowLeft, ArrowRight, BookOpen, CalendarDays, Home, Library, MessageCircle, MoreHorizontal, Settings, ShieldCheck, Sparkles, Timer, TriangleAlert } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { Modal } from './Modal'
import { useMobileViewport } from '../lib/useMobileViewport'

const navItems = [
  { path: '/dashboard', label: '首页总览', icon: Home },
  { path: '/plan', label: '学习计划', icon: CalendarDays },
  { path: '/pomodoro', label: '番茄钟', icon: Timer },
  { path: '/resources', label: '资料库', icon: Library },
  { path: '/mistakes', label: '错题本', icon: TriangleAlert },
  { path: '/ai', label: 'AI 协助', icon: Sparkles },
  { path: '/settings', label: '设置', icon: Settings },
  { path: '/contact', label: '联系我们', icon: MessageCircle },
]

const mobileNavItems = [
  { path: '/dashboard', label: '首页', icon: Home },
  { path: '/plan', label: '计划', icon: CalendarDays },
  { path: '/pomodoro', label: '番茄', icon: Timer },
  { path: '/resources', label: '资料', icon: Library },
  { path: '/mistakes', label: '错题', icon: TriangleAlert },
]

const pageTitle = (path: string) => navItems.find((item) => item.path === path)?.label ?? '首页总览'
const morePaths = ['/ai', '/settings', '/contact']

type NavigationOrigin = { x: number; y: number }

const originFromButton = (button: HTMLButtonElement) => {
  const rect = button.getBoundingClientRect()
  return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }
}

export function Layout({ path, onNavigate, children }: { path: string; onNavigate: (path: string, origin?: NavigationOrigin) => void; children: ReactNode }) {
  useMobileViewport()
  const [moreOpen, setMoreOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    try { return localStorage.getItem('shangan-library-sidebar-collapsed') === 'true' } catch { return false }
  })
  const toggleSidebar = () => {
    const next = !sidebarCollapsed
    setSidebarCollapsed(next)
    try { localStorage.setItem('shangan-library-sidebar-collapsed', String(next)) } catch { /* Storage may be unavailable in private browsing. */ }
  }
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <aside className={`fixed inset-y-0 left-0 z-20 hidden border-r border-slate-200 bg-white/95 py-5 shadow-soft lg:flex lg:flex-col ${sidebarCollapsed ? 'w-20 px-3' : 'w-72 px-4'}`} aria-label="应用侧栏">
        <div className={`mb-4 flex items-center gap-3 ${sidebarCollapsed ? 'justify-center' : 'px-2'}`}>
          <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-slate-950 text-white shadow-sm" title="上岸资料库">
            <BookOpen size={22} />
          </div>
          {!sidebarCollapsed && <div>
            <p className="text-lg font-semibold tracking-tight text-slate-950">上岸资料库</p>
            <p className="text-xs text-slate-500">本地个人学习系统</p>
          </div>}
        </div>
        <button type="button" onClick={toggleSidebar} aria-label={sidebarCollapsed ? '展开侧栏' : '收起侧栏'} aria-expanded={!sidebarCollapsed} aria-controls="desktop-navigation" title={sidebarCollapsed ? '展开侧栏' : '收起侧栏'} className={`mb-4 flex h-9 items-center gap-2 rounded-lg text-xs text-slate-500 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-200 ${sidebarCollapsed ? 'justify-center' : 'px-3'}`}>
          {sidebarCollapsed ? <ArrowRight size={17} /> : <ArrowLeft size={17} />}{!sidebarCollapsed && '收起侧栏'}
        </button>
        <nav id="desktop-navigation" aria-label="桌面主导航" className="min-h-0 space-y-1 overflow-y-auto p-0.5">
          {navItems.map((item) => {
            const Icon = item.icon
            const active = path === item.path
            return (
              <button
                key={item.path}
                type="button"
                aria-label={item.label}
                title={sidebarCollapsed ? item.label : undefined}
                aria-current={active ? 'page' : undefined}
                onClick={(event) => onNavigate(item.path, originFromButton(event.currentTarget))}
                className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium transition focus:outline-none focus:ring-2 focus:ring-blue-200 ${sidebarCollapsed ? 'justify-center' : ''} ${active ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-950'}`}
              >
                <Icon size={18} />
                {!sidebarCollapsed && item.label}
              </button>
            )
          })}
        </nav>
        {sidebarCollapsed ? <div className="mt-auto flex justify-center py-3 text-emerald-600" title="本地优先" role="img" aria-label="本地优先"><ShieldCheck size={18} /></div> : <div className="mt-auto rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-200">
          <div className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-800">
            <ShieldCheck size={16} className="text-emerald-600" />
            本地优先
          </div>
          <p className="text-xs leading-5 text-slate-500">数据保存在当前浏览器，可在设置中导入导出 JSON。</p>
        </div>}
      </aside>
      <div className={`min-w-0 ${sidebarCollapsed ? 'lg:pl-20' : 'lg:pl-72'}`}>
        <header className="mobile-header sticky top-0 z-10 border-b border-slate-200 bg-white/95 px-4 py-2.5 lg:hidden">
          <div className="flex items-center justify-between">
            <div className="min-w-0">
              <h1 className="truncate text-base font-semibold text-slate-950">{pageTitle(path)}</h1>
              <div className="mt-0.5 flex items-center gap-1.5 text-xs text-slate-500">
                <span className="size-1.5 rounded-full bg-emerald-500" />
                本地优先
              </div>
            </div>
            <button
              type="button"
              onClick={() => setMoreOpen(true)}
              aria-label="更多入口"
              aria-expanded={moreOpen}
              className={`flex size-11 items-center justify-center rounded-xl transition focus:outline-none focus:ring-2 focus:ring-blue-200 ${morePaths.includes(path) ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
            >
              <MoreHorizontal size={20} />
            </button>
          </div>
        </header>
        <main className={`app-main mx-auto px-3 pb-20 pt-4 sm:px-5 md:px-6 lg:px-8 lg:py-8 ${sidebarCollapsed ? 'lg:max-w-none' : 'max-w-7xl'}`}>{children}</main>
        <nav aria-label="主导航" className="mobile-nav fixed inset-x-0 bottom-0 z-20 border-t border-slate-200 bg-white px-3 pb-[calc(env(safe-area-inset-bottom)+0.35rem)] pt-1.5 lg:hidden">
          <div className="mx-auto grid max-w-md grid-cols-5 gap-1">
            {mobileNavItems.map((item) => {
              const Icon = item.icon
              const active = path === item.path
              return (
                <button
                  key={item.path}
                  type="button"
                  onClick={(event) => onNavigate(item.path, originFromButton(event.currentTarget))}
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
      {moreOpen && <Modal title="更多" caption="上岸资料库 · 本地个人学习系统" onClose={() => setMoreOpen(false)}>
        <div className="grid gap-2">
          {navItems.filter((item) => morePaths.includes(item.path)).map((item) => {
            const Icon = item.icon
            return <button key={item.path} type="button" onClick={(event) => { setMoreOpen(false); onNavigate(item.path, originFromButton(event.currentTarget)) }} className="flex min-h-14 items-center gap-3 rounded-lg bg-slate-50 px-4 text-left text-base font-medium text-slate-800"><Icon size={20} className="text-blue-600" />{item.label}</button>
          })}
        </div>
      </Modal>}
    </div>
  )
}

export function PageHeader({ title, description }: { title: string; description: string }) {
  return (
    <div className="mb-4 hidden flex-col gap-2 rounded-xl bg-white px-4 py-3 ring-1 ring-slate-200/70 md:mb-6 md:flex-row md:items-start md:justify-between md:rounded-2xl md:px-5 md:py-4 md:shadow-card lg:flex">
      <div className="min-w-0 flex-1">
        <h1 className="text-lg font-semibold tracking-tight text-slate-950 md:text-2xl">{title}</h1>
        <p className="mt-1 max-w-3xl text-wrap text-xs leading-5 text-slate-600 md:text-sm md:leading-6">{description}</p>
      </div>
      <span className="hidden w-fit shrink-0 rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600 md:inline-flex">本地学习工作台</span>
    </div>
  )
}
