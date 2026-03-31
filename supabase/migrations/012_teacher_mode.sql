alter table public.profiles
  add column if not exists role text not null default 'student'
  check (role in ('student', 'teacher'));

update public.profiles
set role = 'teacher'
where id in (
  select owner_id from public.class_groups
);

alter table public.class_groups
  add column if not exists join_code text;

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
where join_code is null;

alter table public.class_groups
  alter column join_code set not null;

create unique index if not exists class_groups_join_code_key
  on public.class_groups(join_code);

create table if not exists public.class_set_assignments (
  id uuid default gen_random_uuid() primary key,
  group_id uuid references public.class_groups(id) on delete cascade not null,
  set_id uuid references public.flashcard_sets(id) on delete cascade not null,
  assigned_by uuid references public.profiles(id) on delete cascade not null,
  deadline timestamptz,
  created_at timestamptz default now() not null,
  unique (group_id, set_id)
);

create index if not exists class_set_assignments_group_idx
  on public.class_set_assignments(group_id, created_at desc);
create index if not exists class_set_assignments_set_idx
  on public.class_set_assignments(set_id);

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
