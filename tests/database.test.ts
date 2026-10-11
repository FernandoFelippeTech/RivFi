import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { PGlite } from '@electric-sql/pglite'
test('migração real: RLS, mês corrente, FK composta e restauração atômica', async t => {
  const db = new PGlite()
  const u1 = '11111111-1111-4111-8111-111111111111', u2 = '22222222-2222-4222-8222-222222222222'
  const c1 = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', c2 = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc'
  const id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'
  await db.exec(`create role anon; create role authenticated; create schema auth;
    create table auth.users(id uuid primary key); insert into auth.users values ('${u1}'), ('${u2}');
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    grant usage on schema auth to authenticated, anon; grant execute on function auth.uid() to authenticated, anon;
    create table public.profiles(id uuid primary key);`)
  await db.exec(await readFile(new URL('../supabase/migrations/202610080001_personal_finance.sql', import.meta.url), 'utf8'))
  const asUser = async (id: string) => { await db.exec(`reset role; set role authenticated; set request.jwt.claim.sub = '${id}';`) }
  const date = (await db.query<{ date: string }>(`select to_char(now() at time zone 'America/Sao_Paulo','YYYY-MM-DD') as date`)).rows[0].date
  await t.test('usuário A não vê nem altera categoria de B', async () => {
    await asUser(u1); await db.exec(`insert into public.rivfi_categories(id,name) values('${c1}','Mercado');`)
    await asUser(u2)
    assert.equal((await db.query('select * from public.rivfi_categories')).rows.length, 0)
    assert.equal((await db.query(`update public.rivfi_categories set name='Invadido' where id='${c1}' returning id`)).rows.length, 0)
    await assert.rejects(db.exec(`insert into public.rivfi_categories(id,user_id,name) values('${c2}','${u1}','Invasão')`))
    await db.exec(`insert into public.rivfi_categories(id,name) values('${c2}','Trabalho');`)
  })
  await t.test('FK composta bloqueia categoria de outro usuário e RLS bloqueia insert passado', async () => {
    await asUser(u1)
    await assert.rejects(db.exec(`insert into public.rivfi_transactions values('${id}','${u1}',100,'${date}','Teste','expense','${c2}')`))
    await assert.rejects(db.exec(`insert into public.rivfi_transactions values('${id}','${u1}',100,(date_trunc('month',now() at time zone 'America/Sao_Paulo') - interval '1 day')::date,'Antigo','expense','${c1}')`))
    await db.exec(`insert into public.rivfi_transactions values('${id}','${u1}',100,'${date}','Teste','expense','${c1}')`)
    await asUser(u2)
    assert.equal((await db.query('select * from public.rivfi_transactions')).rows.length, 0)
    assert.equal((await db.query(`delete from public.rivfi_transactions where id='${id}' returning id`)).rows.length, 0)
  })
  await t.test('histórico é legível pelo dono mas não editável/excluível', async () => {
    await db.exec(`reset role; update public.rivfi_transactions set date='2020-01-01' where id='${id}';`)
    await asUser(u1)
    assert.equal((await db.query('select * from public.rivfi_transactions')).rows.length, 1)
    assert.equal((await db.query(`update public.rivfi_transactions set description='Mudou' where id='${id}' returning id`)).rows.length, 0)
    assert.equal((await db.query(`delete from public.rivfi_transactions where id='${id}' returning id`)).rows.length, 0)
  })
  await t.test('anônimo não acessa dados nem RPC', async () => {
    await db.exec('reset role; set role anon;')
    await assert.rejects(db.query('select * from public.rivfi_transactions'))
    await assert.rejects(db.query(`select public.rivfi_restore('{}')`))
  })
  const row = { id: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd', category_id: c1, amount_cents: 1999, date, description: 'Restaurado', kind: 'expense' }
  const rpc = (transactions: unknown[]) => db.query<{ result: { added: number; skipped: number } }>('select public.rivfi_restore($1::jsonb) as result', [JSON.stringify({ format: 'rivfi', version: 1, categories: [], transactions })])
  await t.test('falha no segundo registro desfaz o primeiro e repetição não duplica', async () => {
    await asUser(u1)
    await assert.rejects(rpc([row, { ...row, id: 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee', amount_cents: -1 }]))
    assert.equal((await db.query(`select * from public.rivfi_transactions where id='${row.id}'`)).rows.length, 0)
    assert.deepEqual((await rpc([row])).rows[0].result, { added: 1, skipped: 0 })
    assert.deepEqual((await rpc([row])).rows[0].result, { added: 0, skipped: 1 })
    await assert.rejects(rpc([{ ...row, description: 'Conflito' }]))
  })
  await t.test('tabela legada preservada', async () => {
    await db.exec('reset role;')
    assert.equal((await db.query(`select count(*) from public.profiles`)).rows.length, 1)
  })
  await t.test('snapshot não trunca em mil linhas e isola usuários', async () => {
    await asUser(u1)
    await db.exec(`insert into public.rivfi_transactions(id,amount_cents,date,description,kind,category_id) select gen_random_uuid(),100,'${date}','Teste de volume','expense','${c1}' from generate_series(1,1001)`)
    const a = await db.query<{ data: { user_id: string; categories: unknown[]; transactions: unknown[] } }>('select public.rivfi_snapshot() as data')
    assert.equal(a.rows[0].data.transactions.length, 1003)
    assert.equal(a.rows[0].data.user_id, u1)
    await asUser(u2)
    const b = await db.query<{ data: { transactions: unknown[] } }>('select public.rivfi_snapshot() as data')
    assert.equal(b.rows[0].data.transactions.length, 0)
  })
  await db.close()
})
