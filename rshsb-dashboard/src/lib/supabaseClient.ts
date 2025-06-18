import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://kfrmnlscvejptimbehgb.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imtmcm1ubHNjdmVqcHRpbWJlaGdiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTAyMzMyMjAsImV4cCI6MjA2NTgwOTIyMH0.s-3sW0OPAv28VRAiA_gCqeu8uxXP2yDeMyeDyfB7Q0I';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
