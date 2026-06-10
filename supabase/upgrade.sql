-- Upgrade recomendado para o Bolão IA da Copa
-- 1) Evita duplicidade de jogos quando vierem da API externa.
create unique index if not exists matches_external_id_unique_idx on public.matches(external_id) where external_id is not null;

-- 2) Garante leitura pública dos jogos e ranking.
grant usage on schema public to anon, authenticated;
grant select on public.matches to anon, authenticated;
grant select on public.profiles to anon, authenticated;
grant select on public.predictions to anon, authenticated;
grant insert, update on public.profiles to authenticated;
grant insert, update, delete on public.predictions to authenticated;

-- 3) Garante criação automática de perfil após cadastro no Supabase Auth.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, name, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', new.raw_user_meta_data->>'full_name', new.email),
    new.email
  )
  on conflict (id) do update
  set name = excluded.name,
      email = excluded.email;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();
