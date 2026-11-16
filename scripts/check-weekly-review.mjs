import assert from 'node:assert/strict'
import { mkdir, readFile } from 'node:fs/promises'
import { chromium } from 'playwright'
const browser = await chromium.launch({ headless: true, channel: 'chrome' })
const base = process.env.PREVIEW_URL || 'http://127.0.0.1:5179'
await mkdir('.codex-tmp/weekly-review', { recursive: true })
async function open({ day = 2, width = 1440, enabled = true, ai = true } = {}) {
  const context = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion: 'reduce', timezoneId: 'Asia/Shanghai' })
  const page = await context.newPage()
  await page.clock.setFixedTime(new Date(`2026-11-0${day}T10:00:00+08:00`))
  await page.addInitScript(({ enabled, ai }) => {
    if (localStorage.getItem('weekly-test-seeded')) return
    localStorage.setItem('weekly-test-seeded', 'true')
    localStorage.setItem('shangan-library-ai-settings', JSON.stringify({ enabled: ai, baseUrl: 'https://weekly.example.test/v1', apiKey: 'fake-weekly-key', model: 'weekly-model', rememberKey: true }))
    localStorage.setItem('shangan-library-data-v1', JSON.stringify({ tasks: [{ id: 't1', date: '2026-10-26', day: '周一', slot: '上午', title: 'PRIVATE_TASK_TITLE', subject: '数学', minutes: 60, status: 'done' }], weeklyPlan: [], resources: [], mistakes: [], pomodoroSessions: [{ id: 'p1', mode: '专注', title: 'PRIVATE_SESSION_TITLE', minutes: 25, subject: '数学', completedAt: '2026-11-01T10:00:00+08:00' }, { id: 'p2', mode: '短休息', minutes: 5, completedAt: '2026-11-01T10:00:00+08:00' }], settings: { subjects: ['数学'], timeSlots: ['上午'], theme: 'light' }, weeklyReview: { enabled, weekday: 1, decisions: {}, reports: [] } }))
  }, { enabled, ai })
  await page.goto(`${base}/settings`)
  await page.getByRole('heading', { name: '每周学习回顾', exact: true }).waitFor()
  return { page, context }
}
try {
  for (const day of [2, 3]) {
    const { page, context } = await open({ day, width: day === 2 ? 1440 : 393 })
    const errors = []; page.on('pageerror', e => errors.push(e.message))
    let calls = 0
    await page.route('https://weekly.example.test/**', route => {
      calls++
      const body = JSON.stringify(route.request().postDataJSON())
      assert.ok(!body.includes('PRIVATE_TASK_TITLE') && !body.includes('PRIVATE_SESSION_TITLE') && !body.includes('fake-weekly-key'))
      assert.ok(body.includes('2026-10-26'))
      return route.fulfill({ json: { choices: [{ message: { content: '学习概况：已记录专注25分钟。\n下周建议：继续记录实际投入。<script>danger()</script>' } }] } })
    })
    const dialog = page.getByRole('dialog')
    await dialog.getByRole('heading', { name: '是否回顾上周学习？' }).waitFor()
    assert.equal(calls, 0)
    await dialog.getByText('25 分钟', { exact: true }).waitFor()
    await dialog.getByText('计划安排 60 分钟', { exact: true }).waitFor()
    await dialog.getByRole('button', { name: '开始回顾并生成报告' }).click()
    await dialog.getByRole('heading', { name: '上周学习报告', exact: true }).waitFor()
    assert.equal(calls, 1)
    assert.equal(await dialog.locator('script').count(), 0)
    await page.screenshot({ path: `.codex-tmp/weekly-review/report-${day}.png` })
    assert.ok(await dialog.evaluate(el => el.scrollWidth <= el.clientWidth + 1))
    await dialog.getByRole('button', { name: '关闭报告', exact: true }).click()
    if (day === 2) {
      const downloadEvent = page.waitForEvent('download')
      await page.getByRole('button', { name: '立即备份', exact: true }).click()
      const download = await downloadEvent
      const backupPath = '.codex-tmp/weekly-review/backup.json'
      await download.saveAs(backupPath)
      const text = await readFile(backupPath, 'utf8')
      assert.equal(JSON.parse(text).weeklyReview.reports.length, 1)
      assert.ok(!text.includes('fake-weekly-key'))
      await page.evaluate(async () => (await import('/src/store/useStudyStore.ts')).useStudyStore.getState().resetData())
      await page.locator('input[type=file]').setInputFiles(backupPath)
      await page.getByText('恢复成功，', { exact: false }).waitFor()
      assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('shangan-library-data-v1')).weeklyReview.reports.length), 1)
    }
    await page.reload()
    await page.waitForTimeout(1500)
    assert.equal(await page.getByRole('dialog').count(), 0)
    await page.getByRole('button', { name: '2026-10-26 — 2026-11-01', exact: true }).click()
    await page.getByRole('dialog').getByRole('heading', { name: '上周学习报告' }).waitFor()
    assert.equal(calls, 1)
    assert.deepEqual(errors, [])
    await context.close(); console.log(`PASS weekly generation, history and privacy day=${day}`)
  }
  for (const ai of [false, true]) {
    const { page, context } = await open({ ai, enabled: ai })
    await page.waitForTimeout(1800)
    if (!ai) assert.equal(await page.getByRole('dialog').count(), 0)
    else {
      await page.getByRole('dialog').getByRole('button', { name: '本周跳过', exact: true }).click()
      await page.reload(); await page.waitForTimeout(1500)
      assert.equal(await page.getByRole('dialog').count(), 0)
    }
    await context.close()
  }
  const { page, context } = await open()
  let attempts = 0
  await page.route('https://weekly.example.test/**', route => { attempts++; return attempts === 1 ? route.fulfill({ status: 429, body: 'rate-limit' }) : route.fulfill({ json: { choices: [{ message: { content: '本周记录不足。' } }] } }) })
  await page.getByRole('dialog').getByRole('button', { name: '开始回顾并生成报告' }).click()
  await page.getByRole('alert').waitFor()
  assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('shangan-library-data-v1')).weeklyReview.reports.length), 0)
  await page.getByRole('button', { name: '重试生成报告', exact: true }).click()
  await page.getByRole('dialog').getByRole('heading', { name: '上周学习报告' }).waitFor()
  assert.equal(attempts, 2)
  await context.close()
  console.log('PASS opt-out, skip, failure and retry')
  const snooze = await open()
  await snooze.page.getByRole('dialog').getByRole('button', { name: '稍后提醒', exact: true }).click()
  await snooze.page.clock.setFixedTime(new Date('2026-11-03T11:00:00+08:00'))
  await snooze.page.evaluate(() => window.dispatchEvent(new Event('focus')))
  await snooze.page.getByRole('dialog').getByRole('heading', { name: '是否回顾上周学习？' }).waitFor()
  await snooze.page.evaluate(async () => {
    const store = (await import('/src/store/useStudyStore.ts')).useStudyStore
    store.getState().importData({ ...store.getState(), weeklyReview: { enabled: true, weekday: 7, decisions: {}, reports: [] } })
  })
  assert.equal(await snooze.page.getByRole('dialog').count(), 0)
  await snooze.context.close()
  console.log('PASS same-session snooze expiry and import invalidation')
} finally { await browser.close() }
