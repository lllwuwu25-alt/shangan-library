import assert from 'node:assert/strict'
import { chromium } from 'playwright'

const base = process.env.MAP_TEST_URL || 'http://127.0.0.1:5179'
const browser = await chromium.launch({ headless: true, channel: 'chrome' })
try {
  for (const width of [1440, 393, 320]) {
    console.log(`CHECK map/sidebar ${width}`)
    const context = await browser.newContext({ viewport: { width, height: 900 }, hasTouch: width < 1024, isMobile: width < 1024, reducedMotion: 'reduce' })
    const page = await context.newPage()
    const errors = []
    page.on('pageerror', (error) => errors.push(error.message))
    const graphRequests = []
    page.on('request', (request) => { if (/MindMap\.tsx|@xyflow|dagre/.test(request.url())) graphRequests.push(request.url()) })
    await page.goto(`${base}/resources`)
    await page.getByRole('heading', { name: '我的资料', exact: true }).waitFor()
    assert.deepEqual(graphRequests, [], 'grid view must not load graph libraries')
    await page.evaluate(async () => {
      const { useKnowledgeStore } = await import('/src/features/knowledge-tree/store/knowledgeStore.ts')
      const { emptyKnowledgeData, KNOWLEDGE_ROOT_ID } = await import('/src/features/knowledge-tree/types/knowledge.ts')
      const data = emptyKnowledgeData(1)
      const { saveAttachmentBlob } = await import('/src/lib/fileStorage.ts')
      await saveAttachmentBlob('map-test-file', new Blob(['Map preview fixture'], { type: 'text/plain' }))
      data.files.push({ id: 'map-file', name: 'Map fixture.txt', storageKey: 'map-test-file', mimeType: 'text/plain', size: 19, createdAt: 1, updatedAt: 1 })
      data.nodes.push(
        { id: 'math', parentId: KNOWLEDGE_ROOT_ID, title: '数学', type: 'folder', order: 1, createdAt: 1, updatedAt: 1 },
        { id: 'limits', parentId: 'math', title: '函数极限与连续', type: 'document', metadata: { fileId: 'map-file' }, order: 1, createdAt: 1, updatedAt: 1 },
        { id: 'english', parentId: KNOWLEDGE_ROOT_ID, title: '英语阅读与写作', type: 'folder', order: 2, createdAt: 1, updatedAt: 1 },
      )
      await useKnowledgeStore.getState().replaceData(data)
    })
    await page.getByRole('button', { name: '导图视图', exact: true }).click()
    console.log(`CHECK graph loaded ${width}`)
    await page.locator('.knowledge-map-node').first().waitFor()
    assert.equal(await page.locator('.knowledge-map-node').count(), 4)
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)
    assert.equal(overflow, false, `horizontal overflow at ${width}`)
    const beforeHierarchy = await page.evaluate(async () => (await import('/src/features/knowledge-tree/store/knowledgeStore.ts')).useKnowledgeStore.getState().nodes.map(({ id, parentId, order }) => ({ id, parentId, order })))
    const math = page.locator('.knowledge-map-label').filter({ hasText: '数学' })
    await math.click()
    assert.equal(await page.getByRole('heading', { name: '我的资料', exact: true }).count(), 1)
    await page.locator('.knowledge-map-label').filter({ hasText: '函数极限与连续' }).click()
    await page.getByRole('dialog').waitFor()
    await page.getByRole('button', { name: '关闭预览', exact: true }).click()
    console.log(`CHECK preview ${width}`)
    assert.equal(await page.locator('.knowledge-map-node').count(), 4)
    await page.getByRole('button', { name: '收起 数学', exact: true }).click()
    await page.waitForFunction(() => document.querySelectorAll('.knowledge-map-node').length === 3)
    assert.equal(await page.locator('.knowledge-map-node').count(), 3)
    await page.getByRole('button', { name: '展开 数学', exact: true }).click()
    await page.waitForFunction(() => document.querySelectorAll('.knowledge-map-node').length === 4)
    assert.equal(await page.locator('.knowledge-map-node').count(), 4)
    await page.getByRole('button', { name: '放大导图', exact: true }).click()
    await page.getByRole('button', { name: '适应画布', exact: true }).click()
    const pane = page.locator('.react-flow__pane')
    const box = await pane.boundingBox()
    const transform = await page.locator('.react-flow__viewport').getAttribute('style')
    await page.mouse.move(box.x + box.width - 30, box.y + 100)
    await page.mouse.down()
    await page.mouse.move(box.x + box.width - 130, box.y + 180, { steps: 5 })
    await page.mouse.up()
    assert.notEqual(await page.locator('.react-flow__viewport').getAttribute('style'), transform)
    assert.deepEqual(await page.evaluate(async () => (await import('/src/features/knowledge-tree/store/knowledgeStore.ts')).useKnowledgeStore.getState().nodes.map(({ id, parentId, order }) => ({ id, parentId, order }))), beforeHierarchy)
    await page.getByRole('button', { name: '适应画布', exact: true }).click()
    if (width >= 1024) {
      const beforeWidth = (await page.locator('.knowledge-map').boundingBox()).width
      await page.getByRole('button', { name: '收起侧栏', exact: true }).click()
      assert.ok((await page.locator('.knowledge-map').boundingBox()).width > beforeWidth)
      assert.equal(await page.getByRole('navigation', { name: '桌面主导航' }).getByRole('button', { name: '资料库', exact: true }).getAttribute('title'), '资料库')
      await page.reload()
      await page.getByRole('button', { name: '展开侧栏', exact: true }).waitFor()
      await page.locator('.knowledge-map-node').first().waitFor()
      assert.equal(await page.getByRole('button', { name: '导图视图', exact: true }).getAttribute('aria-pressed'), 'true')
    } else {
      assert.equal(await page.getByRole('button', { name: '收起侧栏', exact: true }).isVisible(), false)
      assert.equal(await page.getByRole('navigation', { name: '主导航', exact: true }).isVisible(), true)
    }
    await page.screenshot({ path: `/tmp/shangan-map-${width}.png` })
    await page.evaluate(() => { document.documentElement.dataset.theme = 'dark' })
    await page.screenshot({ path: `/tmp/shangan-map-${width}-dark.png` })
    if (width < 1024) {
      const cdp = await context.newCDPSession(page)
      const viewport = page.locator('.react-flow__viewport')
      const beforeTouch = await viewport.getAttribute('style')
      const point = { x: box.x + box.width - 30, y: box.y + box.height - 100 }
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [point] })
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: point.x - 60, y: point.y - 60 }] })
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
      assert.notEqual(await viewport.getAttribute('style'), beforeTouch, 'touch must pan the map')
      await cdp.detach()
      await page.getByRole('button', { name: '适应画布', exact: true }).click()
    }
    await page.getByRole('button', { name: '打开子树 数学', exact: true }).click()
    await page.getByRole('heading', { name: '数学', exact: true }).waitFor()
    await page.waitForFunction(() => document.querySelectorAll('.knowledge-map-node').length === 2)
    assert.equal(await page.locator('.knowledge-map-node').count(), 2)
    await page.evaluate(async () => { await (await import('/src/features/knowledge-tree/store/knowledgeStore.ts')).useKnowledgeStore.getState().setVirtualView('favorite') })
    await page.getByRole('heading', { name: '我的收藏', exact: true }).waitFor()
    assert.equal(await page.locator('.knowledge-map').count(), 0)
    assert.equal(await page.getByRole('button', { name: '列表视图', exact: true }).getAttribute('aria-pressed'), 'true')
    assert.equal(await page.getByRole('button', { name: '导图视图', exact: true }).isDisabled(), true)
    assert.deepEqual(errors, [])
    console.log(`PASS map/sidebar ${width}`)
    await context.close()
  }
} finally {
  await browser.close()
}
