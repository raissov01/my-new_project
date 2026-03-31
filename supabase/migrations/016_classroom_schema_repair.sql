create extension if not exists pgcrypto;

alter table public.profiles
  add column if not exists role text not null default 'student'
  check (role in ('student', 'teacher'));

create table if not exists public.class_groups (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  owner_id uuid references public.profiles(id) on delete cascade not null,
  join_code text,
  created_at timestamptz default now() not null
);

create table if not exists public.class_group_members (
  id uuid default gen_random_uuid() primary key,
  group_id uuid references public.class_groups(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  role text default 'student' not null check (role in ('owner', 'student')),
  joined_at timestamptz default now() not null,
  unique (group_id, user_id)
);

create table if not exists public.class_challenges (
  id uuid default gen_random_uuid() primary key,
  group_id uuid references public.class_groups(id) on delete cascade not null,
  set_id uuid references public.flashcard_sets(id) on delete cascade not null,
  title text not null,
  deadline timestamptz,
  created_by uuid references public.profiles(id) on delete cascade not null,
  created_at timestamptz default now() not null
);

create table if not exists public.class_challenge_participants (
  id uuid default gen_random_uuid() primary key,
  challenge_id uuid references public.class_challenges(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  joined_at timestamptz default now() not null,
  unique (challenge_id, user_id)
);

create table if not exists public.class_challenge_attempts (
  id uuid default gen_random_uuid() primary key,
  challenge_id uuid references public.class_challenges(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  set_id uuid references public.flashcard_sets(id) on delete cascade not null,
  completion_time integer not null check (completion_time >= 0),
  accuracy numeric(5,2) not null check (accuracy >= 0 and accuracy <= 100),
  total_correct integer default 0 not null check (total_correct >= 0),
  total_incorrect integer default 0 not null check (total_incorrect >= 0),
  completed_at timestamptz default now() not null
);

create table if not exists public.class_set_assignments (
  id uuid default gen_random_uuid() primary key,
  group_id uuid references public.class_groups(id) on delete cascade not null,
  set_id uuid references public.flashcard_sets(id) on delete cascade not null,
  assigned_by uuid references public.profiles(id) on delete cascade not null,
  deadline timestamptz,
  created_at timestamptz default now() not null,
  unique (group_id, set_id)
);

create or replace function public.generate_class_join_code()
returns text
language plpgsql
as $$
declare
  candidate text;
begin
  loop
    candidate := upper(substr(md5(gen_random_uuid()::text), 1, 8));
    exit when not exists (
      select 1 from public.class_groups where join_code = candidate
    );
  end loop;

  return candidate;
end;
$$;

update public.class_groups
set join_code = public.generate_class_join_code()
where join_code is null or btrim(join_code) = '';

alter table public.class_groups
  alter column join_code set default public.generate_class_join_code();

alter table public.class_groups
  alter column join_code set not null;

create unique index if not exists class_groups_join_code_key
  on public.class_groups(join_code);
create index if not exists class_groups_owner_idx
  on public.class_groups(owner_id);
create index if not exists class_group_members_group_idx
  on public.class_group_members(group_id);
create index if not exists class_group_members_user_idx
  on public.class_group_members(user_id);
create index if not exists class_challenges_group_idx
  on public.class_challenges(group_id, created_at desc);
create index if not exists class_challenges_set_idx
  on public.class_challenges(set_id);
create index if not exists class_challenge_participants_challenge_idx
  on public.class_challenge_participants(challenge_id);
create index if not exists class_challenge_participants_user_idx
  on public.class_challenge_participants(user_id);
create index if not exists class_challenge_attempts_challenge_idx
  on public.class_challenge_attempts(challenge_id, completed_at desc);
create index if not exists class_challenge_attempts_user_idx
  on public.class_challenge_attempts(user_id, completed_at desc);
create index if not exists class_set_assignments_group_idx
  on public.class_set_assignments(group_id, created_at desc);
create index if not exists class_set_assignments_set_idx
  on public.class_set_assignments(set_id);

alter table public.class_groups enable row level security;
alter table public.class_group_members enable row level security;
alter table public.class_challenges enable row level security;
alter table public.class_challenge_participants enable row level security;
alter table public.class_challenge_attempts enable row level security;
alter table public.class_set_assignments enable row level security;

create or replace function public.join_class_group_by_code(p_join_code text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  target_group_id uuid;
  current_role text;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  select role into current_role
  from public.profiles
  where id = auth.uid();

  if current_role is distinct from 'student' then
    raise exception 'Only students can join classes by code';
  end if;

  select id into target_group_id
  from public.class_groups
  where join_code = upper(trim(p_join_code));

  if target_group_id is null then
    raise exception 'Class not found';
  end if;

  insert into public.class_group_members (group_id, user_id, role)
  values (target_group_id, auth.uid(), 'student')
  on conflict (group_id, user_id) do nothing;

  return target_group_id;
end;
$$;

grant execute on function public.join_class_group_by_code(text) to authenticated;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'class_groups'
      and policyname = 'Group members can view their groups'
  ) then
    create policy "Group members can view their groups"
      on public.class_groups for select
      using (
        owner_id = auth.uid()
        or exists (
          select 1 from public.class_group_members
          where class_group_members.group_id = class_groups.id
            and class_group_members.user_id = auth.uid()
        )
      );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'class_groups'
      and policyname = 'Users can create their own groups'
  ) then
    create policy "Users can create their own groups"
      on public.class_groups for insert
      with check (owner_id = auth.uid());
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'class_groups'
      and policyname = 'Owners can update their own groups'
  ) then
    create policy "Owners can update their own groups"
      on public.class_groups for update
      using (owner_id = auth.uid());
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'class_group_members'
      and policyname = 'Group members can view memberships'
  ) then
    create policy "Group members can view memberships"
      on public.class_group_members for select
      using (
        user_id = auth.uid()
        or exists (
          select 1 from public.class_groups
          where class_groups.id = class_group_members.group_id
            and class_groups.owner_id = auth.uid()
        )
        or exists (
          select 1 from public.class_group_members viewer
          where viewer.group_id = class_group_members.group_id
            and viewer.user_id = auth.uid()
        )
      );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'class_group_members'
      and policyname = 'Owners can manage memberships'
  ) then
    create policy "Owners can manage memberships"
      on public.class_group_members for all
      using (
        exists (
          select 1 from public.class_groups
          where class_groups.id = class_group_members.group_id
            and class_groups.owner_id = auth.uid()
        )
      )
      with check (
        exists (
          select 1 from public.class_groups
          where class_groups.id = class_group_members.group_id
            and class_groups.owner_id = auth.uid()
        )
      );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'class_challenges'
      and policyname = 'Class members can view challenges'
  ) then
    create policy "Class members can view challenges"
      on public.class_challenges for select
      using (
        exists (
          select 1 from public.class_group_members
          where class_group_members.group_id = class_challenges.group_id
            and class_group_members.user_id = auth.uid()
        )
      );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'class_challenges'
      and policyname = 'Group owners can manage challenges'
  ) then
    create policy "Group owners can manage challenges"
      on public.class_challenges for all
      using (
        exists (
          select 1 from public.class_groups
          where class_groups.id = class_challenges.group_id
            and class_groups.owner_id = auth.uid()
        )
      )
      with check (
        exists (
          select 1 from public.class_groups
          where class_groups.id = class_challenges.group_id
            and class_groups.owner_id = auth.uid()
        )
        and created_by = auth.uid()
      );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'class_challenge_participants'
      and policyname = 'Class members can view participants'
  ) then
    create policy "Class members can view participants"
      on public.class_challenge_participants for select
      using (
        exists (
          select 1
          from public.class_challenges cc
          join public.class_group_members cgm on cgm.group_id = cc.group_id
          where cc.id = class_challenge_participants.challenge_id
            and cgm.user_id = auth.uid()
        )
      );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'class_challenge_participants'
      and policyname = 'Members can join their class challenges'
  ) then
    create policy "Members can join their class challenges"
      on public.class_challenge_participants for insert
      with check (
        user_id = auth.uid()
        and exists (
          select 1
          from public.class_challenges cc
          join public.class_group_members cgm on cgm.group_id = cc.group_id
          where cc.id = class_challenge_participants.challenge_id
            and cgm.user_id = auth.uid()
        )
      );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'class_challenge_attempts'
      and policyname = 'Members can view class challenge attempts'
  ) then
    create policy "Members can view class challenge attempts"
      on public.class_challenge_attempts for select
      using (
        exists (
          select 1
          from public.class_challenges cc
          join public.class_group_members cgm on cgm.group_id = cc.group_id
          where cc.id = class_challenge_attempts.challenge_id
            and cgm.user_id = auth.uid()
        )
      );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'class_challenge_attempts'
      and policyname = 'Participants can insert their own class challenge attempts'
  ) then
    create policy "Participants can insert their own class challenge attempts"
      on public.class_challenge_attempts for insert
      with check (
        user_id = auth.uid()
        and exists (
          select 1 from public.class_challenge_participants ccp
          where ccp.challenge_id = class_challenge_attempts.challenge_id
            and ccp.user_id = auth.uid()
        )
      );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'class_set_assignments'
      and policyname = 'Class members can view set assignments'
  ) then
    create policy "Class members can view set assignments"
      on public.class_set_assignments for select
      using (
        exists (
          select 1
          from public.class_group_members
          where class_group_members.group_id = class_set_assignments.group_id
            and class_group_members.user_id = auth.uid()
        )
      );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'class_set_assignments'
      and policyname = 'Teachers can manage set assignments'
  ) then
    create policy "Teachers can manage set assignments"
      on public.class_set_assignments for all
      using (
        exists (
          select 1 from public.class_groups
          where class_groups.id = class_set_assignments.group_id
            and class_groups.owner_id = auth.uid()
        )
      )
      with check (
        exists (
          select 1 from public.class_groups
          where class_groups.id = class_set_assignments.group_id
            and class_groups.owner_id = auth.uid()
        )
        and assigned_by = auth.uid()
      );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'flashcard_sets'
      and policyname = 'Assigned class sets are viewable by class members'
  ) then
    create policy "Assigned class sets are viewable by class members"
      on public.flashcard_sets for select
      using (
        exists (
          select 1
          from public.class_set_assignments csa
          join public.class_group_members cgm on cgm.group_id = csa.group_id
          where csa.set_id = flashcard_sets.id
            and cgm.user_id = auth.uid()
        )
      );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'flashcard_sets'
      and policyname = 'Class challenge sets are viewable by class members'
  ) then
    create policy "Class challenge sets are viewable by class members"
      on public.flashcard_sets for select
      using (
        exists (
          select 1
          from public.class_challenges cc
          join public.class_group_members cgm on cgm.group_id = cc.group_id
          where cc.set_id = flashcard_sets.id
            and cgm.user_id = auth.uid()
        )
      );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'flashcards'
      and policyname = 'Assigned class cards are viewable by class members'
  ) then
    create policy "Assigned class cards are viewable by class members"
      on public.flashcards for select
      using (
        exists (
          select 1
          from public.class_set_assignments csa
          join public.class_group_members cgm on cgm.group_id = csa.group_id
          where csa.set_id = flashcards.set_id
            and cgm.user_id = auth.uid()
        )
      );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'flashcards'
      and policyname = 'Class challenge cards are viewable by class members'
  ) then
    create policy "Class challenge cards are viewable by class members"
      on public.flashcards for select
      using (
        exists (
          select 1
          from public.class_challenges cc
          join public.class_group_members cgm on cgm.group_id = cc.group_id
          where cc.set_id = flashcards.set_id
            and cgm.user_id = auth.uid()
        )
      );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'study_progress'
      and policyname = 'Teachers can view class study progress'
  ) then
    create policy "Teachers can view class study progress"
      on public.study_progress for select
      using (
        exists (
          select 1
          from public.class_groups cg
          join public.class_group_members cgm on cgm.group_id = cg.id
          left join public.class_set_assignments csa on csa.group_id = cg.id
          left join public.class_challenges cc on cc.group_id = cg.id
          join public.flashcards f on f.id = study_progress.flashcard_id
          where cg.owner_id = auth.uid()
            and cgm.user_id = study_progress.user_id
            and (
              csa.set_id = f.set_id
              or cc.set_id = f.set_id
            )
        )
      );
  end if;
end
$$;
