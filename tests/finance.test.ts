import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parseMoney, validDate, currentMonth, editableDate, totals, duplicateCandidates } from '../src/lib/finance.ts'

test('converte reais em centavos sem arredondamento silencioso', () => {
  assert.equal(parseMoney('1.234,56'), 123456)
  assert.equal(parseMoney('0,01'), 1)
  assert.equal(parseMoney('12'), 1200)
  for (const value of ['1.234', '1,001', '-2', '0', 'NaN', '1e3', '1,2,3']) assert.throws(() => parseMoney(value))
})
test('valida calendário e usa mês brasileiro na virada UTC', () => {
  assert.equal(validDate('2024-02-29'), true)
  assert.equal(validDate('2026-02-29'), false)
  assert.equal(validDate('2026-04-31'), false)
  assert.equal(currentMonth(new Date('2026-11-01T01:00:00Z')), '2026-10')
  assert.equal(editableDate('2026-09-30', '2026-10'), false)
  assert.equal(editableDate('2026-11-01', '2026-10'), false)
})
const row = { id: 'a', amount_cents: 12345, date: '2026-10-08', description: 'Café Central', kind: 'expense' as const, category_id: 'c' }
test('saldo considera apenas o mês e soma inteiros', () => {
  assert.deepEqual(totals([row, { ...row, kind: 'income', amount_cents: 20000 }, { ...row, date: '2026-09-08' }], '2026-10'), { income: 20000, expense: 12345, balance: 7655 })
})
test('sinaliza mesmo valor/data/tipo sem bloquear e exclui o próprio registro', () => {
  assert.equal(duplicateCandidates({ ...row, id: 'b', description: 'Outro texto OCR' }, [row]).length, 1)
  assert.equal(duplicateCandidates(row, [row]).length, 0)
  assert.equal(duplicateCandidates({ ...row, id: 'b', kind: 'income' }, [row]).length, 0)
})
