import assert from 'node:assert/strict'
import { mkdir } from 'node:fs/promises'
import { chromium } from 'playwright'
const base = process.env.PREVIEW_URL || 'http://127.0.0.1:5179'
const output = '.codex-tmp/upgrade-preview'
await mkdir(output, { recursive: true })
const browser = await chromium.launch({ headless: true, channel: 'chrome' })
try {
  for (const width of [1440, 393]) {
    const context = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion: 'reduce' })
    const page = await context.newPage()
    const errors = []; page.on('pageerror', error => errors.push(error.message))
    let calls = 0
    await page.route('https://ai.example.test/**', route => {
      calls++
      assert.equal(route.request().headers().authorization, 'Bearer preview-only-test-key')
      return route.fulfill({ json: { choices: [{ message: { content: 'OK' } }] } })
    })
    await page.goto(`${base}/settings`)
    await page.getByLabel('开启 AI 辅助', { exact: true }).check()
    assert.equal(await page.getByLabel('API 地址', { exact: true }).inputValue(), 'https://api.deepseek.com')
    assert.equal(await page.getByLabel('模型名称', { exact: true }).inputValue(), 'deepseek-flash')
    await page.getByLabel('API 地址', { exact: true }).fill('https://other.example/v1')
    await page.getByLabel('API 密钥', { exact: true }).fill('other-provider-key')
    await page.getByRole('button', { name: '使用 DeepSeek 预设', exact: true }).click()
    assert.equal(await page.getByLabel('API 地址', { exact: true }).inputValue(), 'https://api.deepseek.com')
    assert.equal(await page.getByLabel('API 密钥', { exact: true }).inputValue(), '')
    assert.equal(calls, 0)
    await page.getByLabel('API 地址', { exact: true }).fill('https://ai.example.test/v1')
    await page.getByLabel('API 密钥', { exact: true }).fill('preview-only-test-key')
    await page.getByLabel('模型名称', { exact: true }).fill('vision-test')
    await page.getByRole('button', { name: '保存 AI 设置', exact: true }).click()
    assert.equal(calls, 0, '配置保存不得自动调用 AI')
    const serialized = await page.evaluate(() => localStorage.getItem('shangan-library-ai-settings'))
    assert.ok(!serialized.includes('preview-only-test-key'), '默认不持久化密钥')
    await page.getByRole('button', { name: '测试连接', exact: true }).click()
    await page.getByRole('status').filter({ hasText: '连接成功' }).waitFor()
    assert.equal(calls, 1)
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1)
    assert.equal(overflow, false, `${width}px 页面不得横向溢出`)
    await page.screenshot({ path: `${output}/ai-settings-${width}.png`, fullPage: false })
    await page.reload()
    await page.getByLabel('API 密钥', { exact: true }).waitFor()
    assert.equal(await page.getByLabel('API 密钥', { exact: true }).inputValue(), '')
    await page.getByLabel('开启 AI 辅助', { exact: true }).uncheck()
    assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('shangan-library-ai-settings')).enabled), false)
    await page.getByLabel('开启 AI 辅助', { exact: true }).check()
    await page.getByLabel('API 密钥', { exact: true }).fill('remembered-preview-key')
    await page.getByLabel('在此设备记住密钥', { exact: false }).check()
    await page.getByRole('button', { name: '保存 AI 设置', exact: true }).click()
    page.once('dialog', dialog => dialog.accept())
    await page.getByRole('button', { name: '清空数据和附件', exact: true }).click()
    await page.getByText('已清空学习数据、附件和 AI 配置', { exact: false }).waitFor()
    assert.equal(await page.getByLabel('开启 AI 辅助', { exact: true }).isChecked(), false)
    assert.ok(!(await page.evaluate(() => localStorage.getItem('shangan-library-ai-settings'))).includes('remembered-preview-key'))
    assert.deepEqual(errors, [])
    await context.close()
    console.log(`PASS AI configuration privacy and responsive layout ${width}px`)
  }
} finally { await browser.close() }
