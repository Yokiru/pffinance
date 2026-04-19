import { createClient } from '@supabase/supabase-js';

const publicStatusSupabaseUrl = 'https://kmytkftjswammwjzmbbl.supabase.co';
const publicStatusSupabaseKey =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtteXRrZnRqc3dhbW13anptYmJsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU3NDA0NDUsImV4cCI6MjA5MTMxNjQ0NX0.gp5dmrdZE6ZTAPDyoO_d0LY2CpijADFFU6ioibNFV5g';

export const publicStatusSupabase = createClient(
  publicStatusSupabaseUrl,
  publicStatusSupabaseKey,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  }
);
