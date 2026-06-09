# Bolão IA da Copa

MVP para o AI World Cup Challenge: aplicação web com login, cadastro, jogos, palpites, ranking, cálculo de pontuação, análise por IA e rota para sincronizar resultados via API externa.

## Stack

- Next.js
- Supabase Auth
- Supabase Postgres
- Vercel
- API de IA via rota server-side
- API de futebol opcional para resultados

## Como colocar no ar

### 1. Criar projeto no Supabase

1. Acesse o Supabase e crie um novo projeto.
2. Vá em SQL Editor.
3. Rode o conteúdo de `supabase/schema.sql`.
4. Rode o conteúdo de `supabase/seed_matches.sql`.
5. Em Project Settings > API, copie:
   - Project URL
   - anon public key

### 2. Criar projeto na Vercel

1. Suba esta pasta para um repositório no GitHub.
2. Importe o repositório na Vercel.
3. Configure as variáveis de ambiente abaixo.
4. Faça o deploy.

### 3. Variáveis de ambiente

Copie `.env.example` para `.env.local` para rodar localmente.
Na Vercel, cadastre as mesmas variáveis:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
OPENAI_API_KEY=
OPENAI_MODEL=gpt-4.1-mini
API_FOOTBALL_KEY=
API_FOOTBALL_LEAGUE_ID=1
API_FOOTBALL_SEASON=2026
```

`OPENAI_API_KEY` e `API_FOOTBALL_KEY` são opcionais para o MVP. Sem elas, o sistema continua funcionando com jogos cadastrados manualmente e análise demonstrativa.

### 4. Rodar localmente

```bash
npm install
npm run dev
```

Acesse `http://localhost:3000`.

## Regras de pontuação

- 5 pontos: acertou o placar exato.
- 3 pontos: acertou o vencedor ou empate.
- 1 ponto: acertou gols de uma das seleções.
- 0 ponto: errou tudo.

## Fluxo de demonstração

1. Criar usuário.
2. Entrar no dashboard.
3. Registrar palpites.
4. Mostrar ranking.
5. Clicar em “Análise IA”.
6. Clicar em “Atualizar resultados”.
7. Explicar arquitetura: Next.js + Supabase + IA + API externa.

## Como defender na apresentação

A solução atende aos requisitos obrigatórios do desafio: cadastro/login, visualização dos jogos, registro de palpites, ranking, atualização de pontuação, deploy público, banco de dados e organização entre front-end, back-end e integrações. O uso de IA foi aplicado para gerar análises e sugestões de palpites de forma contextual, ajudando o usuário a tomar decisões e tornando a experiência mais criativa.
