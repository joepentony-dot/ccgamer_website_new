-- CCG: neutral public supporter recognition
-- Every verified public listing uses the same status. Existing tier values are
-- retained nowhere in the public presentation and are normalised here when the
-- supporter columns are available.

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'profiles'
      and column_name = 'supporter_tier'
  ) then
    update public.profiles
    set supporter_tier = 'supporter'
    where supporter_tier is distinct from 'supporter';

    alter table public.profiles
      alter column supporter_tier set default 'supporter';
  end if;
end
$$;
