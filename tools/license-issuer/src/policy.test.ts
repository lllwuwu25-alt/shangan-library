import assert from 'node:assert/strict'
import test from 'node:test'
import { canInitializeNewSystem, issuerErrorMessage } from './policy.ts'

test('initialization requires the exact destructive confirmation phrase', () => {
  assert.equal(canInitializeNewSystem(''), false)
  assert.equal(canInitializeNewSystem('创建新的授权'), false)
  assert.equal(canInitializeNewSystem(' 创建新的授权体系 '), true)
})

test('maps stable issuer errors to actionable Chinese messages', () => {
  assert.equal(issuerErrorMessage({ code: 'KEY_MISSING' }), '签名私钥不存在，请恢复备份或明确创建新的授权体系。')
  assert.equal(issuerErrorMessage({ code: 'KEY_MISMATCH' }), '所选备份属于另一套授权体系，已阻止覆盖当前根密钥。')
  assert.equal(issuerErrorMessage({ code: 'INVALID_INPUT' }), '订单备注或销售渠道格式不正确，请检查后重试。')
  assert.equal(issuerErrorMessage(new Error('offline')), '操作未完成，请检查所选文件并重试。')
})
