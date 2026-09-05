-- KlinGhana SmartBin — admin login authorization.
-- Lets a signed-in user read their own profile row (needed by the admin
-- LoginView to check profiles.role before granting admin-portal access),
-- and auto-provisions a profile (default role 'USER', i.e. no admin access)
-- whenever a new auth.users row is created.

-- 1. Self-read policy: a signed-in user may select only their own profile row.
drop policy if exists "Users can read own profile" on public.profiles;
create policy "Users can read own profile" on public.profiles
  for select using (auth.uid() = id);

-- 2. Auto-provision a profile row on signup so every authenticated user has
--    one (defaulting to role 'USER' — no admin access until manually promoted).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1)),
    'USER'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 3. One-time step (run manually, once, for your own account):
--    after you sign up / create your admin user in Authentication > Users,
--    promote it here so the admin portal login accepts it:
--
--    update public.profiles set role = 'ADMIN' where email = 'you@example.com';
