-- KlinGhana SmartBin — let admins see the full team roster.
-- The earlier auth-gate migration only let a user read their OWN profile row
-- (needed for the login check). The Users & Settings admin page needs to list
-- every account, so this adds a second, additive policy: any signed-in user
-- whose own role is not the default 'USER' (i.e. an admin/staff account) may
-- read every profiles row. Regular 'USER' accounts still only see their own
-- row via the existing self-read policy — Postgres RLS policies are OR'd
-- together, so both rules simply combine per-request.
--
-- The "is this uid an admin" check runs through a SECURITY DEFINER function
-- rather than a bare subquery on profiles: a policy on `profiles` that
-- queries `profiles` again directly re-triggers RLS on itself, which
-- Postgres detects as infinite recursion and rejects with
-- "infinite recursion detected in policy for relation profiles" — breaking
-- every query against the table, including unrelated ones. The function's
-- internal query runs with elevated privileges, bypassing RLS just for that
-- one lookup, which avoids the recursion entirely. (See the companion
-- migration 20260905_fix_profiles_admin_recursion.sql, which repairs a
-- database that already ran the broken version of this file.)
create or replace function public.is_admin_profile(uid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles where id = uid and role <> 'USER'
  );
$$;

drop policy if exists "Admins can read all profiles" on public.profiles;
create policy "Admins can read all profiles" on public.profiles
  for select using (public.is_admin_profile(auth.uid()));
