import assert from 'node:assert/strict'
import { mkdir } from 'node:fs/promises'
import { chromium } from 'playwright'

const url = process.env.MOBILE_TEST_URL || 'http://127.0.0.1:5173'
const output = '.codex-tmp/mobile-license'
await mkdir(output, { recursive: true })
const browser = await chromium.launch({ channel: 'chrome', headless: true })

// Simulate only the Capacitor transport. Cryptography/storage are tested in Rust.
async function bridgeFixture() {
  window.androidBridge = {}
  const empty = { state: 'missing', valid: false, edition: null, licenseType: null, licenseId: null, issuedAt: null, expiresAt: null, features: [] }
  const valid = { state: 'valid', valid: true, edition: 'pro', licenseType: 'lifetime', licenseId: 'ui-test-license', issuedAt: 1789200000, expiresAt: null, features: ['full_access'] }
  window.Capacitor = {
    PluginHeaders: [
      { name: 'ShanganLicense', methods: ['getLicenseStatus', 'activateLicense', 'deactivateLicense'].map((name) => ({ name, rtype: 'promise' })) },
      { name: 'App', methods: [{ name: 'addListener', rtype: 'callback' }, { name: 'removeListener', rtype: 'promise' }] },
    ],
    nativeCallback: () => 'test-listener',
    nativePromise: async (plugin, method, args) => {
      if (plugin !== 'ShanganLicense') return {}
      if (localStorage.getItem('ui-transport-failure')) throw { code: 'STORAGE_ERROR' }
      if (method === 'activateLicense') {
        if (args?.license !== 'UI_TEST_CODE') throw { code: 'INVALID_SIGNATURE' }
        localStorage.setItem('ui-transport-license', 'active')
        return valid
      }
      if (method === 'deactivateLicense') localStorage.removeItem('ui-transport-license')
      return localStorage.getItem('ui-transport-license') ? valid : empty
    },
  }
}

try {
  for (const width of [320, 393]) {
    const context = await browser.newContext({ viewport: { width, height: 852 }, isMobile: true, hasTouch: true, reducedMotion: 'reduce' })
    await context.addInitScript(bridgeFixture)
    const page = await context.newPage()
    const errors = []
    page.on('pageerror', (error) => errors.push(error.message))
    await page.goto(`${url}/dashboard`)
    await page.getByRole('heading', { name: '激活产品', exact: true }).waitFor()
    assert.equal(await page.getByRole('navigation', { name: '主导航' }).count(), 0)
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1))
    assert.equal(await page.locator('textarea').evaluate((input) => getComputedStyle(input).fontSize), '16px')
    await page.screenshot({ path: `${output}/activation-${width}.png` })

    await page.getByLabel('授权码', { exact: true }).fill(`SL1.${'a'.repeat(900)}`)
    assert.ok(await page.locator('textarea').evaluate((input) => input.scrollWidth <= input.clientWidth + 1))
    await page.getByRole('button', { name: '激活', exact: true }).click()
    await page.getByText('授权码无效，请检查是否完整复制。', { exact: true }).waitFor()
    assert.equal(await page.getByRole('navigation', { name: '主导航' }).count(), 0)

    await page.getByLabel('授权码', { exact: true }).fill('UI_TEST_CODE')
    await page.getByRole('button', { name: '激活', exact: true }).click()
    await page.getByRole('heading', { name: '激活成功', exact: true }).waitFor()
    await page.getByRole('button', { name: '开始使用', exact: false }).click()
    await page.getByRole('navigation', { name: '主导航' }).waitFor()
    await page.reload()
    await page.getByRole('navigation', { name: '主导航' }).waitFor()
    await page.goto(`${url}/settings`)
    await page.getByText('ui-test-license', { exact: true }).waitFor()
    await page.getByText('ui-test-license', { exact: true }).scrollIntoViewIfNeeded()
    await page.screenshot({ path: `${output}/status-${width}.png` })
    await page.evaluate(() => localStorage.setItem('ui-study-sentinel', 'keep'))
    page.once('dialog', (dialog) => dialog.accept())
    await page.getByRole('button', { name: '移除此设备授权', exact: false }).click()
    await page.getByRole('heading', { name: '激活产品', exact: true }).waitFor()
    assert.equal(await page.evaluate(() => localStorage.getItem('ui-study-sentinel')), 'keep')
    await page.evaluate(() => localStorage.setItem('ui-transport-failure', 'true'))
    await page.reload()
    await page.getByRole('heading', { name: '激活产品', exact: true }).waitFor()
    assert.equal(await page.getByRole('navigation', { name: '主导航' }).count(), 0)
    assert.deepEqual(errors, [])
    await context.close()
    console.log(`PASS Android licensing UI ${width}px: activation, error, restart, removal, fail closed`)
  }
} finally {
  await browser.close()
}
