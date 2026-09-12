/// <reference types="node" />
import test from 'node:test'
import assert from 'node:assert/strict'
import { licenseErrorMessage } from './messages.ts'
import { resolveLicenseSurface } from './runtime.ts'
import type { LicenseStatus } from './types.ts'

const status = (state: LicenseStatus['state']): LicenseStatus => ({
  state,
  valid: state === 'valid',
  edition: state === 'valid' ? 'pro' : null,
  licenseType: state === 'valid' ? 'lifetime' : null,
  licenseId: state === 'valid' ? '0199-test' : null,
  issuedAt: state === 'valid' ? 1_789_200_000 : null,
  expiresAt: null,
  features: state === 'valid' ? ['full_access'] : [],
})

test('resolves desktop, demo and unsupported web surfaces without a bypass', () => {
  assert.equal(resolveLicenseSurface({ tauri: true, demo: false, checking: true, status: null }), 'checking')
  assert.equal(resolveLicenseSurface({ tauri: true, demo: true, checking: false, status: status('missing') }), 'activation')
  assert.equal(resolveLicenseSurface({ tauri: true, demo: true, checking: false, status: status('valid') }), 'unlocked')
  assert.equal(resolveLicenseSurface({ tauri: false, demo: true, checking: false, status: null }), 'unlocked')
  assert.equal(resolveLicenseSurface({ tauri: false, demo: false, checking: false, status: null }), 'desktop-only')
})

test('maps every stable Rust error code to concise Chinese copy', () => {
  const cases = new Map([
    ['MISSING', '尚未找到授权码。'],
    ['INVALID_FORMAT', '授权码无效，请检查是否完整复制。'],
    ['INVALID_ENCODING', '授权码无效，请检查是否完整复制。'],
    ['INVALID_PAYLOAD', '授权码无效，请检查是否完整复制。'],
    ['INVALID_SIGNATURE', '授权码无效，请检查是否完整复制。'],
    ['UNSUPPORTED_SCHEMA', '此授权码版本暂不受支持。'],
    ['UNKNOWN_KEY_ID', '无法识别此授权码的签发密钥。'],
    ['WRONG_PRODUCT', '此授权码不属于上岸资料库。'],
    ['UNSUPPORTED_EDITION', '此授权类型暂不受支持。'],
    ['UNSUPPORTED_LICENSE_TYPE', '此授权类型暂不受支持。'],
    ['EXPIRED', '此授权码已过期。'],
    ['STORAGE_ERROR', '授权信息无法写入本机，请稍后重试。'],
  ])

  for (const [code, expected] of cases) {
    assert.equal(licenseErrorMessage({ code }), expected)
  }
  assert.equal(licenseErrorMessage(new Error('details')), '激活未完成，请确认授权码完整后重试。')
})
