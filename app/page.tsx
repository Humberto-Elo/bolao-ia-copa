'use client';
import { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();
  const [mode, setMode] = useState<'login'|'signup'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit() {
    setLoading(true); setMsg('');
    try {
      if (mode === 'signup') {
        const { data, error } = await supabase.auth.signUp({ email, password, options: { data: { name } } });
        if (error) throw error;
        if (data.user) {
          await supabase.from('profiles').upsert({ id: data.user.id, name: name || email, email });
        }
        setMsg('Cadastro criado. Caso o Supabase peça confirmação, valide seu e-mail antes de entrar.');
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        router.push('/dashboard');
      }
    } catch (e:any) { setMsg(e.message || 'Não foi possível concluir.'); }
    setLoading(false);
  }

  return <main className="container hero">
    <section>
      <div className="badge">🏆 AI World Cup Challenge</div>
      <div className="logo">Bolão IA<br/><span>da Copa</span></div>
      <p className="subtitle">Cadastre seus palpites, acompanhe o ranking em tempo real e use IA para analisar jogos, sugerir placares e explicar a disputa.</p>
      <div className="row">
        <span className="pill">Login</span><span className="pill">Palpites</span><span className="pill">Ranking</span><span className="pill">IA</span><span className="pill">API de resultados</span>
      </div>
    </section>
    <section className="card">
      <h2>{mode === 'login' ? 'Entrar no bolão' : 'Criar cadastro'}</h2>
      {mode === 'signup' && <><label>Nome</label><input value={name} onChange={e=>setName(e.target.value)} placeholder="Seu nome" /></>}
      <label>E-mail</label><input value={email} onChange={e=>setEmail(e.target.value)} placeholder="voce@email.com" />
      <label>Senha</label><input value={password} onChange={e=>setPassword(e.target.value)} type="password" placeholder="mínimo 6 caracteres" />
      {msg && <div className={msg.includes('criado') ? 'success':'error'}>{msg}</div>}
      <button className="btn full" disabled={loading} onClick={submit}>{loading ? 'Aguarde...' : mode === 'login' ? 'Entrar' : 'Cadastrar'}</button>
      <p className="small">{mode === 'login' ? 'Ainda não tem conta?' : 'Já tem conta?'} <button className="btn ghost" onClick={()=>setMode(mode==='login'?'signup':'login')}>{mode === 'login' ? 'Criar cadastro' : 'Fazer login'}</button></p>
    </section>
  </main>;
}
