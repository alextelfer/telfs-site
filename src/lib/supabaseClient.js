import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'process.env.SUPABASE_URL'; // replace with your URL
const supabaseAnonKey = 'process.env.SUPABASE_KEY'; // replace with your key

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
