import { useCallback, useEffect, useRef, useState } from 'react'
import { ArrowDownLeft, ArrowUpRight, ChevronLeft, ChevronRight, Plus, ScanLine, Wallet, RefreshCw, LogOut, Pencil, Trash2 } from 'lucide-react'
import rivfiLogo from '../assets/rivfi-logo.png'
import { brazilDate, currentMonth, editableDate, money, monthLabel, moveMonth, totals } from '../lib/finance'
import type { Category, Transaction } from '../lib/finance'
import type { ReceiptReading } from '../lib/receipt'
import { client } from '../lib/supabase'
import * as repository from '../lib/repository'
import TransactionForm from '../components/TransactionForm'
import Categories from '../components/Categories'
import BackupPanel from '../components/BackupPanel'
import ReceiptPicker from '../components/ReceiptPicker'
import '../styles/Dashboard.css'

export type FinanceService = Pick<typeof repository, 'loadFinance' | 'saveTransaction' | 'deleteTransaction' | 'saveCategory' | 'restoreBackup'>
export default function Dashboard({ userId, service = repository }: { userId: string; service?: FinanceService }) {
  const [data, setData] = useState<{ categories: Category[]; transactions: Transaction[] }>({ categories: [], transactions: [] })
  const [ready, setReady] = useState(false), [loading, setLoading] = useState(true), [error, setError] = useState(''), [message, setMessage] = useState('')
  const [month, setMonth] = useState(currentMonth()), [tab, setTab] = useState('overview')
  const [form, setForm] = useState<{ initial?: Transaction; reading?: ReceiptReading } | null>(null)
  const [receipt, setReceipt] = useState(false), [busy, setBusy] = useState(false), [online, setOnline] = useState(navigator.onLine)
  const [clockMonth, setClockMonth] = useState(currentMonth())
  const sequence = useRef(0), mutating = useRef(false)
  const load = useCallback(async () => {
    const seq = ++sequence.current
    setLoading(true)
    try {
      const result = await service.loadFinance(userId)
      if (seq === sequence.current) { setData(result); setReady(true); setError('') }
      return result
    } catch(e) {
      if (seq === sequence.current) { setError(repository.friendlyError(e)); setReady(false) }
      throw e
    } finally { if (seq === sequence.current) setLoading(false) }
  }, [service, userId])
  useEffect(() => {
    const refresh = () => { setClockMonth(currentMonth()); if (!mutating.current) void load().catch(() => {}) }
    refresh()
    const interval = setInterval(refresh, 60000)
    const connection = () => { setOnline(navigator.onLine); if (navigator.onLine) refresh() }
    window.addEventListener('focus', refresh); window.addEventListener('online', connection); window.addEventListener('offline', connection)
    const invalidate = () => { sequence.current++ }
    return () => { invalidate(); clearInterval(interval); window.removeEventListener('focus', refresh); window.removeEventListener('online', connection); window.removeEventListener('offline', connection) }
  }, [load])
  async function mutate(action: () => Promise<void>, success: string) {
    if (mutating.current || !navigator.onLine) throw new Error('Operação indisponível')
    mutating.current = true; sequence.current++; setLoading(false); setBusy(true); setMessage(''); setError('')
    try { await action(); setMessage(success) } finally { mutating.current = false; setBusy(false) }
  }
  async function save(row: Transaction, previous?: Transaction) {
    if (!ready) throw new Error('Atualize os dados antes de salvar')
    await mutate(async () => {
      if (!editableDate(row.date) || (previous && !editableDate(previous.date))) throw new Error('Mês encerrado')
      await service.saveTransaction(row, userId, previous)
      setData(d => ({ ...d, transactions: [...d.transactions.filter(t => t.id !== row.id), row] }))
    }, 'Lançamento confirmado no Supabase.')
  }
  async function remove(row: Transaction) {
    if (!window.confirm(`Excluir “${row.description}”, de ${money(row.amount_cents)}? Esta ação não pode ser desfeita.`)) return
    try { await mutate(async () => {
      if (!editableDate(row.date)) throw new Error('Mês encerrado')
      await service.deleteTransaction(row, userId)
      setData(d => ({ ...d, transactions: d.transactions.filter(t => t.id !== row.id) }))
    }, 'Exclusão confirmada no Supabase.') } catch(e) { setError(repository.friendlyError(e)) }
  }
  async function logout() {
    setBusy(true)
    try { const { error: signOutError } = await client().auth.signOut(); if (signOutError) throw signOutError }
    catch(e) { setError(repository.friendlyError(e)) } finally { setBusy(false) }
  }
  const disabled = !ready || !online || busy || loading
  const rows = data.transactions.filter(t => t.date.startsWith(month)).sort((a, b) => b.date.localeCompare(a.date) || a.description.localeCompare(b.description))
  const summary = totals(data.transactions, month)
  const editable = month === clockMonth
  return <div className="app-shell">
    <aside className="sidebar"><div className="app-brand"><img src={rivfiLogo} alt="" /><span>Riv<span>Fi</span></span><button className="mobile-logout" onClick={() => void logout()} disabled={busy} aria-label="Sair da conta"><LogOut size={17} /></button></div><p className="sidebar-caption">CLAREZA PARA O SEU DINHEIRO</p>
      <nav aria-label="Navegação principal">{[['overview', 'Visão mensal'], ['categories', 'Categorias'], ['backup', 'Backup']].map(([key, label]) => <button key={key} aria-current={tab === key ? 'page' : undefined} onClick={() => { setTab(key); setForm(null); setReceipt(false) }} disabled={busy}>{label}</button>)}</nav>
      <div className="sidebar-bottom"><span className="private-dot" /> Uso pessoal · dados privados<p>Você no controle.<br />Um lançamento de cada vez.</p><button onClick={() => void logout()} disabled={busy}><LogOut size={16} /> Sair da conta</button></div>
    </aside>
    <main className="workspace"><header className="page-heading"><div><span className="eyebrow">FINANÇAS PESSOAIS</span><h1>{tab === 'overview' ? 'Seu mês, com clareza.' : tab === 'categories' ? 'Tudo no seu lugar.' : 'Seu histórico, protegido.'}</h1><p className="muted">Menos complicação. Mais consciência sobre o seu dinheiro.</p></div><span className="personal-badge"><Wallet size={15} /> Minha carteira</span></header>
      <div className="sync-bar" role="status"><span className={online && ready ? 'sync-dot' : 'sync-dot pending'} />{!online ? 'Sem conexão. Edição indisponível.' : busy ? 'Confirmando operação…' : loading ? 'Carregando do Supabase…' : ready ? 'Dados consultados no Supabase · atualização a cada minuto' : 'Sincronização indisponível'}<button aria-label="Atualizar dados" disabled={loading || busy || !online} onClick={() => { setMessage(''); void load().catch(() => {}) }}><RefreshCw size={16} /></button></div>
      {error && <p className="error banner" role="alert">{error} Os valores visíveis podem estar desatualizados.</p>}{message && <p className="success banner" role="status">{message}</p>}
      {tab === 'overview' && <>
        <div className="month-toolbar"><div className="month-picker"><button aria-label="Mês anterior" onClick={() => setMonth(moveMonth(month, -1))} disabled={month <= '1900-01'}><ChevronLeft size={18} /></button><label><span className="sr-only">Mês de consulta</span><input type="month" value={month} min="1900-01" max={clockMonth} onChange={e => { if (/^\d{4}-\d{2}$/.test(e.target.value) && e.target.value <= clockMonth) setMonth(e.target.value) }} /></label><button aria-label="Próximo mês" disabled={month >= clockMonth} onClick={() => setMonth(moveMonth(month, 1))}><ChevronRight size={18} /></button></div><div className="actions"><button disabled={disabled || !editable} onClick={() => { setForm(null); setReceipt(true) }}><ScanLine size={17} /> Ler comprovante</button><button className="primary" disabled={disabled || !editable} onClick={() => { setReceipt(false); setForm({}) }}><Plus size={17} /> Novo lançamento</button></div></div>
        {!editable && <p className="notice">{monthLabel(month)} está disponível somente para consulta. <button onClick={() => setMonth(currentMonth())}>Ir para o mês atual</button></p>}
        <div className="summary-grid"><article className="summary-card"><div><span>Receitas do mês</span><ArrowUpRight size={20} /></div><strong className="income">{ready ? money(summary.income) : '—'}</strong><small>Entradas registradas</small></article><article className="summary-card"><div><span>Despesas do mês</span><ArrowDownLeft size={20} /></div><strong>{ready ? money(summary.expense) : '—'}</strong><small>Saídas registradas</small></article><article className="summary-card balance"><div><span>Saldo dos lançamentos</span><Wallet size={20} /></div><strong>{ready ? money(summary.balance) : '—'}</strong><small>Receitas − despesas. Não é saldo bancário.</small></article></div>
        {receipt && <ReceiptPicker onRead={r => { setReceipt(false); setForm({ reading: r }) }} onManual={() => { setReceipt(false); setForm({}) }} onClose={() => setReceipt(false)} />}
        {form && <TransactionForm key={form.initial?.id || (form.reading ? 'receipt' : 'new')} {...form} categories={data.categories} rows={data.transactions} onSave={save} onClose={() => setForm(null)} />}
        <section className="panel history"><div className="section-heading"><div><span className="eyebrow">HISTÓRICO</span><h2>Movimentações de {monthLabel(month)}</h2></div><span className="count">{ready ? rows.length : '—'} registros</span></div>
          {ready && !rows.length && <div className="empty"><Wallet size={32} /><h3>Um novo mês para organizar.</h3><p>Seus lançamentos aparecerão aqui. Comece por uma receita ou despesa.</p></div>}
          {!ready && <p className="empty">{loading ? 'Buscando seus lançamentos…' : 'Atualize os dados para consultar o histórico.'}</p>}
          {ready && <ul className="transaction-list">{rows.map(t => <li key={t.id}><span className={`transaction-icon ${t.kind}`}>{t.kind === 'income' ? <ArrowUpRight size={18} /> : <ArrowDownLeft size={18} />}</span><div className="transaction-info"><strong>{t.description}</strong><span>{data.categories.find(c => c.id === t.category_id)?.name || 'Categoria indisponível'} · {brazilDate(t.date)}</span></div><strong className={`transaction-value ${t.kind}`}>{t.kind === 'income' ? '+' : '−'} {money(t.amount_cents)}</strong><div className="row-actions"><button aria-label={`Editar ${t.description}`} disabled={disabled || !editable} onClick={() => { setReceipt(false); setForm({ initial: t }) }}><Pencil size={16} /></button><button aria-label={`Excluir ${t.description}`} disabled={disabled || !editable} onClick={() => void remove(t)}><Trash2 size={16} /></button></div></li>)}</ul>}
        </section><p className="page-footnote">O saldo reflete apenas o que você registrou neste mês. Nenhuma conta bancária é consultada.</p>
      </>}
      {tab === 'categories' && <Categories categories={data.categories} disabled={disabled} onSave={async (c, exists) => { await mutate(async () => { await service.saveCategory(c, userId, exists); setData(d => ({ ...d, categories: [...d.categories.filter(x => x.id !== c.id), c] })) }, 'Categoria confirmada no Supabase.') }} />}
      {tab === 'backup' && <BackupPanel disabled={disabled} load={load} restore={async b => { let result = { added: 0, skipped: 0 }; await mutate(async () => { result = await service.restoreBackup(b) }, 'Restauração confirmada no Supabase.'); await load().catch(() => {}); return result }} />}
    </main>
  </div>
}
