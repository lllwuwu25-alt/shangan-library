import { test } from 'node:test'
import assert from 'node:assert/strict'
import { previousWeek, summarizeWeek, dueForReview, normalizeReviewData } from './model.ts'

test('local natural weeks cross month/year without UTC shifts', () => {
  assert.deepEqual(previousWeek(new Date(2027, 0, 4, 0, 1)), { start: '2026-12-28', end: '2027-01-03' })
  assert.deepEqual(previousWeek(new Date(2026, 10, 8, 23, 59)), { start: '2026-10-26', end: '2026-11-01' })
})
test('summaries separate plans, completed task minutes, and recorded focus; exclude breaks', () => {
  const period = { start: '2026-10-26', end: '2026-11-01' }
  const tasks = [{ date: '2026-10-26', subject: '数学', minutes: 60, status: 'done' }, { date: '2026-11-01', subject: '英语', minutes: 30, status: 'todo' }, { date: '2026-11-02', minutes: 90, subject: '政治', status: 'done' }]
  const sessions = [{ completedAt: new Date(2026, 9, 26, 0, 1).toISOString(), subject: '数学', minutes: 25, mode: '专注' }, { completedAt: new Date(2026, 10, 1, 23, 59).toISOString(), minutes: 50, mode: '专注' }, { completedAt: new Date(2026, 10, 1).toISOString(), minutes: 5, mode: '短休息' }, { completedAt: 'invalid', minutes: 999, mode: '专注' }]
  const summary = summarizeWeek(tasks as never, sessions as never, period)
  assert.equal(summary.plannedMinutes, 90)
  assert.equal(summary.focusMinutes, 75)
  assert.equal(summary.completedTasks, 1)
  assert.equal(summary.totalTasks, 2)
  assert.equal(summary.focusSessions, 2)
  assert.equal(summary.activeDays, 2)
  assert.equal(summary.days.length, 7)
  assert.equal(summary.subjects.find(s => s.subject === '未分类')?.focusMinutes, 50)
  assert.ok(!JSON.stringify(summary).includes('completedAt'))
})
test('zero data stays zero, non-finite or negative minutes never inflate stats', () => {
  const period = { start: '2026-10-26', end: '2026-11-01' }
  assert.equal(summarizeWeek([], [], period).hasData, false)
  const summary = summarizeWeek([{ date: period.start, minutes: -50, subject: '数学', status: 'todo' }] as never, [], period)
  assert.equal(summary.plannedMinutes, 0)
  assert.equal(summary.completionRate, 0)
})
test('Monday first opening or Tuesday catch-up prompts only with both opt-ins; one report per week', () => {
  const now = new Date(2026, 10, 3, 12)
  const data = normalizeReviewData({ enabled: true, weekday: 1 })
  assert.equal(dueForReview(data, true, now), true)
  assert.equal(dueForReview(data, false, now), false)
  assert.equal(dueForReview({ ...data, enabled: false }, true, now), false)
  assert.equal(dueForReview({ ...data, weekday: 3 }, true, now), false)
  assert.equal(dueForReview({ ...data, decisions: { '2026-10-26': { action: 'skip', at: now.toISOString() } } }, true, now), false)
  assert.equal(dueForReview({ ...data, decisions: { '2026-10-26': { action: 'reviewed', at: now.toISOString() } } }, true, now), false)
  assert.equal(dueForReview({ ...data, reports: [{ weekStart: '2026-10-26' }] as never }, true, now), false)
  const later = { ...data, decisions: { '2026-10-26': { action: 'later' as const, at: new Date(2026, 10, 2, 15).toISOString() } } }
  assert.equal(dueForReview(later, true, now), false)
  assert.equal(dueForReview(later, true, new Date(2026, 10, 3, 16)), true)
  assert.equal(dueForReview({ ...data, decisions: { '2026-10-19': { action: 'skip', at: now.toISOString() } } }, true, now), true)
})
test('legacy or malformed review storage normalizes to safe defaults', () => {
  assert.deepEqual(normalizeReviewData(undefined), { enabled: false, weekday: 1, decisions: {}, reports: [] })
  assert.equal(normalizeReviewData({ enabled: 'true', weekday: 100, reports: [null, { weekStart: 'invalid' }], decisions: null }).enabled, false)
  assert.equal(normalizeReviewData({ weekday: 7 }).weekday, 7)
})
