-- Add SELECT policy so users can read their own profile.
-- Without this, upsert (ON CONFLICT check) and normal reads fail under RLS.
do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'profiles'
      and policyname = 'Users can read their own profile'
  ) then
    create policy "Users can read their own profile"
      on public.profiles for select
      using (auth.uid() = id);
  end if;
end
$$;
