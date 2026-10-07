import assert from 'node:assert/strict'
import { mkdir } from 'node:fs/promises'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright')
const baseUrl = process.env.MOBILE_TEST_URL || 'http://127.0.0.1:5173'
const output = process.env.MOBILE_TEST_OUTPUT || '.codex-tmp/mobile-qa'
await mkdir(output, { recursive: true })
const browser = await chromium.launch({ headless: true, channel: process.env.PLAYWRIGHT_CHANNEL || 'chrome' })
let failures = 0

async function check(name, path, run, viewport = { width: 360, height: 800 }) {
  if (process.env.MOBILE_TEST_FILTER && !name.includes(process.env.MOBILE_TEST_FILTER)) return
  const context = await browser.newContext({ viewport, isMobile: viewport.width < 1024, hasTouch: viewport.width < 1024, reducedMotion: 'reduce' })
  const page = await context.newPage()
  const errors = []
  page.on('pageerror', (error) => errors.push(error.message))
  try {
    await page.goto(`${baseUrl}${path}`)
    await page.locator('main').waitFor()
    await run(page)
    assert.deepEqual(errors, [], '页面不应有未处理异常')
    await page.screenshot({ path: `${output}/${name}.png`, fullPage: false })
    console.log(`PASS ${name}`)
  } catch (error) {
    failures++
    console.error(`FAIL ${name}: ${error.message}`)
    await page.screenshot({ path: `${output}/${name}-failure.png`, fullPage: true })
  } finally {
    await context.close()
  }
}

await check('mobile-simplified-page-headers', '/dashboard', async (page) => {
  for (const [path, title] of [['/dashboard', '首页总览'], ['/plan', '学习计划'], ['/pomodoro', '番茄钟']]) {
    await page.goto(`${baseUrl}${path}`)
    await page.locator('main').waitFor()
    assert.equal(await page.getByText(title, { exact: true }).filter({ visible: true }).count(), 1, `${title} 手机上不应重复展示页面标题和介绍卡片`)
  }
  await page.goto(`${baseUrl}/dashboard`)
  assert.equal(await page.getByText('今天先看最该做的事，再处理资料和错题。所有数据保存在本机浏览器中。', { exact: true }).isVisible(), false)
  await page.setViewportSize({ width: 1440, height: 900 })
  assert.equal(await page.getByRole('heading', { name: '首页总览', exact: true }).isVisible(), true, '桌面版页面介绍保持可见')
})

for (const width of [320, 393]) {
  await check(`mobile-directory-hierarchy-${width}`, '/resources', async (page) => {
    const createFolder = async (name) => {
      await page.getByRole('button', { name: '新建', exact: true }).click()
      await page.getByRole('dialog').getByLabel('名称').fill(name)
      await page.getByRole('dialog').getByRole('button', { name: '文件夹', exact: true }).click()
      await page.getByRole('button', { name: '创建', exact: true }).click()
      await page.getByRole('heading', { name, exact: true }).waitFor()
    }
    await createFolder('英语')
    await page.getByRole('button', { name: '返回上一级', exact: true }).click()
    await createFolder('数学')
    await createFolder('高数')
    await createFolder('极限')
    await page.getByRole('button', { name: '目录', exact: true }).click()
    const picker = page.getByRole('dialog')
    await picker.getByRole('button', { name: '我的资料 / 数学 / 高数 / 极限', exact: true }).waitFor({ timeout: 2000 })
    const rows = picker.getByRole('list', { name: '目录层级', exact: true }).getByRole('listitem')
    await rows.first().waitFor({ timeout: 2000 })
    assert.deepEqual(await rows.locator('[data-directory-title]').allTextContents(), ['我的资料', '英语', '数学', '高数', '极限'])
    const positions = await rows.locator('[data-directory-title]').evaluateAll((titles) => titles.map((title) => title.getBoundingClientRect().left))
    assert.ok(positions[2] < positions[3] && positions[3] < positions[4], '子目录应按层级缩进')
    await picker.getByRole('button', { name: '收起我的资料 / 数学', exact: true }).click()
    assert.equal(await picker.getByRole('button', { name: '我的资料 / 数学 / 高数 / 极限', exact: true }).count(), 0)
    await picker.getByPlaceholder('搜索目录').fill('极限')
    assert.deepEqual(await rows.locator('[data-directory-title]').allTextContents(), ['我的资料', '数学', '高数', '极限'], '搜索子目录时保留父级路径')
    await picker.getByPlaceholder('搜索目录').fill('不存在的目录')
    await picker.getByText('没有匹配的目录', { exact: true }).waitFor()
    await picker.getByPlaceholder('搜索目录').fill('')
    await picker.getByRole('button', { name: '展开我的资料 / 数学', exact: true }).click()
    const size = await picker.evaluate((element) => ({ width: element.clientWidth, content: element.scrollWidth }))
    assert.ok(size.content <= size.width + 1, '目录选择器不应横向溢出')
    await page.screenshot({ path: `${output}/directory-tree-${width}.png` })
    await picker.getByRole('button', { name: '我的资料 / 数学 / 高数', exact: true }).click()
    await page.getByRole('heading', { name: '高数', exact: true }).waitFor()
    assert.equal(await page.getByRole('dialog').count(), 0)
  }, { width, height: 852 })
}

await check('mobile-contact-navigation', '/dashboard', async (page) => {
  await page.getByRole('button', { name: '更多入口', exact: true }).click({ timeout: 2000 })
  await page.getByRole('button', { name: '联系我们', exact: true }).click()
  await page.waitForURL('**/contact')
})

await check('mobile-next-week', '/plan', async (page) => {
  await page.getByRole('button', { name: '下周', exact: true }).click({ timeout: 2000 })
  assert.equal(await page.getByRole('button', { name: '周一', exact: false }).count() > 0, true)
})

await check('mobile-touch-inputs', '/plan', async (page) => {
  await page.getByRole('button', { name: '新增', exact: true }).click()
  const metrics = await page.getByPlaceholder('例如：完成真题阅读').filter({ visible: true }).first().evaluate((input) => ({ height: input.getBoundingClientRect().height, fontSize: parseFloat(getComputedStyle(input).fontSize) }))
  assert.ok(metrics.height >= 44 && metrics.fontSize >= 16, JSON.stringify(metrics))
})

await check('mobile-library-actions', '/resources', async (page) => {
  await page.getByPlaceholder('搜索知识库').waitFor()
  assert.equal(await page.getByRole('button', { name: '新建', exact: true }).filter({ visible: true }).count(), 1, '手机应只有一个新建入口')
  assert.equal(await page.getByRole('button', { name: '导入资料', exact: true }).filter({ visible: true }).count(), 1, '手机应只有一个导入入口')
})

await check('mobile-timer-priority', '/pomodoro', async (page) => {
  const timer = await page.getByText('25:00', { exact: true }).boundingBox()
  assert.ok(timer && timer.y < 420, `计时器距离顶部 ${timer?.y}px，手机首屏应可见`)
})

for (const viewport of [{ width: 700, height: 900 }, { width: 800, height: 360 }]) {
  await check(`long-timer-${viewport.width}`, '/pomodoro', async (page) => {
    const settings = page.locator('summary').filter({ hasText: '计时设置' })
    if (await settings.isVisible()) await settings.click()
    await page.getByRole('spinbutton', { name: '计时分钟数' }).fill('720')
    if (viewport.width < 768) {
      const fits = await page.getByText('720:00', { exact: true }).evaluate((clock) => {
        const ring = clock.closest('.mobile-timer-ring').getBoundingClientRect()
        const text = document.createRange()
        text.selectNodeContents(clock)
        const bounds = text.getBoundingClientRect()
        return bounds.left >= ring.left && bounds.right <= ring.right && bounds.height < parseFloat(getComputedStyle(clock).fontSize) * 1.6
      })
      assert.ok(fits, '最长计时文字应完整显示在圆环内')
    }
    await page.getByRole('button', { name: '全屏专注', exact: true }).click()
    const fits = await page.getByText('720:00', { exact: true }).filter({ visible: true }).evaluate((clock) => {
      const ring = clock.parentElement.parentElement.getBoundingClientRect()
      const text = document.createRange()
      text.selectNodeContents(clock)
      const bounds = text.getBoundingClientRect()
      return bounds.left >= ring.left && bounds.right <= ring.right && bounds.height < parseFloat(getComputedStyle(clock).fontSize) * 1.6
    })
    assert.ok(fits, '横屏全屏计时也应完整显示在圆环内')
    const start = await page.getByRole('button', { name: '开始', exact: true }).filter({ visible: true }).boundingBox()
    assert.ok(start && start.y + start.height <= viewport.height, '全屏开始按钮应在首屏内')
  }, viewport)
}

await check('mobile-image-preview-controls', '/resources', async (page) => {
  await page.getByPlaceholder('搜索知识库').waitFor()
  await page.locator('input[type="file"]').first().setInputFiles({ name: 'mobile-test.png', mimeType: 'image/png', buffer: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aXb8AAAAASUVORK5CYII=', 'base64') })
  await page.getByRole('button', { name: /mobile-test/ }).first().click()
  await page.getByRole('button', { name: '原始大小', exact: true }).click({ timeout: 2000 })
  await page.getByRole('button', { name: '关闭预览' }).click()
  assert.equal(await page.getByRole('dialog').count(), 0)
})

await check('mobile-pdf-preview', '/resources', async (page) => {
  const { PDFDocument, StandardFonts } = require(process.env.PDF_LIB_MODULE || 'pdf-lib')
  const pdf = await PDFDocument.create()
  const font = await pdf.embedFont(StandardFonts.Helvetica)
  for (let index = 1; index <= 3; index++) pdf.addPage([400, 600]).drawText(`Study page ${index}`, { x: 40, y: 520, size: 24, font })
  await page.getByPlaceholder('搜索知识库').waitFor()
  await page.locator('input[type="file"]').first().setInputFiles({ name: 'mobile-pdf.pdf', mimeType: 'application/pdf', buffer: Buffer.from(await pdf.save()) })
  await page.getByRole('button', { name: /mobile-pdf/ }).first().click()
  await page.getByRole('dialog').locator('canvas').first().waitFor({ timeout: 5000 })
  const scroll = page.getByRole('dialog').locator('.app-modal__body')
  await scroll.evaluate((element) => { element.scrollTop = element.scrollHeight })
  await page.getByRole('dialog').locator('canvas[aria-label="PDF 第 3 页"]').waitFor()
  await page.waitForFunction(() => {
    const canvas = document.querySelector('canvas[aria-label="PDF 第 3 页"]')
    return canvas?.width > 0 && canvas?.getAttribute('aria-busy') === 'false'
  })
  const pixels = await page.locator('canvas[aria-label="PDF 第 3 页"]').evaluate((canvas) => {
    const data = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data
    let ink = 0
    for (let index = 0; index < data.length; index += 4) if (data[index + 3] > 0 && data[index] < 200) ink++
    return ink
  })
  assert.ok(pixels > 100, 'PDF 最后一页应有真实渲染内容')
})

await check('mobile-office-preview-scroll', '/resources', async (page) => {
  const XLSX = require('xlsx')
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(Array.from({ length: 150 }, (_, index) => [`Study row ${index + 1}`, 'Review'])), '学习清单')
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet([['第二工作表内容']]), '复习清单')
  const JSZip = createRequire(require.resolve('mammoth'))('jszip')
  const zip = new JSZip()
  zip.file('[Content_Types].xml', '<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>')
  zip.file('_rels/.rels', '<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>')
  zip.file('word/document.xml', `<?xml version="1.0"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${Array.from({ length: 100 }, (_, index) => `<w:p><w:r><w:t>Study paragraph ${index + 1}</w:t></w:r></w:p>`).join('')}</w:body></w:document>`)
  await page.getByPlaceholder('搜索知识库').waitFor()
  await page.locator('input[type="file"]').first().setInputFiles([
    { name: 'mobile-sheet.xlsx', mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', buffer: XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' }) },
    { name: 'mobile-word.docx', mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', buffer: await zip.generateAsync({ type: 'nodebuffer' }) },
  ])
  await page.getByRole('button', { name: /mobile-sheet/ }).first().click()
  await page.getByRole('dialog').getByText('Study row 150', { exact: true }).waitFor()
  await page.getByRole('dialog').locator('.app-modal__body').evaluate((element) => { element.scrollTop = element.scrollHeight })
  const lastRow = await page.getByText('Study row 150', { exact: true }).boundingBox()
  assert.ok(lastRow && lastRow.y + lastRow.height <= 800, '最后一行 Excel 内容应能滚动到可见区域')
  await page.getByRole('button', { name: '复习清单', exact: true }).click()
  await page.getByText('第二工作表内容', { exact: true }).waitFor()
  await page.getByRole('button', { name: '关闭预览' }).click()
  await page.getByRole('button', { name: '返回上一级', exact: true }).click()
  await page.getByRole('button', { name: /mobile-word/ }).first().click()
  await page.getByText('Study paragraph 100', { exact: true }).waitFor()
  await page.getByRole('dialog').locator('.app-modal__body').evaluate((element) => { element.scrollTop = element.scrollHeight })
  const lastParagraph = await page.getByText('Study paragraph 100', { exact: true }).boundingBox()
  assert.ok(lastParagraph && lastParagraph.y + lastParagraph.height <= 800, '最后一段 Word 内容应能滚动到可见区域')
})

await check('mobile-keyboard-and-dark-sheet', '/settings', async (page) => {
  await page.getByRole('button', { name: '夜间', exact: true }).click()
  await page.getByRole('navigation', { name: '主导航' }).getByRole('button', { name: '计划', exact: true }).click()
  await page.getByRole('button', { name: '新增', exact: true }).click()
  await page.getByRole('dialog').getByLabel('任务名称').fill('键盘适配计划')
  await page.setViewportSize({ width: 360, height: 450 })
  await page.waitForFunction(() => document.documentElement.dataset.keyboard === 'open')
  assert.equal(await page.getByRole('navigation', { name: '主导航' }).isVisible(), false, '键盘打开时应隐藏底部导航')
  const save = page.getByRole('button', { name: '加入计划', exact: true })
  await save.scrollIntoViewIfNeeded()
  const bounds = await save.boundingBox()
  assert.ok(bounds && bounds.y + bounds.height <= 450, '键盘打开时保存按钮应可滚动到可见区域')
  const background = await page.getByRole('dialog').locator('.app-modal__surface').evaluate((element) => getComputedStyle(element).backgroundColor)
  assert.notEqual(background, 'rgb(255, 255, 255)', '夜间底部弹窗应使用深色背景')
  await save.click()
  await page.setViewportSize({ width: 360, height: 800 })
  await page.getByText('键盘适配计划', { exact: true }).filter({ visible: true }).first().waitFor()
})

await check('mobile-plan-persistence', '/plan', async (page) => {
  await page.clock.install({ time: new Date('2026-10-04T12:00:00+08:00') })
  await page.reload()
  const today = await page.evaluate(() => {
    const date = new Date()
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
  })
  await page.getByRole('button', { name: '新增', exact: true }).click()
  await page.getByRole('dialog').getByLabel('任务名称').fill('今日手机计划')
  await page.getByRole('button', { name: '加入计划', exact: true }).click()
  await page.getByText('今日手机计划', { exact: true }).filter({ visible: true }).first().waitFor()
  await page.getByRole('navigation', { name: '主导航' }).getByRole('button', { name: '首页', exact: true }).click()
  await page.getByText('今日手机计划', { exact: true }).filter({ visible: true }).first().waitFor()
  await page.getByRole('navigation', { name: '主导航' }).getByRole('button', { name: '计划', exact: true }).click()
  await page.getByRole('button', { name: '下周', exact: true }).click()
  await page.getByRole('button', { name: '新增', exact: true }).click()
  const date = await page.getByRole('dialog').getByLabel('计划日期').inputValue()
  assert.ok(date > today, '周日应能安排下周日期')
  await page.getByRole('dialog').getByLabel('任务名称').fill('下周手机计划')
  await page.getByRole('button', { name: '加入计划', exact: true }).click()
  await page.getByText('下周手机计划', { exact: true }).filter({ visible: true }).first().waitFor()
  await page.getByRole('button', { name: '本周', exact: true }).click()
  assert.equal(await page.getByText('下周手机计划', { exact: true }).filter({ visible: true }).count(), 0)
  page.once('dialog', (dialog) => dialog.accept())
  await page.getByRole('button', { name: '清除本周计划', exact: true }).click()
  await page.getByRole('button', { name: '下周', exact: true }).click()
  await page.getByText('下周手机计划', { exact: true }).filter({ visible: true }).first().waitFor()
  await page.reload()
  await page.getByRole('button', { name: '下周', exact: true }).click()
  await page.getByText('下周手机计划', { exact: true }).filter({ visible: true }).first().waitFor()
  const tasks = await page.evaluate(() => JSON.parse(localStorage.getItem('shangan-library-data-v1')).tasks)
  assert.deepEqual(tasks.map((task) => [task.title, task.date]), [['下周手机计划', date]])
})

await check('mobile-library-edit-and-reload', '/resources', async (page) => {
  await page.getByRole('button', { name: '新建', exact: true }).click()
  await page.getByRole('dialog').getByLabel('名称').fill('手机资料目录')
  await page.getByRole('dialog').getByRole('button', { name: '文件夹', exact: true }).click()
  await page.getByRole('button', { name: '创建', exact: true }).click()
  await page.getByRole('heading', { name: '手机资料目录', exact: true }).waitFor()
  await page.getByRole('button', { name: '返回上一级', exact: true }).click()
  await page.getByRole('button', { name: '手机资料目录 更多操作', exact: true }).click()
  await page.getByRole('button', { name: '重命名与编辑', exact: true }).click()
  await page.getByRole('dialog').getByLabel('名称').fill('重命名后的资料目录')
  await page.getByRole('button', { name: '保存修改', exact: true }).click()
  await page.reload()
  await page.getByRole('button', { name: /重命名后的资料目录/ }).first().waitFor()
  await page.getByRole('button', { name: '目录', exact: true }).click()
  await page.getByRole('dialog').getByRole('button', { name: /重命名后的资料目录/ }).click()
  await page.getByRole('heading', { name: '重命名后的资料目录', exact: true }).waitFor()
  await page.getByPlaceholder('搜索知识库').fill('重命名后的资料目录')
  await page.getByRole('button', { name: /重命名后的资料目录 我的资料/ }).waitFor()
})

await check('mobile-timer-records-once', '/pomodoro', async (page) => {
  await page.clock.install({ time: new Date('2026-09-30T12:00:00Z') })
  await page.clock.pauseAt(new Date('2026-09-30T12:00:01Z'))
  await page.locator('summary').filter({ hasText: '计时设置' }).click()
  await page.getByRole('spinbutton', { name: '计时分钟数' }).fill('1')
  await page.getByRole('button', { name: '开始', exact: true }).click()
  await page.getByRole('button', { name: '全屏专注', exact: true }).click()
  await page.getByRole('button', { name: '退出全屏', exact: true }).waitFor()
  await page.clock.runFor(60000)
  await page.getByRole('button', { name: '关闭完成动效', exact: true }).waitFor()
  let sessions = await page.evaluate(() => JSON.parse(localStorage.getItem('shangan-library-data-v1')).pomodoroSessions)
  assert.equal(sessions.length, 1)
  assert.equal(sessions[0].minutes, 1)
  await page.clock.runFor(5000)
  await page.getByRole('button', { name: '退出全屏', exact: true }).click()
  await page.reload()
  sessions = await page.evaluate(() => JSON.parse(localStorage.getItem('shangan-library-data-v1')).pomodoroSessions)
  assert.equal(sessions.length, 1)
})

for (const viewport of [{ width: 320, height: 740 }, { width: 393, height: 852 }, { width: 800, height: 360 }, { width: 768, height: 1024 }, { width: 1440, height: 900 }]) {
  await check(`layout-${viewport.width}`, '/dashboard', async (page) => {
    for (const path of ['/dashboard', '/plan', '/resources', '/mistakes', '/pomodoro', '/settings', '/contact']) {
      await page.goto(`${baseUrl}${path}`)
      await page.locator('main').waitFor()
      if (path === '/resources') await page.getByRole('heading', { name: '我的资料', exact: true }).waitFor()
      const dimensions = await page.evaluate(() => ({ width: window.innerWidth, content: document.documentElement.scrollWidth }))
      assert.ok(dimensions.content <= dimensions.width + 1, `${path} 页面横向溢出: ${JSON.stringify(dimensions)}`)
      await page.screenshot({ path: `${output}/${viewport.width}-${path.slice(1)}.png` })
    }
  }, viewport)
}

await browser.close()
if (failures) process.exitCode = 1
