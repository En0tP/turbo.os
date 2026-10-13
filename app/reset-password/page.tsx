import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import ResetPasswordForm from '@/components/ResetPasswordForm';

export const dynamic = 'force-dynamic';

export default async function ResetPasswordPage() {
  const s = await createClient();
  const { data: { user } } = await s.auth.getUser();
  if (!user) redirect('/login?error=link');
  return (
    <main className="portal-wrap">
      <div className="portal-top">
        <Link href="/" className="portal-brand">TURBO OS<small>FIRMWARE PROJECT</small></Link>
        <Link className="portal-button" href="/account">Личный кабинет</Link>
      </div>
      <section className="portal-shell">
        <div className="portal-kicker">ВОССТАНОВЛЕНИЕ ДОСТУПА</div>
        <h1 className="portal-title">Новый <span style={{ color: '#ff6674' }}>пароль.</span></h1>
        <p className="portal-lead">Аккаунт: {user.email}. Придумай новый пароль — после сохранения ты сразу попадёшь в личный кабинет.</p>
        <ResetPasswordForm />
      </section>
    </main>
  );
}
