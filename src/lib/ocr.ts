import { createWorker } from 'tesseract.js'
import type { Worker } from 'tesseract.js'
export async function recognizeReceipt(file: File, onProgress: (progress: number) => void, signal: AbortSignal): Promise<string> {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) throw new Error('Use uma imagem JPG, PNG ou WebP. Converta HEIC para JPG antes de selecionar.')
  if (file.size > 12 * 1024 * 1024) throw new Error('Escolha uma imagem de até 12 MB.')
  if (signal.aborted) throw new Error('Leitura cancelada.')
  let worker: Worker | undefined
  let cancel = () => {}
  const aborted = new Promise<never>((_, reject) => {
    cancel = () => { reject(new Error('Leitura cancelada.')); if (worker) void worker.terminate() }
    signal.addEventListener('abort', cancel, { once: true })
  })
  const work = async () => {
  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, 2200 / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bitmap.width * scale); canvas.height = Math.round(bitmap.height * scale)
  const ctx = canvas.getContext('2d')
  if (!ctx) { bitmap.close(); throw new Error('Este navegador não conseguiu preparar a imagem.') }
  ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, canvas.width, canvas.height); ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height); bitmap.close()
  const base = new URL(import.meta.env.BASE_URL + 'ocr/', location.origin).href
  if (signal.aborted) throw new Error('Leitura cancelada.')
  worker = await createWorker('por', 1, { workerPath: base + 'worker.min.js', corePath: base, langPath: base, workerBlobURL: false, logger: m => { if (!signal.aborted && m.status === 'recognizing text') onProgress(Math.round(m.progress * 100)) } })
  try {
    if (signal.aborted) throw new Error('Leitura cancelada.')
    const result = await worker.recognize(canvas)
    if (signal.aborted) throw new Error('Leitura cancelada.')
    return result.data.text
  } finally { await worker.terminate() }
  }
  try { return await Promise.race([work(), aborted]) }
  finally { signal.removeEventListener('abort', cancel) }
}
