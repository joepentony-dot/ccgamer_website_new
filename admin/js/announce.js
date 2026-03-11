import { ensureRole, startAccessMonitor } from './guard.js?v=admin-stable-20260207';
import { initAdminNav } from './admin-nav.js?v=admin-stable-20260207';

const FUNCTION_NAME = 'send-new-game-notification';
const RETRO_EVENTS_DATA_PATH = '/data/retro-events.json';
const AMIGA_DEMO_MUSIC_DATA_PATH = '/data/amiga-demo-music.json';

function $(id) {
  return document.getElementById(id);
}

function text(value) {
  return String(value || '').trim();
}

function normalizeAnnouncementMode(rawMode) {
  const mode = text(rawMode);
  if (!mode) return 'new_game_added';
  // keep legacy modes mapped to new_game_added to avoid regressions
  if (mode === 'coming_soon_members' || mode === 'coming_soon') return 'new_game_added';
  return mode;
}

function normalizeThumbnailPath(rawPath) {
  const path = text(rawPath);
  if (!path) return '';
  if (/^https?:\/\//i.test(path)) return path;
  return path.startsWith('/') ? path : `/${path}`;
}

function normalizeType(rawType, fallbackType = 'game') {
  const type = text(rawType).toLowerCase();
  if (type === 'retro_special') return 'retro_special';
  if (type === 'demo_music' || type === 'amiga_demo_music') return 'demo_music';
  if (type === 'retro_event') return 'retro_event';
  return fallbackType;
}

function routeFor(type, slug) {
  const safeSlug = text(slug);
  if (!safeSlug) return '';
  if (type === 'retro_special') return `/retro-specials/${encodeURIComponent(safeSlug)}/`;
  if (type === 'retro_event') return `/retro-events/${encodeURIComponent(safeSlug)}/`;
  if (type === 'demo_music') return `/amiga-demo-music/${encodeURIComponent(safeSlug)}/`;
  return `/games/${encodeURIComponent(safeSlug)}/`;
}

function typeLabel(type) {
  if (type === 'retro_special') return 'Retro Special';
  if (type === 'retro_event') return 'Retro Event';
  if (type === 'demo_music') return 'Amiga Demo Music';
  return 'Game';
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
  if (!node) return;
  node.textContent = message;
  node.dataset.state = isError ? 'error' : 'ok';
}

function updateSendState() {
  const btn = $('announceSendBtn');
  if (!btn) return;

  const slug = text(btn.dataset.slug);
  const wantsTest = !!$('announceTestEmail')?.checked;
  const wantsMembers = !!$('announceNotifyMembers')?.checked;

  btn.disabled = !slug || (!wantsTest && !wantsMembers);
}

function renderSelection(game) {
  const btn = $('announceSendBtn');
  const normalizedThumbnail = normalizeThumbnailPath(game.thumbnail);
  const selectedType = normalizeType(game.type, 'game');

  btn.dataset.slug = game.slug;
  btn.dataset.type = selectedType;
  btn.dataset.route = game.route;
  btn.dataset.thumbnail = normalizedThumbnail;

  $('announceTitle').textContent = text(game.title) || '—';
  $('announceSlug').textContent = text(game.slug) || '—';

  const link = $('announceLink');
  link.href = game.route;
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
  const resultsNode = $('announceResults');
  if (!resultsNode) return;

  const query = $('announceSearch').value;
  const matches = filterGames(games, query);

  resultsNode.innerHTML = '';

  if (!matches.length) {
    const empty = document.createElement('div');
    empty.className = 'ccg-admin-hint';
    empty.textContent = 'No matching content.';
    resultsNode.appendChild(empty);
    return;
  }

  const selectedSlug = text($('announceSendBtn').dataset.slug);
  const selectedType = text($('announceSendBtn').dataset.type) || 'game';

  matches.forEach((game) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'ccg-btn ccg-btn--ghost';

    if (selectedSlug && selectedType === normalizeType(game.type, 'game') && selectedSlug === game.slug) {
      button.classList.add('is-active');
    }

    const title = text(game.title) || '(untitled)';
    const year = text(game.year);
    const system = text(game.system || game.platform);
    const label = typeLabel(game.type);
    const yearLabel = year ? ` (${year})` : '';
    button.textContent = `[${label}] ${title}${yearLabel}${system ? ` · ${system}` : ''}`;

    button.addEventListener('click', () => {
      const fresh = bySlug.get(`${normalizeType(game.type, 'game')}:${game.slug}`) || game;
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

function getSupabaseEndpoint() {
  const base = String(window.CCG_SUPABASE_URL || '').replace(/\/+$/, '');
  if (!base) throw new Error('CCG_SUPABASE_URL is missing on window.');
  return `${base}/functions/v1/${FUNCTION_NAME}`;
}

function getAnonKey() {
  const key = String(window.CCG_SUPABASE_ANON_KEY || '').trim();
  if (!key) throw new Error('CCG_SUPABASE_ANON_KEY is missing on window.');
  return key;
}

async function bootstrap() {
  const gate = await ensureRole(['admin', 'superadmin', 'editor']);
  if (!gate) return;

  initAdminNav({ pageLabel: 'Announcements', active: 'announce' });

  const sendBtn = $('announceSendBtn');
  sendBtn.dataset.defaultLabel = text(sendBtn.textContent) || 'Send Announcement';

  const supabase = await getSupabaseClient();

  const [gamesResponse, retroResponse, demoResponse] = await Promise.all([
    fetch('/games/games.json', { cache: 'no-store' }),
    fetch(RETRO_EVENTS_DATA_PATH, { cache: 'no-store' }),
    fetch(AMIGA_DEMO_MUSIC_DATA_PATH, { cache: 'no-store' })
  ]);

  if (!gamesResponse.ok) throw new Error(`Unable to load games.json (${gamesResponse.status})`);
  if (!retroResponse.ok) throw new Error(`Unable to load retro-events.json (${retroResponse.status})`);
  if (!demoResponse.ok) throw new Error(`Unable to load amiga-demo-music.json (${demoResponse.status})`);

  const [rawGames, rawRetro, rawDemo] = await Promise.all([
    gamesResponse.json(),
    retroResponse.json(),
    demoResponse.json()
  ]);

  const games = Array.isArray(rawGames)
    ? rawGames
      .filter((game) => text(game?.slug) && text(game?.title))
      .map((game) => ({
        ...game,
        type: 'game',
        route: routeFor('game', game.slug)
      }))
    : [];

  const retroItems = Array.isArray(rawRetro)
    ? rawRetro
      .filter((entry) => text(entry?.slug || entry?.id) && text(entry?.title) && entry?.visible !== false && entry?.published !== false)
      .map((entry) => {
        const slug = text(entry.slug || entry.id);
        const type = normalizeType(entry.type, 'retro_event');
        return {
          slug,
          title: text(entry.title),
          year: text(entry?.published_date || entry?.event_date || entry?.date),
          system: '',
          thumbnail: text(entry.thumbnail),
          type,
          route: routeFor(type, slug)
        };
      })
    : [];

  const demoItems = Array.isArray(rawDemo)
    ? rawDemo
      .filter((entry) => text(entry?.slug || entry?.id) && text(entry?.title) && entry?.visible !== false && entry?.published !== false)
      .map((entry) => {
        const slug = text(entry.slug || entry.id);
        const type = normalizeType(entry.type, 'demo_music');
        return {
          slug,
          title: text(entry.title),
          year: text(entry?.published_date || entry?.year),
          system: 'Amiga',
          thumbnail: text(entry.thumbnail),
          type,
          route: routeFor(type, slug)
        };
      })
    : [];

  const announceable = [...games, ...retroItems, ...demoItems];

  const bySlug = new Map();
  announceable.forEach((item) => bySlug.set(`${item.type}:${item.slug}`, item));

  $('announceLoadedHint').textContent = `Loaded ${games.length} games and ${retroItems.length + demoItems.length} retro videos.`;

  $('announceSearch').addEventListener('input', () => renderResults(announceable, bySlug));

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
    const selectedType = text(sendBtn.dataset.type) || 'game';
    const game = bySlug.get(`${selectedType}:${selectedSlug}`);

    if (!selectedSlug || !game) {
      setStatus('Please select content before sending.', true);
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
      if (sessionError) throw new Error(sessionError.message || 'Unable to read admin session.');

      const token = text(session?.access_token);
      if (!token) throw new Error('No active admin session. Please sign in again.');

      const payload = {
        mode: normalizeAnnouncementMode($('announceType').value),
        game_name: text(game.title),
        game_slug: text(game.slug),
        game_thumbnail: normalizeThumbnailPath(sendBtn.dataset.thumbnail || game.thumbnail),
        game_url: text(sendBtn.dataset.route || game.route),
        content_type: selectedType,
        test_email: wantsTest === true,
        notify_members: wantsMembers === true
      };

      const endpoint = getSupabaseEndpoint();
      const anonKey = getAnonKey();

      // ✅ IMPORTANT: Supabase Edge gateway expects apikey on requests.
      const result = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: anonKey,
          Authorization: `Bearer ${token}`,
          'x-client-info': 'ccg-admin/announce'
        },
        body: JSON.stringify(payload)
      });

      const data = await result.json().catch(() => ({}));
      if (!result.ok || !data?.success) {
        throw new Error(data?.error || `Edge function failed (${result.status}).`);
      }

      const sent = Number(data.sent || 0);
      const failed = Number(data.failed || 0);
      setStatus(`Announcement sent. Sent: ${sent}, failed: ${failed}.`);
    } catch (error) {
      console.error('[announce] send failed', error);
      setStatus(`Failed: ${error instanceof Error ? error.message : String(error)}`, true);
    } finally {
      sendBtn.textContent = previousLabel;
      updateSendState();
    }
  });

  renderResults(announceable, bySlug);
  updateSendState();
}

startAccessMonitor();
bootstrap().catch((error) => {
  console.error('[announce] bootstrap failed', error);
  setStatus(error instanceof Error ? error.message : 'Failed to initialise announcements.', true);
});
