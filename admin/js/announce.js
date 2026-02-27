import { ensureRole, startAccessMonitor } from './guard.js?v=admin-stable-20260207';
import { initAdminNav } from './admin-nav.js?v=admin-stable-20260207';

const FUNCTION_NAME = 'send-new-game-notification';

function $(id) {
  return document.getElementById(id);
}

function text(value) {
  return String(value || '').trim();
}

function normalizeAnnouncementMode(rawMode) {
  const mode = text(rawMode);
  if (!mode) return 'new_game_added';
  if (mode === 'coming_soon_members' || mode === 'coming_soon') return 'new_game_added';
  return mode;
}

function normalizeThumbnailPath(rawPath) {
  const path = text(rawPath);
  if (!path) return '';
  if (/^https?:\/\//i.test(path)) return path;
  return path.startsWith('/') ? path : `/${path}`;
}

function subjectFor(mode, title) {
  const gameTitle = text(title);
  if (!gameTitle) return '—';

  switch (normalizeAnnouncementMode(mode)) {
    case 'featured_classic':
      return `⭐ Featured Classic: ${gameTitle}`;
    case 'spotlight_pick':
      return `🎯 Spotlight Pick: ${gameTitle}`;
    default:
      return `🆕 New Game Added: ${gameTitle}`;
  }
}

function setStatus(message = '', isError = false) {
  const node = $('announceStatus');
  node.textContent = message;
  node.dataset.state = isError ? 'error' : 'ok';
}

function updateSendState() {
  const slug = text($('announceSendBtn').dataset.slug);
  const wantsTest = $('announceTestEmail').checked;
  const wantsMembers = $('announceNotifyMembers').checked;
  $('announceSendBtn').disabled = !slug || (!wantsTest && !wantsMembers);
}

function renderSelection(game) {
  const normalizedThumbnail = normalizeThumbnailPath(game.thumbnail);
  $('announceSendBtn').dataset.slug = game.slug;
  $('announceSendBtn').dataset.thumbnail = normalizedThumbnail;

  $('announceTitle').textContent = text(game.title) || '—';
  $('announceSlug').textContent = text(game.slug) || '—';

  const link = $('announceLink');
  link.href = `/games/${encodeURIComponent(game.slug)}/`;
  link.hidden = false;

  const thumb = $('announceThumb');
  if (normalizedThumbnail) {
    thumb.src = normalizedThumbnail;
    thumb.alt = `${text(game.title) || 'Game'} thumbnail`;
    thumb.hidden = false;
  } else {
    thumb.removeAttribute('src');
    thumb.hidden = true;
  }

  $('announceSubject').textContent = subjectFor($('announceType').value, game.title);
  setStatus('');
  updateSendState();
}

function filterGames(games, query) {
  const q = text(query).toLowerCase();
  if (!q) return games.slice(0, 75);

  return games
    .filter((game) => {
      const title = text(game.title).toLowerCase();
      const year = text(game.year).toLowerCase();
      const system = text(game.system || game.platform).toLowerCase();
      const slug = text(game.slug).toLowerCase();
      return title.includes(q) || year.includes(q) || system.includes(q) || slug.includes(q);
    })
    .slice(0, 75);
}

function renderResults(games, bySlug) {
  const query = $('announceSearch').value;
  const matches = filterGames(games, query);
  const resultsNode = $('announceResults');
  resultsNode.innerHTML = '';

  if (!matches.length) {
    const empty = document.createElement('div');
    empty.className = 'ccg-admin-hint';
    empty.textContent = 'No matching games.';
    resultsNode.appendChild(empty);
    return;
  }

  const selectedSlug = text($('announceSendBtn').dataset.slug);

  matches.forEach((game) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'ccg-btn ccg-btn--ghost';
    if (selectedSlug && selectedSlug === game.slug) {
      button.classList.add('is-active');
    }

    const title = text(game.title) || '(untitled)';
    const year = text(game.year) || '?';
    const system = text(game.system || game.platform);
    button.textContent = `${title} (${year})${system ? ` · ${system}` : ''}`;

    button.addEventListener('click', () => {
      const fresh = bySlug.get(game.slug) || game;
      renderSelection(fresh);
      renderResults(games, bySlug);
    });

    resultsNode.appendChild(button);
  });
}

async function getSupabaseClient() {
  if (!window.ccgSupabase || typeof window.ccgSupabase.getClient !== 'function') {
    throw new Error('Supabase client bootstrap is unavailable on this page.');
  }
  return window.ccgSupabase.getClient();
}

async function bootstrap() {
  const gate = await ensureRole(['admin', 'superadmin', 'editor']);
  if (!gate) return;

  initAdminNav({ pageLabel: 'Game Announcements', active: 'announce' });

  const sendBtn = $('announceSendBtn');
  sendBtn.dataset.defaultLabel = text(sendBtn.textContent) || 'Send Announcement';

  const supabase = await getSupabaseClient();

  const response = await fetch('/games/games.json', { cache: 'no-store' });
  if (!response.ok) {
    throw new Error(`Unable to load games.json (${response.status})`);
  }

  const rawGames = await response.json();
  const games = Array.isArray(rawGames)
    ? rawGames.filter((game) => text(game?.slug) && text(game?.title))
    : [];

  const bySlug = new Map();
  games.forEach((game) => {
    bySlug.set(game.slug, game);
  });

  $('announceLoadedHint').textContent = `Loaded ${games.length} live games.`;

  $('announceSearch').addEventListener('input', () => renderResults(games, bySlug));

  $('announceType').addEventListener('change', () => {
    $('announceSubject').textContent = subjectFor($('announceType').value, $('announceTitle').textContent);
  });

  $('announceTestEmail').addEventListener('change', () => {
    if ($('announceTestEmail').checked) $('announceNotifyMembers').checked = false;
    updateSendState();
  });

  $('announceNotifyMembers').addEventListener('change', () => {
    if ($('announceNotifyMembers').checked) $('announceTestEmail').checked = false;
    updateSendState();
  });

  sendBtn.addEventListener('click', async () => {
    const previousLabel = sendBtn.dataset.defaultLabel || 'Send Announcement';
    const selectedSlug = text(sendBtn.dataset.slug);
    const game = bySlug.get(selectedSlug);

    if (!selectedSlug || !game) {
      setStatus('Please select a game before sending.', true);
      return;
    }

    const wantsTest = $('announceTestEmail').checked;
    const wantsMembers = $('announceNotifyMembers').checked;
    if (!wantsTest && !wantsMembers) {
      setStatus('Select either test email or notify members.', true);
      return;
    }

    sendBtn.disabled = true;
    sendBtn.textContent = 'Sending…';
    setStatus('Sending announcement…');

    try {
      const { data: { session } = {}, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) throw new Error(sessionError.message);

      const token = text(session?.access_token);
      if (!token) throw new Error('No active admin session.');

      const payload = {
        mode: normalizeAnnouncementMode($('announceType').value),
        game_name: text(game.title),
        game_slug: text(game.slug),
        game_thumbnail: normalizeThumbnailPath(sendBtn.dataset.thumbnail || game.thumbnail),
        test_email: wantsTest === true
      };

      const endpoint =
        `${String(window.CCG_SUPABASE_URL || '').replace(/\/+$/, '')}/functions/v1/${FUNCTION_NAME}`;

      const result = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          apikey: supabase.supabaseKey
        },
        body: JSON.stringify(payload)
      });

      const data = await result.json().catch(() => ({}));
      if (!result.ok || !data?.success) {
        throw new Error(data?.error || `Edge function failed (${result.status}).`);
      }

      setStatus(`Announcement sent. Sent: ${Number(data.sent || 0)}, failed: ${Number(data.failed || 0)}.`);
    } catch (error) {
      console.error('[announce] send failed', error);
      setStatus(`Failed: ${error.message || error}`, true);
    } finally {
      sendBtn.textContent = previousLabel;
      updateSendState();
    }
  });

  renderResults(games, bySlug);
  updateSendState();
}

startAccessMonitor();
bootstrap().catch((error) => {
  console.error('[announce] bootstrap failed', error);
  setStatus(error.message || 'Failed to initialise announcements.', true);
});