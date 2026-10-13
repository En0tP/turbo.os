'use client';
import { useState } from 'react';

type Props = {
  kind: 'build' | 'post';
  id: string;
  title: string;
  /** описание сборки или текст публикации */
  text: string;
  published: boolean;
};

const API = { build: '/api/admin/builds', post: '/api/admin/posts' } as const;

export default function AdminItemActions({ kind, id, title, text, published }: Props) {
  const [editing, setEditing] = useState(false);
  const [t, setT] = useState(title);
  const [body, setBody] = useState(text);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const textKey = kind === 'build' ? 'description' : 'body';

  async function call(method: 'PATCH' | 'DELETE', payload?: Record<string, unknown>) {
    setBusy(true); setErr('');
    try {
      const r = await fetch(`${API[kind]}/${id}`, {
        method,
        headers: { 'content-type': 'application/json' },
        body: payload ? JSON.stringify(payload) : undefined
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.error || 'Ошибка');
      window.location.reload();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Ошибка');
      setBusy(false);
    }
  }

  function remove() {
    const what = kind === 'build' ? 'сборку' : 'публикацию';
    const extra = kind === 'build' ? '\nЕё файл в хранилище тоже будет удалён (если не используется другой сборкой).' : '';
    if (window.confirm(`Удалить ${what} «${title}»?${extra}\nДействие нельзя отменить.`)) void call('DELETE');
  }

  return (
    <div style={{ marginTop: 10 }}>
      {!editing ? (
        <div className="portal-actions">
          <button type="button" disabled={busy} className="portal-button" onClick={() => call('PATCH', { published: !published })}>
            {published ? 'Скрыть' : 'Опубликовать'}
          </button>
          <button type="button" disabled={busy} className="portal-button" onClick={() => setEditing(true)}>
            {kind === 'build' ? 'Изменить описание' : 'Редактировать'}
          </button>
          <button type="button" disabled={busy} className="portal-button danger" onClick={remove}>Удалить</button>
        </div>
      ) : (
        <div className="portal-form" style={{ marginTop: 6 }}>
          <label>Название<input value={t} maxLength={180} onChange={(e) => setT(e.target.value)} /></label>
          <label>{kind === 'build' ? 'Описание' : 'Текст'}
            <textarea value={body} maxLength={kind === 'build' ? 5000 : 10000} onChange={(e) => setBody(e.target.value)} />
          </label>
          <div className="portal-actions">
            <button type="button" disabled={busy} className="portal-button primary" onClick={() => call('PATCH', { title: t, [textKey]: body })}>Сохранить</button>
            <button type="button" disabled={busy} className="portal-button" onClick={() => { setEditing(false); setT(title); setBody(text); }}>Отмена</button>
          </div>
        </div>
      )}
      {err && <p className="portal-error">{err}</p>}
    </div>
  );
}
