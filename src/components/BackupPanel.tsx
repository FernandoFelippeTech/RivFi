import { useState } from 'react'
import { exportBackup, planRestore, validateBackup } from '../lib/backup'
import type { Backup } from '../lib/backup'
import type { Category, Transaction } from '../lib/finance'
import { currentMonth, money, brazilDate } from '../lib/finance'
import { friendlyError } from '../lib/repository'
type Plan = ReturnType<typeof planRestore>
export default function BackupPanel({ load, restore, disabled }: {
  load: () => Promise<{ categories: Category[]; transactions: Transaction[] }>;
  restore: (b: Backup) => Promise<{ added: number; skipped: number }>; disabled: boolean
}) {
  const [plan, setPlan] = useState<Plan | null>(null)
  const [backup, setBackup] = useState<Backup | null>(null)
  const [busy, setBusy] = useState(false), [message, setMessage] = useState(''), [error, setError] = useState('')
  const [duplicates, setDuplicates] = useState('')
  async function download() {
    setBusy(true); setError(''); setMessage('')
    try {
      const data = await load()
      const url = URL.createObjectURL(new Blob([exportBackup(data.categories, data.transactions)], { type: 'application/json' }))
      const a = document.createElement('a'); a.href = url; a.download = `rivfi-backup-${currentMonth()}.json`; a.click()
      setTimeout(() => URL.revokeObjectURL(url), 1000)
      setMessage('Backup gerado a partir dos dados consultados no Supabase. Guarde o arquivo em local seguro.')
    } catch(e) { setError(friendlyError(e)) } finally { setBusy(false) }
  }
  async function select(file?: File) {
    setPlan(null); setBackup(null); setError(''); setMessage(''); setDuplicates('')
    if (!file) return
    setBusy(true)
    try {
      if (file.size > 25 * 1024 * 1024) throw new Error('O limite de backup é 25 MB.')
      let b: Backup
      try { b = validateBackup(JSON.parse(await file.text())) } catch(e) { throw new Error(e instanceof SyntaxError ? 'O arquivo não é um JSON válido.' : (e as Error).message, { cause: e }) }
      const data = await load()
      setBackup(b); setPlan(planRestore(b, data.categories, data.transactions, currentMonth()))
    } catch(e) { setError(e instanceof Error ? e.message : friendlyError(e)) } finally { setBusy(false) }
  }
  async function confirm() {
    if (!plan || !backup) return
    setBusy(true); setError(''); setMessage('')
    try {
      // Reconsulta antes de escrever; mudanças em outro dispositivo exigem nova revisão.
      const fresh = await load()
      const next = planRestore(backup, fresh.categories, fresh.transactions, currentMonth())
      if (JSON.stringify(next) !== JSON.stringify(plan)) { setPlan(next); setDuplicates(''); setError('Os dados mudaram. Revise o resumo atualizado antes de confirmar novamente.'); return }
      const ids = new Set(plan.similar.map(t => t.id))
      const selected = duplicates === 'skip' ? plan.transactions.filter(t => !ids.has(t.id)) : plan.transactions
      const result = await restore({ format: 'rivfi', version: 1, exported_at: backup.exported_at, categories: plan.categories, transactions: selected })
      setMessage(`Restauração confirmada: ${result.added} lançamento(s) adicionado(s). ${plan.existing + result.skipped} já existente(s). ${plan.blocked.length} fora do mês atual não foram importados.`)
      setPlan(null); setBackup(null)
    } catch(e) { setError(friendlyError(e)) } finally { setBusy(false) }
  }
  return <section className="panel"><span className="eyebrow">SEUS DADOS COM VOCÊ</span><h2>Backup e restauração</h2><p className="muted">O JSON inclui categorias e lançamentos, sem imagens ou credenciais. Contém informações financeiras: guarde-o com cuidado. A restauração adiciona registros e nunca substitui os existentes.</p>
    <div className="actions"><button disabled={busy || disabled} onClick={() => void download()}>Exportar backup completo</button><label className="file-button">Selecionar backup<input disabled={busy || disabled} type="file" accept=".json,application/json" onChange={e => { void select(e.target.files?.[0]); e.target.value = '' }} /></label></div>
    {busy && <p role="status">Consultando e validando no Supabase…</p>}
    {plan && <div className="notice"><h3>Revise antes de restaurar</h3><p>{plan.categories.length} categoria(s) nova(s); {plan.transactions.length} lançamento(s) novo(s); {plan.existing} já existente(s).</p>
      {!!plan.blocked.length && <p>{plan.blocked.length} lançamento(s) fora do mês atual serão ignorados. Meses passados permanecem somente para consulta.</p>}
      {!!plan.conflicts.length && <><p className="error">Restauração bloqueada por conflitos. Nenhum dado foi gravado.</p><ul>{plan.conflicts.map(c => <li key={c}>{c}</li>)}</ul></>}
      {!!plan.similar.length && <><p>{plan.similar.length} possível(is) duplicidade(s), com IDs diferentes:</p><ul>{plan.similar.map(t => <li key={t.id}>{brazilDate(t.date)} · {money(t.amount_cents)} · {t.description}</li>)}</ul><label>Como tratar esses lançamentos?<select value={duplicates} onChange={e => setDuplicates(e.target.value)}><option value="">Escolha após revisar</option><option value="skip">Ignorar os semelhantes</option><option value="keep">Importar: são movimentações distintas</option></select></label></>}
      <div className="actions"><button className="primary" disabled={busy || disabled || !!plan.conflicts.length || (!!plan.similar.length && !duplicates) || (!plan.categories.length && !plan.transactions.length)} onClick={() => void confirm()}>Confirmar restauração</button><button disabled={busy} onClick={() => setPlan(null)}>Cancelar</button></div>
    </div>}
    {error && <p className="error" role="alert">{error}</p>}{message && <p className="success" role="status">{message}</p>}
  </section>
}
