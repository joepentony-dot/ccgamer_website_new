import { ensureRole, startAccessMonitor } from './guard.js?v=admin-stable-20260207';
import { initAdminNav } from './admin-nav.js?v=admin-stable-20260207';

const FUNCTION_NAME = 'send-new-game-notification';
const RETRO_SPECIALS_DATA_PATH = '/data/retro-specials.json';
const RETRO_EVENTS_DATA_PATH = '/data/retro-events.json';
const AMIGA_DEMO_MUSIC_DATA_PATH = '/data/amiga-demo-music.json';
const CONTENT_FILTERS = new Set(['all', 'game', 'retro_special', 'retro_event', 'demo_music']);

function $(id) {
  return document.getElementById(id);
}

function text(value) {
  return String(value || '').trim();
}

function normalizeAnnouncementMode(rawMode) {
  const mode = text(rawMode).toLowerCase();
  if (!mode || mode === 'new_game_added' || mode === 'coming_soon_members' || mode === 'coming_soon') {
    return 'new_content';
  }
  if (mode === 'featured_classic' || mode === 'spotlight_pick') return mode;
  return 'new_content';
}

function normalizeThumbnailPath(rawPath) {
  const path = text(rawPath);
  if (!path) return '';
  if (/^https?:\/\//i.test(path)) return path;
  return path.startsWith('/') ? path : `/${path}`;
}

function normalizeType(rawType, fallbackType = 'game') {
  const type = text(rawType).toLowerCase().replace(/[\s-]+/g, '_');
  if (type === 'retro_special' || type === 'retro_specials') return 'retro_special';
  if (type === 'demo_music' || type === 'amiga_demo_music') return 'demo_music';
  if (type === 'retro_event' || type === 'retro_events') return 'retro_event';
  if (type === 'game' || type === 'games') return 'game';
  return fallbackType;
}

function contentCategory(type, entry) {
  const combined = [entry?.collection, entry?.category, entry?.slug, entry?.title]
    .map((value) => text(value).toLowerCase())
    .join(' ');
  if (type === 'retro_special' && /zzap!?\s*64|zzap64/.test(combined)) return 'zzap64';
  return type;
}

function routeFor(type, slug) {
  const safeSlug = text(slug);
  if (!safeSlug) return '';
  if (type === 'retro_special') return `/retro-specials/${encodeURIComponent(safeSlug)}/`;
  if (type === 'retro_event') return `/retro-events/${encodeURIComponent(safeSlug)}/`;
  if (type === 'demo_music') return `/amiga-demo-music/${encodeURIComponent(safeSlug)}/`;
  return `/games/${encodeURIComponent(safeSlug)}/`;
}

function typeLabel(itemOrType) {
  const item = typeof itemOrType === 'object' ? itemOrType : { type: itemOrType };
  const type = normalizeType(item.type, 'game');
  if (item.category === 'zzap64') return 'Zzap!64 Feature';
  if (type === 'retro_special') return 'Retro Special';
  if (type === 'retro_event') return 'Retro Event';
  if (type === 'demo_music') return 'Amiga Demo Music';
  return 'Game';
}

function preferenceLabel(item) {
  return normalizeType(item?.type, 'game') === 'game'
    ? 'New game notifications'
    : 'New video and Retro Special notifications';
}

function subjectFor(mode, item) {
  const title = text(item?.title || item);
  if (!title) return '—';

  const normalizedMode = normalizeAnnouncementMode(mode);
  const type = normalizeType(item?.type, 'game');
  const category = text(item?.category).toLowerCase();

  if (normalizedMode === 'featured_classic') {
    return type === 'game' ? `⭐ Featured Classic: ${title}` : `⭐ Featured CCG Video: ${title}`;
  }

  if (normalizedMode === 'spotlight_pick') {
    return `🎯 CCG Spotlight: ${title}`;
  }

  if (category === 'zzap64') return `🏅 New Zzap!64 Feature: ${title}`;
  if (type === 'retro_special') return `🎬 New CCG Video: ${title}`;
  if (type === 'retro_event') return `📅 New Retro Event: ${title}`;
  if (type === 'demo_music') return `🎵 New Amiga Demo Music: ${title}`;
  return `🆕 New Game Added: ${title}`;
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
  const wantsTest = Boolean($('announceTestEmail')?.checked);
  const wantsMembers = Boolean($('announceNotifyMembers')?.checked);
  btn.disabled = !slug || (!wantsTest && !wantsMembers);
}

function updatePreviewSubject(item) {
  const subject = $('announceSubject');
  if (subject) subject.textContent = subjectFor($('announceType')?.value, item);
}

function renderSelection(item) {
  const btn = $('announceSendBtn');
  const normalizedThumbnail = normalizeThumbnailPath(item.thumbnail);
  const selectedType = normalizeType(item.type, 'game');

  btn.dataset.slug = item.slug;
  btn.dataset.type = selectedType;
  btn.dataset.category = text(item.category || selectedType);
  btn.dataset.route = item.route;
  btn.dataset.thumbnail = normalizedThumbnail;

  $('announceTitle').textContent = text(item.title) || '—';
  $('announceSlug').textContent = text(item.slug) || '—';
  $('announceContentType').textContent = typeLabel(item);
  $('announcePreference').textContent = preferenceLabel(item);

  const link = $('announceLink');
  link.href = item.route;
  link.hidden = false;

  const thumb = $('announceThumb');
  if (normalizedThumbnail) {
    thumb.src = normalizedThumbnail;
    thumb.alt = `${text(item.title) || typeLabel(item)} thumbnail`;
    thumb.hidden = false;
  } else {
    thumb.removeAttribute('src');
    thumb.hidden = true;
  }

  updatePreviewSubject(item);
  setStatus('');
  updateSendState();
}

function selectedContentFilter() {
  const filter = text($('announceContentFilter')?.value).toLowerCase();
  return CONTENT_FILTERS.has(filter) ? filter : 'all';
}

function filterContent(items, query) {
  const q = text(query).toLowerCase();
  const filter = selectedContentFilter();

  return items
    .filter((item) => filter === 'all' || normalizeType(item.type, 'game') === filter)
    .filter((item) => {
      if (!q) return true;
      const haystack = [
        item.title,
        item.year,
        item.system,
        item.platform,
        item.slug,
        item.collection,
        item.category,
        typeLabel(item)
      ].map((value) => text(value).toLowerCase()).join(' ');
      return haystack.includes(q);
    })
    .slice(0, 100);
}

function renderResults(items, byKey) {
  const resultsNode = $('announceResults');
  if (!resultsNode) return;

  const matches = filterContent(items, $('announceSearch')?.value);
  resultsNode.replaceChildren();

  if (!matches.length) {
    const empty = document.createElement('div');
    empty.className = 'ccg-admin-hint';
    empty.textContent = 'No matching live content.';
    resultsNode.appendChild(empty);
    return;
  }

  const selectedSlug = text($('announceSendBtn').dataset.slug);
  const selectedType = text($('announceSendBtn').dataset.type) || 'game';

  matches.forEach((item) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'ccg-btn ccg-btn--ghost';

    const itemType = normalizeType(item.type, 'game');
    if (selectedSlug && selectedType === itemType && selectedSlug === item.slug) {
      button.classList.add('is-active');
    }

    const title = text(item.title) || '(untitled)';
    const year = text(item.year);
    const system = text(item.system || item.platform);
    const yearLabel = year ? ` (${year})` : '';
    button.textContent = `[${typeLabel(item)}] ${title}${yearLabel}${system ? ` · ${system}` : ''}`;

    button.addEventListener('click', () => {
      const fresh = byKey.get(`${itemType}:${item.slug}`) || item;
      renderSelection(fresh);
      renderResults(items, byKey);
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

async function fetchJsonFeed(path, label, required = false) {
  try {
    const response = await fetch(path, { cache: 'no-store' });
    if (!response.ok) throw new Error(`${response.status}`);
    return { label, data: await response.json(), error: null };
  } catch (error) {
    if (required) throw new Error(`Unable to load ${label}: ${error instanceof Error ? error.message : String(error)}`);
    return { label, data: [], error: error instanceof Error ? error.message : String(error) };
  }
}

function dateYear(value) {
  const raw = text(value);
  if (!raw) return '';
  const match = raw.match(/\b(19|20)\d{2}\b/);
  return match ? match[0] : raw;
}

function mapVideoFeed(entries, fallbackType) {
  return (Array.isArray(entries) ? entries : [])
    .filter((entry) => text(entry?.slug || entry?.id) && text(entry?.title) && entry?.visible !== false && entry?.published !== false)
    .map((entry) => {
      const slug = text(entry.slug || entry.id);
      const type = normalizeType(entry.type, fallbackType);
      const youtubeId = text(entry.youtubeId || entry.youtube_video_id || entry.videoId || entry.youtube);
      const thumbnail = text(entry.thumbnail) || (youtubeId ? `https://img.youtube.com/vi/${encodeURIComponent(youtubeId)}/hqdefault.jpg` : '');
      return {
        slug,
        title: text(entry.title),
        year: dateYear(entry.published_date || entry.created_at || entry.event_date || entry.date || entry.year),
        system: type === 'demo_music' ? 'Amiga' : text(entry.system || entry.platform),
        thumbnail,
        type,
        category: contentCategory(type, entry),
        collection: text(entry.collection),
        route: routeFor(type, slug)
      };
    });
}

async function bootstrap() {
  const gate = await ensureRole(['admin', 'superadmin', 'editor']);
  if (!gate) return;

  initAdminNav({ pageLabel: 'Announcements', active: 'announce' });

  const sendBtn = $('announceSendBtn');
  sendBtn.dataset.defaultLabel = text(sendBtn.textContent) || 'Send Announcement';
  const supabase = await getSupabaseClient();

  const [gamesFeed, specialsFeed, eventsFeed, demoFeed] = await Promise.all([
    fetchJsonFeed('/games/games.json', 'games.json', true),
    fetchJsonFeed(RETRO_SPECIALS_DATA_PATH, 'Retro Specials'),
    fetchJsonFeed(RETRO_EVENTS_DATA_PATH, 'Retro Events'),
    fetchJsonFeed(AMIGA_DEMO_MUSIC_DATA_PATH, 'Amiga Demo Music')
  ]);

  const games = (Array.isArray(gamesFeed.data) ? gamesFeed.data : [])
    .filter((game) => text(game?.slug) && text(game?.title))
    .map((game) => ({
      ...game,
      type: 'game',
      category: 'game',
      route: routeFor('game', game.slug)
    }));

  const specials = mapVideoFeed(specialsFeed.data, 'retro_special');
  const events = mapVideoFeed(eventsFeed.data, 'retro_event');
  const demoItems = mapVideoFeed(demoFeed.data, 'demo_music');
  const announceable = [...games, ...specials, ...events, ...demoItems];

  const byKey = new Map();
  announceable.forEach((item) => byKey.set(`${normalizeType(item.type, 'game')}:${item.slug}`, item));

  const warnings = [specialsFeed, eventsFeed, demoFeed]
    .filter((feed) => feed.error)
    .map((feed) => feed.label);
  const totals = `${games.length} games, ${specials.length} Retro Specials, ${events.length} Retro Events and ${demoItems.length} Amiga demo videos`;
  $('announceLoadedHint').textContent = warnings.length
    ? `Loaded ${totals}. Unavailable feed: ${warnings.join(', ')}.`
    : `Loaded ${totals}.`;

  const rerender = () => renderResults(announceable, byKey);
  $('announceSearch').addEventListener('input', rerender);
  $('announceContentFilter').addEventListener('change', rerender);

  $('announceType').addEventListener('change', () => {
    const selectedType = text(sendBtn.dataset.type) || 'game';
    const selectedSlug = text(sendBtn.dataset.slug);
    const selected = byKey.get(`${selectedType}:${selectedSlug}`);
    if (selected) updatePreviewSubject(selected);
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
    const item = byKey.get(`${selectedType}:${selectedSlug}`);

    if (!selectedSlug || !item) {
      setStatus('Please select live content before sending.', true);
      return;
    }

    const wantsTest = Boolean($('announceTestEmail').checked);
    const wantsMembers = Boolean($('announceNotifyMembers').checked);
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

      const contentUrl = text(sendBtn.dataset.route || item.route);
      const contentThumbnail = normalizeThumbnailPath(sendBtn.dataset.thumbnail || item.thumbnail);
      const payload = {
        mode: normalizeAnnouncementMode($('announceType').value),
        content_name: text(item.title),
        content_slug: text(item.slug),
        content_thumbnail: contentThumbnail,
        content_url: contentUrl,
        content_type: selectedType,
        content_category: text(sendBtn.dataset.category || item.category || selectedType),
        test_email: wantsTest,
        notify_members: wantsMembers,
        // Legacy keys remain during the endpoint transition.
        game_name: text(item.title),
        game_slug: text(item.slug),
        game_thumbnail: contentThumbnail,
        game_url: contentUrl
      };

      const result = await fetch(getSupabaseEndpoint(), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: getAnonKey(),
          Authorization: `Bearer ${token}`,
          'x-client-info': 'ccg-admin/content-announcements-phase20b'
        },
        body: JSON.stringify(payload)
      });

      const data = await result.json().catch(() => ({}));
      if (!result.ok || !data?.success) {
        throw new Error(data?.error || `Edge function failed (${result.status}).`);
      }

      const attempted = Number(data.attempted || 0);
      const sent = Number(data.sent || 0);
      const failed = Number(data.failed || 0);
      setStatus(`Announcement completed. Attempted: ${attempted}, sent: ${sent}, failed: ${failed}.`);
    } catch (error) {
      console.error('[announce] send failed', error);
      setStatus(`Failed: ${error instanceof Error ? error.message : String(error)}`, true);
    } finally {
      sendBtn.textContent = previousLabel;
      updateSendState();
    }
  });

  renderResults(announceable, byKey);
  updateSendState();
}

startAccessMonitor();
bootstrap().catch((error) => {
  console.error('[announce] bootstrap failed', error);
  setStatus(error instanceof Error ? error.message : 'Failed to initialise announcements.', true);
});
