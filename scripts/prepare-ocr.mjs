import { mkdir, copyFile, readdir } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
const require = createRequire(import.meta.url)
const target = new URL('../public/ocr/', import.meta.url)
await mkdir(target, { recursive: true })
await copyFile(require.resolve('tesseract.js/dist/worker.min.js'), new URL('worker.min.js', target))
const core = dirname(require.resolve('tesseract.js-core/package.json'))
for (const file of await readdir(core)) {
  if (/^tesseract-core.*\.(wasm|js)$/.test(file)) await copyFile(join(core, file), new URL(file, target))
}
const data = dirname(require.resolve('@tesseract.js-data/por/package.json'))
await copyFile(join(data, '4.0.0_best_int', 'por.traineddata.gz'), new URL('por.traineddata.gz', target))
console.log('OCR local preparado: worker, WebAssembly e idioma português.')
