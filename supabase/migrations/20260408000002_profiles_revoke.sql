-- ── Add missing columns (safe to run even if partially applied) ──────────────
alter table public.profiles
  add column if not exists status text not null default 'pending'
    check (status in ('pending', 'active')),
  add column if not exists invited_at timestamptz,
  add column if not exists last_sign_in_at timestamptz,
  add column if not exists is_revoked boolean not null default false,
  add column if not exists revoked_at timestamptz;

-- Mark existing confirmed users as active
update public.profiles p
set status = 'active'
from auth.users u
where p.id = u.id
  and u.email_confirmed_at is not null
  and p.status = 'pending';

-- ── RLS: allow admins to update any profile (for revoke / restore) ────────────
drop policy if exists "admins_can_update_any_profile" on public.profiles;
create policy "admins_can_update_any_profile"
  on public.profiles for update
  to authenticated
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );

-- ── Trigger: mark profile active + track last_sign_in on auth user update ─────
create or replace function public.handle_user_updated()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.profiles
  set
    status          = case when new.email_confirmed_at is not null then 'active' else status end,
    last_sign_in_at = coalesce(new.last_sign_in_at, last_sign_in_at)
  where id = new.id;
  return new;
end;
$$;

drop trigger if exists on_auth_user_updated on auth.users;
create trigger on_auth_user_updated
  after update on auth.users
  for each row execute function public.handle_user_updated();
