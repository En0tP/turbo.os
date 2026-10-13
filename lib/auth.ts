import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
export async function requireUser() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login?next=/account');
  return { supabase, user };
}
export async function isAdmin(userId: string) {
  const supabase = await createClient();
  const { data } = await supabase.from('user_roles').select('role').eq('user_id', userId).eq('role', 'admin').maybeSingle();
  return Boolean(data);
}
export async function requireAdmin() {
  const { user } = await requireUser();
  if (!(await isAdmin(user.id))) redirect('/account?error=admin');
  return user;
}
