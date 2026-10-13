'use client';
import { useState } from 'react';
import { createClient } from '@/lib/supabase/browser';

export default function ResetPasswordForm() {
  const [supabase] = useState(() => createClient());
  const [password, setPassword] = useState('');
  const [password2, setPassword2] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (password !== password2) { setError('Пароли не совпадают.'); return; }
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) { setError(error.message.toLowerCase().includes('same') ? 'Новый пароль должен отличаться от старого.' : error.message); return; }
    setDone(true);
    setTimeout(() => window.location.assign('/account'), 1200);
  }

  if (done) return <p className="portal-success">Пароль изменён. Перенаправляю в личный кабинет…</p>;
  return (
    <>
      <form className="portal-form" onSubmit={submit}>
        <label>Новый пароль
          <input type="password" minLength={8} required autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Не менее 8 символов" />
        </label>
        <label>Повтори пароль
          <input type="password" minLength={8} required autoComplete="new-password" value={password2} onChange={(e) => setPassword2(e.target.value)} />
        </label>
        <button className="portal-button primary" disabled={busy}>{busy ? 'Сохраняю…' : 'Сохранить пароль'}</button>
      </form>
      {error && <p className="portal-error">{error}</p>}
    </>
  );
}
