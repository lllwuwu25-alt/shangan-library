import { test } from 'node:test'
import assert from 'node:assert/strict'
import { chatEndpoint, parseRecognition, recognizeMistake, testConnection } from './client.ts'
import { defaultAIConfig, serializeAIConfig } from './config.ts'

test('AI endpoints preserve custom API prefixes and reject unsafe URLs', () => {
  assert.equal(chatEndpoint('https://api.deepseek.com'), 'https://api.deepseek.com/chat/completions')
  assert.equal(chatEndpoint('https://example.com/v1/'), 'https://example.com/v1/chat/completions')
  assert.equal(chatEndpoint('https://example.com/chat/completions'), 'https://example.com/chat/completions')
  for (const url of ['javascript:alert(1)', 'http://example.com/v1', 'https://user:secret@example.com', 'https://example.com/?key=secret']) assert.throws(() => chatEndpoint(url))
  assert.equal(chatEndpoint('http://localhost:11434/v1'), 'http://localhost:11434/v1/chat/completions')
})
test('API keys are excluded unless local retention is explicitly enabled', () => {
  const config = { ...defaultAIConfig, apiKey: 'secret' }
  assert.ok(!serializeAIConfig(config).includes('secret'))
  assert.ok(serializeAIConfig({ ...config, rememberKey: true }).includes('secret'))
})
test('recognition accepts fenced JSON and rejects malformed or empty questions', () => {
  assert.deepEqual(parseRecognition('```json\n{"question":"题目","answer":"答案"}\n```'), { question: '题目', answer: '答案', note: '', subject: '' })
  for (const value of ['not json', '{"question":""}', '{"question":{}}', '{"question":"x","answer":[]}']) assert.throws(() => parseRecognition(value))
})
test('AI disabled or non-image input sends no requests', async () => {
  let calls = 0
  const transport = async () => { calls++; return { choices: [] } }
  await assert.rejects(recognizeMistake(defaultAIConfig, 'data:image/png;base64,AAAA', undefined, transport))
  await assert.rejects(recognizeMistake({ ...defaultAIConfig, enabled: true, model: 'vision' }, 'data:application/pdf;base64,AAAA', undefined, transport))
  assert.equal(calls, 0)
})
test('recognition sends only selected image and parses returned draft', async () => {
  const config = { ...defaultAIConfig, enabled: true, model: 'vision' }
  const draft = await recognizeMistake(config, 'data:image/png;base64,AAAA', undefined, async (url, body) => {
    assert.equal(url, 'https://api.deepseek.com/chat/completions')
    assert.equal(body.model, 'vision')
    assert.ok(JSON.stringify(body).includes('data:image/png;base64,AAAA'))
    return { choices: [{ message: { content: '{"question":"识别题目"}' } }] }
  })
  assert.equal(draft.question, '识别题目')
})
test('connection test requires meaningful model output; abort prevents requests', async () => {
  const config = { ...defaultAIConfig, enabled: true, model: 'vision' }
  await assert.rejects(testConnection(config, undefined, async () => ({ choices: [] })))
  const controller = new AbortController(); controller.abort()
  await assert.rejects(testConnection(config, controller.signal, async () => { throw new Error('must not call') }), /取消/)
})
test('stopping waits rejects promptly and ignores a late provider response', async () => {
  const controller = new AbortController()
  const pending = testConnection({ ...defaultAIConfig, enabled: true, model: 'vision' }, controller.signal, async () => new Promise(() => {}))
  controller.abort()
  await assert.rejects(pending, /无法撤回/)
})
