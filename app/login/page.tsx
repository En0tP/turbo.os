import Link from 'next/link';
import { Suspense } from 'react';
import AuthForm from '@/components/AuthForm';
export default function LoginPage(){return <main className="portal-wrap"><div className="portal-top"><Link href="/" className="portal-brand">TURBO OS<small>FIRMWARE PROJECT</small></Link><Link className="portal-button" href="/">На главную</Link></div><section className="portal-shell"><div className="portal-kicker">АККАУНТ TURBO OS</div><h1 className="portal-title">Твой профиль.<br/><span style={{color:'#ff6674'}}>Твои правила.</span></h1><p className="portal-lead">Войди, создай аккаунт или восстанови пароль. Для регистрации потребуется подтвердить адрес электронной почты.</p><Suspense fallback={<p>Загрузка формы…</p>}><AuthForm/></Suspense></section></main>}
