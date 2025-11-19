// Replace these with your actual Supabase project credentials
const SUPABASE_URL = 'https://gcojuhkujvwuffzwuypt.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdjb2p1aGt1anZ3dWZmend1eXB0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMxOTY4ODgsImV4cCI6MjA3ODc3Mjg4OH0.v9dNR9qXETtrqjxdvHLqrAWXjrF-6Aw36F6Ky1YSLdM';

// Create Supabase client
window.supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
