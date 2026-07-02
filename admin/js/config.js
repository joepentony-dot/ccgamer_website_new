/**
 * Cheeky Commodore Gamer Admin Auth Config
 *
 * Copy this file to `config.local.js` for local testing if required,
 * or replace placeholder values during deployment through your build
 * or host environment variable injection.
 *
 * Never commit service-role keys in the client.
 */
export const SUPABASE_URL = 'https://lcslgxpgmttaexsorxik.supabase.co';
export const SUPABASE_ANON_KEY = 'sb_publishable_MDjIagrZ-IjI_xbE3VXNaQ_ZaScTuTJ';

export const OWNER_EMAILS = Object.freeze([
  'admin@cheekycommodoregamer.co.uk',
  'joepentony@hotmail.com'
]);

export const AUTH_CONFIG = Object.freeze({
  storageKey: 'ccg-admin-auth',
  roleCacheKey: 'ccg-admin-role-cache',
  defaultRedirectAfterLogin: '/admin/dashboard.html',
  loginPage: '/admin/login.html',
  postLogoutRedirect: '/admin/login.html',
  passwordResetRedirect: 'https://www.cheekycommodoregamer.co.uk/admin/reset-password.html',
  refreshMarginMs: 60_000,
  sessionCheckIntervalMs: 30_000,
  hydrationTimeoutMs: 2000
});

// Canonical static paths for GitHub Pages + local static hosting.
export const APP_PATHS = Object.freeze({
  gamesJson: '/games/games.json',
  resourcesRoot: '/resources/',
  adminRoot: '/admin/'
});
