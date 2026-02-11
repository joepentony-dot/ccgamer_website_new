-- Omega: community commenting UX and report pipeline hardening.
-- Idempotent policy/table updates for public.comments + public.comment_reports.

create extension if not exists pgcrypto;

alter table if exists public.comments
  add column if not exists updated_at timestamptz not null default now(),
  add column if not exists deleted boolean not null default false;

create table if not exists public.comment_reports (
  id uuid primary key default gen_random_uuid(),
  comment_id uuid not null references public.comments(id) on delete cascade,
  reporter_user_id uuid not null references auth.users(id) on delete cascade,
  reason text,
  page_type text,
  page_id text,
  status text not null default 'open',
  created_at timestamptz not null default now()
);

alter table if exists public.comment_reports
  add column if not exists page_type text,
  add column if not exists page_id text,
  add column if not exists status text not null default 'open',
  add column if not exists created_at timestamptz not null default now();

create unique index if not exists idx_comment_reports_comment_reporter_unique
  on public.comment_reports (comment_id, reporter_user_id);

alter table if exists public.comments enable row level security;
alter table if exists public.comment_reports enable row level security;

drop policy if exists comments_owner_update on public.comments;
create policy comments_owner_update on public.comments
for update to authenticated
using (
  user_id = auth.uid()
  or exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role in ('admin','mod','editor')
  )
)
with check (
  user_id = auth.uid()
  or exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role in ('admin','mod','editor')
  )
);

drop policy if exists comments_owner_delete on public.comments;
create policy comments_owner_delete on public.comments
for delete to authenticated
using (
  user_id = auth.uid()
  or exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role in ('admin','mod','editor')
  )
);

drop policy if exists reports_insert_authenticated on public.comment_reports;
create policy reports_insert_authenticated on public.comment_reports
for insert to authenticated
with check (auth.uid() = reporter_user_id);

drop policy if exists reports_select_admin_mod on public.comment_reports;
create policy reports_select_admin_mod on public.comment_reports
for select to authenticated
using (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role in ('admin','mod','editor')
  )
);
