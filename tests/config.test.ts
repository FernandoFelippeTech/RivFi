import { test } from 'node:test'
import assert from 'node:assert/strict'
import { configurationIssue } from '../src/lib/config.ts'
const jwt = (role: string) => 'header.' + btoa(JSON.stringify({ role })) + '.signature'
test('aceita somente URL de projeto e chave pública; rejeita credencial privilegiada', () => {
  assert.equal(configurationIssue('https://example.supabase.co', 'sb_publishable_test'), '')
  assert.equal(configurationIssue('https://example.supabase.co', jwt('anon')), '')
  assert.notEqual(configurationIssue('https://example.supabase.co', jwt('service_role')), '')
  assert.notEqual(configurationIssue('https://example.supabase.co', 'sb_secret_fake'), '')
  assert.notEqual(configurationIssue('http://example.supabase.co', 'sb_publishable_test'), '')
  assert.notEqual(configurationIssue('https://example.supabase.co.attacker.test', 'sb_publishable_test'), '')
  assert.notEqual(configurationIssue('', ''), '')
})
