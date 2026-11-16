import assert from 'node:assert/strict'
import { after, before, test } from 'node:test'
import { chromium } from 'playwright'

let browser
const base = `${(process.env.PREVIEW_URL || 'http://127.0.0.1:5179').replace(/\/$/, '')}/`
before(async () => {
  browser = await chromium.launch({ channel: 'chrome', headless: true })
})
after(async () => { await browser?.close() })

async function open(ai = false, width = 393) {
  const page = await browser.newPage({ viewport: { width, height: 852 }, reducedMotion: 'reduce' })
  page.setDefaultTimeout(20000)
  page.setDefaultNavigationTimeout(60000)
  await page.addInitScript((enabled) => {
    localStorage.setItem('shangan-library-ai-settings', JSON.stringify({ enabled, baseUrl: 'https://ai.example.test/v1', apiKey: '', model: 'vision-test', rememberKey: false }))
  }, ai)
  await page.goto(`${base}mistakes`, { waitUntil: 'domcontentloaded' })
  await page.locator('main').waitFor()
  return page
}
const button = (page, name) => page.getByRole('button', { name, exact: true })
async function create(page) {
  await button(page, '新增错题').click()
  const dialog = page.getByRole('dialog')
  await dialog.getByLabel('题目（必填）').fill('测试题目')
  await dialog.getByLabel('正确答案 / 思路').fill('测试答案')
  await button(dialog, '保存错题').click()
}

test('manual save, explicit edit/cancel, hidden answers, review and confirmed delete', async () => {
  const page = await open()
  try {
    await create(page)
    const card = page.getByRole('article').filter({ hasText: '测试题目' })
    assert.equal(await card.locator('textarea').count(), 0)
    assert.equal(await card.getByText('测试答案', { exact: true }).count(), 0)
    await button(card, '编辑').click()
    await page.getByLabel('题目（必填）').fill('不应保存')
    await button(page.getByRole('dialog'), '取消').click()
    await card.waitFor()
    await button(card, '复习').click()
    const review = page.getByRole('dialog')
    assert.equal(await review.getByText('测试答案', { exact: true }).count(), 0)
    await button(review, '显示答案').click()
    await review.getByText('测试答案', { exact: true }).waitFor()
    await button(review, '已掌握').click()
    await card.getByText('已掌握', { exact: true }).waitFor()
    await button(card, '删除').click()
    await button(page.getByRole('dialog'), '取消').click()
    await card.waitFor()
    await page.screenshot({ path: '/tmp/mistakes-mobile.png', fullPage: true })
    await button(card, '删除').click()
    await button(page.getByRole('dialog'), '确认删除').click()
    assert.equal(await card.count(), 0)
  } finally { await page.close() }
})

test('AI requires image selection and host consent, creates editable unsaved draft', async () => {
  const page = await open(true, 1440)
  let calls = 0
  await page.route('https://ai.example.test/**', async (route) => {
    calls++
    const body = route.request().postDataJSON()
    const imageParts = body.messages.flatMap((message) => Array.isArray(message.content) ? message.content.filter((part) => part.type === 'image_url') : [])
    assert.equal(imageParts.length, 1)
    assert.equal(imageParts[0].image_url.url, 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a0ioAAAAASUVORK5CYII=')
    await route.fulfill({ json: { choices: [{ message: { content: JSON.stringify({ question: '识别题目', answer: '识别答案', note: '待核对', subject: '新科目' }) } }] } })
  })
  try {
    await button(page, '新增错题').click()
    const dialog = page.getByRole('dialog')
    await dialog.getByLabel('题目（必填）').fill('手动内容')
    await dialog.locator('input[type=file]').setInputFiles([{ name: 'question.png', mimeType: 'image/png', buffer: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a0ioAAAAASUVORK5CYII=', 'base64') }, { name: 'private-unselected.png', mimeType: 'image/png', buffer: Buffer.from('must-not-send') }])
    await dialog.getByRole('button', { name: 'AI 识别', exact: true }).isDisabled().then((disabled) => assert.equal(disabled, true))
    await dialog.getByLabel('识别图片').selectOption({ label: 'question.png' })
    assert.equal(calls, 0)
    await button(dialog, 'AI 识别').click()
    await dialog.getByText('ai.example.test', { exact: false }).waitFor()
    assert.equal(calls, 0)
    await button(dialog, '确认发送并识别').click()
    await dialog.getByRole('heading', { name: '识别草稿' }).waitFor()
    assert.equal(await dialog.getByLabel('题目（必填）').inputValue(), '手动内容')
    page.once('dialog', (confirmation) => confirmation.accept())
    await button(dialog, '应用到编辑区').click()
    assert.equal(await dialog.getByLabel('题目（必填）').inputValue(), '识别题目')
    assert.equal(calls, 1)
    assert.equal(await page.getByRole('article').filter({ hasText: '识别题目' }).count(), 0)
    await dialog.getByLabel('题目（必填）').fill('核对后题目')
    await page.screenshot({ path: '/tmp/mistakes-composer-desktop.png' })
    await button(dialog, '保存错题').click()
    await page.getByRole('article').filter({ hasText: '核对后题目' }).waitFor()
  } finally { await page.close() }
})

test('batch import, filters, edit/save, attachment removal cancel and reload preserve data', async () => {
  const page = await open(false)
  try {
    await button(page, '批量导入').click()
    let dialog = page.getByRole('dialog')
    await dialog.getByLabel('导入重要程度').selectOption('红')
    await dialog.locator('input[type=file]').setInputFiles([{ name: 'legacy-question.txt', mimeType: 'text/plain', buffer: Buffer.from('original-file') }, { name: 'other-question.txt', mimeType: 'text/plain', buffer: Buffer.from('other-file') }])
    await dialog.getByRole('status').filter({ hasText: '2 条错题' }).waitFor()
    await button(dialog, '关闭').click()
    await page.getByLabel('搜索错题').fill('legacy-question')
    const card = page.getByRole('article').filter({ hasText: 'legacy-question' })
    await card.getByText('红色等级', { exact: true }).waitFor()
    await button(card, '编辑').click()
    dialog = page.getByRole('dialog')
    await button(dialog, '移除附件 legacy-question.txt').click()
    await button(dialog, '取消').click()
    await card.getByText('legacy-question.txt', { exact: true }).waitFor()
    assert.equal(await page.evaluate(async () => {
      const request = indexedDB.open('shangan-library-files')
      const db = await new Promise((resolve) => { request.onsuccess = () => resolve(request.result) })
      const data = JSON.parse(localStorage.getItem('shangan-library-data-v1'))
      const file = data.mistakes.find((item) => item.question === 'legacy-question').attachments[0]
      const get = db.transaction('attachments').objectStore('attachments').get(file.storageKey)
      const blob = await new Promise((resolve) => { get.onsuccess = () => resolve(get.result) })
      db.close()
      return blob.text()
    }), 'original-file')
    await button(card, '编辑').click()
    await page.getByLabel('重要程度').selectOption('绿')
    await page.getByLabel('正确答案 / 思路').fill('补充答案')
    await button(page.getByRole('dialog'), '保存错题').click()
    await page.reload()
    await page.getByLabel('搜索错题').fill('补充答案')
    await card.getByText('绿色等级', { exact: true }).waitFor()
    assert.equal(await card.getByText('补充答案', { exact: true }).count(), 0)
    await page.getByLabel('筛选状态').selectOption('已掌握')
    assert.equal(await page.getByRole('article').count(), 0)
  } finally { await page.close() }
})

test('AI failure, retry, cancel, timeout and close preserve manual content', async () => {
  const page = await open(true, 320)
  let calls = 0
  const pending = []
  await page.route('https://ai.example.test/**', async (route) => {
    calls++
    if (calls === 1) return route.fulfill({ status: 429, body: 'failure' })
    await new Promise((resolve) => pending.push(resolve))
    await route.fulfill({ json: { choices: [{ message: { content: JSON.stringify({ question: '迟到的题目', answer: '', note: '', subject: '' }) } }] } }).catch(() => {})
  })
  try {
    await button(page, '新增错题').click()
    const dialog = page.getByRole('dialog')
    await button(dialog, '保存错题').click()
    await dialog.getByRole('alert').waitFor()
    await dialog.getByLabel('题目（必填）').fill('持续手动录入')
    await dialog.locator('input[type=file]').setInputFiles({ name: 'question.png', mimeType: 'image/png', buffer: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a0ioAAAAASUVORK5CYII=', 'base64') })
    await dialog.getByLabel('识别图片').selectOption({ label: 'question.png' })
    const start = async () => { await button(dialog, 'AI 识别').click(); await button(dialog, '确认发送并识别').click() }
    await start()
    await dialog.getByRole('status').filter({ hasText: '服务限流或额度不足' }).waitFor()
    await start()
    await button(dialog, '停止等待').click()
    await dialog.getByRole('status').filter({ hasText: '已发送内容无法撤回' }).waitFor()
    await dialog.getByLabel('题目（必填）').fill('取消后编辑')
    pending.splice(0).forEach((resolve) => resolve())
    assert.equal(await dialog.getByLabel('题目（必填）').inputValue(), '取消后编辑')
    await page.clock.install()
    await start()
    await page.clock.runFor(61000)
    await dialog.getByRole('status').filter({ hasText: '超时' }).waitFor()
    assert.equal(await dialog.getByLabel('题目（必填）').inputValue(), '取消后编辑')
    await start()
    await button(dialog, '取消').click()
    pending.splice(0).forEach((resolve) => resolve())
    await button(page, '新增错题').click()
    assert.equal(await page.getByLabel('题目（必填）').inputValue(), '')
    assert.equal(await page.getByRole('heading', { name: '识别草稿' }).count(), 0)
    const dimensions = await dialog.evaluate((el) => ({ width: el.clientWidth, content: el.scrollWidth }))
    assert.ok(dimensions.content <= dimensions.width + 1)
    await dialog.locator('input[type=file]').setInputFiles({ name: `${'很长的截图文件名'.repeat(12)}.png`, mimeType: 'image/png', buffer: Buffer.from('test') })
    await dialog.getByRole('button', { name: /^移除附件/ }).waitFor()
    await page.screenshot({ path: '/tmp/mistakes-composer-320.png' })
    assert.ok(await dialog.evaluate((el) => el.scrollWidth <= el.clientWidth + 1))
    assert.ok(await dialog.locator('.app-modal__body').evaluate((el) => el.scrollWidth <= el.clientWidth + 1), 'composer body must not overflow with long filenames')
  } finally { pending.splice(0).forEach((resolve) => resolve()); await page.close() }
})
