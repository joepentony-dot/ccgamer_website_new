import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const authEmail = fs.readFileSync('supabase/functions/send-auth-email/index.ts', 'utf8');
const config = fs.readFileSync('supabase/config.toml', 'utf8');

test('CCG auth email hook is branded and uses Resend', () => {
  assert.match(authEmail, /Cheeky Commodore Gamer/);
  assert.match(authEmail, /Confirm your Cheeky Commodore Gamer account/);
  assert.match(authEmail, /CONFIRM MY CCG ACCOUNT/);
  assert.match(authEmail, /RESEND_API_KEY/);
  assert.match(authEmail, /ccg-email-banner\.png/);
  assert.doesNotMatch(authEmail, /powered by Supabase/i);
});

test('CCG auth email hook verifies Standard Webhooks signatures', () => {
  assert.match(authEmail, /standardwebhooks/);
  assert.match(authEmail, /SEND_EMAIL_HOOK_SECRETS/);
  assert.match(authEmail, /new Webhook\(hookSecret\)/);
  assert.match(authEmail, /verifier\.verify\(rawPayload, headers\)/);
});

test('CCG auth email hook covers signup, recovery and email-change flows', () => {
  for (const action of ['signup', 'recovery', 'magiclink', 'invite', 'email_change', 'reauthentication']) {
    assert.ok(authEmail.includes(`case "${action}"`), `Missing auth email action: ${action}`);
  }
  assert.match(authEmail, /tokenHashNew/);
  assert.match(authEmail, /newEmail/);
});

test('Supabase function is configured for webhook authentication', () => {
  assert.match(config, /\[functions\.send-auth-email\][\s\S]*verify_jwt = false/);
});
