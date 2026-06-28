import { create } from 'zustand'
import { clearData, loadData, normalizeAppData, saveData } from '../lib/storage'
import { initialData } from '../data/initialData'
import { isoForCurrentWeekDay } from '../lib/date'
import type { AppData, Mistake, ResourceItem, Settings, Task, WeeklyPlanItem } from '../types'

const uid = (prefix: string) => `${prefix}-${crypto.randomUUID?.() ?? Date.now().toString(36)}`

type StudyStore = AppData & {
  addTask: (task: Omit<Task, 'id' | 'date'> & Partial<Pick<Task, 'date'>>) => void
  updateTask: (id: string, patch: Partial<Task>) => void
  deleteTask: (id: string) => void
  toggleTask: (id: string) => void
  addPlanItem: (item: Omit<WeeklyPlanItem, 'id'>) => void
  updatePlanItem: (id: string, patch: Partial<WeeklyPlanItem>) => void
  deletePlanItem: (id: string) => void
  addResource: (item: Omit<ResourceItem, 'id' | 'addedAt'>) => void
  addResources: (items: Array<Omit<ResourceItem, 'id' | 'addedAt'>>) => void
  updateResource: (id: string, patch: Partial<ResourceItem>) => void
  deleteResource: (id: string) => void
  openResource: (id: string) => void
  addMistake: (item: Omit<Mistake, 'id' | 'createdAt'>) => void
  addMistakes: (items: Array<Omit<Mistake, 'id' | 'createdAt'>>) => void
  updateMistake: (id: string, patch: Partial<Mistake>) => void
  deleteMistake: (id: string) => void
  toggleMistake: (id: string) => void
  updateSettings: (settings: Partial<Settings>) => void
  importData: (data: AppData) => void
  resetData: () => void
}

const persist = (state: AppData) => saveData(state)

export const useStudyStore = create<StudyStore>((set, get) => ({
  ...loadData(),
  addTask: (task) => set((state) => {
    const nextTask = { ...task, id: uid('task'), date: task.date ?? isoForCurrentWeekDay(task.day) }
    const next = { ...state, tasks: [nextTask, ...state.tasks] }
    persist(next)
    return next
  }),
  updateTask: (id, patch) => set((state) => {
    const next = { ...state, tasks: state.tasks.map((task) => (task.id === id ? { ...task, ...patch } : task)) }
    persist(next)
    return next
  }),
  deleteTask: (id) => set((state) => {
    const next = { ...state, tasks: state.tasks.filter((task) => task.id !== id) }
    persist(next)
    return next
  }),
  toggleTask: (id) => get().updateTask(id, { status: get().tasks.find((task) => task.id === id)?.status === 'done' ? 'todo' : 'done' }),
  addPlanItem: (item) => set((state) => {
    const next = { ...state, weeklyPlan: [...state.weeklyPlan, { ...item, id: uid('plan') }] }
    persist(next)
    return next
  }),
  updatePlanItem: (id, patch) => set((state) => {
    const next = { ...state, weeklyPlan: state.weeklyPlan.map((item) => (item.id === id ? { ...item, ...patch } : item)) }
    persist(next)
    return next
  }),
  deletePlanItem: (id) => set((state) => {
    const next = { ...state, weeklyPlan: state.weeklyPlan.filter((item) => item.id !== id) }
    persist(next)
    return next
  }),
  addResource: (item) => set((state) => {
    const next = { ...state, resources: [{ ...item, id: uid('res'), addedAt: new Date().toISOString().slice(0, 10) }, ...state.resources] }
    persist(next)
    return next
  }),
  addResources: (items) => set((state) => {
    const addedAt = new Date().toISOString().slice(0, 10)
    const nextResources = items.map((item) => ({ ...item, id: uid('res'), addedAt }))
    const next = { ...state, resources: [...nextResources, ...state.resources] }
    persist(next)
    return next
  }),
  updateResource: (id, patch) => set((state) => {
    const next = { ...state, resources: state.resources.map((item) => (item.id === id ? { ...item, ...patch } : item)) }
    persist(next)
    return next
  }),
  deleteResource: (id) => set((state) => {
    const next = { ...state, resources: state.resources.filter((item) => item.id !== id) }
    persist(next)
    return next
  }),
  openResource: (id) => get().updateResource(id, { lastOpenedAt: new Date().toISOString().slice(0, 10) }),
  addMistake: (item) => set((state) => {
    const next = { ...state, mistakes: [{ ...item, id: uid('mis'), createdAt: new Date().toISOString().slice(0, 10) }, ...state.mistakes] }
    persist(next)
    return next
  }),
  addMistakes: (items) => set((state) => {
    const createdAt = new Date().toISOString().slice(0, 10)
    const nextMistakes = items.map((item) => ({ ...item, id: uid('mis'), createdAt }))
    const next = { ...state, mistakes: [...nextMistakes, ...state.mistakes] }
    persist(next)
    return next
  }),
  updateMistake: (id, patch) => set((state) => {
    const next = { ...state, mistakes: state.mistakes.map((item) => (item.id === id ? { ...item, ...patch } : item)) }
    persist(next)
    return next
  }),
  deleteMistake: (id) => set((state) => {
    const next = { ...state, mistakes: state.mistakes.filter((item) => item.id !== id) }
    persist(next)
    return next
  }),
  toggleMistake: (id) => get().updateMistake(id, { status: get().mistakes.find((item) => item.id === id)?.status === '已掌握' ? '待复习' : '已掌握' }),
  updateSettings: (settings) => set((state) => {
    const next = { ...state, settings: { ...state.settings, ...settings } }
    persist(next)
    return next
  }),
  importData: (data) => set(() => {
    const normalized = normalizeAppData(data)
    persist(normalized)
    return normalized
  }),
  resetData: () => set(() => {
    clearData()
    persist(initialData)
    return initialData
  }),
}))
