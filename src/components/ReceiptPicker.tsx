import { useEffect, useRef, useState } from 'react'
import { parseReceipt } from '../lib/receipt'
import type { ReceiptReading } from '../lib/receipt'
export default function ReceiptPicker({ onRead, onManual, onClose }: { onRead: (r: ReceiptReading) => void; onManual: () => void; onClose: () => void }) {
  const [file, setFile] = useState<File | null>(null), [preview, setPreview] = useState('')
  const [progress, setProgress] = useState(0), [busy, setBusy] = useState(false), [error, setError] = useState('')
  const controller = useRef<AbortController | null>(null)
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview) }, [preview])
  useEffect(() => () => controller.current?.abort(), [])
  async function read() {
    if (!file) return
    const run = new AbortController(); controller.current = run
    setBusy(true); setProgress(0); setError('')
    const timeout = setTimeout(() => run.abort(), 120000)
    try {
      const { recognizeReceipt } = await import('../lib/ocr')
      const text = await recognizeReceipt(file, setProgress, run.signal)
      if (!text.trim()) throw new Error('Nenhum texto legível encontrado. Tente uma imagem mais nítida ou preencha manualmente.')
      onRead(parseReceipt(text))
    } catch(e) { setError(run.signal.aborted ? 'Leitura cancelada ou tempo limite atingido. Você pode tentar novamente ou lançar manualmente.' : e instanceof Error ? e.message : 'Não foi possível ler a imagem.') }
    finally { clearTimeout(timeout); setBusy(false) }
  }
  return <section className="panel"><div className="section-heading"><div><span className="eyebrow">LEITURA NO DISPOSITIVO</span><h2>Lançar por comprovante</h2></div><button onClick={onClose}>Fechar</button></div><p className="muted">Selecione uma foto ou print. A imagem fica neste dispositivo e não é enviada ao Supabase nem a serviços de reconhecimento. A precisão varia com a qualidade da imagem.</p>
    <label>Imagem JPG, PNG ou WebP, até 12 MB<input type="file" accept="image/jpeg,image/png,image/webp" disabled={busy} onChange={e => { setError(''); const selected = e.target.files?.[0]; if (!selected) return; if (selected.size > 12 * 1024 * 1024 || !['image/jpeg','image/png','image/webp'].includes(selected.type)) { setError('Use JPG, PNG ou WebP com até 12 MB.'); setFile(null); setPreview(''); return } setFile(selected); setPreview(URL.createObjectURL(selected)) }} /></label>
    {preview && <img className="receipt-preview" src={preview} alt="Prévia do comprovante selecionado" />}
    {busy && <div role="status"><p>{progress ? `Lendo texto: ${progress}%` : 'Preparando o leitor local…'}</p><progress value={progress || undefined} max={100} aria-label="Progresso da leitura" /></div>}
    <div className="actions"><button className="primary" disabled={!file || busy} onClick={() => void read()}>Ler e revisar</button>{busy && <button onClick={() => controller.current?.abort()}>Cancelar leitura</button>}<button disabled={busy} onClick={onManual}>Preencher manualmente</button></div>
    {error && <p className="error" role="alert">{error}</p>}
  </section>
}
