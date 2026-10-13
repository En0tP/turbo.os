import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { notifyTelegram } from '@/lib/telegram';
import { isUuid } from '@/lib/utils';

// Пользователь дописывает сообщение в своё обращение.
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const s = await createClient();
  const { data: { user } } = await s.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Сначала войдите в аккаунт.' }, { status: 401 });
  const { id } = await params;
  if (!isUuid(id)) return NextResponse.json({ error: 'Неверный ID.' }, { status: 400 });
  let b: any;
  try { b = await req.json(); } catch { return NextResponse.json({ error: 'Некорректные данные.' }, { status: 400 }); }
  const body = String(b.body || '').trim().slice(0, 5000);
  if (!body) return NextResponse.json({ error: 'Напиши сообщение.' }, { status: 400 });

  // RLS отдаст обращение только владельцу (или админу), но владельца проверяем явно.
  const { data: ticket } = await s.from('support_tickets').select('id,user_id,subject').eq('id', id).maybeSingle();
  if (!ticket || ticket.user_id !== user.id) return NextResponse.json({ error: 'Обращение не найдено.' }, { status: 404 });

  const { error } = await s.from('support_messages').insert({ ticket_id: id, author_id: user.id, body, is_admin_reply: false });
  if (error) return NextResponse.json({ error: 'Не удалось отправить сообщение.' }, { status: 500 });

  // Новое сообщение снова переводит обращение в «open» (в т.ч. закрытое). Прав на update у пользователя нет — используем service-клиент.
  await createAdminClient().from('support_tickets').update({ status: 'open', updated_at: new Date().toISOString() }).eq('id', id);
  await notifyTelegram(`TURBO OS — новый ответ в обращении\nПользователь: ${user.email || user.id}\nТема: ${ticket.subject}\nТекст: ${body}\nПанель: ${process.env.SITE_URL || new URL(req.url).origin}/admin/tickets/${id}`);
  return NextResponse.json({ ok: true });
}
