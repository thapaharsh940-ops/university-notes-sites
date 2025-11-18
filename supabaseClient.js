// Replace these with your actual Supabase project credentials
const SUPABASE_URL = 'YOUR_SUPABASE_URL_HERE';
const SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY_HERE';

// Create Supabase client
window.supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
