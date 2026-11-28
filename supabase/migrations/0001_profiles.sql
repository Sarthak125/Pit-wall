-- Pit Wall accounts: one row per signed-in person holding the settings that follow them between devices
-- (favourites, theme, spoiler-free mode, session reminders). Run this once in the Supabase SQL editor.

create table if not exists public.profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  -- Keeps a row small; Pit Wall's document is a few kilobytes at most.
  constraint profiles_data_size check (pg_column_size(data) < 65536)
);

-- The server sets the time of every save, so devices with wrong clocks cannot win a sync they should lose.
create or replace function public.profiles_touch() returns trigger
language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists profiles_touch on public.profiles;
create trigger profiles_touch before insert or update on public.profiles
  for each row execute function public.profiles_touch();

-- Row rules: a signed-in person can read and change only their own row. The public key in the app cannot reach
-- anyone else's.
alter table public.profiles enable row level security;

drop policy if exists "own row: read" on public.profiles;
create policy "own row: read" on public.profiles for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists "own row: add" on public.profiles;
create policy "own row: add" on public.profiles for insert to authenticated with check ((select auth.uid()) = user_id);
drop policy if exists "own row: change" on public.profiles;
create policy "own row: change" on public.profiles for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
drop policy if exists "own row: remove" on public.profiles;
create policy "own row: remove" on public.profiles for delete to authenticated using ((select auth.uid()) = user_id);

revoke all on public.profiles from anon;
grant select, insert, update, delete on public.profiles to authenticated;

-- "Delete account" in Settings: removes the signed-in person's login, and with it their row (on delete cascade).
create or replace function public.delete_my_account() returns void
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then
    raise exception 'not signed in';
  end if;
  delete from auth.users where id = auth.uid();
end;
$$;

revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;
