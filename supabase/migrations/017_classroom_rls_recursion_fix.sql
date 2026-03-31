create or replace function public.is_teacher(target_user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = target_user_id
      and role = 'teacher'
  );
$$;

create or replace function public.is_class_group_owner(
  target_group_id uuid,
  target_user_id uuid default auth.uid()
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.class_groups
    where id = target_group_id
      and owner_id = target_user_id
  );
$$;

create or replace function public.is_class_group_member(
  target_group_id uuid,
  target_user_id uuid default auth.uid()
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.class_group_members
    where group_id = target_group_id
      and user_id = target_user_id
  );
$$;

drop policy if exists "Group members can view their groups" on public.class_groups;
drop policy if exists "Users can create their own groups" on public.class_groups;
drop policy if exists "Owners can update their own groups" on public.class_groups;

create policy "Users can view accessible class groups"
  on public.class_groups
  for select
  using (
    owner_id = auth.uid()
    or public.is_class_group_member(id, auth.uid())
  );

create policy "Teachers can create their own class groups"
  on public.class_groups
  for insert
  with check (
    owner_id = auth.uid()
    and public.is_teacher(auth.uid())
  );

create policy "Teachers can update their own class groups"
  on public.class_groups
  for update
  using (
    owner_id = auth.uid()
    and public.is_teacher(auth.uid())
  )
  with check (
    owner_id = auth.uid()
    and public.is_teacher(auth.uid())
  );

drop policy if exists "Group members can view memberships" on public.class_group_members;
drop policy if exists "Owners can manage memberships" on public.class_group_members;

create policy "Users can view relevant class memberships"
  on public.class_group_members
  for select
  using (
    user_id = auth.uid()
    or public.is_class_group_owner(group_id, auth.uid())
  );

create policy "Teachers can manage class memberships"
  on public.class_group_members
  for all
  using (
    public.is_class_group_owner(group_id, auth.uid())
    and public.is_teacher(auth.uid())
  )
  with check (
    public.is_class_group_owner(group_id, auth.uid())
    and public.is_teacher(auth.uid())
  );
