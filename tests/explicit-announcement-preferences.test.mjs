import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');

const migration = read('supabase/migrations/20260806191500_explicit_announcement_preferences.sql');
const authCore = read('js/ccg-auth-core.js');
const registerHtml = read('auth/register.html');
const memberHub = read('resources/js/auth/member-hub.js');
const announceHtml = read('admin/announce.html');
const previewJs = read('admin/js/announcement-recipient-preview.js');

test('existing members are not silently opted into video announcements', () => {
  assert.match(migration, /notify_newsletter_choice_recorded boolean default false/i);
  assert.doesNotMatch(migration, /update\s+public\.profiles[\s\S]*set\s+notify_newsletter\s*=\s*true/i);
  assert.match(migration, /notify_new_games_choice_recorded = true[\s\S]*notify_new_games, false\) = true/i);
});

test('registration presents separate unticked game and video choices', () => {
  assert.match(registerHtml, /id="notifyNewGames"/);
  assert.match(registerHtml, /id="notifyNewsletter"/);
  assert.match(registerHtml, /Both choices are optional and start unticked/);
  assert.doesNotMatch(registerHtml, /id="notifyNewsletter"[^>]*checked/i);
  assert.match(registerHtml, /registerUser\(email, password, notificationPreferences\)/);
  assert.match(authCore, /notification_preferences_presented/);
  assert.match(authCore, /notify_new_games_choice_recorded/);
  assert.match(authCore, /notify_newsletter_choice_recorded/);
});

test('Member Hub prompts only when the video preference has not been recorded', () => {
  assert.match(memberHub, /notify_newsletter_choice_recorded/);
  assert.match(memberHub, /Yes, email me/);
  assert.match(memberHub, /No thanks/);
  assert.match(memberHub, /No video announcement emails will be sent to you until you choose/);
  assert.match(memberHub, /notification_preferences_updated_at/);
});

test('admin panel previews eligible recipients and blocks an empty send', () => {
  assert.match(announceHtml, /id="announceRecipientPreview"/);
  assert.match(announceHtml, /announcement-recipient-preview\.js/);
  assert.match(migration, /admin_announcement_recipient_counts/);
  assert.match(migration, /u\.email_confirmed_at is not null/);
  assert.match(previewJs, /Eligible recipients:/);
  assert.match(previewJs, /event\.stopImmediatePropagation\(\)/);
  assert.match(previewJs, /No email was sent\. No eligible members/);
});
