-- Tables and policies for /admin/games-editor.html

create table if not exists public.games_json_backups (
  id bigint generated always as identity primary key,
  commit_sha text,
  commit_message text,
  payload jsonb not null,
  created_by uuid,
  created_at timestamptz not null default now()
);

create table if not exists public.admin_audit_log (
  id bigint generated always as identity primary key,
  user_id uuid,
  role text,
  action text not null,
  metadata jsonb,
  created_at timestamptz not null default now()
);

create or replace function public.trim_games_backups_to_twenty()
returns void
language plpgsql
security definer
as $$
begin
  delete from public.games_json_backups
  where id in (
    select id from public.games_json_backups
    order by created_at desc
    offset 20
  );
end;
$$;
