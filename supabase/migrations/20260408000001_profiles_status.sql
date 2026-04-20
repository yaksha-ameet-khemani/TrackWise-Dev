-- Add status tracking columns to profiles
alter table public.profiles
  add column if not exists status text not null default 'pending'
    check (status in ('pending', 'active')),
  add column if not exists invited_at timestamptz,
  add column if not exists last_sign_in_at timestamptz;

-- Update existing confirmed users to active
update public.profiles p
set status = 'active'
from auth.users u
where p.id = u.id
  and u.email_confirmed_at is not null;

-- Trigger: mark profile active when user confirms / signs in
create or replace function public.handle_user_updated()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.profiles
  set
    status           = case when new.email_confirmed_at is not null then 'active' else status end,
    last_sign_in_at  = coalesce(new.last_sign_in_at, last_sign_in_at)
  where id = new.id;
  return new;
end;
$$;

drop trigger if exists on_auth_user_updated on auth.users;
create trigger on_auth_user_updated
  after update on auth.users
  for each row execute function public.handle_user_updated();
