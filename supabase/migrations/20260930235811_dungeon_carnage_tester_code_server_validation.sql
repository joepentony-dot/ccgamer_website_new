create or replace function public.ccg_validate_dungeon_carnage_tester_code(p_code text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  candidate text := lower(btrim(coalesce(p_code, '')));
  expected text;
begin
  if char_length(candidate) < 4 or char_length(candidate) > 128 then
    return false;
  end if;

  select lower(btrim(v.decrypted_secret))
    into expected
    from vault.decrypted_secrets as v
   where v.name = 'dungeon_carnage_tester_code'
   limit 1;

  if expected is null or expected = '' then
    return false;
  end if;

  return extensions.digest(pg_catalog.convert_to(candidate, 'UTF8'), 'sha256')
       = extensions.digest(pg_catalog.convert_to(expected, 'UTF8'), 'sha256');
end;
$$;

revoke all on function public.ccg_validate_dungeon_carnage_tester_code(text) from public;
grant execute on function public.ccg_validate_dungeon_carnage_tester_code(text) to anon, authenticated;

comment on function public.ccg_validate_dungeon_carnage_tester_code(text) is
  'Validates the invited Dungeon Carnage tester code against the encrypted Supabase Vault secret. Returns only true/false and intentionally permits anon/authenticated execution for the public beta gate.';
