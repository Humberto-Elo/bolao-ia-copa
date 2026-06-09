import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { match, ranking } = await req.json();
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ text: `Análise demonstrativa: ${match.home_team} x ${match.away_team} tende a ser equilibrado. Compare momento das equipes, histórico recente e escolha um placar coerente. Um palpite conservador seria 1 x 1; um palpite ousado seria 2 x 1.` });
    }
    const prompt = `Você é um assistente de bolão da Copa. Gere uma análise curta, divertida e responsável para o jogo ${match.home_team} x ${match.away_team}. Não prometa resultado. Sugira um palpite conservador e um palpite ousado. Responda em português do Brasil, com no máximo 900 caracteres.`;
    const resp = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({ model: process.env.OPENAI_MODEL || 'gpt-4.1-mini', messages: [{ role: 'user', content: prompt }], temperature: 0.7 })
    });
    if (!resp.ok) throw new Error(await resp.text());
    const data = await resp.json();
    return NextResponse.json({ text: data.choices?.[0]?.message?.content || 'Sem análise gerada.' });
  } catch (e:any) {
    return NextResponse.json({ error: e.message || 'Erro ao gerar análise.' }, { status: 500 });
  }
}
