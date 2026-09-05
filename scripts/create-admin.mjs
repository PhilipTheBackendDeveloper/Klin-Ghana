#!/usr/bin/env node
// Creates (or promotes) a KlinGhana SmartBin admin account: an auth.users
// entry plus a public.profiles row with role = 'ADMIN'. Uses the Supabase
// service/secret key, so it bypasses RLS entirely — run locally only, never
// ship this key to a browser.
//
// Usage:
//   node scripts/create-admin.mjs
//   node scripts/create-admin.mjs --name "Ama Mensah" --email ama@klinghana.org --password "..."
//
// Note: the password prompt below is plain text (not masked) — this is a
// local, one-off bootstrap script, not something run over a shared terminal.

import fs from 'fs';
import path from 'path';
import readline from 'node:readline/promises';
import { createClient } from '@supabase/supabase-js';

const loadEnvFile = (filePath) => {
  if (!fs.existsSync(filePath)) return;
  const lines = fs.readFileSync(filePath, 'utf8').split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) continue;
    const [key, ...rest] = trimmed.split('=');
    if (!process.env[key]) process.env[key] = rest.join('=').replace(/^['"]|['"]$/g, '');
  }
};

loadEnvFile(path.resolve(process.cwd(), '.env.local'));
loadEnvFile(path.resolve(process.cwd(), '.env'));

const required = (name) => process.env[name]?.trim() || '';
const supabaseUrl = required('SUPABASE_URL') || required('VITE_SUPABASE_URL');
const supabaseSecretKey = required('SUPABASE_SECRET_KEY');

if (!supabaseUrl || !supabaseSecretKey) {
  console.error('Missing SUPABASE_URL / SUPABASE_SECRET_KEY. Set them in .env.local (server-side section) first.');
  process.exit(1);
}

const args = Object.fromEntries(
  process.argv.slice(2).reduce((pairs, arg, i, all) => {
    if (arg.startsWith('--')) pairs.push([arg.slice(2), all[i + 1]]);
    return pairs;
  }, [])
);

async function findUserIdByEmail(supabase, email) {
  const target = email.trim().toLowerCase();
  for (let page = 1; page <= 20; page += 1) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    const match = data.users.find((u) => u.email?.toLowerCase() === target);
    if (match) return match.id;
    if (data.users.length < 200) break; // last page
  }
  return null;
}

async function main() {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

  const fullName = args.name || (await rl.question('Full name: '));
  const email = args.email || (await rl.question('Email: '));
  const password = args.password || (await rl.question('Password (min 8 chars, shown as you type): '));
  rl.close();

  if (!fullName || !email || !password) {
    console.error('Full name, email, and password are all required.');
    process.exit(1);
  }
  if (password.length < 8) {
    console.error('Password must be at least 8 characters (Supabase Auth minimum).');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseSecretKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  console.log(`\nLooking up ${email}...`);
  let userId = await findUserIdByEmail(supabase, email);

  if (userId) {
    console.log('Existing auth user found — updating password & name, skipping creation.');
    const { error } = await supabase.auth.admin.updateUserById(userId, {
      password,
      user_metadata: { full_name: fullName },
    });
    if (error) {
      console.error('Failed to update existing user:', error.message);
      process.exit(1);
    }
  } else {
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName },
    });
    if (error) {
      console.error('Failed to create user:', error.message);
      process.exit(1);
    }
    userId = data.user.id;
    console.log('Auth user created.');
  }

  // Upsert the profile row directly with the service key — this bypasses RLS
  // and doesn't depend on the on-signup trigger having fired, so it works
  // regardless of whether this user pre-dates the profiles migration.
  const { error: profileError } = await supabase
    .from('profiles')
    .upsert({ id: userId, email, full_name: fullName, role: 'ADMIN' }, { onConflict: 'id' });

  if (profileError) {
    console.error('User exists in Auth, but promoting the profile failed:', profileError.message);
    console.error(
      "Make sure supabase/migrations/20260905_profile_auth_gate.sql has been run (creates public.profiles' RLS policy) and that a public.profiles table exists."
    );
    process.exit(1);
  }

  console.log(`\nDone. ${email} can now sign in at the admin login screen with role = ADMIN.`);
}

main().catch((err) => {
  console.error('Unexpected error:', err instanceof Error ? err.message : err);
  process.exit(1);
});
