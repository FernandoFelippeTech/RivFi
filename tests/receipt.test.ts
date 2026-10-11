import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parseReceipt, suggestCategory } from '../src/lib/receipt.ts'

test('extrai candidatos e não interpreta Pix como despesa', () => {
  const r = parseReceipt('PIX RECEBIDO\nDestinatário: MERCADO TESTE\n08/10/2026\nR$ 123,45\nSaldo R$ 999,00')
  assert.deepEqual(r.amounts, [12345, 99900])
  assert.deepEqual(r.dates, ['2026-10-08'])
  assert.equal(r.description, 'MERCADO TESTE')
  assert.equal('kind' in r, false)
})
test('campos ausentes ou inválidos ficam vazios', () => {
  const r = parseReceipt('PIX\n31/02/2026\nCPF 123.456.789-00')
  assert.deepEqual(r.amounts, [])
  assert.deepEqual(r.dates, [])
  assert.equal(r.description, '')
})
test('valores repetidos se tornam um candidato e datas ambíguas permanecem múltiplas', () => {
  const r = parseReceipt('TOTAL 1.234,56\nR$ 1.234,56\n01/10/2026\n02/10/2026')
  assert.deepEqual(r.amounts, [123456])
  assert.equal(r.dates.length, 2)
})
test('categoria exige palavra-chave explícita, não Pix', () => {
  const cats = [{ id: 'c', name: 'Alimentação', keywords: ['mercado'], archived: false }]
  assert.equal(suggestCategory('MERCADO TESTE', cats), 'c')
  assert.equal(suggestCategory('PIX recebido', cats), '')
})
