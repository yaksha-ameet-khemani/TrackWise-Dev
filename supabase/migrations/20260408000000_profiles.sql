-- ─────────────────────────────────────────────────────────────────────────────
-- profiles table
-- Linked 1-to-1 with auth.users. Stores display name and role.
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.profiles (
  id          uuid        primary key references auth.users(id) on delete cascade,
  name        text        not null default '',
  email       text        not null default '',
  role        text        not null default 'member' check (role in ('admin', 'member')),
  created_at  timestamptz not null default now()
);

-- ── Row-level security ────────────────────────────────────────────────────────
alter table public.profiles enable row level security;

-- Any authenticated user can read all profiles (needed for UserManagement list)
create policy "profiles_select"
  on public.profiles for select
  to authenticated
  using (true);

-- Users can update their own profile (e.g. name)
create policy "profiles_update_own"
  on public.profiles for update
  to authenticated
  using (auth.uid() = id);

-- Service role (used by the Edge Function) bypasses RLS automatically.

-- ── Trigger: auto-create profile row when a user is created ──────────────────
-- This fires for both manual dashboard creation and invite acceptance.
-- The Edge Function also upserts the profile with name/role BEFORE the user
-- accepts, so on_conflict is intentional.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'role', 'member')
  )
  on conflict (id) do update
    set
      email = excluded.email,
      name  = case when excluded.name <> '' then excluded.name else profiles.name end,
      role  = case when excluded.role <> 'member' then excluded.role else profiles.role end;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ─────────────────────────────────────────────────────────────────────────────
-- FIRST-ADMIN SETUP (run manually after creating your admin user)
--
-- 1. Go to Supabase Dashboard → Authentication → Users → "Invite user"
--    Enter your admin email. Supabase will send the invite email.
--
-- 2. Accept the invite, set your password.
--    At this point your profile exists with role = 'member'.
--
-- 3. Run this SQL in the Supabase SQL editor to promote yourself to admin:
--
--    UPDATE public.profiles
--    SET role = 'admin'
--    WHERE email = 'your-admin@example.com';
--
-- That's it. From then on, admins invite other users through the app UI.
-- ─────────────────────────────────────────────────────────────────────────────
