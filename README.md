# Bolão IA da Copa

Aplicação web para o AI World Cup Challenge: login/cadastro, jogos, palpites, ranking, cálculo de pontuação, análise por IA e sincronização gratuita de jogos via OpenFootball.

## Stack

- Next.js
- Supabase Auth
- Supabase Postgres
- Vercel
- API de IA via rota server-side
- OpenFootball / worldcup.json para dados gratuitos da Copa

## Como colocar no ar

### 1. Criar projeto no Supabase

1. Acesse o Supabase e crie um novo projeto.
2. Vá em SQL Editor.
3. Rode o conteúdo de `supabase/schema.sql`.
4. Rode o conteúdo de `supabase/seed_matches.sql` se quiser começar com jogos manuais.
5. Em Project Settings > API, copie:
   - Project URL
   - anon public key
   - secret/service role key

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
SUPABASE_SERVICE_ROLE_KEY=
OPENAI_API_KEY=
OPENAI_MODEL=gpt-4.1-mini
OPENFOOTBALL_WORLD_CUP_URL=https://raw.githubusercontent.com/openfootball/worldcup.json/master/2026/worldcup.json
```

`OPENAI_API_KEY` é necessária para a análise por IA. `OPENFOOTBALL_WORLD_CUP_URL` é opcional, pois o projeto já usa a URL pública padrão se ela não for preenchida.

### 4. Rodar upgrade no banco

Se você já tinha uma versão anterior do projeto, rode o arquivo:

```text
supabase/upgrade.sql
```

Ele ajusta permissões, trigger de perfil e índice único para evitar duplicidade por `external_id`.

### 5. Rodar localmente

```bash
npm install
npm run dev
```

Acesse `http://localhost:3000`.

## Integração gratuita com OpenFootball

O botão “Atualizar resultados” chama a rota `/api/sync-results`, que busca o JSON público da Copa 2026 no OpenFootball:

```text
https://raw.githubusercontent.com/openfootball/worldcup.json/master/2026/worldcup.json
```

A rota importa/atualiza jogos na tabela `matches` usando `external_id` e recalcula os pontos dos palpites.

Observação: o OpenFootball é um dataset aberto, não uma API comercial de placar ao vivo. Para demonstração do desafio, ele funciona como fonte externa pública e gratuita. Os resultados são atualizados quando o dataset público é atualizado.

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
7. Explicar arquitetura: Next.js + Supabase + IA + OpenFootball.

## Como defender na apresentação

A solução atende aos requisitos obrigatórios do desafio: cadastro/login, visualização dos jogos, registro de palpites, ranking, atualização de pontuação, deploy público, banco de dados e organização entre front-end, back-end e integrações. O uso de IA foi aplicado para gerar análises e sugestões de palpites de forma contextual, ajudando o usuário a tomar decisões e tornando a experiência mais criativa. A integração externa usa dados públicos gratuitos do OpenFootball, sem necessidade de chave ou plano pago.
