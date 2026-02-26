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
  const existing = getSupabaseClient();
  if (existing) return existing;

  return new Promise(resolve => {
    const tick = () => {
      const c = getSupabaseClient();
      if (c) return resolve(c);
      requestAnimationFrame(tick);
    };
    tick();
  });
}

function setStatus(msg = '') {
  $('announceStatus').textContent = msg;
}

function updateSendState() {
  const slug = text($('announceSendBtn')?.dataset?.slug);
  const test = $('announceTestEmail')?.checked;
  const members = $('announceNotifyMembers')?.checked;

  $('announceSendBtn').disabled =
    !authReady || !slug || (!test && !members);
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
  if (authReady) setStatus('');

  authClient.auth.onAuthStateChange((_e, s) => {
    authReady = Boolean(s?.access_token);
    setStatus(authReady ? '' : 'Waiting for admin authentication…');
    updateSendState();
  });

  // ---------------- LOAD GAMES ----------------

  const res = await fetch('/games/games.json', { cache: 'no-store' });
  const games = await res.json();

  const bySlug = new Map();
  games.forEach(g => g.slug && bySlug.set(g.slug, g));

  $('announceLoadedHint').textContent = `Loaded ${bySlug.size} games.`;

  // ---------------- SEARCH ----------------

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
          const thumb = normalizeThumbnailPath(g.thumbnail);

          sendBtn.dataset.slug = g.slug;
          sendBtn.dataset.thumbnail = thumb;

          $('announceTitle').textContent = g.title;
          $('announceSlug').textContent = g.slug;
          $('announceLink').href = `/games/${g.slug}/`;
          $('announceLink').hidden = false;

          $('announceSubject').textContent =
            subjectFor($('announceType').value, g.title);

          if (thumb) {
            $('announceThumb').src = thumb;
            $('announceThumb').hidden = false;
          } else {
            $('announceThumb').hidden = true;
          }

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

  // ---------------- SEND ----------------

  sendBtn.addEventListener('click', async () => {
    const prev = sendBtn.dataset.defaultLabel;
    sendBtn.disabled = true;
    sendBtn.textContent = 'Sending…';

    try {
      const slug = sendBtn.dataset.slug;
      const game = bySlug.get(slug);
      const test = $('announceTestEmail').checked;

      if (!game) throw new Error('Please select a game.');

      const { data: { session } = {} } = await authClient.auth.getSession();
      const token = session?.access_token;
      if (!token) throw new Error('Admin session expired.');

      const payload = {
        mode: test ? 'test' : 'members',
        game_name: game.title,
        game_slug: game.slug,
        game_thumbnail: normalizeThumbnailPath(game.thumbnail),
        test_email: test
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
        throw new Error(j.error || `Request failed (${r.status})`);
      }

      setStatus(`Sent: ${j.sent || 0}, failed: ${j.failed || 0}`);
    } catch (err) {
      setStatus(`Failed: ${err.message}`);
      console.error(err);
    } finally {
      sendBtn.textContent = prev;
      sendBtn.disabled = false;
      updateSendState();
    }
  });

  updateSendState();
}

startAccessMonitor();
bootstrap();