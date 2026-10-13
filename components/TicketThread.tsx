type Msg = { id: string; body: string; is_admin_reply: boolean; created_at: string };
type Ticket = { subject: string; message: string; category: string; device: string | null; created_at: string };

export default function TicketThread({ ticket, messages, userLabel }: { ticket: Ticket; messages: Msg[]; userLabel: string }) {
  const items = [
    { id: 'first', body: ticket.message, admin: false, at: ticket.created_at },
    ...messages.map((m) => ({ id: m.id, body: m.body, admin: m.is_admin_reply, at: m.created_at }))
  ];
  return (
    <div className="portal-thread">
      {items.map((m) => (
        <div key={m.id} className={`portal-msg${m.admin ? ' admin' : ''}`}>
          <small>{m.admin ? 'Поддержка TURBO OS' : userLabel} · {new Date(m.at).toLocaleString('ru-RU')}</small>
          <div style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{m.body}</div>
        </div>
      ))}
    </div>
  );
}
