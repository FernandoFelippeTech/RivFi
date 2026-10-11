import { test } from 'node:test'
import assert from 'node:assert/strict'
import { validateBackup, planRestore } from '../src/lib/backup.ts'
const cid = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
const tid = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'
const category = { id: cid, name: 'Mercado', keywords: ['mercado'], archived: false }
const row = { id: tid, category_id: cid, amount_cents: 1250, date: '2026-10-08', description: 'Teste', kind: 'expense' }
const backup = () => ({ format: 'rivfi', version: 1, exported_at: '2026-10-08T12:00:00Z', categories: [category], transactions: [row] })
test('valida versão, calendário, centavos, referências e IDs repetidos', () => {
  assert.equal(validateBackup(backup()).transactions.length, 1)
  for (const mutation of [
    { ...backup(), version: 2 },
    { ...backup(), transactions: [{ ...row, amount_cents: 1.2 }] },
    { ...backup(), transactions: [{ ...row, date: '2026-02-30' }] },
    { ...backup(), categories: [] },
    { ...backup(), transactions: [row, row] },
  ]) assert.throws(() => validateBackup(mutation))
})
test('restauração é idempotente por ID e não sobrescreve conflitos', () => {
  const b = validateBackup(backup())
  assert.equal(planRestore(b, b.categories, b.transactions, '2026-10').existing, 1)
  assert.equal(planRestore(b, b.categories, [{ ...b.transactions[0], description: 'Editado' }], '2026-10').conflicts.length, 1)
})
test('detecta candidatos semelhantes sem deduplicar gastos distintos automaticamente', () => {
  const b = validateBackup(backup())
  const p = planRestore(b, b.categories, [{ ...b.transactions[0], id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc' }], '2026-10')
  assert.equal(p.similar.length, 1)
  assert.equal(p.transactions.length, 1)
})
test('regra estrita não permite importar registros fora do mês atual', () => {
  const p = planRestore(validateBackup(backup()), [], [], '2026-11')
  assert.equal(p.blocked.length, 1)
  assert.equal(p.transactions.length, 0)
})
