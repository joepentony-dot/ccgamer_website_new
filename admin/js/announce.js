import { ensureRole, startAccessMonitor } from './guard.js?v=admin-stable-20260207';
import { initAdminNav } from './admin-nav.js?v=admin-stable-20260207';

const SITE_ORIGIN = window.location.origin;

function $(id) {
  return document.getElementById(id);
}

function normalizeText(value) {
  return String(value || '').trim();
}

function absolutifyUrl(maybeRelative) {
  const raw = normalizeText(maybeRelative);
  if (!raw) return '';
  if (/^https?:\/\//i.test(raw)) return raw;
  return `${SITE_ORIGIN}/${raw.replace(/^\/+/, '')}`;
}

function buildLabel(game) {
  const title = normalizeText(game?.title);
  const year = normalizeText(game?.year);
  const system = normalizeText(game?.system);
  const bits = [];
  if (title) bits.push(title);
  if (year) bits.push(`(${year})`);
  if (system) bits.push(`– ${system}`);
  return bits.join(' ');
}

function setStatus(text) {
  const node = $('announceStatus');
  if (node) node.textContent = text || '';
}

function setLoadedHint(text) {
  const node = $('announceLoadedHint');
  if (node) node.textContent = text || '';
}

function updateSendState() {
  const btn = $('announceSendBtn');
  const selectedSlug = normalizeText(btn?.dataset?.selectedSlug);
  const test = $('announceTestEmail')?.checked === true;
  const members = $('announceNotifyMembers')?.checked === true;
  if (!btn) return;

  btn.disabled = !selectedSlug || (!test && !members);
}

function setPreview(game) {
  const title = normalizeText(game?.title);
  const slug = normalizeText(game?.slug);
  const thumb = absolutifyUrl(game?.thumbnail);

  $('announceTitle').textContent = title || '—';
  $('announceSlug').textContent = slug || '—';

  const link = $('announceLink');
  if (link && slug) {
    link.href = `/games/${encodeURIComponent(slug)}.html`;
    link.hidden = false;
  } else if (link) {
    link.hidden = true;
    link.href = '#';
  }

  const subject = title ? `🆕 New Game Added: ${title}` : '—';
  $('announceSubject').textContent = subject;

  const img = $('announceThumb');
  if (img && thumb) {
    img.src = thumb;
    img.alt = title ? `${title} thumbnail` : 'Game thumbnail';
    img.hidden = false;
  } else if (img) {
    img.hidden = true;
    img.removeAttribute('src');
    img.alt = '';
  }
}

function renderResults(games, query) {
  const resultsNode = $('announceResults');
  if (!resultsNode) return;

  resultsNode.innerHTML = '';

  const q = normalizeText(query).toLowerCase();
  const filtered = games.filter(g => {
    const title = normalizeText(g?.title).toLowerCase();
    const slug = normalizeText(g?.slug).toLowerCase();
    const system = normalizeText(g?.system).toLowerCase();
    const year = normalizeText(g?.year).toLowerCase();
    if (!q) return true;
    return title.includes(q) || slug.includes(q) || system.includes(q) || year.includes(q);
  });

  if (!filtered.length) {
    const empty = document.createElement('div');
    empty.className = 'ccg-admin-empty';
    empty.textContent = 'No matches.';
    resultsNode.appendChild(empty);
    return;
  }

  filtered.slice(0, 60).forEach(game => {
    const slug = normalizeText(game?.slug);
    const label = buildLabel(game);

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'ccg-btn ccg-btn--ghost ccg-admin-result';
    btn.textContent = label || slug || 'Untitled';
    btn.dataset.slug = slug;

    btn.addEventListener('click', () => {
      const sendBtn = $('announceSendBtn');
      if (sendBtn) sendBtn.dataset.selectedSlug = slug;

      setPreview(game);
      setStatus('');
      updateSendState();
    });

    resultsNode.appendChild(btn);
  });
}

async function assertLivePage(slug) {
  const url = `/games/${encodeURIComponent(slug)}.html`;
  const res = await fetch(url, { method: 'HEAD', cache: 'no-store' }).catch(() => null);
  return Boolean(res && res.ok);
}

async function sendAnnouncement(gamesBySlug) {
  const sendBtn = $('announceSendBtn');
  const selectedSlug = normalizeText(sendBtn?.dataset?.selectedSlug);
  const status = $('announceStatus');

  if (!selectedSlug) {
    setStatus('Please select a game first.');
    return;
  }

  const test = $('announceTestEmail')?.checked === true;
  const members = $('announceNotifyMembers')?.checked === true;

  if (!test && !members) {
    setStatus('Please select either test email or notify members.');
    return;
  }

  // Mutually-exclusive enforcement: test wins
  if (test && members) {
    $('announceNotifyMembers').checked = false;
  }

  const game = gamesBySlug.get(selectedSlug);
  if (!game) {
    setStatus('Selected game could not be resolved from games.json.');
    return;
  }

  const gameName = normalizeText(game?.title);
  const gameSlug = normalizeText(game?.slug);
  const gameThumbnail = absolutifyUrl(game?.thumbnail);

  if (!gameName || !gameSlug) {
    setStatus('Selected game is missing required data (title/slug).');
    return;
  }

  setStatus('Checking live page…');

  const live = await assertLivePage(gameSlug);
  if (!live) {
    setStatus('That game page is not live yet. Upload/deploy first, then announce.');
    return;
  }

  if (!window.ccgSupabase || typeof window.ccgSupabase.getClient !== 'function') {
    setStatus('Supabase client unavailable in announce page context.');
    return;
  }

  const supabase = await window.ccgSupabase.getClient();
  const supabaseUrl = String(window.CCG_SUPABASE_URL || '').replace(/\/+$/, '');
  const anonKey = String(window.CCG_SUPABASE_ANON_KEY || '').trim();
  if (!supabaseUrl || !anonKey) {
    setStatus('Supabase config unavailable in announce page context.');
    return;
  }

  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  if (sessionError) {
    setStatus(`Failed to read auth session: ${sessionError.message || 'Unknown auth error'}`);
    return;
  }

  const accessToken = normalizeText(sessionData?.session?.access_token);
  if (!accessToken) {
    setStatus('Auth required: please sign in again, then retry.');
    return;
  }

  const payload = {
    game_name: gameName,
    game_slug: gameSlug,
    game_thumbnail: gameThumbnail,
    mode: test ? 'new_game_added' : 'new_game_added_members',
    export_id: `announce-${Date.now()}`
  };
  if (test) payload.test_email = true;

  setStatus(test ? 'Sending test email…' : 'Sending member announcement…');

  const functionUrl = `${supabaseUrl}/functions/v1/send-new-game-notification`;
  const response = await fetch(functionUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: anonKey,
      Authorization: `Bearer ${accessToken}`
    },
    body: JSON.stringify(payload)
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    setStatus(`Failed: ${String(data?.error || `Edge function request failed (${response.status}).`)}`);
    return;
  }
  if (!data?.success) {
    setStatus(`Failed: ${String(data?.error || 'Unknown edge function error')}`);
    return;
  }

  const sent = Number(data?.sent || 0);
  const failed = Number(data?.failed || 0);

  if (failed > 0) {
    setStatus(`Announcement complete. Sent: ${sent}, failed: ${failed}.`);
  } else {
    setStatus(`Announcement complete. Sent: ${sent}.`);
  }
}

async function bootstrap() {
  const roleCheck = await ensureRole(['superadmin', 'admin', 'editor']);
  if (!roleCheck) return;

  const search = $('announceSearch');
  const testBox = $('announceTestEmail');
  const memberBox = $('announceNotifyMembers');
  const sendBtn = $('announceSendBtn');

  initAdminNav({ pageLabel: 'Game Announcements', active: 'announce' });

  setLoadedHint('Loading games.json…');

  let games = [];
  try {
    const res = await fetch('/games/games.json', { cache: 'no-store' });
    if (!res.ok) throw new Error(`games.json fetch failed (${res.status})`);
    games = await res.json();
    if (!Array.isArray(games)) throw new Error('games.json did not return an array.');
  } catch (e) {
    setLoadedHint(`Failed to load games.json: ${e.message}`);
    return;
  }

  const gamesBySlug = new Map();
  games.forEach(g => {
    const slug = normalizeText(g?.slug);
    if (slug) gamesBySlug.set(slug, g);
  });

  setLoadedHint(`Loaded ${gamesBySlug.size} games. Select one to announce.`);
  renderResults(games, '');

  search?.addEventListener('input', () => {
    renderResults(games, search.value || '');
  });

  // Mutual exclusivity: test wins
  testBox?.addEventListener('change', () => {
    if (testBox.checked && memberBox) memberBox.checked = false;
    updateSendState();
  });
  memberBox?.addEventListener('change', () => {
    if (memberBox.checked && testBox) testBox.checked = false;
    updateSendState();
  });

  sendBtn?.addEventListener('click', () => sendAnnouncement(gamesBySlug));

  updateSendState();
}

startAccessMonitor();
bootstrap();