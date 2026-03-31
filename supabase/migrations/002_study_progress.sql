-- Per-card study progress, upserted after each session
create table public.study_progress (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  flashcard_id uuid references public.flashcards(id) on delete cascade not null,
  times_seen integer default 0 not null,
  times_correct integer default 0 not null,
  times_incorrect integer default 0 not null,
  last_studied_at timestamptz default now() not null,
  created_at timestamptz default now() not null,

  -- One row per user per flashcard
  unique (user_id, flashcard_id)
);

create index study_progress_user_id_idx on public.study_progress(user_id);
create index study_progress_flashcard_id_idx on public.study_progress(flashcard_id);
create index study_progress_last_studied_idx on public.study_progress(user_id, last_studied_at desc);

-- RLS
alter table public.study_progress enable row level security;

create policy "Users can view their own progress"
  on public.study_progress for select
  using (auth.uid() = user_id);

create policy "Users can insert their own progress"
  on public.study_progress for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own progress"
  on public.study_progress for update
  using (auth.uid() = user_id);

-- Atomic upsert function: increments counters server-side to avoid
-- read-modify-write race conditions from concurrent sessions.
create or replace function public.upsert_study_progress(
  p_user_id uuid,
  p_flashcard_id uuid,
  p_correct boolean
)
returns void as $$
begin
  insert into public.study_progress (user_id, flashcard_id, times_seen, times_correct, times_incorrect, last_studied_at)
  values (
    p_user_id,
    p_flashcard_id,
    1,
    case when p_correct then 1 else 0 end,
    case when p_correct then 0 else 1 end,
    now()
  )
  on conflict (user_id, flashcard_id) do update set
    times_seen = study_progress.times_seen + 1,
    times_correct = study_progress.times_correct + case when p_correct then 1 else 0 end,
    times_incorrect = study_progress.times_incorrect + case when p_correct then 0 else 1 end,
    last_studied_at = now();
end;
$$ language plpgsql security definer;
