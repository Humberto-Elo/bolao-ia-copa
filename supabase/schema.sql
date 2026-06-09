create table if not exists public.profiles (
  id uuid primary key,
  name text not null,
  email text not null,
  created_at timestamptz default now()
);

create table if not exists public.matches (
  id uuid primary key default gen_random_uuid(),
  external_id text unique,
  home_team text not null,
  away_team text not null,
  match_date timestamptz not null,
  home_score int,
  away_score int,
  status text not null default 'scheduled',
  created_at timestamptz default now()
);

create table if not exists public.predictions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  match_id uuid not null references public.matches(id) on delete cascade,
  predicted_home_score int not null default 0,
  predicted_away_score int not null default 0,
  points int not null default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(user_id, match_id)
);

alter table public.profiles enable row level security;
alter table public.matches enable row level security;
alter table public.predictions enable row level security;

create policy "profiles_read_all" on public.profiles for select using (true);
create policy "profiles_insert_own" on public.profiles for insert with check (auth.uid() = id);
create policy "profiles_update_own" on public.profiles for update using (auth.uid() = id);

create policy "matches_read_all" on public.matches for select using (true);

create policy "predictions_read_all" on public.predictions for select using (true);
create policy "predictions_insert_own" on public.predictions for insert with check (auth.uid() = user_id);
create policy "predictions_update_own" on public.predictions for update using (auth.uid() = user_id);

-- Para inserir jogos pelo painel SQL do Supabase, use a service role ou desabilite RLS temporariamente apenas durante carga inicial.
