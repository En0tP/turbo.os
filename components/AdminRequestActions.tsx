'use client';
import { useState } from 'react';

export default function AdminRequestActions({ id, status }: { id: string; status: 'pending' | 'approved' | 'rejected' }) {
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);

  async function call(method: 'POST' | 'DELETE', body?: Record<string, unknown>) {
    setBusy(true); setMsg('');
    try {
      const r = await fetch(`/api/admin/plus/${id}`, { method, headers: { 'content-type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.error || 'Ошибка');
      window.location.reload();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Ошибка');
      setBusy(false);
    }
  }

  function remove() {
    if (window.confirm('Удалить заявку? Если доступ был одобрен, он пропадёт.')) void call('DELETE');
  }

  return (
    <div className="portal-actions" style={{ marginTop: 8 }}>
      {status === 'pending' && (
        <>
          <button type="button" disabled={busy} className="portal-button primary" onClick={() => call('POST', { status: 'approved' })}>Одобрить</button>
          <button type="button" disabled={busy} className="portal-button" onClick={() => call('POST', { status: 'rejected' })}>Отклонить</button>
        </>
      )}
      {status === 'approved' && (
        <button type="button" disabled={busy} className="portal-button" onClick={() => { if (window.confirm('Отозвать PLUS-доступ у этого пользователя?')) void call('POST', { status: 'rejected' }); }}>Отозвать доступ</button>
      )}
      {status === 'rejected' && (
        <button type="button" disabled={busy} className="portal-button" onClick={() => call('POST', { status: 'approved' })}>Одобрить</button>
      )}
      <button type="button" disabled={busy} className="portal-button danger" onClick={remove}>Удалить</button>
      {msg && <small className="portal-error">{msg}</small>}
    </div>
  );
}
