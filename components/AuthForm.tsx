'use client';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/browser';
import { safeNext } from '@/lib/utils';

type Mode = 'login' | 'signup' | 'reset';

/** Переводим типовые ошибки Supabase на понятный русский. */
function friendly(msg: string): string {
  const m = msg.toLowerCase();
  if (m.includes('invalid login')) return 'Неверный email или пароль.';
  if (m.includes('email not confirmed')) return 'Почта ещё не подтверждена. Открой письмо от TURBO OS и перейди по ссылке в нём.';
  if (m.includes('rate limit') || m.includes('too many') || m.includes('security purposes')) return 'Слишком много попыток. Подожди пару минут и попробуй снова.';
  if (m.includes('already registered')) return 'Этот email уже зарегистрирован. Войди или сбрось пароль.';
  if (m.includes('at least') && m.includes('character')) return 'Пароль слишком короткий — нужно минимум 8 символов.';
  if (m.includes('weak') || m.includes('easy to guess')) return 'Пароль слишком простой. Добавь буквы разного регистра и цифры.';
  if (m.includes('invalid') && m.includes('email')) return 'Проверь адрес электронной почты.';
  return msg;
}

export default function AuthForm() {
  const [supabase] = useState(() => createClient());
  const params = useSearchParams();
  const next = safeNext(params.get('next'));

  const [mode, setMode] = useState<Mode>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [password2, setPassword2] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState(params.get('error') === 'link' ? 'Ссылка из письма недействительна или устарела. Запроси новое письмо.' : '');

  // окно «письмо отправлено»
  const [showModal, setShowModal] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [resendInfo, setResendInfo] = useState('');
  const [needConfirm, setNeedConfirm] = useState(false);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  useEffect(() => {
    if (!showModal) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') closeModal(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showModal]);

  const redirectTo = `${typeof window !== 'undefined' ? window.location.origin : ''}/auth/callback?next=${encodeURIComponent(next)}`;

  function switchMode(m: Mode) {
    setMode(m); setMessage(''); setError(''); setNeedConfirm(false);
  }

  function closeModal() {
    setShowModal(false);
    setResendInfo('');
    setPassword(''); setPassword2('');
    setMode('login');
    setMessage('После подтверждения почты войди с этим email и паролем.');
  }

  async function resend() {
    if (cooldown > 0 || !email) return;
    setResendInfo('');
    const { error } = await supabase.auth.resend({ type: 'signup', email, options: { emailRedirectTo: redirectTo } });
    if (error) { setResendInfo(friendly(error.message)); return; }
    setResendInfo('Письмо отправлено повторно.');
    setCooldown(60);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setMessage(''); setError(''); setNeedConfirm(false);
    try {
      if (mode === 'signup') {
        if (password !== password2) throw new Error('Пароли не совпадают.');
        const { data, error } = await supabase.auth.signUp({
          email, password,
          options: { emailRedirectTo: redirectTo, data: { name: name.trim().slice(0, 80) } }
        });
        if (error) throw error;
        // Supabase для уже существующего адреса не выдаёт ошибку, но возвращает пользователя без identities.
        if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
          throw new Error('Этот email уже зарегистрирован. Войди или сбрось пароль.');
        }
        // Если в проекте отключено подтверждение почты — сессия появится сразу.
        if (data.session) { window.location.assign(next); return; }
        setCooldown(60);
        setShowModal(true);
      } else if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        window.location.assign(next);
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/auth/callback?next=/reset-password` });
        if (error) throw error;
        setMessage('Если адрес зарегистрирован, на него придёт письмо со ссылкой для смены пароля.');
      }
    } catch (err) {
      const raw = err instanceof Error ? err.message : 'Не удалось выполнить запрос.';
      setError(friendly(raw));
      if (raw.toLowerCase().includes('email not confirmed')) setNeedConfirm(true);
    } finally {
      setBusy(false);
    }
  }

  const label = (m: Mode) => (m === 'login' ? 'Войти' : m === 'signup' ? 'Создать аккаунт' : 'Сбросить пароль');

  return (
    <>
      <div className="portal-actions">
        {(['login', 'signup', 'reset'] as const).map((m) => (
          <button type="button" key={m} className={`portal-button ${mode === m ? 'primary' : ''}`} onClick={() => switchMode(m)}>
            {label(m)}
          </button>
        ))}
      </div>

      <form className="portal-form" onSubmit={submit}>
        {mode === 'signup' && (
          <label>Имя (необязательно)
            <input type="text" autoComplete="nickname" maxLength={80} value={name} onChange={(e) => setName(e.target.value)} placeholder="Как к тебе обращаться" />
          </label>
        )}
        <label>Email
          <input type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@example.com" />
        </label>
        {mode !== 'reset' && (
          <label>Пароль
            <input type="password" minLength={8} required value={password} onChange={(e) => setPassword(e.target.value)} autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} placeholder="Не менее 8 символов" />
          </label>
        )}
        {mode === 'signup' && (
          <label>Повтори пароль
            <input type="password" minLength={8} required value={password2} onChange={(e) => setPassword2(e.target.value)} autoComplete="new-password" placeholder="Ещё раз тот же пароль" />
          </label>
        )}
        <button className="portal-button primary" disabled={busy}>
          {busy ? 'Подождите…' : mode === 'login' ? 'Войти' : mode === 'signup' ? 'Зарегистрироваться' : 'Отправить ссылку'}
        </button>
      </form>

      {message && <p className="portal-success">{message}</p>}
      {error && <p className="portal-error">{error}</p>}
      {needConfirm && (
        <p><button type="button" className="portal-button" onClick={resend} disabled={cooldown > 0}>
          {cooldown > 0 ? `Отправить письмо ещё раз (${cooldown} с)` : 'Отправить письмо для подтверждения ещё раз'}
        </button></p>
      )}
      {needConfirm && resendInfo && <p className="portal-success">{resendInfo}</p>}

      {showModal && (
        <div className="portal-modal-bg" onClick={closeModal} role="presentation">
          <div className="portal-modal" role="dialog" aria-modal="true" aria-labelledby="confirm-title" onClick={(e) => e.stopPropagation()}>
            <div className="portal-modal-icon" aria-hidden="true">✉</div>
            <h2 id="confirm-title">Подтверди почту</h2>
            <p>Мы отправили письмо на</p>
            <p><b style={{ color: '#fff', wordBreak: 'break-all' }}>{email}</b></p>
            <p>Открой его и нажми на ссылку, чтобы завершить регистрацию. Пока почта не подтверждена, войти в аккаунт не получится.</p>
            <p style={{ fontSize: 12 }}>Письма нет? Проверь папку «Спам» — иногда оно попадает туда.</p>
            {resendInfo && <p className={resendInfo.startsWith('Письмо') ? 'portal-success' : 'portal-error'}>{resendInfo}</p>}
            <div className="portal-modal-actions">
              <button type="button" className="portal-button primary" onClick={closeModal}>Понятно</button>
              <button type="button" className="portal-button" onClick={resend} disabled={cooldown > 0}>
                {cooldown > 0 ? `Отправить ещё раз (${cooldown} с)` : 'Отправить письмо ещё раз'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
