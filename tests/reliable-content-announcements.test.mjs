import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');

const announceJs = read('admin/js/announce.js');
const announceHtml = read('admin/announce.html');
const edgeFunction = read('supabase/functions/send-new-game-notification/index.ts');
const profileJs = read('resources/js/auth/profile-page.js');
const profileHtml = read('community/profile.html');
const migration = read('supabase/migrations/20260806150000_reliable_content_announcements.sql');
const retroSpecials = JSON.parse(read('data/retro-specials.json'));

test('announcement selector loads every supported live content feed', () => {
  assert.match(announceJs, /RETRO_SPECIALS_DATA_PATH\s*=\s*'\/data\/retro-specials\.json'/);
  assert.match(announceJs, /RETRO_EVENTS_DATA_PATH\s*=\s*'\/data\/retro-events\.json'/);
  assert.match(announceJs, /AMIGA_DEMO_MUSIC_DATA_PATH\s*=\s*'\/data\/amiga-demo-music\.json'/);
  assert.match(announceJs, /routeFor\('game'/);
  assert.match(announceJs, /routeFor\(type, slug\)/);
});

test('Zzap!64 Retro Specials are available without manual announcement data', () => {
  const zzapEntries = retroSpecials.filter((entry) => /zzap!?\s*64|zzap64/i.test(`${entry.slug || ''} ${entry.title || ''}`));
  assert.ok(zzapEntries.length >= 4, `Expected several Zzap!64 entries, found ${zzapEntries.length}`);
  zzapEntries.forEach((entry) => {
    assert.ok(entry.slug || entry.id, 'Zzap!64 entry requires a slug or id');
    assert.ok(entry.title, 'Zzap!64 entry requires a title');
    assert.ok(entry.thumbnail || entry.youtubeId, 'Zzap!64 entry requires a thumbnail source');
  });
  assert.match(announceJs, /category\s*===\s*'zzap64'/);
  assert.match(announceJs, /New Zzap!64 Feature/);
});

test('admin interface exposes content and recipient context', () => {
  for (const value of ['all', 'game', 'retro_special', 'retro_event', 'demo_music']) {
    assert.match(announceHtml, new RegExp(`value="${value}"`));
  }
  assert.match(announceHtml, /id="announceContentType"/);
  assert.match(announceHtml, /id="announcePreference"/);
  assert.match(announceHtml, /New video and Retro Special notifications/);
});

test('member preferences keep games and videos separate', () => {
  assert.match(profileHtml, /id="notifyNewGames"/);
  assert.match(profileHtml, /id="notifyNewsletter"/);
  assert.match(profileJs, /notify_new_games:\s*notifyNewGames/);
  assert.match(profileJs, /notify_newsletter:\s*notifyNewsletter/);
  assert.match(profileJs, /profile\.notify_newsletter/);
});

test('edge function sends real emails and rejects unsafe announcements', () => {
  assert.match(edgeFunction, /https:\/\/api\.resend\.com\/emails/);
  assert.match(edgeFunction, /RESEND_API_KEY/);
  assert.match(edgeFunction, /content_announcements/);
  assert.match(edgeFunction, /Content URL must remain on the CCG website/);
  assert.match(edgeFunction, /notify_new_games/);
  assert.match(edgeFunction, /notify_newsletter/);
  assert.match(edgeFunction, /This announcement was already sent recently/);
  assert.doesNotMatch(edgeFunction, /wire your Resend logic here/i);
  assert.doesNotMatch(edgeFunction, /return json\(\{ success: true, sent: 1, failed: 0 \}\)/);
});

test('database migration provides privacy-safe logging and preference support', () => {
  assert.match(migration, /create table if not exists public\.content_announcements/i);
  assert.match(migration, /add column if not exists notify_newsletter boolean default false/i);
  assert.match(migration, /enable row level security/i);
  assert.match(migration, /content_announcements_admin_select/i);
  assert.match(migration, /Recipient email addresses are not stored here/i);
});
