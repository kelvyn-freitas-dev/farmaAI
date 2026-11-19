create table if not exists public.study_generations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  kind text not null,
  type text not null,
  title text not null default 'Estudo de Farmácia',
  provider text not null,
  model text not null,
  prompt text not null,
  content jsonb not null,
  created_at timestamptz not null default now()
);

alter table public.study_generations
  add column if not exists id uuid not null default gen_random_uuid(),
  add column if not exists user_id uuid references auth.users (id) on delete cascade,
  add column if not exists kind text,
  add column if not exists type text,
  add column if not exists title text,
  add column if not exists provider text,
  add column if not exists model text,
  add column if not exists prompt text,
  add column if not exists content jsonb,
  add column if not exists created_at timestamptz not null default now();

update public.study_generations
set kind = coalesce(nullif(btrim(kind), ''), nullif(btrim(type), ''), 'material')
where kind is null or btrim(kind) = '';

update public.study_generations
set type = coalesce(nullif(btrim(type), ''), nullif(btrim(kind), ''), 'material')
where type is null or btrim(type) = '';

update public.study_generations
set title = coalesce(nullif(btrim(title), ''), nullif(btrim(prompt), ''), 'Estudo de Farmácia')
where title is null or btrim(title) = '';

alter table public.study_generations
  alter column id set default gen_random_uuid(),
  alter column type set not null,
  alter column title set default 'Estudo de Farmácia',
  alter column title set not null,
  alter column created_at set default now();

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'study_generations_kind_check'
      and conrelid = 'public.study_generations'::regclass
  ) then
    alter table public.study_generations
      add constraint study_generations_kind_check
      check (kind in ('chat', 'quiz', 'material')) not valid;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'study_generations_provider_check'
      and conrelid = 'public.study_generations'::regclass
  ) then
    alter table public.study_generations
      add constraint study_generations_provider_check
      check (provider in ('gemini', 'openai', 'anthropic', 'groq')) not valid;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'study_generations_required_fields_check'
      and conrelid = 'public.study_generations'::regclass
  ) then
    alter table public.study_generations
      add constraint study_generations_required_fields_check
      check (
        user_id is not null
        and kind is not null
        and type is not null
        and title is not null
        and provider is not null
        and model is not null
        and prompt is not null
        and content is not null
        and created_at is not null
      ) not valid;
  end if;
end
$$;

create index if not exists study_generations_user_created_idx
  on public.study_generations (user_id, created_at desc);

alter table public.study_generations enable row level security;

drop policy if exists "Users can read their own study generations"
  on public.study_generations;
create policy "Users can read their own study generations"
  on public.study_generations
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users can insert their own study generations"
  on public.study_generations;
create policy "Users can insert their own study generations"
  on public.study_generations
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

grant select, insert on public.study_generations to authenticated, service_role;

notify pgrst, 'reload schema';
