import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { calculatePoints } from '@/lib/scoring';

export async function POST() {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) return NextResponse.json({ message: 'Configure o Supabase antes de sincronizar.' });
    const supabase = createClient(url, key);

    const apiKey = process.env.API_FOOTBALL_KEY;
    if (!apiKey) {
      await recalcPoints(supabase);
      return NextResponse.json({ message: 'Sem chave da API de futebol. Pontuação recalculada com os resultados já cadastrados no banco.' });
    }

    const league = process.env.API_FOOTBALL_LEAGUE_ID || '1';
    const season = process.env.API_FOOTBALL_SEASON || '2026';
    const resp = await fetch(`https://v3.football.api-sports.io/fixtures?league=${league}&season=${season}`, { headers: { 'x-apisports-key': apiKey } });
    if (!resp.ok) throw new Error(await resp.text());
    const data = await resp.json();
    const fixtures = data.response || [];

    for (const f of fixtures) {
      const external_id = String(f.fixture?.id);
      const home_score = f.goals?.home;
      const away_score = f.goals?.away;
      const status = f.fixture?.status?.short === 'FT' ? 'finished' : (f.fixture?.status?.short || 'scheduled');
      if (external_id && home_score !== undefined && away_score !== undefined) {
        await supabase.from('matches').update({ home_score, away_score, status }).eq('external_id', external_id);
      }
    }
    await recalcPoints(supabase);
    return NextResponse.json({ message: 'Resultados sincronizados e ranking recalculado.' });
  } catch (e:any) {
    return NextResponse.json({ message: `Falha na sincronização: ${e.message}` }, { status: 500 });
  }
}

async function recalcPoints(supabase:any){
  const { data: matches } = await supabase.from('matches').select('*');
  const { data: preds } = await supabase.from('predictions').select('*');
  const matchMap = new Map((matches || []).map((m:any)=>[m.id,m]));
  for (const p of preds || []) {
    const m:any = matchMap.get(p.match_id);
    if (!m) continue;
    const points = calculatePoints(p.predicted_home_score, p.predicted_away_score, m.home_score, m.away_score);
    await supabase.from('predictions').update({ points }).eq('id', p.id);
  }
}
