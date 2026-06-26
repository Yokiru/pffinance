import { createClient } from "@supabase/supabase-js";

const adminSupabaseUrl =
  import.meta.env.VITE_ADMIN_SUPABASE_URL ??
  import.meta.env.VITE_SUPABASE_URL ??
  "https://kmytkftjswammwjzmbbl.supabase.co";

const configuredAdminSupabaseKey =
  import.meta.env.VITE_ADMIN_SUPABASE_ANON_KEY ??
  import.meta.env.VITE_SUPABASE_ANON_KEY;

const fallbackAdminSupabaseKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtteXRrZnRqc3dhbW13anptYmJsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU3NDA0NDUsImV4cCI6MjA5MTMxNjQ0NX0.gp5dmrdZE6ZTAPDyoO_d0LY2CpijADFFU6ioibNFV5g";

const adminSupabaseKey =
  configuredAdminSupabaseKey?.startsWith("eyJ")
    ? configuredAdminSupabaseKey
    : fallbackAdminSupabaseKey;

export const adminSupabase = createClient(
  adminSupabaseUrl,
  adminSupabaseKey,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  }
);
