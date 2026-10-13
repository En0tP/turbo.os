import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { isAdmin } from '@/lib/auth';

/** Проверка «это администратор» для API-маршрутов. Возвращает либо ошибку-ответ, либо user + service-клиент. */
export async function adminGuard() {
  const s = await createClient();
  const { data: { user } } = await s.auth.getUser();
  if (!user) return { ok: false as const, res: NextResponse.json({ error: 'Требуется вход.' }, { status: 401 }) };
  if (!(await isAdmin(user.id))) return { ok: false as const, res: NextResponse.json({ error: 'Недостаточно прав.' }, { status: 403 }) };
  return { ok: true as const, user, admin: createAdminClient() };
}

/** Запись в журнал действий администратора (ошибки журнала не должны ломать основное действие). */
export async function audit(
  admin: ReturnType<typeof createAdminClient>,
  actor: string,
  action: string,
  targetType: string,
  targetId: string,
  details: Record<string, unknown> = {}
) {
  try {
    await admin.from('audit_log').insert({ actor_id: actor, action, target_type: targetType, target_id: targetId, details });
  } catch {
    /* ignore */
  }
}
