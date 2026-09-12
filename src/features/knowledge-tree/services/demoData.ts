import { saveAttachmentBlob } from '../../../lib/fileStorage.ts'
import { KNOWLEDGE_ROOT_ID, KNOWLEDGE_SCHEMA_VERSION, type KnowledgeData, type KnowledgeNode, type ResourceFile } from '../types/knowledge.ts'

export type DemoKnowledgeBundle = {
  data: KnowledgeData
  fileBodies: Record<string, string>
}

const dataUrl = (mimeType: string, content: string) => `data:${mimeType};charset=utf-8,${encodeURIComponent(content)}`

function pdfDataUrl() {
  const stream = 'BT /F1 20 Tf 72 760 Td (Shangan Library Demo) Tj 0 -34 Td /F1 13 Tf (Calculus limits and continuity review) Tj 0 -24 Td (Use this virtual file to test the PDF preview.) Tj ET'
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`,
  ]
  let source = '%PDF-1.4\n'
  const offsets = [0]
  objects.forEach((object, index) => {
    offsets.push(source.length)
    source += `${index + 1} 0 obj\n${object}\nendobj\n`
  })
  const xref = source.length
  source += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`
  source += offsets.slice(1).map((offset) => `${String(offset).padStart(10, '0')} 00000 n \n`).join('')
  source += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`
  return `data:application/pdf;base64,${btoa(source)}`
}

const demoSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="800" viewBox="0 0 1200 800">
<rect width="1200" height="800" fill="#f8fafc"/><rect x="80" y="80" width="1040" height="640" rx="28" fill="#fff" stroke="#dbeafe" stroke-width="4"/>
<text x="130" y="175" font-family="Arial,sans-serif" font-size="52" font-weight="700" fill="#0f172a">Political review map</text>
<text x="130" y="240" font-family="Arial,sans-serif" font-size="28" fill="#64748b">Virtual image for preview testing</text>
<circle cx="245" cy="430" r="95" fill="#dbeafe"/><circle cx="600" cy="430" r="95" fill="#bfdbfe"/><circle cx="955" cy="430" r="95" fill="#93c5fd"/>
<path d="M340 430H505M695 430H860" stroke="#2563eb" stroke-width="12" stroke-linecap="round"/>
<text x="245" y="440" text-anchor="middle" font-family="Arial,sans-serif" font-size="26" fill="#1e3a8a">Concept</text><text x="600" y="440" text-anchor="middle" font-family="Arial,sans-serif" font-size="26" fill="#1e3a8a">Practice</text><text x="955" y="440" text-anchor="middle" font-family="Arial,sans-serif" font-size="26" fill="#1e3a8a">Review</text>
</svg>`

export function createDemoKnowledgeBundle(now = Date.now()): DemoKnowledgeBundle {
  const day = 24 * 60 * 60 * 1000
  const node = (value: Omit<KnowledgeNode, 'createdAt' | 'updatedAt'>): KnowledgeNode => ({ ...value, createdAt: now - 12 * day, updatedAt: now - day })
  const nodes: KnowledgeNode[] = [
    node({ id: KNOWLEDGE_ROOT_ID, parentId: null, title: '我的资料', type: 'root', order: 1000 }),
    node({ id: 'demo-math', parentId: KNOWLEDGE_ROOT_ID, title: '考研数学', type: 'subject', order: 1000 }),
    node({ id: 'demo-english', parentId: KNOWLEDGE_ROOT_ID, title: '考研英语', type: 'subject', order: 2000 }),
    node({ id: 'demo-politics', parentId: KNOWLEDGE_ROOT_ID, title: '政治', type: 'subject', order: 3000 }),
    node({ id: 'demo-major', parentId: KNOWLEDGE_ROOT_ID, title: '专业课', type: 'subject', order: 4000 }),
    node({ id: 'demo-calculus', parentId: 'demo-math', title: '高等数学', type: 'chapter', order: 1000 }),
    node({ id: 'demo-linear', parentId: 'demo-math', title: '线性代数', type: 'chapter', order: 2000 }),
    node({ id: 'demo-limits', parentId: 'demo-calculus', title: '极限与连续', type: 'topic', order: 1000, learningStatus: 'review', favorite: true, lastOpenedAt: now - 20 * 60 * 1000 }),
    node({ id: 'demo-limit-pdf-node', parentId: 'demo-limits', title: '极限公式速查（演示 PDF）.pdf', type: 'document', order: 1000, learningStatus: 'review', metadata: { fileId: 'demo-limit-pdf' } }),
    node({ id: 'demo-limit-note', parentId: 'demo-limits', title: '极限易错点复盘', type: 'note', order: 2000, learningStatus: 'learning', metadata: { noteContent: '1. 等价无穷小只能用于乘除结构。\n2. 遇到指数型极限，先取对数再整理。\n3. 做完题后回到定义检查左右极限。' } }),
    node({ id: 'demo-matrix-note', parentId: 'demo-linear', title: '矩阵秩的判断清单', type: 'note', order: 1000, learningStatus: 'mastered', metadata: { noteContent: '先看最高阶非零子式，再结合初等变换判断秩。' } }),
    node({ id: 'demo-reading', parentId: 'demo-english', title: '阅读理解', type: 'chapter', order: 1000 }),
    node({ id: 'demo-writing', parentId: 'demo-english', title: '作文素材', type: 'chapter', order: 2000 }),
    node({ id: 'demo-reading-csv-node', parentId: 'demo-reading', title: '真题精读记录（演示表格）.csv', type: 'document', order: 1000, learningStatus: 'learning', lastOpenedAt: now - day, metadata: { fileId: 'demo-reading-csv' } }),
    node({ id: 'demo-writing-text-node', parentId: 'demo-writing', title: '小作文开头模板（演示文本）.txt', type: 'document', order: 1000, learningStatus: 'completed', favorite: true, metadata: { fileId: 'demo-writing-text' } }),
    node({ id: 'demo-politics-map-node', parentId: 'demo-politics', title: '高频考点复习图（演示图片）.svg', type: 'image', order: 1000, learningStatus: 'review', metadata: { fileId: 'demo-politics-map' } }),
    node({ id: 'demo-major-note', parentId: 'demo-major', title: '专业课章节框架', type: 'note', order: 1000, learningStatus: 'unlearned', metadata: { noteContent: '这是可编辑的虚拟笔记。你可以重命名、移动、添加标签或删除它。' } }),
  ]
  const fileBodies: Record<string, string> = {
    'demo-limit-pdf': pdfDataUrl(),
    'demo-reading-csv': dataUrl('text/csv', '年份,题型,正确率,复盘状态\n2023,阅读 Text 1,80%,已复盘\n2024,阅读 Text 2,60%,待二刷\n2025,阅读 Text 3,90%,已掌握\n'),
    'demo-writing-text': dataUrl('text/plain', 'Dear Sir or Madam,\n\nI am writing to express my sincere appreciation and share several practical suggestions.\n\nYours sincerely,\nA candidate\n'),
    'demo-politics-map': dataUrl('image/svg+xml', demoSvg),
  }
  const file = (id: string, name: string, mimeType: string): ResourceFile => ({ id, name, mimeType, size: fileBodies[id].length, storageKey: id, createdAt: now - 12 * day, updatedAt: now - day })
  const files = [
    file('demo-limit-pdf', '极限公式速查（演示 PDF）.pdf', 'application/pdf'),
    file('demo-reading-csv', '真题精读记录（演示表格）.csv', 'text/csv'),
    file('demo-writing-text', '小作文开头模板（演示文本）.txt', 'text/plain'),
    file('demo-politics-map', '高频考点复习图（演示图片）.svg', 'image/svg+xml'),
  ]
  const tags = [
    { id: 'demo-tag-important', name: '重点', color: '#ef4444', createdAt: now },
    { id: 'demo-tag-formula', name: '公式', color: '#2563eb', createdAt: now },
    { id: 'demo-tag-second', name: '二刷', color: '#f59e0b', createdAt: now },
    { id: 'demo-tag-exam', name: '真题', color: '#10b981', createdAt: now },
  ]
  return {
    data: {
      schemaVersion: KNOWLEDGE_SCHEMA_VERSION,
      nodes,
      files,
      tags,
      nodeTags: [
        { nodeId: 'demo-limits', tagId: 'demo-tag-important' },
        { nodeId: 'demo-limit-pdf-node', tagId: 'demo-tag-formula' },
        { nodeId: 'demo-reading-csv-node', tagId: 'demo-tag-exam' },
        { nodeId: 'demo-reading-csv-node', tagId: 'demo-tag-second' },
        { nodeId: 'demo-politics-map-node', tagId: 'demo-tag-important' },
      ],
      relations: [{ id: 'demo-relation-limit-review', sourceNodeId: 'demo-limit-pdf-node', targetNodeId: 'demo-limit-note', type: 'note', createdAt: now }],
      selectedNodeId: KNOWLEDGE_ROOT_ID,
      expandedNodeIds: [KNOWLEDGE_ROOT_ID, 'demo-math', 'demo-english', 'demo-politics'],
      viewMode: 'grid',
      virtualView: 'tree',
      updatedAt: now,
    },
    fileBodies,
  }
}

export async function persistDemoFileBodies(bundle: DemoKnowledgeBundle) {
  for (const file of bundle.data.files) {
    const body = bundle.fileBodies[file.id]
    if (!body || !file.storageKey) continue
    const blob = await fetch(body).then((response) => response.blob())
    await saveAttachmentBlob(file.storageKey, blob)
  }
}
