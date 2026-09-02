import { createClient } from '@supabase/supabase-js';
import { env } from '../config/env';

export const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});

export const isSupabaseConfigured = (): boolean => {
  return (
    Boolean(env.VITE_SUPABASE_URL) &&
    env.VITE_SUPABASE_URL.includes('ufnwwgilqxvjrzrmydes.supabase.co') &&
    Boolean(env.VITE_SUPABASE_PUBLISHABLE_KEY) &&
    env.VITE_SUPABASE_PUBLISHABLE_KEY !== 'klinghana_dev_publishable_key'
  );
};
