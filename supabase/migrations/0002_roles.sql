-- Pit Wall roles: one super admin, up to 5 admins, everyone else a normal user (no row here means normal user).
-- Run after 0001_profiles.sql. Roles can only be changed through the functions below (or by the project owner in the
-- Supabase SQL editor); the app's public key cannot write this table directly.

create table if not exists public.user_roles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  role text not null check (role in ('super_admin', 'admin')),
  granted_at timestamptz not null default now(),
  granted_by uuid references auth.users (id) on delete set null
);

-- Only one super admin.
create unique index if not exists user_roles_one_super_admin on public.user_roles ((true)) where role = 'super_admin';

-- At most 5 admins (the super admin is not counted).
create or replace function public.user_roles_admin_cap() returns trigger
language plpgsql as $$
begin
  if new.role = 'admin' and (select count(*) from public.user_roles where role = 'admin' and user_id <> new.user_id) >= 5 then
    raise exception 'Pit Wall allows at most 5 admins';
  end if;
  return new;
end;
$$;

drop trigger if exists user_roles_admin_cap on public.user_roles;
create trigger user_roles_admin_cap before insert or update on public.user_roles
  for each row execute function public.user_roles_admin_cap();

alter table public.user_roles enable row level security;
revoke all on public.user_roles from anon, authenticated;

-- The signed-in person's role: 'super_admin', 'admin' or 'user'.
create or replace function public.my_role() returns text
language sql stable security definer set search_path = '' as $$
  select coalesce((select role from public.user_roles where user_id = auth.uid()), 'user');
$$;

-- Everyone with an account, for the Admin page. Admins and the super admin only.
create or replace function public.admin_list_users()
returns table (user_id uuid, email text, role text, created_at timestamptz, last_sign_in_at timestamptz)
language plpgsql stable security definer set search_path = '' as $$
begin
  if public.my_role() not in ('admin', 'super_admin') then
    raise exception 'admins only';
  end if;
  return query
    select u.id, u.email::text, coalesce(r.role, 'user'), u.created_at, u.last_sign_in_at
    from auth.users u left join public.user_roles r on r.user_id = u.id
    order by case coalesce(r.role, 'user') when 'super_admin' then 0 when 'admin' then 1 else 2 end, u.created_at;
end;
$$;

-- Makes someone an admin or a normal user again. Super admin only; the super admin's own role cannot change here.
create or replace function public.set_admin(target uuid, make_admin boolean) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if public.my_role() <> 'super_admin' then
    raise exception 'only the super admin can change admins';
  end if;
  if exists (select 1 from public.user_roles where user_id = target and role = 'super_admin') then
    raise exception 'the super admin role cannot be changed here';
  end if;
  if make_admin then
    insert into public.user_roles (user_id, role, granted_by) values (target, 'admin', auth.uid())
      on conflict (user_id) do update set role = 'admin', granted_at = now(), granted_by = auth.uid();
  else
    delete from public.user_roles where user_id = target and role = 'admin';
  end if;
end;
$$;

-- The super admin cannot delete their own account from the app, so the project is never left without one.
create or replace function public.delete_my_account() returns void
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then
    raise exception 'not signed in';
  end if;
  if exists (select 1 from public.user_roles where user_id = auth.uid() and role = 'super_admin') then
    raise exception 'The super admin account cannot be deleted from the app';
  end if;
  delete from auth.users where id = auth.uid();
end;
$$;

revoke all on function public.my_role() from public, anon;
revoke all on function public.admin_list_users() from public, anon;
revoke all on function public.set_admin(uuid, boolean) from public, anon;
revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.my_role() to authenticated;
grant execute on function public.admin_list_users() to authenticated;
grant execute on function public.set_admin(uuid, boolean) to authenticated;
grant execute on function public.delete_my_account() to authenticated;

-- Making yourself the super admin (once, in the SQL editor, after signing in to Pit Wall once so your account
-- exists). Replace the address with yours; it is deliberately not stored in this repository.
--
--   insert into public.user_roles (user_id, role)
--   select id, 'super_admin' from auth.users where email = 'you@example.com';
