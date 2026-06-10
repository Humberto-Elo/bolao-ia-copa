import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { calculatePoints } from '@/lib/scoring';

const DEFAULT_OPENFOOTBALL_URL = 'https://raw.githubusercontent.com/openfootball/worldcup.json/master/2026/worldcup.json';

type OpenFootballMatch = {
  round?: string;
  date?: string;
  time?: string;
  team1?: string;
  team2?: string;
  score?: { ft?: [number, number]; et?: [number, number]; p?: [number, number]; ht?: [number, number] };
  group?: string;
  ground?: string;
};

function slug(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function parseOpenFootballDate(date?: string, time?: string) {
  if (!date) return new Date().toISOString();

  if (!time) return `${date}T12:00:00.000Z`;

  // Exemplos esperados:
  // 13:00 UTC-6 -> 2026-06-11T13:00:00-06:00
  // 20:00 UTC-4 -> 2026-06-11T20:00:00-04:00
  // 19:00       -> 2022-11-20T19:00:00.000Z
  const match = time.match(/(\d{1,2}:\d{2})\s*UTC\s*([+-]?\d{1,2})?/i);
  if (match) {
    const hhmm = match[1];
    const offsetNumber = Number(match[2] || 0);
    const sign = offsetNumber >= 0 ? '+' : '-';
    const abs = Math.abs(offsetNumber).toString().padStart(2, '0');
    return `${date}T${hhmm}:00${sign}${abs}:00`;
  }

  const simple = time.match(/(\d{1,2}:\d{2})/);
  if (simple) return `${date}T${simple[1]}:00.000Z`;

  return `${date}T12:00:00.000Z`;
}

function getStatus(match: OpenFootballMatch) {
  return match.score?.ft ? 'finished' : 'scheduled';
}

function getScore(match: OpenFootballMatch) {
  const ft = match.score?.ft;
  return {
    home_score: Array.isArray(ft) ? ft[0] : null,
    away_score: Array.isArray(ft) ? ft[1] : null
  };
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

    const sourceUrl = process.env.OPENFOOTBALL_WORLD_CUP_URL || DEFAULT_OPENFOOTBALL_URL;
    const resp = await fetch(sourceUrl, { cache: 'no-store' });

    if (!resp.ok) {
      throw new Error(`Falha ao buscar OpenFootball: ${resp.status} ${resp.statusText}`);
    }

    const data = await resp.json();
    const fixtures: OpenFootballMatch[] = data.matches || [];

    let upserted = 0;
    let skipped = 0;

    for (let i = 0; i < fixtures.length; i++) {
      const f = fixtures[i];
      const home_team = f.team1;
      const away_team = f.team2;
      const match_date = parseOpenFootballDate(f.date, f.time);

      if (!home_team || !away_team || !f.date) {
        skipped += 1;
        continue;
      }

      const external_id = `openfootball-2026-${f.date}-${slug(home_team)}-${slug(away_team)}-${i + 1}`;
      const { home_score, away_score } = getScore(f);

      const { error } = await supabase.from('matches').upsert({
        external_id,
        home_team,
        away_team,
        match_date,
        home_score,
        away_score,
        status: getStatus(f)
      }, { onConflict: 'external_id' });

      if (error) {
        skipped += 1;
      } else {
        upserted += 1;
      }
    }

    const recalculated = await recalcPoints(supabase);
    return NextResponse.json({
      message: `OpenFootball sincronizado gratuitamente. Jogos importados/atualizados: ${upserted}. Ignorados: ${skipped}. Palpites recalculados: ${recalculated}.`
    });
  } catch (e: any) {
    return NextResponse.json({ message: `Falha na sincronização: ${e.message}` }, { status: 500 });
  }
}

async function recalcPoints(supabase: any) {
  const { data: matches, error: matchesError } = await supabase.from('matches').select('*');
  if (matchesError) throw matchesError;

  const { data: preds, error: predsError } = await supabase.from('predictions').select('*');
  if (predsError) throw predsError;

  const matchMap = new Map((matches || []).map((m: any) => [m.id, m]));
  let recalculated = 0;

  for (const p of preds || []) {
    const m: any = matchMap.get(p.match_id);
    if (!m) continue;

    const points = calculatePoints(
      p.predicted_home_score,
      p.predicted_away_score,
      m.home_score,
      m.away_score
    );

    const { error } = await supabase.from('predictions').update({ points }).eq('id', p.id);
    if (!error) recalculated += 1;
  }

  return recalculated;
}
