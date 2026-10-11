import { duplicateCandidates, editableDate, MAX_CENTS, normalize, validDate } from './finance.ts'
import type { Category, Transaction } from './finance.ts'
export type Backup = { format: 'rivfi'; version: 1; exported_at: string; categories: Category[]; transactions: Transaction[] }
const uuid = (x: unknown): x is string => typeof x === 'string' && /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(x)
const object = (x: unknown): Record<string, unknown> => {
  if (!x || typeof x !== 'object' || Array.isArray(x)) throw new Error('Backup contém um registro inválido.')
  return x as Record<string, unknown>
}
const string = (x: unknown, max: number) => typeof x === 'string' && x.trim().length > 0 && x.length <= max
export function validateBackup(input: unknown): Backup {
  const b = object(input)
  if (b.format !== 'rivfi' || b.version !== 1 || !Array.isArray(b.categories) || !Array.isArray(b.transactions) || typeof b.exported_at !== 'string' || !Number.isFinite(Date.parse(b.exported_at))) throw new Error('Formato ou versão de backup incompatível.')
  if (b.categories.length > 500 || b.transactions.length > 50000) throw new Error('Backup excede 500 categorias ou 50.000 lançamentos.')
  const ids = new Set<string>(), names = new Set<string>()
  const categories = b.categories.map(input => {
    const c = object(input)
    if (!uuid(c.id) || !string(c.name, 60) || typeof c.archived !== 'boolean' || !Array.isArray(c.keywords) || c.keywords.length > 20 || c.keywords.some(k => !string(k, 40))) throw new Error('Categoria inválida no backup.')
    const id = c.id.toLowerCase(), name = (c.name as string).trim()
    if (ids.has(id) || names.has(normalize(name))) throw new Error('Categoria repetida no backup.')
    ids.add(id); names.add(normalize(name))
    return { id, name, archived: c.archived, keywords: c.keywords as string[] }
  })
  const rowIds = new Set<string>()
  const transactions = b.transactions.map(input => {
    const t = object(input)
    if (!uuid(t.id) || !uuid(t.category_id) || !ids.has(t.category_id.toLowerCase()) || !Number.isSafeInteger(t.amount_cents) || Number(t.amount_cents) <= 0 || Number(t.amount_cents) > MAX_CENTS || typeof t.date !== 'string' || !validDate(t.date) || !string(t.description, 200) || !['income', 'expense'].includes(String(t.kind))) throw new Error('Lançamento inválido ou categoria ausente no backup.')
    const id = t.id.toLowerCase()
    if (rowIds.has(id)) throw new Error('ID de lançamento repetido no backup.')
    rowIds.add(id)
    return { id, category_id: t.category_id.toLowerCase(), amount_cents: t.amount_cents as number, date: t.date, description: (t.description as string).trim(), kind: t.kind as Transaction['kind'] }
  })
  return { format: 'rivfi', version: 1, exported_at: b.exported_at, categories, transactions }
}
export const sameTransaction = (a: Transaction, b: Transaction) => a.amount_cents === b.amount_cents && a.date === b.date && a.description === b.description && a.kind === b.kind && a.category_id === b.category_id
export function planRestore(backup: Backup, categories: Category[], rows: Transaction[], month: string) {
  const conflicts: string[] = [], blocked: Transaction[] = [], similar: Transaction[] = [], transactions: Transaction[] = []
  const mapping = new Map<string, string>()
  const newCategories: Category[] = []
  for (const c of backup.categories) {
    const sameId = categories.find(x => x.id === c.id)
    const sameName = categories.find(x => normalize(x.name) === normalize(c.name))
    if (sameId && normalize(sameId.name) !== normalize(c.name)) conflicts.push(`Categoria com ID existente e nome diferente: ${c.name}`)
    mapping.set(c.id, sameId?.id || sameName?.id || c.id)
    if (!sameId && !sameName) newCategories.push(c)
  }
  let existing = 0
  for (const original of backup.transactions) {
    const t = { ...original, category_id: mapping.get(original.category_id)! }
    const old = rows.find(r => r.id === t.id)
    if (old) {
      if (sameTransaction(t, old)) existing++
      else conflicts.push(`Lançamento ${t.id} já existe com dados diferentes.`)
    } else if (!editableDate(t.date, month)) blocked.push(t)
    else {
      if (duplicateCandidates(t, [...rows, ...transactions]).length) similar.push(t)
      transactions.push(t)
    }
  }
  return { categories: newCategories, transactions, existing, conflicts, blocked, similar }
}
export function exportBackup(categories: Category[], transactions: Transaction[]): string {
  return JSON.stringify(validateBackup({ format: 'rivfi', version: 1, exported_at: new Date().toISOString(), categories, transactions }), null, 2)
}
