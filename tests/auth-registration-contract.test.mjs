import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const registerPage = fs.readFileSync('auth/register.html', 'utf8');
const authCore = fs.readFileSync('js/ccg-auth-core.js', 'utf8');
const migration = fs.readFileSync(
  'supabase/migrations/20261006104000_fix_signup_profile_trigger_schema_drift.sql',
  'utf8'
);
const pgcryptoFix = fs.readFileSync(
  'supabase/migrations/20261006105000_fix_signup_pgcrypto_schema.sql',
  'utf8'
);

test('registration page matches the live ten-character password policy', () => {
  assert.match(registerPage, /minlength="10"/);
  assert.match(registerPage, /Password must be at least 10 characters\./);
  assert.match(registerPage, /password\.length < 10/);
  assert.doesNotMatch(registerPage, /minlength="8"/);
});

test('auth core surfaces weak-password errors instead of generic authentication failure', () => {
  assert.match(authCore, /category = 'weak_password'/);
  assert.match(authCore, /Password must be at least/);
  assert.match(authCore, /password should be at least/);
});

test('browser profile bootstrap only writes columns present in the current profiles schema', () => {
  for (const retiredColumn of [
    'points',
    'newsletter_monthly',
    'notify_c64',
    'notify_amiga',
    'newsletter_opt_in',
    'notify_new_games_opt_in',
    'notify_platform_c64',
    'notify_platform_amiga',
    'email_confirmed'
  ]) {
    assert.ok(
      !authCore.includes(retiredColumn),
      `auth bootstrap still references retired profile column: ${retiredColumn}`
    );
  }

  for (const currentColumn of [
    'notify_new_games',
    'notify_newsletter',
    'notify_new_games_choice_recorded',
    'notify_newsletter_choice_recorded',
    'notification_preferences_updated_at',
    'unsub_token'
  ]) {
    assert.ok(authCore.includes(currentColumn), `auth bootstrap missing current profile column: ${currentColumn}`);
  }
});

test('signup trigger migration targets the current profile contract', () => {
  assert.match(migration, /create or replace function public\.handle_new_user_profile\(\)/);
  assert.match(migration, /after insert on auth\.users/);
  assert.match(migration, /notify_new_games,/);
  assert.match(migration, /notify_newsletter,/);
  assert.match(migration, /notification_preferences_updated_at,/);
});


test('signup trigger qualifies pgcrypto in Supabase extensions schema', () => {
  assert.match(pgcryptoFix, /extensions\.gen_random_bytes\(24\)/);
  assert.match(pgcryptoFix, /set search_path = public/);
  assert.match(pgcryptoFix, /revoke execute on function public\.handle_new_user_profile\(\) from public, anon, authenticated/);
});
