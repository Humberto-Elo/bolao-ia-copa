'use client';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { calculatePoints } from '@/lib/scoring';

type Match = { id:string; external_id?:string; home_team:string; away_team:string; match_date:string; home_score:number|null; away_score:number|null; status:string };
type Prediction = { id?:string; user_id:string; match_id:string; predicted_home_score:number; predicted_away_score:number; points:number };
type Profile = { id:string; name:string; email:string };

export default function Dashboard(){
  const router = useRouter();
  const [user,setUser]=useState<any>(null);
  const [matches,setMatches]=useState<Match[]>([]);
  const [preds,setPreds]=useState<Record<string,Prediction>>({});
  const [profiles,setProfiles]=useState<Profile[]>([]);
  const [allPreds,setAllPreds]=useState<any[]>([]);
  const [loading,setLoading]=useState(true);
  const [msg,setMsg]=useState('');
  const [ai,setAi]=useState<Record<string,string>>({});
  const [summary,setSummary]=useState('');

  useEffect(()=>{ init(); },[]);
  async function init(){
    const { data:{user} } = await supabase.auth.getUser();
    if(!user){ router.push('/'); return; }
    setUser(user); await load(user.id); setLoading(false);
  }
  async function load(userId=user?.id){
    const [{data:matches},{data:mine},{data:profiles},{data:allPreds}] = await Promise.all([
      supabase.from('matches').select('*').order('match_date'),
      supabase.from('predictions').select('*').eq('user_id', userId),
      supabase.from('profiles').select('*'),
      supabase.from('predictions').select('*')
    ]);
    setMatches(matches || []);
    const map:Record<string,Prediction>={}; (mine || []).forEach((p:any)=>map[p.match_id]=p);
    setPreds(map); setProfiles(profiles || []); setAllPreds(allPreds || []);
  }
  function updateLocal(matchId:string, field:'predicted_home_score'|'predicted_away_score', value:string){
    const old = preds[matchId] || { user_id:user.id, match_id:matchId, predicted_home_score:0, predicted_away_score:0, points:0 };
    setPreds({...preds, [matchId]:{...old, [field]: Number(value)}});
  }
  function isLocked(match:Match){ return new Date(match.match_date).getTime() <= Date.now(); }
  async function save(match:Match){
    const p = preds[match.id]; if(!p) return;
    if(isLocked(match)){ setMsg('Palpites bloqueados para jogos já iniciados.'); return; }
    const points = calculatePoints(p.predicted_home_score,p.predicted_away_score,match.home_score,match.away_score);
    const { error } = await supabase.from('predictions').upsert({ ...p, user_id:user.id, match_id:match.id, points }, { onConflict:'user_id,match_id' });
    if(error){ setMsg(error.message); } else { setMsg('Palpite salvo com sucesso.'); await load(user.id); }
  }
  async function signOut(){ await supabase.auth.signOut(); router.push('/'); }
  async function syncResults(){ setMsg('Atualizando resultados...'); const r=await fetch('/api/sync-results',{method:'POST'}); const j=await r.json(); setMsg(j.message || 'Sincronização concluída.'); await load(user.id); }
  async function getAI(match:Match){
    setAi({...ai,[match.id]:'Gerando análise...'});
    const r = await fetch('/api/ai-analysis',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({match, ranking})});
    const j = await r.json(); setAi(prev=>({...prev,[match.id]:j.text || j.error || 'Não foi possível gerar análise.'}));
  }
  async function getSummary(){
    setSummary('Gerando resumo inteligente da rodada...');
    const r = await fetch('/api/round-summary',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({matches, ranking, predictionsCount: allPreds.length})});
    const j = await r.json();
    setSummary(j.text || j.error || 'Não foi possível gerar resumo.');
  }
  const ranking = useMemo(()=>{
    const totals:Record<string,{profile?:Profile; points:number; exact:number; played:number}>={};
    profiles.forEach(p=>totals[p.id]={profile:p,points:0,exact:0,played:0});
    allPreds.forEach(p=>{ if(!totals[p.user_id]) totals[p.user_id]={points:0,exact:0,played:0}; totals[p.user_id].points += p.points || 0; totals[p.user_id].played += 1; if((p.points||0)===5) totals[p.user_id].exact += 1; });
    return Object.entries(totals).map(([id,v])=>({id,...v})).sort((a,b)=>b.points-a.points || b.exact-a.exact);
  },[profiles,allPreds]);
  const myRank = ranking.findIndex(r=>r.id===user?.id)+1;
  const myPoints = ranking.find(r=>r.id===user?.id)?.points || 0;
  const myPredList = Object.values(preds);
  const avgGoals = myPredList.length ? (myPredList.reduce((sum,p)=>sum+p.predicted_home_score+p.predicted_away_score,0)/myPredList.length).toFixed(1) : '0';
  const exacts = ranking.find(r=>r.id===user?.id)?.exact || 0;
  const profileName = myPredList.length === 0 ? 'Estreante' : Number(avgGoals) >= 3.5 ? 'Caçador de placar elástico' : exacts > 0 ? 'Placar cravado' : myPredList.some(p=>p.predicted_home_score===p.predicted_away_score) ? 'Rei do empate' : 'Estrategista';

  if(loading) return <main className="container"><div className="card">Carregando...</div></main>;
  return <main className="container">
    <div className="header"><div><h1>Bolão IA da Copa</h1><p>Palpites, ranking e análises inteligentes.</p></div><div className="row"><button className="btn secondary" onClick={getSummary}>Resumo IA</button><button className="btn secondary" onClick={syncResults}>Atualizar resultados</button><button className="btn" onClick={signOut}>Sair</button></div></div>
    <section className="grid">
      <div className="metric"><span className="small">Minha pontuação</span><br/><b>{myPoints}</b></div>
      <div className="metric"><span className="small">Minha posição</span><br/><b>{myRank ? `${myRank}º`:'-'}</b></div>
      <div className="metric"><span className="small">Palpites enviados</span><br/><b>{Object.keys(preds).length}</b></div>
      <div className="metric"><span className="small">Jogos cadastrados</span><br/><b>{matches.length}</b></div>
    </section>
    <section className="insights">
      <div className="insight-card"><span className="small">Perfil do participante</span><b>{profileName}</b><p>Média de gols nos palpites: {avgGoals}</p></div>
      <div className="insight-card"><span className="small">Badges</span><div className="row"><span className="pill">🎯 Palpiteiro ativo</span>{exacts > 0 && <span className="pill">🏆 Placar cravado</span>}{myRank === 1 && <span className="pill">👑 Líder</span>}</div></div>
    </section>
    {summary && <div className="aiBox summaryBox">{summary}</div>}
    {msg && <div className={msg.includes('sucesso') || msg.includes('conclu') ? 'success':'error'}>{msg}</div>}
    <section className="grid2">
      <div>
        <h2 className="section-title">Jogos e palpites</h2>
        {matches.map(m=>{ const p=preds[m.id]; const locked=isLocked(m); return <div className="card match" key={m.id}>
          <div>
            <div className="row"><span className="status">{m.status}</span><span className="small">{new Date(m.match_date).toLocaleString('pt-BR')}</span></div>
            <div className="teams">{m.home_team} x {m.away_team}</div>
            <p className="muted">Resultado: {m.home_score ?? '-'} x {m.away_score ?? '-'}</p>
            <div className="scoreBox">
              <span>Seu palpite:</span>
              <input disabled={locked} type="number" min="0" value={p?.predicted_home_score ?? 0} onChange={e=>updateLocal(m.id,'predicted_home_score',e.target.value)} />
              <b>x</b>
              <input disabled={locked} type="number" min="0" value={p?.predicted_away_score ?? 0} onChange={e=>updateLocal(m.id,'predicted_away_score',e.target.value)} />
            </div>
            {ai[m.id] && <div className="aiBox">{ai[m.id]}</div>}
          </div>
          <div className="row">
            <button className="btn" disabled={locked} onClick={()=>save(m)}>Salvar</button>
            <button className="btn secondary" onClick={()=>getAI(m)}>Análise IA</button>
          </div>
        </div>})}
      </div>
      <div>
        <h2 className="section-title">Ranking</h2>
        <div className="card">
          <div className="ranking-row small"><b>#</b><b>Participante</b><b>Pontos</b><b className="hide-mobile">Exatos</b></div>
          {ranking.map((r,i)=><div className="ranking-row" key={r.id}>
            <div className="pos">{i+1}º</div><div>{r.profile?.name || r.profile?.email || 'Participante'} {r.id===user.id && <span className="pill">você</span>}</div><b>{r.points}</b><span className="hide-mobile">{r.exact}</span>
          </div>)}
        </div>
      </div>
    </section>
  </main>;
}
