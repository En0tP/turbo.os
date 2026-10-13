import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { isUuid } from '@/lib/utils';

// Пользователь может только закрыть собственное обращение.
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const s = await createClient();
  const { data: { user } } = await s.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Сначала войдите в аккаунт.' }, { status: 401 });
  const { id } = await params;
  if (!isUuid(id)) return NextResponse.json({ error: 'Неверный ID.' }, { status: 400 });
  const { data: ticket } = await s.from('support_tickets').select('id,user_id').eq('id', id).maybeSingle();
  if (!ticket || ticket.user_id !== user.id) return NextResponse.json({ error: 'Обращение не найдено.' }, { status: 404 });
  const { error } = await createAdminClient().from('support_tickets').update({ status: 'closed', updated_at: new Date().toISOString() }).eq('id', id);
  if (error) return NextResponse.json({ error: 'Не удалось закрыть обращение.' }, { status: 500 });
  return NextResponse.json({ ok: true });
}
