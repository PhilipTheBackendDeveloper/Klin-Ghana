import { z } from 'zod';

const envSchema = z.object({
  VITE_SUPABASE_URL: z.string().url().default('https://ufnwwgilqxvjrzrmydes.supabase.co'),
  VITE_SUPABASE_PUBLISHABLE_KEY: z.string().min(1).default('klinghana_dev_publishable_key'),
  VITE_SUPABASE_ANON_KEY: z.string().min(1).optional(),
  VITE_API_BASE_URL: z.string().default('http://localhost:3000/api'),
  VITE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  VITE_DATA_MODE: z.enum(['live', 'demo']).default('live'),
  VITE_GOOGLE_MAPS_API_KEY: z.string().optional().default(''),
});

const viteEnv = (typeof import.meta !== 'undefined' && (import.meta as any).env) || {};

const publishableKey =
  viteEnv.VITE_SUPABASE_PUBLISHABLE_KEY ||
  viteEnv.VITE_SUPABASE_ANON_KEY ||
  'klinghana_dev_publishable_key';

const rawEnv = {
  VITE_SUPABASE_URL: viteEnv.VITE_SUPABASE_URL || 'https://ufnwwgilqxvjrzrmydes.supabase.co',
  VITE_SUPABASE_PUBLISHABLE_KEY: publishableKey,
  VITE_SUPABASE_ANON_KEY: viteEnv.VITE_SUPABASE_ANON_KEY,
  VITE_API_BASE_URL: viteEnv.VITE_API_BASE_URL || 'http://localhost:3000/api',
  VITE_ENV: viteEnv.VITE_ENV || (viteEnv.DEV ? 'development' : 'production'),
  VITE_DATA_MODE: viteEnv.VITE_DATA_MODE || 'live',
  VITE_GOOGLE_MAPS_API_KEY: viteEnv.VITE_GOOGLE_MAPS_API_KEY || '',
};

export const env = envSchema.parse(rawEnv);
