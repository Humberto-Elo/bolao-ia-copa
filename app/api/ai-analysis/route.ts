import { NextResponse } from 'next/server';

function fallbackAnalysis(match: any) {
  const home = match?.home_team || 'Time A';
  const away = match?.away_team || 'Time B';

  return `Análise IA demonstrativa: ${home} x ${away} promete ser um confronto equilibrado. Para um palpite mais conservador, vale considerar um placar com poucos gols, como 1 x 1. Para um palpite mais ousado, uma boa aposta seria 2 x 1 para ${home}. Use essa análise como apoio, não como previsão garantida.`;
}

export async function POST(req: Request) {
  try {
    const { match, ranking } = await req.json();
    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      return NextResponse.json({
        text: fallbackAnalysis(match)
      });
    }

    const prompt = `Você é um assistente de bolão da Copa. Gere uma análise curta, divertida e responsável para o jogo ${match.home_team} x ${match.away_team}. Não prometa resultado. Sugira um palpite conservador e um palpite ousado. Responda em português do Brasil, com no máximo 900 caracteres.`;

    const resp = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7
      })
    });

    if (!resp.ok) {
      return NextResponse.json({
        text: fallbackAnalysis(match)
      });
    }

    const data = await resp.json();

    return NextResponse.json({
      text: data.choices?.[0]?.message?.content || fallbackAnalysis(match)
    });
  } catch (e: any) {
    return NextResponse.json({
      text: 'Análise IA demonstrativa: não foi possível consultar a IA em tempo real agora, mas este jogo pode ser avaliado considerando equilíbrio entre as equipes, histórico recente e tendência de gols. Um palpite conservador seria 1 x 1; um palpite ousado seria 2 x 1.'
    });
  }
}
