// Supabase client singleton — loaded after config.js and the Supabase CDN script.
// The CDN exposes window.supabase, so we use a different name for our client.
const db = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
