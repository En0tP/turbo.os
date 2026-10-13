import { NextResponse } from 'next/server';
import { adminGuard, audit } from '@/lib/guard';
import { isUuid } from '@/lib/utils';

// Сменить статус обращения (закрыть / открыть заново).
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const g = await adminGuard(); if (!g.ok) return g.res;
  const { id } = await params;
  if (!isUuid(id)) return NextResponse.json({ error: 'Неверный ID.' }, { status: 400 });
  let b: any;
  try { b = await req.json(); } catch { return NextResponse.json({ error: 'Некорректные данные.' }, { status: 400 }); }
  if (!['open', 'waiting', 'closed'].includes(b.status)) return NextResponse.json({ error: 'Недопустимый статус.' }, { status: 400 });
  const { error } = await g.admin.from('support_tickets').update({ status: b.status, updated_at: new Date().toISOString() }).eq('id', id);
  if (error) return NextResponse.json({ error: 'Не удалось изменить статус.' }, { status: 500 });
  await audit(g.admin, g.user.id, 'ticket.status', 'ticket', id, { status: b.status });
  return NextResponse.json({ ok: true });
}

// Удалить обращение вместе с перепиской (сообщения удаляются каскадом).
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const g = await adminGuard(); if (!g.ok) return g.res;
  const { id } = await params;
  if (!isUuid(id)) return NextResponse.json({ error: 'Неверный ID.' }, { status: 400 });
  const { error } = await g.admin.from('support_tickets').delete().eq('id', id);
  if (error) return NextResponse.json({ error: 'Не удалось удалить обращение.' }, { status: 500 });
  await audit(g.admin, g.user.id, 'ticket.delete', 'ticket', id);
  return NextResponse.json({ ok: true });
}
