import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ewkcqsjuptygmekxnwzi.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV3a2Nxc2p1cHR5Z21la3hud3ppIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMxMDQyODQsImV4cCI6MjA3ODY4MDI4NH0.zJByMDK9qlc2k-NYNfqfDfDFWimI-chQktzguo_xLcI';

export const supabase = createClient(supabaseUrl, supabaseKey);
