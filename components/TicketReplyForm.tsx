'use client';
import { useState } from 'react';

type Props = { ticketId: string; mode: 'admin' | 'user'; status: string };

export default function TicketReplyForm({ ticketId, mode, status }: Props) {
  const [body, setBody] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const closed = status === 'closed';

  async function request(url: string, method: string, payload?: Record<string, unknown>, after: 'reload' | 'admin' = 'reload') {
    setBusy(true); setErr('');
    try {
      const r = await fetch(url, { method, headers: { 'content-type': 'application/json' }, body: payload ? JSON.stringify(payload) : undefined });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.error || 'Ошибка');
      if (after === 'admin') window.location.assign('/admin'); else window.location.reload();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Ошибка');
      setBusy(false);
    }
  }

  const sendAdmin = (close: boolean) => request(`/api/admin/tickets/${ticketId}/reply`, 'POST', { body, status: close ? 'closed' : 'waiting' });
  const sendUser = () => request(`/api/support/tickets/${ticketId}/messages`, 'POST', { body });

  return (
    <div style={{ marginTop: 18 }}>
      <form className="portal-form" onSubmit={(e) => { e.preventDefault(); void (mode === 'admin' ? sendAdmin(false) : sendUser()); }}>
        <label>{mode === 'admin' ? 'Ответ пользователю' : closed ? 'Обращение закрыто — напиши, чтобы открыть его заново' : 'Твоё сообщение'}
          <textarea required maxLength={5000} value={body} onChange={(e) => setBody(e.target.value)} placeholder={mode === 'admin' ? 'Напиши ответ — пользователь увидит его в личном кабинете' : 'Опиши, что нужно добавить'} />
        </label>
        <div className="portal-actions">
          <button className="portal-button primary" disabled={busy || !body.trim()}>{busy ? 'Отправка…' : 'Отправить'}</button>
          {mode === 'admin' && (
            <button type="button" className="portal-button" disabled={busy || !body.trim()} onClick={() => void sendAdmin(true)}>Ответить и закрыть</button>
          )}
        </div>
      </form>

      <div className="portal-actions" style={{ marginTop: 14 }}>
        {mode === 'admin' ? (
          <>
            {closed ? (
              <button type="button" className="portal-button" disabled={busy} onClick={() => request(`/api/admin/tickets/${ticketId}`, 'PATCH', { status: 'open' })}>Открыть заново</button>
            ) : (
              <button type="button" className="portal-button" disabled={busy} onClick={() => request(`/api/admin/tickets/${ticketId}`, 'PATCH', { status: 'closed' })}>Закрыть без ответа</button>
            )}
            <button type="button" className="portal-button danger" disabled={busy} onClick={() => { if (window.confirm('Удалить обращение вместе с перепиской? Это нельзя отменить.')) void request(`/api/admin/tickets/${ticketId}`, 'DELETE', undefined, 'admin'); }}>Удалить обращение</button>
          </>
        ) : (
          !closed && <button type="button" className="portal-button" disabled={busy} onClick={() => request(`/api/support/tickets/${ticketId}/status`, 'POST')}>Вопрос решён — закрыть</button>
        )}
      </div>
      {err && <p className="portal-error">{err}</p>}
    </div>
  );
}
