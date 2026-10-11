-- Revisar e aplicar SOMENTE com autorização. Não altera tabelas legadas.
-- Falha se nomes novos já existirem, em vez de assumir compatibilidade.
begin;
create table public.rivfi_categories (
  id uuid primary key,
  user_id uuid not null default auth.uid() references auth.users(id),
  name text not null check (char_length(btrim(name)) between 1 and 60),
  keywords text[] not null default '{}' check (cardinality(keywords) <= 20),
  archived boolean not null default false,
  unique (id, user_id)
);
create unique index rivfi_category_name on public.rivfi_categories(user_id, lower(btrim(name)));
create table public.rivfi_transactions (
  id uuid primary key,
  user_id uuid not null default auth.uid() references auth.users(id),
  amount_cents bigint not null check (amount_cents between 1 and 99999999999),
  date date not null check (date between '1900-01-01' and '2100-12-31'),
  description text not null check (char_length(btrim(description)) between 1 and 200),
  kind text not null check (kind in ('income', 'expense')),
  category_id uuid not null,
  foreign key (category_id, user_id) references public.rivfi_categories(id, user_id)
);
create index rivfi_transactions_user_date on public.rivfi_transactions(user_id, date, id);
create function public.rivfi_current_month(d date) returns boolean
language sql stable set search_path = '' as $$
  select date_trunc('month', d::timestamp) = date_trunc('month', now() at time zone 'America/Sao_Paulo');
$$;
revoke all on function public.rivfi_current_month(date) from public;
grant execute on function public.rivfi_current_month(date) to authenticated;
alter table public.rivfi_categories enable row level security;
alter table public.rivfi_transactions enable row level security;
revoke all on public.rivfi_categories, public.rivfi_transactions from anon, authenticated;
grant select, insert, update on public.rivfi_categories to authenticated;
grant select, insert, update, delete on public.rivfi_transactions to authenticated;
create policy categories_select on public.rivfi_categories for select to authenticated using (user_id = (select auth.uid()));
create policy categories_insert on public.rivfi_categories for insert to authenticated with check (user_id = (select auth.uid()));
create policy categories_update on public.rivfi_categories for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy transactions_select on public.rivfi_transactions for select to authenticated using (user_id = (select auth.uid()));
create policy transactions_insert on public.rivfi_transactions for insert to authenticated with check (user_id = (select auth.uid()) and public.rivfi_current_month(date));
create policy transactions_update on public.rivfi_transactions for update to authenticated
  using (user_id = (select auth.uid()) and public.rivfi_current_month(date))
  with check (user_id = (select auth.uid()) and public.rivfi_current_month(date));
create policy transactions_delete on public.rivfi_transactions for delete to authenticated using (user_id = (select auth.uid()) and public.rivfi_current_month(date));

-- INVOKER: submetida às políticas do usuário. Erro desfaz o lote inteiro.
create function public.rivfi_restore(payload jsonb) returns jsonb
language plpgsql security invoker set search_path = '' as $$
declare
  c jsonb; t jsonb; old_c public.rivfi_categories; old_t public.rivfi_transactions;
  added integer := 0; skipped integer := 0;
begin
  if auth.uid() is null then raise exception 'Autenticação necessária'; end if;
  if payload->>'format' is distinct from 'rivfi' or payload->>'version' is distinct from '1'
     or jsonb_typeof(payload->'categories') is distinct from 'array'
     or jsonb_typeof(payload->'transactions') is distinct from 'array' then raise exception 'Backup inválido'; end if;
  if jsonb_array_length(payload->'categories') > 500 or jsonb_array_length(payload->'transactions') > 50000 then raise exception 'Backup muito grande'; end if;
  perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text, 0));
  for c in select value from jsonb_array_elements(payload->'categories') loop
    select * into old_c from public.rivfi_categories where id = (c->>'id')::uuid;
    if found then
      if old_c.name is distinct from c->>'name' then raise exception 'Conflito de categoria'; end if;
    else
      if jsonb_typeof(c->'keywords') is distinct from 'array' or jsonb_typeof(c->'archived') is distinct from 'boolean' then raise exception 'Categoria inválida'; end if;
      insert into public.rivfi_categories(id, name, keywords, archived)
      values ((c->>'id')::uuid, c->>'name', array(select jsonb_array_elements_text(c->'keywords')), (c->>'archived')::boolean);
    end if;
  end loop;
  for t in select value from jsonb_array_elements(payload->'transactions') loop
    if (t->>'amount_cents') !~ '^[0-9]+$' or (t->>'date') !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' then raise exception 'Valor ou data inválidos'; end if;
    select * into old_t from public.rivfi_transactions where id = (t->>'id')::uuid;
    if found then
      if old_t.amount_cents is distinct from (t->>'amount_cents')::bigint or old_t.date is distinct from (t->>'date')::date
        or old_t.description is distinct from t->>'description' or old_t.kind is distinct from t->>'kind'
        or old_t.category_id is distinct from (t->>'category_id')::uuid then raise exception 'ID existente com dados diferentes'; end if;
      skipped := skipped + 1;
    else
      insert into public.rivfi_transactions(id, amount_cents, date, description, kind, category_id)
      values ((t->>'id')::uuid, (t->>'amount_cents')::bigint, (t->>'date')::date, t->>'description', t->>'kind', (t->>'category_id')::uuid);
      added := added + 1;
    end if;
  end loop;
  return jsonb_build_object('added', added, 'skipped', skipped);
end;
$$;
revoke all on function public.rivfi_restore(jsonb) from public, anon;
grant execute on function public.rivfi_restore(jsonb) to authenticated;
-- Uma única instrução SELECT: categorias e lançamentos no mesmo snapshot MVCC.
-- jsonb_agg evita o limite de linhas do PostgREST sem paginação inconsistente.
create function public.rivfi_snapshot() returns jsonb
language sql stable security invoker set search_path = '' as $$
  select jsonb_build_object(
    'user_id', auth.uid(),
    'categories', coalesce((select jsonb_agg(jsonb_build_object('id',id,'name',name,'keywords',keywords,'archived',archived) order by id) from public.rivfi_categories where user_id = auth.uid()), '[]'::jsonb),
    'transactions', coalesce((select jsonb_agg(jsonb_build_object('id',id,'amount_cents',amount_cents,'date',date,'description',description,'kind',kind,'category_id',category_id) order by id) from public.rivfi_transactions where user_id = auth.uid()), '[]'::jsonb)
  );
$$;
revoke all on function public.rivfi_snapshot() from public, anon;
grant execute on function public.rivfi_snapshot() to authenticated;
commit;
