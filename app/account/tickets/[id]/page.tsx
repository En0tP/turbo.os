import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { isUuid, TICKET_LABEL_USER } from '@/lib/utils';
import TicketThread from '@/components/TicketThread';
import TicketReplyForm from '@/components/TicketReplyForm';

export const dynamic = 'force-dynamic';

export default async function UserTicketPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const s = await createClient();
  const { data: { user } } = await s.auth.getUser();
  if (!user) redirect(`/login?next=/account/tickets/${id}`);
  if (!isUuid(id)) notFound();

  const { data: ticket } = await s.from('support_tickets').select('id,user_id,subject,category,message,device,status,created_at').eq('id', id).maybeSingle();
  if (!ticket || ticket.user_id !== user.id) notFound();
  const { data: messages } = await s.from('support_messages').select('id,body,is_admin_reply,created_at').eq('ticket_id', id).order('created_at', { ascending: true });

  return (
    <main className="portal-wrap">
      <div className="portal-top">
        <Link href="/" className="portal-brand">TURBO OS<small>FIRMWARE PROJECT</small></Link>
        <Link className="portal-button" href="/account">← Личный кабинет</Link>
      </div>
      <section className="portal-shell">
        <div className="portal-kicker">ТВОЁ ОБРАЩЕНИЕ</div>
        <h1 className="portal-title" style={{ fontSize: 'clamp(24px,4vw,38px)' }}>{ticket.subject}</h1>
        <p><span className={`portal-status st-${ticket.status}`}>{TICKET_LABEL_USER[ticket.status] || ticket.status}</span></p>
        <TicketThread ticket={ticket} messages={messages || []} userLabel="Ты" />
        <TicketReplyForm ticketId={ticket.id} mode="user" status={ticket.status} />
      </section>
    </main>
  );
}
