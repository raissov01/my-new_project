-- Profiles table (extends Supabase auth.users)
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  username text unique not null,
  avatar_url text,
  created_at timestamptz default now() not null
);

-- Flashcard sets
create table public.flashcard_sets (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  description text,
  is_public boolean default false not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- Individual flashcards
create table public.flashcards (
  id uuid default gen_random_uuid() primary key,
  term text not null,
  definition text not null,
  position integer not null,
  set_id uuid references public.flashcard_sets(id) on delete cascade not null,
  created_at timestamptz default now() not null
);

-- Indexes
create index flashcard_sets_user_id_idx on public.flashcard_sets(user_id);
create index flashcards_set_id_idx on public.flashcards(set_id);
create index flashcards_position_idx on public.flashcards(set_id, position);

-- Row-level security
alter table public.profiles enable row level security;
alter table public.flashcard_sets enable row level security;
alter table public.flashcards enable row level security;

-- Profiles policies
create policy "Public profiles are viewable by everyone"
  on public.profiles for select using (true);

create policy "Users can update their own profile"
  on public.profiles for update using (auth.uid() = id);

-- Flashcard sets policies
create policy "Public sets are viewable by everyone"
  on public.flashcard_sets for select
  using (is_public = true or auth.uid() = user_id);

create policy "Users can create their own sets"
  on public.flashcard_sets for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own sets"
  on public.flashcard_sets for update
  using (auth.uid() = user_id);

create policy "Users can delete their own sets"
  on public.flashcard_sets for delete
  using (auth.uid() = user_id);

-- Flashcards policies
create policy "Cards in public sets are viewable by everyone"
  on public.flashcards for select
  using (
    exists (
      select 1 from public.flashcard_sets
      where id = flashcards.set_id
      and (is_public = true or auth.uid() = user_id)
    )
  );

create policy "Users can manage cards in their own sets"
  on public.flashcards for insert
  with check (
    exists (
      select 1 from public.flashcard_sets
      where id = flashcards.set_id and auth.uid() = user_id
    )
  );

create policy "Users can update cards in their own sets"
  on public.flashcards for update
  using (
    exists (
      select 1 from public.flashcard_sets
      where id = flashcards.set_id and auth.uid() = user_id
    )
  );

create policy "Users can delete cards in their own sets"
  on public.flashcards for delete
  using (
    exists (
      select 1 from public.flashcard_sets
      where id = flashcards.set_id and auth.uid() = user_id
    )
  );

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, username)
  values (new.id, coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)));
  return new;
end;
$$ language plpgsql security definer;

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

create trigger set_updated_at
  before update on public.flashcard_sets
  for each row execute function public.update_updated_at();
