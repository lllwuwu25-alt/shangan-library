import { test } from 'node:test'
import assert from 'node:assert/strict'
import { generateWeeklyAnalysis } from '../ai/client.ts'
import { defaultAIConfig } from '../ai/config.ts'
import { summarizeWeek } from './model.ts'
test('weekly requests send only aggregate data, require AI opt-in and never create reports themselves', async () => {
  const summary = summarizeWeek([], [], { start: '2026-10-26', end: '2026-11-01' })
  Object.assign(summary, { attachments: ['private-file'], apiKey: 'private-secret', taskTitle: 'private-title' })
  let calls = 0
  const transport = async (_url: string, body: unknown) => {
    calls++; const request = JSON.stringify(body)
    for (const secret of ['private-file', 'private-secret', 'private-title']) assert.ok(!request.includes(secret))
    assert.ok(request.includes('2026-10-26'))
    return { choices: [{ message: { content: '记录不足，请先记录实际专注再复盘。' } }] }
  }
  await assert.rejects(generateWeeklyAnalysis(defaultAIConfig, summary, undefined, transport))
  assert.equal(calls, 0)
  assert.equal(await generateWeeklyAnalysis({ ...defaultAIConfig, enabled: true }, summary, undefined, transport), '记录不足，请先记录实际专注再复盘。')
  assert.equal(calls, 1)
})
