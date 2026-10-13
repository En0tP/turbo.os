-- TURBO OS Portal v2. Выполнить один раз в Supabase SQL Editor (безопасно запускать повторно).
-- Индексы для быстрой работы переписки поддержки и списков в админке.
create index if not exists support_messages_ticket_idx on public.support_messages(ticket_id, created_at);
create index if not exists support_tickets_user_idx on public.support_tickets(user_id, created_at desc);
create index if not exists support_tickets_updated_idx on public.support_tickets(updated_at desc);
create index if not exists plus_requests_user_status_idx on public.plus_access_requests(user_id, status);
