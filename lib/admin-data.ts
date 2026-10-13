import { createAdminClient } from '@/lib/supabase/admin';

/** По списку user_id возвращает { id: email }, чтобы в админке было видно почту, а не UUID. */
export async function emailsFor(ids: string[]): Promise<Record<string, string>> {
  const admin = createAdminClient();
  const out: Record<string, string> = {};
  await Promise.all(
    [...new Set(ids)].map(async (id) => {
      try {
        const { data } = await admin.auth.admin.getUserById(id);
        out[id] = data.user?.email || id;
      } catch {
        out[id] = id;
      }
    })
  );
  return out;
}
