import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { matches, ranking, predictionsCount } = await req.json();
    const apiKey = process.env.OPENAI_API_KEY;
    const finished = (matches || []).filter((m:any)=>m.status === 'finished').length;
    const scheduled = (matches || []).filter((m:any)=>m.status !== 'finished').length;
    const leader = ranking?.[0]?.profile?.name || ranking?.[0]?.profile?.email || 'ninguém ainda';

    if (!apiKey) {
      return NextResponse.json({
        text: `Resumo da rodada: ${predictionsCount || 0} palpites enviados, ${finished} jogos finalizados e ${scheduled} jogos ainda disponíveis. A liderança atual está com ${leader}.`
      });
    }

    const prompt = `Você é o narrador de um bolão corporativo da Copa. Gere um resumo curto e empolgante, em português do Brasil, com no máximo 700 caracteres. Dados: total de jogos=${matches?.length || 0}; jogos finalizados=${finished}; jogos pendentes=${scheduled}; palpites enviados=${predictionsCount || 0}; líder atual=${leader}; ranking=${JSON.stringify((ranking || []).slice(0,5))}. Não invente placares.`;

    const resp = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || 'gpt-4.1-mini',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7
      })
    });

    if (!resp.ok) throw new Error(await resp.text());
    const data = await resp.json();
    return NextResponse.json({ text: data.choices?.[0]?.message?.content || 'Resumo indisponível.' });
  } catch (e:any) {
    return NextResponse.json({ error: e.message || 'Erro ao gerar resumo.' }, { status: 500 });
  }
}
