alter table public.profiles
  add column if not exists email text,
  add column if not exists full_name text;

update public.profiles
set
  email = coalesce(profiles.email, users.email),
  full_name = coalesce(
    nullif(profiles.full_name, ''),
    nullif(users.raw_user_meta_data->>'full_name', ''),
    nullif(users.raw_user_meta_data->>'username', ''),
    profiles.username
  )
from auth.users as users
where users.id = profiles.id;

alter table public.profiles
  alter column email set default '',
  alter column full_name set default '';

update public.profiles
set
  email = coalesce(nullif(email, ''), ''),
  full_name = coalesce(nullif(full_name, ''), username);

alter table public.profiles
  alter column email set not null,
  alter column full_name set not null;

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
    coalesce(
      nullif(new.raw_user_meta_data->>'role', ''),
      'student'
    )
  )
  on conflict (id) do update
  set
    email = excluded.email,
    full_name = excluded.full_name,
    username = excluded.username,
    role = excluded.role;

  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
