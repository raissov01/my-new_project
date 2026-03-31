alter table public.profiles
  add column if not exists bio text;

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

notify pgrst, 'reload schema';
