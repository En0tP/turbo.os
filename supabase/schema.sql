-- TURBO OS Portal. Выполнять в Supabase SQL Editor один раз.
create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.user_roles (
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('admin','moderator')),
  created_at timestamptz not null default now(),
  primary key(user_id,role)
);
create table if not exists public.devices (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  codename text,
  category text not null default 'official' check(category in ('official','port')),
  active boolean not null default true,
  created_at timestamptz not null default now()
);
create table if not exists public.builds (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  edition text not null check(edition in ('FREE','PLUS')),
  device text not null,
  android_version text,
  description text not null default '',
  checksum text,
  instructions text,
  public_url text,
  storage_path text,
  published boolean not null default false,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint build_file_source check ((public_url is not null) or (storage_path is not null) or (published = false))
);
create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text not null,
  kind text not null default 'Новость',
  language text not null default 'ru' check(language in ('ru','en')),
  published boolean not null default false,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.plus_access_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  device text not null,
  reason text not null,
  status text not null default 'pending' check(status in ('pending','approved','rejected')),
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);
create table if not exists public.support_tickets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  subject text not null,
  category text not null default 'Другое',
  message text not null,
  device text,
  status text not null default 'open' check(status in ('open','waiting','closed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.support_messages (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.support_tickets(id) on delete cascade,
  author_id uuid not null references auth.users(id) on delete cascade,
  body text not null,
  is_admin_reply boolean not null default false,
  created_at timestamptz not null default now()
);
create table if not exists public.audit_log (
  id bigint generated always as identity primary key,
  actor_id uuid references auth.users(id) on delete set null,
  action text not null,
  target_type text,
  target_id text,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create or replace function public.is_admin(check_user uuid default auth.uid()) returns boolean
language sql stable security definer set search_path=public
as $$ select exists(select 1 from public.user_roles where user_id=check_user and role='admin'); $$;
revoke all on function public.is_admin(uuid) from public;
grant execute on function public.is_admin(uuid) to anon, authenticated;

create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path=public
as $$ begin insert into public.profiles(id,display_name) values(new.id,coalesce(new.raw_user_meta_data->>'name','')) on conflict(id) do nothing; return new; end; $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute procedure public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.user_roles enable row level security;
alter table public.devices enable row level security;
alter table public.builds enable row level security;
alter table public.posts enable row level security;
alter table public.plus_access_requests enable row level security;
alter table public.support_tickets enable row level security;
alter table public.support_messages enable row level security;
alter table public.audit_log enable row level security;

drop policy if exists "profile self read" on public.profiles;
create policy "profile self read" on public.profiles for select to authenticated using(id=auth.uid() or public.is_admin());
drop policy if exists "profile self update" on public.profiles;
create policy "profile self update" on public.profiles for update to authenticated using(id=auth.uid()) with check(id=auth.uid());
drop policy if exists "roles self read" on public.user_roles;
create policy "roles self read" on public.user_roles for select to authenticated using(user_id=auth.uid() or public.is_admin());
drop policy if exists "devices public read" on public.devices;
create policy "devices public read" on public.devices for select to anon,authenticated using(active or public.is_admin());
drop policy if exists "devices admin write" on public.devices;
create policy "devices admin write" on public.devices for all to authenticated using(public.is_admin()) with check(public.is_admin());
drop policy if exists "builds published read" on public.builds;
create policy "builds published read" on public.builds for select to anon,authenticated using(published or public.is_admin());
drop policy if exists "builds admin write" on public.builds;
create policy "builds admin write" on public.builds for all to authenticated using(public.is_admin()) with check(public.is_admin());
drop policy if exists "posts published read" on public.posts;
create policy "posts published read" on public.posts for select to anon,authenticated using(published or public.is_admin());
drop policy if exists "posts admin write" on public.posts;
create policy "posts admin write" on public.posts for all to authenticated using(public.is_admin()) with check(public.is_admin());
drop policy if exists "plus request self read" on public.plus_access_requests;
create policy "plus request self read" on public.plus_access_requests for select to authenticated using(user_id=auth.uid() or public.is_admin());
drop policy if exists "plus request self create" on public.plus_access_requests;
create policy "plus request self create" on public.plus_access_requests for insert to authenticated with check(user_id=auth.uid() and status='pending');
drop policy if exists "plus request admin update" on public.plus_access_requests;
create policy "plus request admin update" on public.plus_access_requests for update to authenticated using(public.is_admin()) with check(public.is_admin());
drop policy if exists "tickets self read" on public.support_tickets;
create policy "tickets self read" on public.support_tickets for select to authenticated using(user_id=auth.uid() or public.is_admin());
drop policy if exists "tickets self create" on public.support_tickets;
create policy "tickets self create" on public.support_tickets for insert to authenticated with check(user_id=auth.uid());
drop policy if exists "tickets admin update" on public.support_tickets;
create policy "tickets admin update" on public.support_tickets for update to authenticated using(public.is_admin()) with check(public.is_admin());
drop policy if exists "messages ticket participant read" on public.support_messages;
create policy "messages ticket participant read" on public.support_messages for select to authenticated using(public.is_admin() or exists(select 1 from public.support_tickets t where t.id=ticket_id and t.user_id=auth.uid()));
drop policy if exists "messages participant create" on public.support_messages;
create policy "messages participant create" on public.support_messages for insert to authenticated with check(author_id=auth.uid() and (public.is_admin() or exists(select 1 from public.support_tickets t where t.id=ticket_id and t.user_id=auth.uid()) and is_admin_reply=false));
drop policy if exists "audit admin read" on public.audit_log;
create policy "audit admin read" on public.audit_log for select to authenticated using(public.is_admin());
drop policy if exists "audit admin insert" on public.audit_log;
create policy "audit admin insert" on public.audit_log for insert to authenticated with check(public.is_admin());

-- Create these two buckets in Storage dashboard. Do not make plus-private public.
insert into storage.buckets(id,name,public) values('free-files','free-files',true) on conflict(id) do nothing;
insert into storage.buckets(id,name,public) values('plus-private','plus-private',false) on conflict(id) do nothing;
-- Storage access is deliberately not granted directly for PLUS. Server uses signed URLs only after checking access.
