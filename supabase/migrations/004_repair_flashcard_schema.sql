create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  username text unique not null,
  avatar_url text,
  bio text,
  created_at timestamptz default now() not null,
  streak_days integer default 0 not null,
  last_active_date date,
  points integer default 0 not null
);

create table if not exists public.flashcard_sets (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  description text,
  is_public boolean default false not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

create table if not exists public.flashcards (
  id uuid default gen_random_uuid() primary key,
  term text not null,
  definition text not null,
  position integer not null,
  set_id uuid references public.flashcard_sets(id) on delete cascade not null,
  created_at timestamptz default now() not null
);

create table if not exists public.study_progress (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  flashcard_id uuid references public.flashcards(id) on delete cascade not null,
  times_seen integer default 0 not null,
  times_correct integer default 0 not null,
  times_incorrect integer default 0 not null,
  last_studied_at timestamptz default now() not null,
  created_at timestamptz default now() not null,
  is_weak boolean default false not null,
  review_interval integer default 1 not null,
  next_review_at timestamptz default now() not null,
  last_reviewed_at timestamptz,
  unique (user_id, flashcard_id)
);

alter table public.flashcard_sets
  add column if not exists description text,
  add column if not exists is_public boolean default false not null,
  add column if not exists updated_at timestamptz default now() not null;

alter table public.profiles
  add column if not exists bio text,
  add column if not exists streak_days integer default 0 not null,
  add column if not exists last_active_date date,
  add column if not exists points integer default 0 not null;

alter table public.flashcards
  add column if not exists position integer default 0 not null,
  add column if not exists created_at timestamptz default now() not null;

alter table public.study_progress
  add column if not exists times_seen integer default 0 not null,
  add column if not exists times_correct integer default 0 not null,
  add column if not exists times_incorrect integer default 0 not null,
  add column if not exists last_studied_at timestamptz default now() not null,
  add column if not exists created_at timestamptz default now() not null,
  add column if not exists is_weak boolean default false not null,
  add column if not exists review_interval integer default 1 not null,
  add column if not exists next_review_at timestamptz default now() not null,
  add column if not exists last_reviewed_at timestamptz;

create index if not exists flashcard_sets_user_id_idx
  on public.flashcard_sets(user_id);

create index if not exists flashcards_set_id_idx
  on public.flashcards(set_id);

create index if not exists flashcards_position_idx
  on public.flashcards(set_id, position);

create index if not exists study_progress_user_id_idx
  on public.study_progress(user_id);

create index if not exists study_progress_flashcard_id_idx
  on public.study_progress(flashcard_id);

create index if not exists study_progress_last_studied_idx
  on public.study_progress(user_id, last_studied_at desc);

create index if not exists study_progress_next_review_idx
  on public.study_progress(user_id, next_review_at asc);

create index if not exists study_progress_weak_idx
  on public.study_progress(user_id, is_weak)
  where is_weak = true;

alter table public.profiles enable row level security;
alter table public.flashcard_sets enable row level security;
alter table public.flashcards enable row level security;
alter table public.study_progress enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'profiles'
      and policyname = 'Public profiles are viewable by everyone'
  ) then
    create policy "Public profiles are viewable by everyone"
      on public.profiles for select using (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'profiles'
      and policyname = 'Users can update their own profile'
  ) then
    create policy "Users can update their own profile"
      on public.profiles for update using (auth.uid() = id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'profiles'
      and policyname = 'Users can create their own profile'
  ) then
    create policy "Users can create their own profile"
      on public.profiles for insert
      with check (auth.uid() = id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'flashcard_sets'
      and policyname = 'Public sets are viewable by everyone'
  ) then
    create policy "Public sets are viewable by everyone"
      on public.flashcard_sets for select
      using (is_public = true or auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'flashcard_sets'
      and policyname = 'Users can create their own sets'
  ) then
    create policy "Users can create their own sets"
      on public.flashcard_sets for insert
      with check (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'flashcard_sets'
      and policyname = 'Users can update their own sets'
  ) then
    create policy "Users can update their own sets"
      on public.flashcard_sets for update
      using (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'flashcard_sets'
      and policyname = 'Users can delete their own sets'
  ) then
    create policy "Users can delete their own sets"
      on public.flashcard_sets for delete
      using (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'flashcards'
      and policyname = 'Cards in public sets are viewable by everyone'
  ) then
    create policy "Cards in public sets are viewable by everyone"
      on public.flashcards for select
      using (
        exists (
          select 1 from public.flashcard_sets
          where id = flashcards.set_id
            and (is_public = true or auth.uid() = user_id)
        )
      );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'flashcards'
      and policyname = 'Users can manage cards in their own sets'
  ) then
    create policy "Users can manage cards in their own sets"
      on public.flashcards for insert
      with check (
        exists (
          select 1 from public.flashcard_sets
          where id = flashcards.set_id
            and auth.uid() = user_id
        )
      );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'flashcards'
      and policyname = 'Users can update cards in their own sets'
  ) then
    create policy "Users can update cards in their own sets"
      on public.flashcards for update
      using (
        exists (
          select 1 from public.flashcard_sets
          where id = flashcards.set_id
            and auth.uid() = user_id
        )
      );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'flashcards'
      and policyname = 'Users can delete cards in their own sets'
  ) then
    create policy "Users can delete cards in their own sets"
      on public.flashcards for delete
      using (
        exists (
          select 1 from public.flashcard_sets
          where id = flashcards.set_id
            and auth.uid() = user_id
        )
      );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'study_progress'
      and policyname = 'Users can view their own progress'
  ) then
    create policy "Users can view their own progress"
      on public.study_progress for select
      using (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'study_progress'
      and policyname = 'Users can insert their own progress'
  ) then
    create policy "Users can insert their own progress"
      on public.study_progress for insert
      with check (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'study_progress'
      and policyname = 'Users can update their own progress'
  ) then
    create policy "Users can update their own progress"
      on public.study_progress for update
      using (auth.uid() = user_id);
  end if;
end
$$;

create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, username)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1))
  )
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

create or replace function public.update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

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
    times_seen = public.study_progress.times_seen + 1,
    times_correct = public.study_progress.times_correct + case when p_correct then 1 else 0 end,
    times_incorrect = public.study_progress.times_incorrect + case when p_correct then 0 else 1 end,
    last_studied_at = now(),
    last_reviewed_at = now(),
    review_interval = case
      when p_correct then least(
        case public.study_progress.review_interval
          when 1 then 2
          when 2 then 4
          when 4 then 7
          when 7 then 14
          when 14 then 30
          else 30
        end, 30)
      else 1
    end,
    next_review_at = case
      when p_correct then now() + (
        case public.study_progress.review_interval
          when 1 then interval '2 days'
          when 2 then interval '4 days'
          when 4 then interval '7 days'
          when 7 then interval '14 days'
          when 14 then interval '30 days'
          else interval '30 days'
        end)
      else now() + interval '1 day'
    end,
    is_weak = case
      when not p_correct then true
      else (
        (public.study_progress.times_correct + 1)::numeric /
        nullif(public.study_progress.times_correct + public.study_progress.times_incorrect + 1, 0)
      ) < 0.7
    end;
end;
$$ language plpgsql security definer;

create or replace function public.delete_current_user_account()
returns boolean
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  current_user_id uuid := auth.uid();
begin
  if current_user_id is null then
    raise exception 'Not authenticated';
  end if;

  delete from auth.users
  where id = current_user_id;

  return true;
end;
$$;

grant execute on function public.delete_current_user_account() to authenticated;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

drop trigger if exists set_updated_at on public.flashcard_sets;
create trigger set_updated_at
  before update on public.flashcard_sets
  for each row execute function public.update_updated_at();

create table if not exists public.pomodoro_preferences (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  work_minutes int not null default 25 check (work_minutes >= 5),
  break_minutes int not null default 5 check (break_minutes >= 1),
  updated_at timestamptz not null default now()
);

alter table public.pomodoro_preferences enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'pomodoro_preferences'
      and policyname = 'Users can view own pomodoro preferences'
  ) then
    create policy "Users can view own pomodoro preferences"
      on public.pomodoro_preferences for select
      using (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'pomodoro_preferences'
      and policyname = 'Users can upsert own pomodoro preferences'
  ) then
    create policy "Users can upsert own pomodoro preferences"
      on public.pomodoro_preferences for insert
      with check (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'pomodoro_preferences'
      and policyname = 'Users can update own pomodoro preferences'
  ) then
    create policy "Users can update own pomodoro preferences"
      on public.pomodoro_preferences for update
      using (auth.uid() = user_id);
  end if;
end $$;

notify pgrst, 'reload schema';
