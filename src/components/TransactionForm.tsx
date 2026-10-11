import { useState } from 'react'
import { brazilDate, currentMonth, duplicateCandidates, money, moneyInput, parseMoney, today, validateTransaction } from '../lib/finance'
import type { Category, Kind, Transaction } from '../lib/finance'
import type { ReceiptReading } from '../lib/receipt'
import { suggestCategory } from '../lib/receipt'
import { friendlyError } from '../lib/repository'

export default function TransactionForm({ initial, reading, categories, rows, onSave, onClose }: {
  initial?: Transaction; reading?: ReceiptReading; categories: Category[]; rows: Transaction[];
  onSave: (row: Transaction, previous?: Transaction) => Promise<void>; onClose: () => void
}) {
  const [id] = useState(() => initial?.id || crypto.randomUUID())
  const [amount, setAmount] = useState(initial ? moneyInput(initial.amount_cents) : reading?.amounts.length === 1 ? moneyInput(reading.amounts[0]) : '')
  const [date, setDate] = useState(initial?.date || (reading ? reading.dates.length === 1 ? reading.dates[0] : '' : today()))
  const [description, setDescription] = useState(initial?.description || reading?.description || '')
  const [kind, setKind] = useState<Kind | ''>(initial?.kind || '')
  const [category, setCategory] = useState(initial?.category_id || (reading ? suggestCategory(reading.description, categories) : ''))
  const [error, setError] = useState(''), [busy, setBusy] = useState(false)
  const [pending, setPending] = useState<Transaction | null>(null)
  async function commit(row: Transaction) {
    setBusy(true); setError('')
    try { validateTransaction(row, categories); await onSave(row, initial); onClose() }
    catch (e) { setError(friendlyError(e)); setPending(null) }
    finally { setBusy(false) }
  }
  function submit(event: React.FormEvent) {
    event.preventDefault(); setError('')
    try {
      const row: Transaction = { id, amount_cents: parseMoney(amount), date, description: description.trim(), kind: kind as Kind, category_id: category }
      validateTransaction(row, categories)
      if (duplicateCandidates(row, rows).length) setPending(row)
      else void commit(row)
    } catch (e) { setError((e as Error).message) }
  }
  return <section className="panel editor" aria-labelledby="form-title">
    <div className="section-heading"><div><span className="eyebrow">{reading ? 'REVISÃO DO COMPROVANTE' : 'SEU CONTROLE'}</span><h2 id="form-title">{initial ? 'Editar lançamento' : 'Novo lançamento'}</h2></div><button onClick={onClose} disabled={busy}>Fechar</button></div>
    {reading && <div className="notice">A leitura pode errar. Confira todos os campos. Nada foi salvo e a imagem não será sincronizada.
      {reading.amounts.length > 1 && <div className="choices"><p>Há vários valores. Escolha o da movimentação ou digite abaixo:</p>{reading.amounts.map(n => <button key={n} onClick={() => setAmount(moneyInput(n))}>{money(n)}</button>)}</div>}
      {reading.dates.length > 1 && <div className="choices"><p>Escolha a data correta:</p>{reading.dates.map(d => <button key={d} onClick={() => setDate(d)}>{brazilDate(d)}</button>)}</div>}
      <details><summary>Ver texto reconhecido neste dispositivo</summary><pre>{reading.text}</pre></details>
    </div>}
    <form onSubmit={submit}>
      <fieldset disabled={busy || !!pending} className="form-grid">
        <label>Valor (R$)<input autoFocus inputMode="decimal" placeholder="0,00" value={amount} onChange={e => setAmount(e.target.value)} required /></label>
        <label>Data<input type="date" value={date} onChange={e => setDate(e.target.value)} required /></label>
        <label className="full">Descrição<input value={description} maxLength={200} onChange={e => setDescription(e.target.value)} placeholder="Ex.: compras da semana" required /></label>
        <label>Tipo<select value={kind} onChange={e => setKind(e.target.value as Kind)} required><option value="">Escolha o tipo</option><option value="expense">Despesa</option><option value="income">Receita</option></select></label>
        <label>Categoria<select value={category} onChange={e => setCategory(e.target.value)} required><option value="">Escolha a categoria</option>{categories.filter(c => !c.archived || c.id === initial?.category_id).map(c => <option key={c.id} value={c.id}>{c.name}{c.archived ? ' (arquivada)' : ''}</option>)}</select></label>
        <p className="muted full">Mês editável: {currentMonth().split('-').reverse().join('/')}. Pix pode ser entrada ou saída. Transferências entre suas contas não devem ser lançadas como receita ou despesa.</p>
        {!categories.some(c => !c.archived) && <p className="notice full">Cadastre uma categoria na aba Categorias antes de salvar.</p>}
        <button className="primary full" type="submit">{busy ? 'Confirmando no Supabase…' : 'Confirmar e salvar'}</button>
      </fieldset>
    </form>
    {pending && <div className="notice" role="alert"><strong>Possível duplicidade</strong><p>Já existe lançamento com o mesmo valor, data e tipo. Pode ser uma compra legítima igual.</p><div className="actions"><button disabled={busy} onClick={() => setPending(null)}>Voltar e conferir</button><button className="primary" disabled={busy} onClick={() => void commit(pending)}>Salvar mesmo assim</button></div></div>}
    {error && <p className="error" role="alert">{error}</p>}
  </section>
}
