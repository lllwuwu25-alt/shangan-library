import assert from 'node:assert/strict'
import { mkdir } from 'node:fs/promises'
import { chromium } from 'playwright'

const base = process.env.PREVIEW_URL || 'http://127.0.0.1:5179'
const output = '.codex-tmp/study-assistant'
await mkdir(output, { recursive: true })
const browser = await chromium.launch({ channel: 'chrome', headless: true })
const today = '2026-11-16'
const future = '2026-11-25'
const task = (title, date, minutes = 45) => ({ title, date, minutes, slot: '上午', subject: '数学' })
try {
  for (const width of [1440, 360]) {
    const context = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion: 'reduce', timezoneId: 'Asia/Shanghai' })
    const page = await context.newPage()
    const errors = []
    const requests = []
    let returnLateResponse
    page.on('pageerror', error => errors.push(error.message))
    await page.clock.setFixedTime(new Date('2026-11-16T10:00:00+08:00'))
    await page.addInitScript((date) => {
      if (localStorage.getItem('assistant-fixture')) return
      localStorage.setItem('assistant-fixture', '1')
      localStorage.setItem('shangan-library-ai-settings', JSON.stringify({ enabled: true, baseUrl: 'https://assistant.example.test/v1', model: 'plan-test', apiKey: 'test-key', rememberKey: true }))
      localStorage.setItem('shangan-library-data-v1', JSON.stringify({
        tasks: [{ id: 'existing', title: 'UNSENT_EXISTING_TASK', date, day: '周一', slot: '上午', subject: '数学', status: 'done', minutes: 30 }],
        mistakes: [{ id: 'mistake', question: 'UNSENT_MISTAKE', attachments: [] }],
        resources: [], weeklyPlan: [], settings: { subjects: ['数学', '英语'], timeSlots: ['上午', '晚上'], theme: 'light' },
      }))
    }, today)
    await page.route('https://assistant.example.test/**', async route => {
      requests.push(route.request().postDataJSON())
      const payload = JSON.stringify(requests.at(-1))
      for (const secret of ['UNSENT_EXISTING_TASK', 'UNSENT_MISTAKE', 'test-key']) assert.ok(!payload.includes(secret))
      if (requests.length === 1) return route.fulfill({ json: { choices: [{ message: { content: JSON.stringify({ reply: '已整理两项计划。', tasks: [task('极限专项', today), task('真题复盘', future)] }) } }] } })
      if (requests.length === 2) return route.fulfill({ status: 429, body: 'quota' })
      if (requests.length === 4) {
        await new Promise(resolve => { returnLateResponse = resolve })
        await route.fulfill({ json: { choices: [{ message: { content: '{"reply":"不应显示的迟到回复","tasks":[]}' } }] } }).catch(() => {})
        return
      }
      assert.ok(payload.includes('极限专项') && payload.includes('把今天改成 35 分钟'))
      return route.fulfill({ json: { choices: [{ message: { content: JSON.stringify({ reply: '已按要求调整草稿。', tasks: [task('极限专项', today, 35), task('真题复盘', future), task('极限专项', today, 35)] }) } }] } })
    })
    const button = (name) => page.getByRole('button', { name, exact: true })
    const storedTasks = () => page.evaluate(() => JSON.parse(localStorage.getItem('shangan-library-data-v1')).tasks)
    await page.goto(`${base}/dashboard`)
    if (width < 1024) await button('更多入口').click()
    else await button('收起侧栏').click()
    await button('AI 协助').click()
    await page.waitForURL('**/ai')
    assert.equal(requests.length, 0)
    await page.getByLabel('计划需求').fill('今天和下周各排一项数学任务')
    await button('发送').click()
    await page.getByText('已整理两项计划。', { exact: true }).waitFor()
    assert.equal((await storedTasks()).length, 1)
    await page.getByLabel('计划需求').fill('把今天改成 35 分钟')
    await button('发送').click()
    await page.getByRole('alert').filter({ hasText: '限流' }).waitFor()
    assert.equal(await page.getByLabel('第 1 项预计分钟').inputValue(), '45')
    await button('发送').click()
    await page.getByText('已按要求调整草稿。', { exact: true }).waitFor()
    await page.getByLabel('计划需求').fill('这次请求会取消')
    const sent = page.waitForRequest(request => request.url() === 'https://assistant.example.test/v1/chat/completions')
    await button('发送').click()
    await sent
    await button('停止等待').click()
    returnLateResponse?.()
    assert.equal(await page.getByText('不应显示的迟到回复', { exact: true }).count(), 0)
    assert.equal(await page.getByLabel('第 1 项预计分钟').inputValue(), '35')
    await page.getByLabel('第 2 项任务名称').fill('下周真题订正')
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1))
    await page.evaluate(() => window.scrollTo(0, 0))
    await page.screenshot({ path: `${output}/assistant-${width}.png` })
    await button('加入学习计划').click()
    assert.equal((await storedTasks()).length, 1, 'first action only requests confirmation')
    await page.evaluate(() => { Object.defineProperty(crypto, 'randomUUID', { value: undefined }) })
    await button('确认加入学习计划').click()
    await page.getByText('已加入 2 项学习任务，跳过 1 项重复任务。', { exact: true }).waitFor()
    const tasks = await storedTasks()
    assert.equal(tasks.length, 3)
    assert.equal(new Set(tasks.map(t => t.id)).size, 3, 'batch task IDs must remain unique without randomUUID')
    assert.equal(tasks.find(t => t.id === 'existing').status, 'done')
    assert.equal(tasks.find(t => t.title === '极限专项').minutes, 35)
    assert.equal(tasks.find(t => t.title === '下周真题订正').day, '周三')
    await button('查看学习计划').click()
    await page.getByText('极限专项', { exact: true }).filter({ visible: true }).first().waitFor()
    if (width < 1024) {
      await button('下周').click()
      await button('周三 2026-11-25 1 项计划').click()
    } else await button('展开下周计划').click()
    await page.getByText('下周真题订正', { exact: true }).filter({ visible: true }).first().waitFor()
    await page.goto(`${base}/dashboard`)
    await page.getByText('极限专项', { exact: true }).filter({ visible: true }).first().waitFor()
    await page.goto(`${base}/pomodoro`)
    await page.locator('option').filter({ hasText: '极限专项' }).waitFor({ state: 'attached' })
    assert.equal(await page.locator('option').filter({ hasText: '下周真题订正' }).count(), 0)
    assert.equal((await storedTasks()).length, 3)
    assert.deepEqual(errors, [])
    await context.close()
    console.log(`PASS planning, confirmation, and cross-module sync at ${width}px`)
  }
  const page = await browser.newPage({ reducedMotion: 'reduce' })
  await page.goto(`${base}/ai`)
  await page.getByText('AI 已关闭。', { exact: true }).waitFor()
  assert.equal(await page.getByRole('button', { name: '发送', exact: true }).isDisabled(), true)
  await page.close()
  console.log('PASS disabled AI')
} finally { await browser.close() }
