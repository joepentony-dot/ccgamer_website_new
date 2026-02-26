import { ensureRole, startAccessMonitor } from './guard.js?v=admin-stable-20260207';
import { initAdminNav } from './admin-nav.js?v=admin-stable-20260207';

function $(id) {
  return document.getElementById(id);
}

function text(v) {
  return String(v || '').trim();
}

function normalizeAnnouncementMode(rawMode) {
  const mode = text(rawMode);
  if (mode === 'new_game_added') return 'members';
  return mode;
}

function normalizeThumbnailPath(rawPath) {
  const path = text(rawPath);
  if (!path) return '';
  if (/^https?:\/\//i.test(path)) return path;
  return path.startsWith('/') ? path : `/${path}`;
}

function subjectFor(type, title) {
  if (!title) return '—';
  switch (type) {
    case 'featured_classic':
      return `⭐ Featured Classic: ${title}`;
    case 'spotlight_pick':
      return `🎯 Spotlight Pick: ${title}`;
    default:
      return `🆕 New Game Added: ${title}`;
  }
}

let authReady = false;
let authClient = null;

function getSupabaseClient() {
  return window.ccgSupabase?.getClient?.() || null;
}

async function waitForSupabaseClient() {
  const existingClient = getSupabaseClient();
  if (existingClient) return existingClient;

  return new Promise(resolve => {
    const check = () => {
      const nextClient = getSupabaseClient();
      if (nextClient) {
        resolve(nextClient);
        return;
      }
      window.requestAnimationFrame(check);
    };
    check();
  });
}

function setStatus(msg = '') {
  if ($('announceStatus')) {
    $('announceStatus').textContent = msg;
  }
}

function updateSendState() {
  const slug = text($('announceSendBtn')?.dataset?.slug);
  const test = $('announceTestEmail')?.checked;
  const members = $('announceNotifyMembers')?.checked;

  $('announceSendBtn').disabled = !authReady || !slug || (!test && !members);
}

async function bootstrap() {
  const ok = await ensureRole(['superadmin', 'admin', 'editor']);
  if (!ok) return;

  initAdminNav({ pageLabel: 'Game Announcements', active: 'announce' });

  const sendBtn = $('announceSendBtn');
  sendBtn.dataset.defaultLabel = text(sendBtn.textContent) || 'Send Announcement';

  setStatus('Waiting for admin authentication…');

  authClient = await waitForSupabaseClient();

  const { data: { session } = {} } = await authClient.auth.getSession();
  authReady = Boolean(session?.access_token);

  if (authReady) {
    setStatus('');
  }

  authClient.auth.onAuthStateChange((_event, nextSession) => {
    authReady = Boolean(nextSession?.access_token);
    setStatus(authReady ? '' : 'Waiting for admin authentication…');
    updateSendState();
  });

  const res = await fetch('/games/games.json', { cache: 'no-store' });
  const games = await res.json();

  const bySlug = new Map();
  games.forEach(g => g.slug && bySlug.set(g.slug, g));

  $('announceLoadedHint').textContent = `Loaded ${bySlug.size} games.`;

  $('announceSendBtn').addEventListener('click', async () => {
    const previousLabel = sendBtn.dataset.defaultLabel || 'Send Announcement';
    sendBtn.disabled = true;

    try {
      const slug = text(sendBtn.dataset.slug);
      const game = bySlug.get(slug);
      const test = $('announceTestEmail').checked;

      if (!slug || !game) {
        throw new Error('Please select a game before sending.');
      }

      const { data: { session } = {} } = await authClient.auth.getSession();
      const token = session?.access_token;
      if (!token) {
        throw new Error('No active admin session. Please sign in again.');
      }

      const payload = {
        mode: test ? 'test' : 'members',
        game_name: game.title,
        game_slug: game.slug,
        game_thumbnail: normalizeThumbnailPath(game.thumbnail),
        test_email: test
      };

      setStatus('Sending…');
      sendBtn.textContent = 'Sending…';

      const r = await fetch(
        `${window.CCG_SUPABASE_URL}/functions/v1/send-new-game-notification`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify(payload)
        }
      );

      const j = await r.json();
      if (!r.ok || !j.success) {
        throw new Error(j.error || `Request failed (${r.status}).`);
      }

      setStatus(`Sent: ${j.sent || 0}, failed: ${j.failed || 0}`);
    } catch (err) {
      setStatus(`Failed: ${err?.message || 'Unknown error.'}`);
      console.error('Announcement send failed:', err);
    } finally {
      sendBtn.textContent = previousLabel;
      sendBtn.disabled = false;
      updateSendState();
    }
  });

  updateSendState();
}

startAccessMonitor();
bootstrap();