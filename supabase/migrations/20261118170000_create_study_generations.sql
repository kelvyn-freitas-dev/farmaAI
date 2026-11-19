create table public.study_generations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  kind text not null check (kind in ('chat', 'quiz', 'material')),
  provider text not null check (provider in ('gemini', 'openai', 'anthropic', 'groq')),
  model text not null,
  prompt text not null,
  content jsonb not null,
  created_at timestamptz not null default now()
);

create index study_generations_user_created_idx
  on public.study_generations (user_id, created_at desc);

alter table public.study_generations enable row level security;

create policy "Users can read their own study generations"
  on public.study_generations
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can insert their own study generations"
  on public.study_generations
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

grant select, insert on public.study_generations to authenticated;
