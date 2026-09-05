-- Fixes infinite recursion in the "Admins can read all profiles" policy added
-- by 20260905_profiles_admin_read_all.sql. That policy checked the
-- requester's own role via a subquery directly on public.profiles — but
-- evaluating that subquery re-triggers RLS on profiles, which re-evaluates
-- the same policy, forever. Postgres detects this and raises
-- "infinite recursion detected in policy for relation profiles", which broke
-- EVERY query against profiles, including the original self-read login check.
--
-- Fix: move the "is this uid an admin" check into a SECURITY DEFINER
-- function. Its internal query runs with the function owner's privileges,
-- bypassing RLS for that one lookup, which breaks the recursion.
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
