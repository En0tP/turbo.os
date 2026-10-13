import { NextResponse } from 'next/server';
import { adminGuard, audit } from '@/lib/guard';
import { isUuid } from '@/lib/utils';

// Ответ администратора на жалобу / обращение.
// status: 'waiting' (ответили, ждём пользователя) или 'closed' (ответили и закрыли).
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const g = await adminGuard(); if (!g.ok) return g.res;
  const { id } = await params;
  if (!isUuid(id)) return NextResponse.json({ error: 'Неверный ID.' }, { status: 400 });
  let b: any;
  try { b = await req.json(); } catch { return NextResponse.json({ error: 'Некорректные данные.' }, { status: 400 }); }

  const body = String(b.body || '').trim().slice(0, 5000);
  if (!body) return NextResponse.json({ error: 'Напиши текст ответа.' }, { status: 400 });
  const status = b.status === 'closed' ? 'closed' : 'waiting';

  const { data: ticket } = await g.admin.from('support_tickets').select('id').eq('id', id).maybeSingle();
  if (!ticket) return NextResponse.json({ error: 'Обращение не найдено.' }, { status: 404 });

  const { error } = await g.admin.from('support_messages').insert({ ticket_id: id, author_id: g.user.id, body, is_admin_reply: true });
  if (error) return NextResponse.json({ error: 'Не удалось отправить ответ.' }, { status: 500 });
  await g.admin.from('support_tickets').update({ status, updated_at: new Date().toISOString() }).eq('id', id);
  await audit(g.admin, g.user.id, 'ticket.reply', 'ticket', id, { status });
  return NextResponse.json({ ok: true });
}
