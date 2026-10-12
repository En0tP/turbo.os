-- TURBO OS production schema for Supabase PostgreSQL
create extension if not exists pgcrypto;
create type public.app_role as enum ('admin','user');
create type public.edition_type as enum ('FREE','PLUS');
create type public.request_status as enum ('pending','approved','denied');
create type public.ticket_status as enum ('open','in_progress','resolved');
create table public.profiles (id uuid primary key references auth.users(id) on delete cascade, display_name text, created_at timestamptz not null default now());
create table public.user_roles (user_id uuid references auth.users(id) on delete cascade, role public.app_role not null default 'user', primary key(user_id,role));
create table public.devices (id uuid primary key default gen_random_uuid(), name text not null, category text not null check(category in ('official','port')), active boolean not null default true, created_at timestamptz not null default now());
create table public.builds (id uuid primary key default gen_random_uuid(), title text not null, edition public.edition_type not null, device_id uuid references public.devices(id), device_name text not null, android_base text, description text not null, instructions text, storage_path text, external_url text, sha256 text, published boolean not null default false, created_by uuid references auth.users(id), created_at timestamptz not null default now());
create table public.posts (id uuid primary key default gen_random_uuid(), title_ru text not null, title_en text, body_ru text not null, body_en text, post_type text not null default 'news', published boolean not null default false, created_by uuid references auth.users(id), created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create table public.plus_access_requests (id uuid primary key default gen_random_uuid(), user_id uuid references auth.users(id) on delete cascade, display_name text not null, device_name text not null, reason text not null, status public.request_status not null default 'pending', reviewed_by uuid references auth.users(id), reviewed_at timestamptz, created_at timestamptz not null default now());
create table public.support_tickets (id uuid primary key default gen_random_uuid(), user_id uuid references auth.users(id) on delete set null, display_name text not null, category text not null, device_name text, subject text not null, status public.ticket_status not null default 'open', created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create table public.support_messages (id uuid primary key default gen_random_uuid(), ticket_id uuid not null references public.support_tickets(id) on delete cascade, sender_id uuid references auth.users(id) on delete set null, sender_kind text not null check(sender_kind in ('user','admin')), body text not null, created_at timestamptz not null default now());
create table public.audit_log (id bigint generated always as identity primary key, actor_id uuid references auth.users(id), action text not null, target_type text, target_id text, details jsonb not null default '{}'::jsonb, created_at timestamptz not null default now());
create or replace function public.is_admin() returns boolean language sql stable security definer set search_path=public as $$ select exists(select 1 from public.user_roles where user_id=auth.uid() and role='admin'); $$;
alter table public.profiles enable row level security; alter table public.user_roles enable row level security; alter table public.devices enable row level security; alter table public.builds enable row level security; alter table public.posts enable row level security; alter table public.plus_access_requests enable row level security; alter table public.support_tickets enable row level security; alter table public.support_messages enable row level security; alter table public.audit_log enable row level security;
create policy "profile self or admin read" on public.profiles for select using(id=auth.uid() or public.is_admin());
create policy "profile self update" on public.profiles for update using(id=auth.uid()) with check(id=auth.uid());
create policy "roles self read" on public.user_roles for select using(user_id=auth.uid() or public.is_admin());
create policy "published devices public read" on public.devices for select using(active or public.is_admin());
create policy "published builds public read" on public.builds for select using((published and edition='FREE') or public.is_admin() or (edition='PLUS' and exists(select 1 from public.plus_access_requests r where r.user_id=auth.uid() and r.status='approved')));
create policy "published posts public read" on public.posts for select using(published or public.is_admin());
create policy "user creates own plus request" on public.plus_access_requests for insert with check(user_id=auth.uid());
create policy "user reads own plus request" on public.plus_access_requests for select using(user_id=auth.uid() or public.is_admin());
create policy "admin updates plus request" on public.plus_access_requests for update using(public.is_admin()) with check(public.is_admin());
create policy "user creates ticket" on public.support_tickets for insert with check(user_id=auth.uid());
create policy "user reads own ticket" on public.support_tickets for select using(user_id=auth.uid() or public.is_admin());
create policy "ticket messages visible to owner/admin" on public.support_messages for select using(public.is_admin() or exists(select 1 from public.support_tickets t where t.id=ticket_id and t.user_id=auth.uid()));
create policy "owner or admin sends ticket messages" on public.support_messages for insert with check(public.is_admin() or (sender_id=auth.uid() and sender_kind='user' and exists(select 1 from public.support_tickets t where t.id=ticket_id and t.user_id=auth.uid())));
create policy "admin audit read" on public.audit_log for select using(public.is_admin());
create policy "admin manages devices" on public.devices for all using(public.is_admin()) with check(public.is_admin());
create policy "admin manages builds" on public.builds for all using(public.is_admin()) with check(public.is_admin());
create policy "admin manages posts" on public.posts for all using(public.is_admin()) with check(public.is_admin());
create policy "admin manages tickets" on public.support_tickets for update using(public.is_admin()) with check(public.is_admin());
-- IMPORTANT: PLUS files belong in a PRIVATE Storage bucket. Do not put their public URLs in builds.external_url.
-- Grant the first admin manually from trusted SQL after creating their auth.users account:
-- insert into public.user_roles(user_id,role) values ('AUTH-USER-UUID','admin');
