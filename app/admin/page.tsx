import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { isAdmin } from '@/lib/auth';
import { emailsFor } from '@/lib/admin-data';
import { TICKET_LABEL_ADMIN } from '@/lib/utils';
import AdminRequestActions from '@/components/AdminRequestActions';
import AdminCreateForms from '@/components/AdminCreateForms';
import AdminItemActions from '@/components/AdminItemActions';

export const dynamic = 'force-dynamic';

export default async function AdminPage() {
  const s = await createClient();
  const { data: { user } } = await s.auth.getUser();
  if (!user) redirect('/login?next=/admin');
  if (!(await isAdmin(user.id))) redirect('/account?error=admin');

  const [{ data: requests }, { data: builds }, { data: posts }, { data: tickets }] = await Promise.all([
    s.from('plus_access_requests').select('id,user_id,device,reason,status,created_at').order('created_at', { ascending: false }).limit(100),
    s.from('builds').select('id,title,edition,device,description,published,created_at').order('created_at', { ascending: false }).limit(100),
    s.from('posts').select('id,title,body,kind,published,created_at').order('created_at', { ascending: false }).limit(100),
    s.from('support_tickets').select('id,user_id,subject,category,status,created_at,updated_at').order('updated_at', { ascending: false }).limit(100)
  ]);

  const emails = await emailsFor([...(requests || []).map((r) => r.user_id), ...(tickets || []).map((t) => t.user_id)]);
  const openTickets = (tickets || []).filter((t) => t.status === 'open').length;

  return (
    <main className="portal-wrap">
      <div className="portal-top">
        <Link href="/" className="portal-brand">TURBO OS<small>FIRMWARE PROJECT</small></Link>
        <div className="portal-actions">
          <span className="portal-status">Администратор</span>
          <Link className="portal-button" href="/account">Личный кабинет</Link>
        </div>
      </div>
      <section className="portal-shell">
        <div className="portal-kicker">ЗАКРЫТАЯ ПАНЕЛЬ</div>
        <h1 className="portal-title">Управление <span style={{ color: '#ff6674' }}>TURBO OS.</span></h1>
        <p className="portal-lead">Этот маршрут и данные доступны только пользователям с ролью администратора, проверенной на сервере.</p>

        <div className="portal-grid">
          <div className="portal-row"><b>{builds?.length || 0}</b><p>Сборок в базе</p></div>
          <div className="portal-row"><b>{requests?.filter((r) => r.status === 'pending').length || 0}</b><p>Заявок PLUS ожидают решения</p></div>
          <div className="portal-row"><b>{openTickets}</b><p>Обращений ждут ответа</p></div>
          <div className="portal-row"><b>{posts?.length || 0}</b><p>Публикаций</p></div>
        </div>

        <h2 style={{ marginTop: 30 }}>Поддержка и жалобы</h2>
        <div className="portal-list">
          {(tickets || []).length ? (tickets || []).map((t) => (
            <Link key={t.id} href={`/admin/tickets/${t.id}`} className="portal-row portal-link-row">
              <span className={`portal-status st-${t.status}`}>{TICKET_LABEL_ADMIN[t.status] || t.status}</span>
              <b style={{ display: 'block', marginTop: 6 }}>{t.subject}</b>
              <p>{t.category} · {emails[t.user_id] || t.user_id}</p>
              <p>{new Date(t.updated_at || t.created_at).toLocaleString('ru-RU')}</p>
            </Link>
          )) : <div className="portal-row"><p>Обращений пока нет.</p></div>}
        </div>

        <h2 style={{ marginTop: 30 }}>Добавить сборку или публикацию</h2>
        <AdminCreateForms />

        <h2 style={{ marginTop: 30 }}>Заявки PLUS</h2>
        <div className="portal-list">
          {(requests || []).length ? (requests || []).map((r) => (
            <article className="portal-row" key={r.id}>
              <b>{r.device}</b>
              <p>{r.reason}</p>
              <p>Пользователь: {emails[r.user_id] || r.user_id}</p>
              <p>Статус: <span className={`portal-status st-${r.status}`}>{r.status === 'approved' ? 'Одобрено' : r.status === 'rejected' ? 'Отклонено' : 'Ожидает'}</span></p>
              <p>{new Date(r.created_at).toLocaleString('ru-RU')}</p>
              <AdminRequestActions id={r.id} status={r.status as 'pending' | 'approved' | 'rejected'} />
            </article>
          )) : <div className="portal-row"><p>Заявок пока нет.</p></div>}
        </div>

        <h2 style={{ marginTop: 30 }}>Сборки</h2>
        <div className="portal-list">
          {(builds || []).length ? (builds || []).map((b) => (
            <article className="portal-row" key={b.id}>
              <b>{b.title}</b>
              <p>{b.edition} · {b.device} · {b.published ? 'опубликована' : 'черновик'}</p>
              {b.description && <p style={{ whiteSpace: 'pre-wrap' }}>{b.description}</p>}
              <AdminItemActions kind="build" id={b.id} title={b.title} text={b.description || ''} published={b.published} />
            </article>
          )) : <div className="portal-row"><p>Сборок пока нет.</p></div>}
        </div>

        <h2 style={{ marginTop: 30 }}>Публикации</h2>
        <div className="portal-list">
          {(posts || []).length ? (posts || []).map((p) => (
            <article className="portal-row" key={p.id}>
              <b>{p.title}</b>
              <p>{p.kind} · {p.published ? 'опубликована' : 'черновик'}</p>
              <AdminItemActions kind="post" id={p.id} title={p.title} text={p.body} published={p.published} />
            </article>
          )) : <div className="portal-row"><p>Публикаций пока нет.</p></div>}
        </div>
      </section>
    </main>
  );
}
