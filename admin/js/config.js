/**
 * Cheeky Commodore Gamer Admin Auth Config
 *
 * Copy this file to `config.local.js` for local testing if required,
 * or replace placeholder values during deployment through your build
 * or host environment variable injection.
 *
 * Never commit service-role keys in the client.
 */
export const SUPABASE_URL = 'https://YOUR_PROJECT_REF.supabase.co';
export const SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY';

export const AUTH_CONFIG = Object.freeze({
  storageKey: 'ccg-admin-auth',
  roleCacheKey: 'ccg-admin-role-cache',
  defaultRedirectAfterLogin: '/admin/dashboard.html',
  loginPage: '/admin/login.html',
  postLogoutRedirect: '/admin/login.html',
  refreshMarginMs: 60_000,
  sessionCheckIntervalMs: 30_000
});
