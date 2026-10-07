import { cp, mkdir } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { dirname, resolve } from 'node:path'

const require = createRequire(import.meta.url)
const source = dirname(require.resolve('pdfjs-dist/package.json'))
const { version } = require('pdfjs-dist/package.json')
const target = resolve('public/pdfjs', version)
await mkdir(target, { recursive: true })
for (const folder of ['cmaps', 'standard_fonts', 'wasm']) {
  await cp(resolve(source, folder), resolve(target, folder), { recursive: true })
}
