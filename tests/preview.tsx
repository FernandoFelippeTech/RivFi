import { createRoot } from 'react-dom/client'
import Dashboard from '../src/pages/Dashboard'
import type { FinanceService } from '../src/pages/Dashboard'
import { today } from '../src/lib/finance'
import type { Category, Transaction } from '../src/lib/finance'
import '../src/index.css'
const categories: Category[] = [{ id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', name: 'Alimentação', keywords: ['mercado'], archived: false }, { id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc', name: 'Trabalho', keywords: [], archived: false }]
let transactions: Transaction[] = [
  { id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', amount_cents: 12050, date: today(), description: 'Mercado de exemplo', kind: 'expense', category_id: categories[0].id },
  { id: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd', amount_cents: 480000, date: today(), description: 'Receita de exemplo', kind: 'income', category_id: categories[1].id },
]
const fail = new URLSearchParams(location.search).has('fail')
const service: FinanceService = {
  loadFinance: async () => ({ categories: [...categories], transactions: [...transactions] }),
  saveTransaction: async row => { if (fail) throw new Error('Falha simulada'); transactions = [...transactions.filter(t => t.id !== row.id), row] },
  deleteTransaction: async row => { transactions = transactions.filter(t => t.id !== row.id) },
  saveCategory: async c => { const i = categories.findIndex(x => x.id === c.id); if (i < 0) categories.push(c); else categories[i] = c },
  restoreBackup: async b => { if (fail) throw new Error('Falha simulada'); const next = b.transactions.filter(t => !transactions.some(x => x.id === t.id)); transactions.push(...next); categories.push(...b.categories); return { added: next.length, skipped: b.transactions.length - next.length } },
}
createRoot(document.getElementById('root')!).render(<><p style={{ margin: 0, padding: 8, background: '#6a4b1b', textAlign: 'center' }}>TESTE LOCAL · dados fictícios em memória · sem conexão ao Supabase</p><Dashboard userId="teste" service={service} /></>)
