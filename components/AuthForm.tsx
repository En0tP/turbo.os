'use client';
import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/browser';
export default function AuthForm() {
  const supabase = createClient(); const params = useSearchParams();
  const [mode,setMode] = useState<'login'|'signup'|'reset'>('login'); const [email,setEmail] = useState(''); const [password,setPassword] = useState(''); const [busy,setBusy] = useState(false); const [message,setMessage] = useState(''); const [error,setError] = useState('');
  async function submit(e: React.FormEvent) { e.preventDefault(); setBusy(true); setMessage(''); setError('');
    try {
      if (mode === 'signup') { const {error} = await supabase.auth.signUp({email,password,options:{emailRedirectTo:`${window.location.origin}/auth/callback`}}); if(error) throw error; setMessage('Проверь почту и подтверди адрес, чтобы завершить регистрацию.'); }
      else if (mode === 'login') { const {error} = await supabase.auth.signInWithPassword({email,password}); if(error) throw error; window.location.assign(params.get('next') || '/account'); }
      else { const {error} = await supabase.auth.resetPasswordForEmail(email,{redirectTo:`${window.location.origin}/login?mode=reset`}); if(error) throw error; setMessage('Если адрес зарегистрирован, на него придёт письмо для восстановления пароля.'); }
    } catch (err) { setError(err instanceof Error ? err.message : 'Не удалось выполнить запрос.'); } finally { setBusy(false); }
  }
  return <><div className="portal-actions">{(['login','signup','reset'] as const).map(m=><button key={m} className={`portal-button ${mode===m?'primary':''}`} onClick={()=>{setMode(m);setMessage('');setError('')}}>{m==='login'?'Войти':m==='signup'?'Создать аккаунт':'Сбросить пароль'}</button>)}</div><form className="portal-form" onSubmit={submit}><label>Email<input type="email" autoComplete="email" required value={email} onChange={e=>setEmail(e.target.value)} placeholder="name@example.com"/></label>{mode!=='reset'&&<label>Пароль<input type="password" minLength={8} required value={password} onChange={e=>setPassword(e.target.value)} autoComplete={mode==='signup'?'new-password':'current-password'} placeholder="Не менее 8 символов"/></label>}<button className="portal-button primary" disabled={busy}>{busy?'Подождите…':mode==='login'?'Войти':mode==='signup'?'Зарегистрироваться':'Отправить ссылку'}</button></form>{message&&<p className="portal-success">{message}</p>}{error&&<p className="portal-error">{error}</p>}</>;
}
