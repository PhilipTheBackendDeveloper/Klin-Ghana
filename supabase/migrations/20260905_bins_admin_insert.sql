-- KlinGhana SmartBin — let admins register new bins from the app.
-- public.bins has RLS enabled with only a public SELECT policy (citizens
-- need to browse bins without auth) — there was no INSERT policy at all, so
-- even an authenticated admin's browser session was silently rejected by
-- RLS. Reuses the is_admin_profile() helper from the profiles migrations
-- (SECURITY DEFINER, so no recursive-policy risk) to gate INSERT to admins.
--
-- Scope: registering the bin as an asset only (code, name, location,
-- category, capacity). Device/hardware credential pairing is unaffected —
-- still the existing manual DEVICE_CREDENTIALS_JSON env-var process.
drop policy if exists "Admins can add bins" on public.bins;
create policy "Admins can add bins" on public.bins
  for insert with check (public.is_admin_profile(auth.uid()));
