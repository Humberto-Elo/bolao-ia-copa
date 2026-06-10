import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { calculatePoints } from '@/lib/scoring';

function normalizeStatus(short?: string) {
  if (!short) return 'scheduled';
  if (['FT', 'AET', 'PEN'].includes(short)) return 'finished';
  if (['1H', 'HT', '2H', 'ET', 'BT', 'P', 'LIVE'].includes(short)) return 'live';
  return 'scheduled';
}

export async function POST() {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || (!serviceKey && !anonKey)) {
      return NextResponse.json({ message: 'Configure o Supabase antes de sincronizar.' }, { status: 400 });
    }

    // Service role deve ser usada apenas no servidor. Ela permite atualizar jogos e recalcular pontos sem depender do usuário logado.
    const supabase = createClient(url, serviceKey || anonKey!);

    const apiKey = process.env.API_FOOTBALL_KEY;
    if (!apiKey) {
      const recalculated = await recalcPoints(supabase);
      return NextResponse.json({
        message: `Sem chave da API de futebol. Pontuação recalculada com os resultados já cadastrados no banco. Palpites recalculados: ${recalculated}.`
      });
    }

    const league = process.env.API_FOOTBALL_LEAGUE_ID || '1';
    const season = process.env.API_FOOTBALL_SEASON || '2026';
    const from = process.env.API_FOOTBALL_FROM;
    const to = process.env.API_FOOTBALL_TO;
    const dateFilter = from && to ? `&from=${from}&to=${to}` : '';

    const resp = await fetch(`https://v3.football.api-sports.io/fixtures?league=${league}&season=${season}${dateFilter}`, {
      headers: { 'x-apisports-key': apiKey },
      cache: 'no-store'
    });

    if (!resp.ok) throw new Error(await resp.text());
    const data = await resp.json();
    const fixtures = data.response || [];

    let upserted = 0;
    for (const f of fixtures) {
      const external_id = String(f.fixture?.id || '');
      if (!external_id) continue;

      const home_score = f.goals?.home ?? null;
      const away_score = f.goals?.away ?? null;
      const status = normalizeStatus(f.fixture?.status?.short);
      const match_date = f.fixture?.date;
      const home_team = f.teams?.home?.name;
      const away_team = f.teams?.away?.name;

      if (!home_team || !away_team || !match_date) continue;

      const { error } = await supabase.from('matches').upsert({
        external_id,
        home_team,
        away_team,
        match_date,
        home_score,
        away_score,
        status
      }, { onConflict: 'external_id' });

      if (!error) upserted += 1;
    }

    const recalculated = await recalcPoints(supabase);
    return NextResponse.json({
      message: `API sincronizada. Jogos importados/atualizados: ${upserted}. Palpites recalculados: ${recalculated}.`
    });
  } catch (e:any) {
    return NextResponse.json({ message: `Falha na sincronização: ${e.message}` }, { status: 500 });
  }
}

async function recalcPoints(supabase:any){
  const { data: matches, error: matchesError } = await supabase.from('matches').select('*');
  if (matchesError) throw matchesError;
  const { data: preds, error: predsError } = await supabase.from('predictions').select('*');
  if (predsError) throw predsError;

  const matchMap = new Map((matches || []).map((m:any)=>[m.id,m]));
  let recalculated = 0;
  for (const p of preds || []) {
    const m:any = matchMap.get(p.match_id);
    if (!m) continue;
    const points = calculatePoints(p.predicted_home_score, p.predicted_away_score, m.home_score, m.away_score);
    const { error } = await supabase.from('predictions').update({ points }).eq('id', p.id);
    if (!error) recalculated += 1;
  }
  return recalculated;
}
