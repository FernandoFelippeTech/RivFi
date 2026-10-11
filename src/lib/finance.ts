export type Kind = 'income' | 'expense'
export type Category = { id: string; name: string; keywords: string[]; archived: boolean }
export type Transaction = { id: string; amount_cents: number; date: string; description: string; kind: Kind; category_id: string }
export const MAX_CENTS = 99999999999
export const normalize = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim().replace(/\s+/g, ' ')
export function parseMoney(input: string): number {
  const text = input.trim().replace(/^R\$\s*/, '')
  if (!/^(?:\d+|\d{1,3}(?:\.\d{3})+)(?:,\d{1,2})?$/.test(text) || (text.includes('.') && !text.includes(','))) throw new Error('Use um valor como 123,45, com até duas casas decimais.')
  const [whole, fraction = ''] = text.replace(/\./g, '').split(',')
  const cents = Number(whole) * 100 + Number(fraction.padEnd(2, '0'))
  if (!Number.isSafeInteger(cents) || cents <= 0 || cents > MAX_CENTS) throw new Error('Informe um valor entre R$ 0,01 e R$ 999.999.999,99.')
  return cents
}
export const money = (cents: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100)
export const moneyInput = (cents: number) => (cents / 100).toFixed(2).replace('.', ',')
export function validDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || value < '1900-01-01' || value > '2100-12-31') return false
  const d = new Date(value + 'T12:00:00Z')
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value
}
export function today(now = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(now)
  return ['year', 'month', 'day'].map(key => parts.find(p => p.type === key)!.value).join('-')
}
export const currentMonth = (now = new Date()) => today(now).slice(0, 7)
export const editableDate = (date: string, month = currentMonth()) => validDate(date) && date.slice(0, 7) === month
export const brazilDate = (date: string) => date.split('-').reverse().join('/')
export const monthLabel = (month: string) => new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(month + '-15T12:00:00Z'))
export function moveMonth(month: string, step: number): string {
  const date = new Date(month + '-15T12:00:00Z')
  date.setUTCMonth(date.getUTCMonth() + step)
  return date.toISOString().slice(0, 7)
}
export function totals(rows: Transaction[], month: string) {
  let income = 0, expense = 0
  for (const row of rows.filter(r => r.date.startsWith(month))) {
    if (row.kind === 'income') income += row.amount_cents
    else expense += row.amount_cents
  }
  if (!Number.isSafeInteger(income) || !Number.isSafeInteger(expense)) throw new Error('Total excede o limite seguro de cálculo.')
  return { income, expense, balance: income - expense }
}
export function duplicateCandidates(row: Transaction, rows: Transaction[]): Transaction[] {
  return rows.filter(r => r.id !== row.id && r.amount_cents === row.amount_cents && r.date === row.date && r.kind === row.kind)
}
export function validateTransaction(row: Transaction, categories: Category[], month = currentMonth()): void {
  if (!Number.isSafeInteger(row.amount_cents) || row.amount_cents <= 0 || row.amount_cents > MAX_CENTS) throw new Error('Valor inválido.')
  if (!editableDate(row.date, month)) throw new Error('Somente lançamentos do mês atual podem ser alterados.')
  if (!['income', 'expense'].includes(row.kind)) throw new Error('Escolha receita ou despesa. Pix entre suas contas não é receita nem despesa.')
  if (!row.description.trim() || row.description.trim().length > 200) throw new Error('Descrição deve ter de 1 a 200 caracteres.')
  if (!categories.some(c => c.id === row.category_id)) throw new Error('Escolha uma categoria válida.')
}
