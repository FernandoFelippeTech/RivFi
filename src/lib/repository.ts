import { client } from './supabase'
import { sameTransaction, validateBackup } from './backup'
import type { Backup } from './backup'
import type { Category, Transaction } from './finance'
import { confirmWrite } from './confirmed-write'
const transactionFields = 'id,amount_cents,date,description,kind,category_id'
export function friendlyError(error: unknown): string {
  const e = error as { code?: string; message?: string }
  if (e.code === '23505') return 'Já existe um registro com esse identificador ou nome. Atualize os dados antes de tentar novamente.'
  if (e.code === '42501') return 'Operação não permitida. Confira a sessão e a regra do mês atual.'
  if (['42P01', 'PGRST205', 'PGRST202'].includes(e.code || '')) return 'Banco ainda não preparado. Revise e aplique a migração do RivFi no Supabase.'
  return 'Não foi possível confirmar a operação. Verifique a conexão e atualize os dados antes de tentar novamente.'
}
export async function loadFinance(userId: string) {
  const { data, error } = await client().rpc('rivfi_snapshot')
  if (error) throw error
  if (!data || data.user_id !== userId) throw new Error('Sessão mudou durante a consulta')
  const snapshot = validateBackup({ ...data, format: 'rivfi', version: 1, exported_at: new Date().toISOString() })
  return { categories: snapshot.categories, transactions: snapshot.transactions }
}
export async function saveTransaction(row: Transaction, userId: string, previous?: Transaction) {
  await confirmWrite(async () => {
  if (previous) {
    const { data, error } = await client().from('rivfi_transactions').update(row).eq('id', row.id).eq('user_id', userId)
      .eq('amount_cents', previous.amount_cents).eq('date', previous.date).eq('description', previous.description).eq('kind', previous.kind).eq('category_id', previous.category_id).select(transactionFields).single()
    if (error || !data) throw error || new Error('Registro alterado em outro dispositivo')
  } else {
    const { error } = await client().from('rivfi_transactions').insert({ ...row, user_id: userId }).select('id').single()
    if (error) throw error
  }
  }, async () => {
    const { data, error } = await client().from('rivfi_transactions').select(transactionFields).eq('user_id', userId).eq('id', row.id).single()
    return !error && !!data && sameTransaction(row, data as Transaction)
  })
}
export async function deleteTransaction(row: Transaction, userId: string) {
  const { data, error } = await client().from('rivfi_transactions').delete().eq('user_id', userId).eq('id', row.id)
    .eq('amount_cents', row.amount_cents).eq('date', row.date).eq('description', row.description).eq('kind', row.kind).eq('category_id', row.category_id).select('id').single()
  if (error || !data) throw error || new Error('Exclusão não confirmada')
}
export async function saveCategory(category: Category, userId: string, previous?: Category) {
  await confirmWrite(async () => {
  const arrayLiteral = previous ? '{' + previous.keywords.map(k => '"' + k.replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"').join(',') + '}' : '{}'
  const query = previous ? client().from('rivfi_categories').update(category).eq('user_id', userId).eq('id', category.id).eq('name', previous.name).eq('archived', previous.archived).eq('keywords', arrayLiteral) : client().from('rivfi_categories').insert({ ...category, user_id: userId })
  const { data, error } = await query.select('id').single()
  if (error || !data) throw error || new Error('Categoria não confirmada')
  }, async () => {
    const { data, error } = await client().from('rivfi_categories').select('id,name,keywords,archived').eq('user_id', userId).eq('id', category.id).single()
    return !error && !!data && data.name === category.name && data.archived === category.archived && JSON.stringify(data.keywords) === JSON.stringify(category.keywords)
  })
}
export async function restoreBackup(backup: Backup) {
  const { data, error } = await client().rpc('rivfi_restore', { payload: backup })
  if (error || !data) throw error || new Error('Restauração não confirmada')
  return data as { added: number; skipped: number }
}
