-- ============================================================================
-- StudyWithRaissov — Combined Schema
-- Run this in the Supabase SQL Editor to create all tables, policies,
-- functions, and triggers in one go.
-- ============================================================================

-- ── 001: Core Tables ─────────────────────────────────────────────────────────

-- Profiles table (extends Supabase auth.users)
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text not null default '',
  full_name text not null default '',
  username text unique not null,
  avatar_url text,
  bio text,
  created_at timestamptz default now() not null,
  streak_days integer default 0 not null,
  last_active_date date,
  points integer default 0 not null,
  role text not null default 'student' check (role in ('student', 'teacher'))
);

-- Flashcard sets
create table if not exists public.flashcard_sets (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  description text,
  is_public boolean default false not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- Individual flashcards
create table if not exists public.flashcards (
  id uuid default gen_random_uuid() primary key,
  term text not null,
  definition text not null,
  position integer not null,
  set_id uuid references public.flashcard_sets(id) on delete cascade not null,
  created_at timestamptz default now() not null
);

-- Indexes
create index if not exists flashcard_sets_user_id_idx on public.flashcard_sets(user_id);
create index if not exists flashcards_set_id_idx on public.flashcards(set_id);
create index if not exists flashcards_position_idx on public.flashcards(set_id, position);

-- Row-level security
alter table public.profiles enable row level security;
alter table public.flashcard_sets enable row level security;
alter table public.flashcards enable row level security;

-- Profiles policies
do $$ begin
  create policy "Public profiles are viewable by everyone"
    on public.profiles for select using (true);
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy "Users can update their own profile"
    on public.profiles for update using (auth.uid() = id);
exception when duplicate_object then null;
end $$;

-- Flashcard sets policies
do $$ begin
  create policy "Public sets are viewable by everyone"
    on public.flashcard_sets for select
    using (is_public = true or auth.uid() = user_id);
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy "Users can create their own sets"
    on public.flashcard_sets for insert
    with check (auth.uid() = user_id);
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy "Users can update their own sets"
    on public.flashcard_sets for update
    using (auth.uid() = user_id);
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy "Users can delete their own sets"
    on public.flashcard_sets for delete
    using (auth.uid() = user_id);
exception when duplicate_object then null;
end $$;

-- Flashcards policies
do $$ begin
  create policy "Cards in public sets are viewable by everyone"
    on public.flashcards for select
    using (
      exists (
        select 1 from public.flashcard_sets
        where id = flashcards.set_id
        and (is_public = true or auth.uid() = user_id)
      )
    );
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy "Users can manage cards in their own sets"
    on public.flashcards for insert
    with check (
      exists (
        select 1 from public.flashcard_sets
        where id = flashcards.set_id and auth.uid() = user_id
      )
    );
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy "Users can update cards in their own sets"
    on public.flashcards for update
    using (
      exists (
        select 1 from public.flashcard_sets
        where id = flashcards.set_id and auth.uid() = user_id
      )
    );
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy "Users can delete cards in their own sets"
    on public.flashcards for delete
    using (
      exists (
        select 1 from public.flashcard_sets
        where id = flashcards.set_id and auth.uid() = user_id
      )
    );
exception when duplicate_object then null;
end $$;

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name, username, role)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(
      nullif(new.raw_user_meta_data->>'full_name', ''),
      nullif(new.raw_user_meta_data->>'username', ''),
      split_part(coalesce(new.email, ''), '@', 1)
    ),
    coalesce(
      nullif(new.raw_user_meta_data->>'username', ''),
      split_part(coalesce(new.email, ''), '@', 1)
    ),
    coalesce(nullif(new.raw_user_meta_data->>'role', ''), 'student')
  );
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Auto-update updated_at
create or replace function public.update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists set_updated_at on public.flashcard_sets;
create trigger set_updated_at
  before update on public.flashcard_sets
  for each row execute function public.update_updated_at();


-- ── 002: Study Progress ──────────────────────────────────────────────────────

create table if not exists public.study_progress (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  flashcard_id uuid references public.flashcards(id) on delete cascade not null,
  times_seen integer default 0 not null,
  times_correct integer default 0 not null,
  times_incorrect integer default 0 not null,
  is_weak boolean default false not null,
  review_interval integer default 1 not null,
  next_review_at timestamptz default now() not null,
  last_reviewed_at timestamptz,
  last_studied_at timestamptz default now() not null,
  created_at timestamptz default now() not null,
  unique (user_id, flashcard_id)
);

create index if not exists study_progress_user_id_idx on public.study_progress(user_id);
create index if not exists study_progress_flashcard_id_idx on public.study_progress(flashcard_id);
create index if not exists study_progress_last_studied_idx on public.study_progress(user_id, last_studied_at desc);
create index if not exists study_progress_next_review_idx on public.study_progress(user_id, next_review_at asc);
create index if not exists study_progress_weak_idx on public.study_progress(user_id, is_weak) where is_weak = true;

alter table public.study_progress enable row level security;

do $$ begin
  create policy "Users can view their own progress"
    on public.study_progress for select using (auth.uid() = user_id);
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy "Users can insert their own progress"
    on public.study_progress for insert with check (auth.uid() = user_id);
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy "Users can update their own progress"
    on public.study_progress for update using (auth.uid() = user_id);
exception when duplicate_object then null;
end $$;


-- ── 003: Spaced Repetition Function ─────────────────────────────────────────

create or replace function public.upsert_study_progress(
  p_user_id uuid,
  p_flashcard_id uuid,
  p_correct boolean
)
returns void as $$
begin
  insert into public.study_progress (
    user_id, flashcard_id,
    times_seen, times_correct, times_incorrect,
    last_studied_at, last_reviewed_at,
    review_interval, next_review_at, is_weak
  )
  values (
    p_user_id, p_flashcard_id,
    1,
    case when p_correct then 1 else 0 end,
    case when p_correct then 0 else 1 end,
    now(), now(),
    case when p_correct then 2 else 1 end,
    case when p_correct then now() + interval '2 days' else now() + interval '1 day' end,
    not p_correct
  )
  on conflict (user_id, flashcard_id) do update set
    times_seen = study_progress.times_seen + 1,
    times_correct = study_progress.times_correct + case when p_correct then 1 else 0 end,
    times_incorrect = study_progress.times_incorrect + case when p_correct then 0 else 1 end,
    last_studied_at = now(),
    last_reviewed_at = now(),
    review_interval = case
      when p_correct then least(
        case study_progress.review_interval
          when 1 then 2  when 2 then 4  when 4 then 7
          when 7 then 14  when 14 then 30  else 30
        end, 30)
      else 1
    end,
    next_review_at = case
      when p_correct then now() + (
        case study_progress.review_interval
          when 1 then interval '2 days'  when 2 then interval '4 days'
          when 4 then interval '7 days'  when 7 then interval '14 days'
          when 14 then interval '30 days'  else interval '30 days'
        end)
      else now() + interval '1 day'
    end,
    is_weak = case
      when not p_correct then true
      else (
        (study_progress.times_correct + 1)::numeric /
        nullif(study_progress.times_correct + study_progress.times_incorrect + 1, 0)
      ) < 0.7
    end;
end;
$$ language plpgsql security definer;
