create table if not exists public.flashcard_set_access (
  id uuid default gen_random_uuid() primary key,
  set_id uuid references public.flashcard_sets(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  granted_by uuid references public.profiles(id) on delete cascade not null,
  created_at timestamptz default now() not null,
  unique (set_id, user_id)
);

create table if not exists public.challenge_attempts (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  set_id uuid references public.flashcard_sets(id) on delete cascade not null,
  completion_time integer not null check (completion_time >= 0),
  accuracy numeric(5,2) not null check (accuracy >= 0 and accuracy <= 100),
  total_correct integer not null default 0 check (total_correct >= 0),
  total_incorrect integer not null default 0 check (total_incorrect >= 0),
  completed_at timestamptz default now() not null
);

create index if not exists flashcard_set_access_set_idx
  on public.flashcard_set_access(set_id);

create index if not exists flashcard_set_access_user_idx
  on public.flashcard_set_access(user_id);

create index if not exists challenge_attempts_set_idx
  on public.challenge_attempts(set_id, completed_at desc);

create index if not exists challenge_attempts_user_idx
  on public.challenge_attempts(user_id, completed_at desc);

alter table public.flashcard_set_access enable row level security;
alter table public.challenge_attempts enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'flashcard_sets'
      and policyname = 'Accessible sets are viewable by allowed users'
  ) then
    create policy "Accessible sets are viewable by allowed users"
      on public.flashcard_sets for select
      using (
        is_public = true
        or auth.uid() = user_id
        or exists (
          select 1 from public.flashcard_set_access
          where flashcard_set_access.set_id = flashcard_sets.id
            and flashcard_set_access.user_id = auth.uid()
        )
      );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'flashcards'
      and policyname = 'Cards in accessible sets are viewable by allowed users'
  ) then
    create policy "Cards in accessible sets are viewable by allowed users"
      on public.flashcards for select
      using (
        exists (
          select 1 from public.flashcard_sets
          where flashcard_sets.id = flashcards.set_id
            and (
              flashcard_sets.is_public = true
              or flashcard_sets.user_id = auth.uid()
              or exists (
                select 1 from public.flashcard_set_access
                where flashcard_set_access.set_id = flashcards.set_id
                  and flashcard_set_access.user_id = auth.uid()
              )
            )
        )
      );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'flashcard_set_access'
      and policyname = 'Set owners can manage private access'
  ) then
    create policy "Set owners can manage private access"
      on public.flashcard_set_access for all
      using (
        exists (
          select 1 from public.flashcard_sets
          where flashcard_sets.id = flashcard_set_access.set_id
            and flashcard_sets.user_id = auth.uid()
        )
      )
      with check (
        exists (
          select 1 from public.flashcard_sets
          where flashcard_sets.id = flashcard_set_access.set_id
            and flashcard_sets.user_id = auth.uid()
        )
        and granted_by = auth.uid()
      );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'flashcard_set_access'
      and policyname = 'Users can view their own private access'
  ) then
    create policy "Users can view their own private access"
      on public.flashcard_set_access for select
      using (
        user_id = auth.uid()
        or exists (
          select 1 from public.flashcard_sets
          where flashcard_sets.id = flashcard_set_access.set_id
            and flashcard_sets.user_id = auth.uid()
        )
      );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'challenge_attempts'
      and policyname = 'Users can view challenge attempts they can access'
  ) then
    create policy "Users can view challenge attempts they can access"
      on public.challenge_attempts for select
      using (
        exists (
          select 1 from public.flashcard_sets
          where flashcard_sets.id = challenge_attempts.set_id
            and (
              flashcard_sets.is_public = true
              or flashcard_sets.user_id = auth.uid()
              or exists (
                select 1 from public.flashcard_set_access
                where flashcard_set_access.set_id = challenge_attempts.set_id
                  and flashcard_set_access.user_id = auth.uid()
              )
            )
        )
      );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'challenge_attempts'
      and policyname = 'Users can insert their own accessible challenge attempts'
  ) then
    create policy "Users can insert their own accessible challenge attempts"
      on public.challenge_attempts for insert
      with check (
        auth.uid() = user_id
        and exists (
          select 1 from public.flashcard_sets
          where flashcard_sets.id = challenge_attempts.set_id
            and (
              flashcard_sets.is_public = true
              or flashcard_sets.user_id = auth.uid()
              or exists (
                select 1 from public.flashcard_set_access
                where flashcard_set_access.set_id = challenge_attempts.set_id
                  and flashcard_set_access.user_id = auth.uid()
              )
            )
        )
      );
  end if;
end $$;
