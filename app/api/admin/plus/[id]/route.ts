import { NextResponse } from 'next/server';
import { adminGuard, audit } from '@/lib/guard';
import { isUuid } from '@/lib/utils';
import { notifyTelegram } from '@/lib/telegram';

// Одобрить / отклонить / отозвать (approved -> rejected) заявку PLUS.
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const g = await adminGuard(); if (!g.ok) return g.res;
  const { id } = await params;
  if (!isUuid(id)) return NextResponse.json({ error: 'Неверный ID.' }, { status: 400 });
  let b: any;
  try { b = await req.json(); } catch { return NextResponse.json({ error: 'Некорректные данные.' }, { status: 400 }); }
  if (!['approved', 'rejected'].includes(b.status)) return NextResponse.json({ error: 'Недопустимый статус.' }, { status: 400 });

  const { data, error } = await g.admin.from('plus_access_requests')
    .update({ status: b.status, reviewed_by: g.user.id, reviewed_at: new Date().toISOString() })
    .eq('id', id).select('user_id,device').single();
  if (error || !data) return NextResponse.json({ error: 'Не удалось обновить заявку.' }, { status: 500 });

  await audit(g.admin, g.user.id, `plus.${b.status}`, 'plus_request', id, { device: data.device });
  await notifyTelegram(`TURBO OS — заявка PLUS ${b.status === 'approved' ? 'одобрена' : 'отклонена / доступ отозван'}\nУстройство: ${data.device}\nID: ${id}`);
  return NextResponse.json({ ok: true });
}

// Удалить заявку из списка (если она была одобрена — доступ пропадёт).
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const g = await adminGuard(); if (!g.ok) return g.res;
  const { id } = await params;
  if (!isUuid(id)) return NextResponse.json({ error: 'Неверный ID.' }, { status: 400 });
  const { error } = await g.admin.from('plus_access_requests').delete().eq('id', id);
  if (error) return NextResponse.json({ error: 'Не удалось удалить заявку.' }, { status: 500 });
  await audit(g.admin, g.user.id, 'plus.delete', 'plus_request', id);
  return NextResponse.json({ ok: true });
}
