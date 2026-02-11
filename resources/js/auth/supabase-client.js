export async function getSupabaseClient() {
  if (window.ccgSupabase && typeof window.ccgSupabase.getClient === 'function') {
    return window.ccgSupabase.getClient();
  }
  throw new Error('CCG Supabase client is unavailable. Ensure /js/ccg-supabase-client.js is loaded.');
}
