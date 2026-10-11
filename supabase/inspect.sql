-- SOMENTE LEITURA: executar e revisar antes da migração.
select table_schema, table_name, column_name, data_type, is_nullable
from information_schema.columns where table_schema = 'public' order by table_name, ordinal_position;
select schemaname, tablename, policyname, roles, cmd, qual, with_check
from pg_policies where schemaname = 'public';
select n.nspname, c.relname, c.relrowsecurity from pg_class c
join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public' and c.relkind = 'r';
select event_object_table, trigger_name, action_statement
from information_schema.triggers where trigger_schema = 'public';
