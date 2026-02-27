import { ensureRole, startAccessMonitor } from './guard.js?v=admin-stable-20260207';
import { initAdminNav } from './admin-nav.js?v=admin-stable-20260207';

function $(id) {
  return document.getElementById(id);
}

function text(v) {
  return String(v || '').trim();
}

function normalizeThumbnailPath(rawPath) {
  const path = text(rawPath);
  if (!path) return '';
  if (/^https?:\/\//i.test(path)) return path;
  return path.startsWith('/') ? path : `/${path}`;
}

let authClient = null;
let authReady = false;

function getSupabaseClient() {
  return window.ccgSupabase?.getClient?.() || null;
}

async function waitForSupabaseClient() {
  const c = getSupabaseClient();
  if (c) return c;
  return new Promise(resolve => {
    const tick = () => {
      const next = getSupabaseClient();
      if (next) return resolve(next);
      requestAnimationFrame(tick);
    };
    tick();
  });
}

function setStatus(msg = '') {
  $('announceStatus').textContent = msg;
}

async function bootstrap() {
  const ok = await ensureRole(['admin', 'superadmin', 'editor']);
  if (!ok) return;

  initAdminNav({ pageLabel: 'Game Announcements', active: 'announce' });

  authClient = await waitForSupabaseClient();

  const { data: { session } = {} } = await authClient.auth.getSession();
  authReady = Boolean(session?.access_token);

  authClient.auth.onAuthStateChange((_e, s) => {
    authReady = Boolean(s?.access_token);
  });

  // Load games
  const res = await fetch('/games/games.json', { cache: 'no-store' });
  const games = await res.json();

  const bySlug = new Map();
  games.forEach(g => g.slug && bySlug.set(g.slug, g));

  $('announceLoadedHint').textContent = `Loaded ${bySlug.size} games.`;

  $('announceSendBtn').addEventListener('click', async () => {
    try {
      setStatus('Sending…');

      const { data: { session } } = await authClient.auth.getSession();
      const token = session?.access_token;
      if (!token) throw new Error('No admin session');

      const slug = $('announceSendBtn').dataset.slug;
      const game = bySlug.get(slug);
      if (!game) throw new Error('Select a game');

      const payload = {
        mode: $('announceTestEmail').checked ? 'test' : 'members',
        game_name: game.title,
        game_slug: game.slug,
        game_thumbnail: normalizeThumbnailPath(game.thumbnail),
        test_email: $('announceTestEmail').checked
      };

      const r = await fetch(
        'https://lcslgxpgmttaexsorxik.supabase.co/functions/v1/send-new-game-notification',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}` // ✅ ONLY ONE JWT
          },
          body: JSON.stringify(payload)
        }
      );

      const j = await r.json();
      if (!r.ok) throw new Error(j.error || 'Edge call failed');

      setStatus(`Sent: ${j.sent || 0}, failed: ${j.failed || 0}`);
    } catch (err) {
      console.error(err);
      setStatus(`Failed: ${err.message}`);
    }
  });
}

startAccessMonitor();
bootstrap();