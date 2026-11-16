import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parsePlanReply, preparePlanTasks, type PlanContext } from './planDraft.ts'
import { generatePlanReply } from './client.ts'
import { defaultAIConfig } from './config.ts'

const context: PlanContext = { today: '2026-11-16', currentWeekStart: '2026-11-16', nextWeekEnd: '2026-11-29', subjects: ['数学'], slots: ['上午', '晚上'] }
const draft = { title: '复习极限', date: '2026-11-25', subject: '数学', slot: '晚上', minutes: 60 }

test('only allowlisted draft fields are accepted; no model-selected operations or status', () => {
  const parsed = parsePlanReply('```json\n' + JSON.stringify({ reply: '整理好了', tasks: [{ ...draft, id: 'existing', status: 'done' }] }) + '\n```')
  assert.deepEqual(parsed, { reply: '整理好了', tasks: [draft] })
  assert.deepEqual(parsePlanReply('{"reply":"你每天能学多久？"}'), { reply: '你每天能学多久？' })
  assert.deepEqual(parsePlanReply('{"reply":"草稿已清空","tasks":[]}').tasks, [])
  for (const text of ['no json', '{"reply":"x","tasks":[{}]}', '{"reply":"x","tasks":null}', '{"reply":"x","tasks":[{"title":1}]}']) assert.throws(() => parsePlanReply(text))
})
test('validate calendar, selected options and minutes; day is computed locally', () => {
  assert.deepEqual(preparePlanTasks([draft], context, []), { tasks: [{ ...draft, day: '周三', status: 'todo' }], omitted: 0 })
  for (const patch of [{ date: '2026-11-30' }, { date: '2026-11-00' }, { date: '2026-11-9' }, { minutes: 0 }, { minutes: 2.3 }, { minutes: Infinity }, { subject: '历史' }, { slot: '凌晨' }, { title: ' ' }]) {
    assert.throws(() => preparePlanTasks([{ ...draft, ...patch }], context, []))
  }
})
test('duplicates are not added or used to update existing tasks', () => {
  const existing = { ...draft, day: '周三' as const, id: 'saved', minutes: 10, status: 'done' as const }
  assert.deepEqual(preparePlanTasks([draft], context, [existing]), { tasks: [], omitted: 1 })
  assert.equal(preparePlanTasks([draft, draft], context, []).tasks.length, 1)
  assert.equal(preparePlanTasks([draft, { ...draft, date: '2026-11-26' }], context, [existing]).tasks.length, 1)
})
test('planning request is explicit, bounded to its own inputs, and blocked when AI is off', async () => {
  let calls = 0
  const request = { ...context, apiKey: 'private', resources: ['private-attachment'] }
  const transport = async (_url: string, body: unknown) => {
    calls++
    const serialized = JSON.stringify(body)
    assert.ok(serialized.includes('周三留空') && serialized.includes('2026-11-29') && serialized.includes('复习极限'))
    assert.ok(!serialized.includes('private'))
    return { choices: [{ message: { content: '{"reply":"收到","tasks":[]}' } }] }
  }
  const history = [{ role: 'user' as const, content: '周三留空' }]
  await assert.rejects(generatePlanReply(defaultAIConfig, request, history, [draft], undefined, transport))
  assert.equal(calls, 0)
  assert.deepEqual(await generatePlanReply({ ...defaultAIConfig, enabled: true }, request, history, [draft], undefined, transport), { reply: '收到', tasks: [] })
  assert.equal(calls, 1)
})
