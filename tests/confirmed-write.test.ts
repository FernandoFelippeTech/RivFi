import { test } from 'node:test'
import assert from 'node:assert/strict'
import { confirmWrite } from '../src/lib/confirmed-write.ts'
test('resposta perdida é reconciliada somente se leitura confirma estado desejado', async () => {
  let persisted = 0
  await confirmWrite(async () => { persisted = 42; throw new Error('Timeout') }, async () => persisted === 42)
  assert.equal(persisted, 42)
})
test('conflito ou falha de leitura não vira sucesso', async () => {
  await assert.rejects(confirmWrite(async () => { throw new Error('Conflito') }, async () => false), /Conflito/)
  await assert.rejects(confirmWrite(async () => { throw new Error('Timeout') }, async () => { throw new Error('Offline') }), /Timeout/)
})
test('escrita confirmada não exige nova consulta', async () => {
  let reads = 0
  await confirmWrite(async () => {}, async () => { reads++; return false })
  assert.equal(reads, 0)
})
