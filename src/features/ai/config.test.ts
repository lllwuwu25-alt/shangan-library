import { test } from 'node:test'
import assert from 'node:assert/strict'
import { defaultAIConfig, normalizeAIConfig, deepseekPreset } from './config.ts'

test('new installations default to DeepSeek while AI and key retention remain off', () => {
  assert.equal(defaultAIConfig.baseUrl, 'https://api.deepseek.com')
  assert.equal(defaultAIConfig.model, 'deepseek-flash')
  assert.equal(defaultAIConfig.enabled, false)
  assert.equal(defaultAIConfig.apiKey, '')
  assert.equal(defaultAIConfig.rememberKey, false)
  assert.deepEqual(normalizeAIConfig({}), defaultAIConfig)
})
test('only unused legacy placeholders migrate; custom configurations remain intact', () => {
  assert.deepEqual(normalizeAIConfig({ baseUrl: 'https://api.openai.com/v1', model: '', enabled: false }), defaultAIConfig)
  const custom = { enabled: true, baseUrl: 'https://custom.example/v1', model: 'my-model', apiKey: 'my-key', rememberKey: true }
  assert.deepEqual(normalizeAIConfig(custom), custom)
  assert.equal(normalizeAIConfig({ baseUrl: 'https://api.openai.com/v1', model: 'custom-model' }).model, 'custom-model')
  assert.equal(normalizeAIConfig({ baseUrl: 'https://api.openai.com/v1', model: '', apiKey: 'saved-key', rememberKey: true }).baseUrl, 'https://api.openai.com/v1')
  assert.deepEqual(normalizeAIConfig(null), defaultAIConfig)
})
test('switching provider never carries another providers key into DeepSeek', () => {
  const custom = { ...defaultAIConfig, baseUrl: 'https://custom.example', apiKey: 'custom-key', rememberKey: true }
  assert.equal(deepseekPreset(custom).apiKey, '')
  assert.equal(deepseekPreset(custom).rememberKey, false)
  assert.equal(deepseekPreset({ ...custom, baseUrl: 'https://api.deepseek.com/v1' }).apiKey, 'custom-key')
  assert.equal(deepseekPreset({ ...custom, baseUrl: 'https://api.deepseek.com.evil.test' }).apiKey, '')
})
