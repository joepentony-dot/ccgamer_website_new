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
  if (mode === 'new_game_added') return 'coming_soon_members';
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

function updateSendState() {
  const slug = text($('announceSendBtn')?.dataset?.slug);
  const test = $('announceTestEmail')?.checked;
  const members = $('announceNotifyMembers')?.checked;

  if (!authReady) {
    $('announceStatus').textContent = 'Waiting for admin authentication…';
  }

  $('announceSendBtn').disabled = !authReady || !slug || (!test && !members);
}

async function bootstrap() {
  const ok = await ensureRole(['superadmin', 'admin', 'editor']);
  if (!ok) return;

  initAdminNav({ pageLabel: 'Game Announcements', active: 'announce' });

  const sendBtn = $('announceSendBtn');
  sendBtn.dataset.defaultLabel = text(sendBtn.textContent) || 'Send Announcement';
  updateSendState();

  authClient = await waitForSupabaseClient();

  const {
    data: { session } = {},
    error: sessionError
  } = await authClient.auth.getSession();

  if (sessionError) {
    $('announceStatus').textContent = `Unable to verify admin authentication: ${sessionError.message || 'Unknown error.'}`;
  } else if (session?.access_token) {
    authReady = true;
    if ($('announceStatus').textContent === 'Waiting for admin authentication…') {
      $('announceStatus').textContent = '';
    }
  } else {
    $('announceStatus').textContent = 'No active admin session. Please sign in to continue.';
  }

  authClient.auth.onAuthStateChange((_event, nextSession) => {
    authReady = Boolean(nextSession?.access_token);

    if (!authReady) {
      $('announceStatus').textContent = 'No active admin session. Please sign in to continue.';
    } else if (
      $('announceStatus').textContent === 'Waiting for admin authentication…' ||
      $('announceStatus').textContent === 'No active admin session. Please sign in to continue.'
    ) {
      $('announceStatus').textContent = '';
    }

    updateSendState();
  });

  updateSendState();

  const res = await fetch('/games/games.json', { cache: 'no-store' });
  const games = await res.json();

  const bySlug = new Map();
  games.forEach(g => g.slug && bySlug.set(g.slug, g));

  $('announceLoadedHint').textContent = `Loaded ${bySlug.size} games.`;

  $('announceSearch').addEventListener('input', e => {
    const q = e.target.value.toLowerCase();
    $('announceResults').innerHTML = '';
    [...bySlug.values()]
      .filter(g => g.title.toLowerCase().includes(q))
      .slice(0, 50)
      .forEach(g => {
        const b = document.createElement('button');
        b.className = 'ccg-btn ccg-btn--ghost';
        b.textContent = `${g.title} (${g.year || '?'})`;
        b.onclick = () => {
          const announceThumb = $('announceThumb');
          const normalizedThumbnail = normalizeThumbnailPath(g.thumbnail);

          sendBtn.dataset.slug = g.slug;
          sendBtn.dataset.thumbnail = normalizedThumbnail;
          $('announceTitle').textContent = g.title;
          $('announceSlug').textContent = g.slug;
          $('announceLink').href = `/games/${g.slug}/`;
          $('announceLink').hidden = false;

          if (normalizedThumbnail) {
            announceThumb.src = normalizedThumbnail;
            announceThumb.hidden = false;
          } else {
            announceThumb.removeAttribute('src');
            announceThumb.hidden = true;
          }

          $('announceSubject').textContent =
            subjectFor($('announceType').value, g.title);
          updateSendState();
        };
        $('announceResults').appendChild(b);
      });
  });

  $('announceType').addEventListener('change', () => {
    $('announceSubject').textContent =
      subjectFor($('announceType').value, $('announceTitle').textContent);
  });

  $('announceTestEmail').addEventListener('change', () => {
    if ($('announceTestEmail').checked) $('announceNotifyMembers').checked = false;
    updateSendState();
  });

  $('announceNotifyMembers').addEventListener('change', () => {
    if ($('announceNotifyMembers').checked) $('announceTestEmail').checked = false;
    updateSendState();
  });

  $('announceSendBtn').addEventListener('click', async () => {
    const previousLabel = sendBtn.dataset.defaultLabel || 'Send Announcement';
    sendBtn.disabled = true;

    try {
      const slug = text(sendBtn.dataset.slug);
      const game = bySlug.get(slug);
      const mode = normalizeAnnouncementMode($('announceType').value);
      const test = $('announceTestEmail').checked;
      const normalizedThumbnail = normalizeThumbnailPath(
        sendBtn.dataset.thumbnail || game?.thumbnail
      );

      if (!slug || !game) {
        throw new Error('Please select a game before sending.');
      }

      $('announceStatus').textContent = 'Sending…';
      sendBtn.textContent = 'Sending...';

      if (!authReady) {
        throw new Error('Waiting for admin authentication…');
      }

      const client = authClient || getSupabaseClient();

      const {
        data: { session } = {},
        error: sessionError
      } = await client.auth.getSession();

      if (sessionError) {
        throw new Error(sessionError.message || 'Unable to retrieve auth session.');
      }

      const token = session?.access_token;
      authReady = Boolean(token);
      if (!token) {
        throw new Error('No active admin session found. Please sign in again.');
      }

      const payload = {
        mode,
        game_name: game.title,
        game_slug: game.slug,
        game_thumbnail: normalizedThumbnail,
        test_email: test === true
      };

      const r = await fetch(
        `${window.CCG_SUPABASE_URL}/functions/v1/send-new-game-notification`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            apikey: window.CCG_SUPABASE_ANON_KEY,
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify(payload)
        }
      );

      const j = await r.json();
      if (!r.ok || !j.success) {
        throw new Error(j.error || `Request failed (${r.status}).`);
      }

      $('announceStatus').textContent = `Sent: ${j.sent || 0}, failed: ${j.failed || 0}`;
    } catch (err) {
      $('announceStatus').textContent = `Failed: ${err?.message || 'Unknown error.'}`;
      console.error('Announcement send failed:', err);
    } finally {
      sendBtn.textContent = previousLabel;
      sendBtn.disabled = false;
      updateSendState();
    }
  });
}

startAccessMonitor();
bootstrap();
