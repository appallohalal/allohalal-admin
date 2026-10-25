import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://nkhlqwotyadtzdtmkatj.supabase.co';
const supabaseKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  'sb_publishable_a0ryV5Kjh5lbsnsK1V5Q0g_-r1tsj1c';

export const isSupabaseConfigured = () => {
  return Boolean(supabaseUrl && supabaseKey);
};

export const supabase = createClient(supabaseUrl, supabaseKey);
