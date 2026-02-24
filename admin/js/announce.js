import { ensureRole, startAccessMonitor } from './guard.js?v=admin-stable-20260207';
import { initAdminNav } from './admin-nav.js?v=admin-stable-20260207';

const state = {
  games: [],
  filteredGames: [],
  selectedSlug: '',
  selectedMode: ''
};

function formatGameLabel(game) {
  const title = String(game?.title || '').trim();
  const year = String(game?.year || '').trim();
  const system = String(game?.system || '').trim();
  return `${title} (${year}) – ${system}`;
}

function getSelectedGame() {
  return state.games.find((game) => game.slug === state.selectedSlug) || null;
}

function setStatus(message, status = 'info') {
  const node = document.getElementById('announceStatus');
  if (!node) return;
  node.textContent = message;
  node.dataset.state = status;
}

function refreshSendButton() {
  const sendBtn = document.getElementById('announceSendBtn');
  if (!sendBtn) return;
  sendBtn.disabled = !(state.selectedSlug && state.selectedMode);
}

function renderPreview() {
  const game = getSelectedGame();
  const titleNode = document.getElementById('announcePreviewTitle');
  const subjectNode = document.getElementById('announcePreviewSubject');
  const thumbNode = document.getElementById('announcePreviewThumbnail');
  const linkNode = document.getElementById('announcePreviewLink');

  if (!titleNode || !subjectNode || !thumbNode || !linkNode) return;

  if (!game) {
    titleNode.textContent = 'Select a game to preview details.';
    subjectNode.textContent = '—';
    thumbNode.hidden = true;
    thumbNode.removeAttribute('src');
    linkNode.textContent = '—';
    linkNode.setAttribute('href', '#');
    refreshSendButton();
    return;
  }

  const title = String(game.title || '').trim();
  const year = String(game.year || '').trim();
  const subject = `🆕 New Game Added: ${title} (${year})`;
  const gameLink = `/games/${game.slug}.html`;

  titleNode.textContent = `${title} (${year})`;
  subjectNode.textContent = subject;

  const thumbnail = String(game.thumbnail || '').trim();
  if (thumbnail) {
    thumbNode.src = `/${thumbnail.replace(/^\/+/, '')}`;
    thumbNode.hidden = false;
  } else {
    thumbNode.hidden = true;
    thumbNode.removeAttribute('src');
  }

  linkNode.textContent = gameLink;
  linkNode.href = gameLink;

  refreshSendButton();
}

function renderGameList(games) {
  const listNode = document.getElementById('announceGameList');
  if (!listNode) return;

  listNode.innerHTML = '';

  if (!games.length) {
    const option = document.createElement('option');
    option.value = '';
    option.textContent = 'No games match your search.';
    option.disabled = true;
    listNode.append(option);
    return;
  }

  for (const game of games) {
    const option = document.createElement('option');
    option.value = game.slug;
    option.textContent = formatGameLabel(game);
    if (game.slug === state.selectedSlug) option.selected = true;
    listNode.append(option);
  }
}

function updateFilteredGames(searchTerm = '') {
  const query = String(searchTerm || '').trim().toLowerCase();
  state.filteredGames = query
    ? state.games.filter((game) => formatGameLabel(game).toLowerCase().includes(query) || game.slug.includes(query))
    : [...state.games];

  renderGameList(state.filteredGames);

  if (!state.filteredGames.some((game) => game.slug === state.selectedSlug)) {
    state.selectedSlug = '';
  }

  renderPreview();
}

function bindOptionToggles() {
  const testBox = document.getElementById('announceTestEmail');
  const membersBox = document.getElementById('announceNotifyMembers');

  if (!testBox || !membersBox) return;

  testBox.addEventListener('change', () => {
    if (testBox.checked) {
      membersBox.checked = false;
      state.selectedMode = 'test';
    } else if (!membersBox.checked) {
      state.selectedMode = '';
    }
    refreshSendButton();
  });

  membersBox.addEventListener('change', () => {
    if (membersBox.checked) {
      testBox.checked = false;
      state.selectedMode = 'members';
    } else if (!testBox.checked) {
      state.selectedMode = '';
    }
    refreshSendButton();
  });
}

async function loadGames() {
  const response = await fetch('/games/games.json', {
    method: 'GET',
    headers: { Accept: 'application/json' }
  });

  if (!response.ok) {
    throw new Error(`Failed to load games.json (${response.status}).`);
  }

  const payload = await response.json();
  const games = Array.isArray(payload) ? payload : [];

  state.games = games
    .filter((game) => {
      return String(game?.slug || '').trim() && String(game?.title || '').trim() && String(game?.year || '').trim() && String(game?.system || '').trim();
    })
    .map((game) => ({
      slug: String(game.slug).trim(),
      title: String(game.title).trim(),
      year: String(game.year).trim(),
      system: String(game.system).trim(),
      thumbnail: String(game.thumbnail || '').trim()
    }))
    .sort((a, b) => a.title.localeCompare(b.title, 'en', { sensitivity: 'base' }));

  state.filteredGames = [...state.games];
  renderGameList(state.filteredGames);
}

async function sendAnnouncement() {
  const game = getSelectedGame();
  if (!game || !state.selectedMode) {
    setStatus('Select one game and one announcement option.', 'error');
    return;
  }

  const isTest = state.selectedMode === 'test';
  const sendBtn = document.getElementById('announceSendBtn');
  if (sendBtn) sendBtn.disabled = true;

  setStatus('Sending…', 'info');

  try {
    const anonKey = String(window.CCG_SUPABASE_ANON_KEY || '').trim();
    if (!anonKey) {
      throw new Error('Supabase anon key is missing.');
    }

    const response = await fetch('/functions/v1/send-new-game-notification', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: anonKey
      },
      body: JSON.stringify({
        mode: 'new_game_added',
        game_slug: game.slug,
        test_email: isTest
      })
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(data?.error || `Request failed (${response.status}).`);
    }

    const sent = Number(data?.sent || 0);
    const failed = Number(data?.failed || 0);
    setStatus(`Sent: ${sent}, Failed: ${failed}`, failed > 0 ? 'error' : 'success');
  } catch (error) {
    setStatus(`Failed to send announcement: ${error.message}`, 'error');
  } finally {
    refreshSendButton();
  }
}

async function bootstrap() {
  const roleCheck = await ensureRole(['superadmin', 'admin', 'editor']);
  if (!roleCheck) return;

  initAdminNav({ pageLabel: 'Game Announcements', active: 'announce' });
  startAccessMonitor();

  const searchNode = document.getElementById('announceSearchInput');
  const listNode = document.getElementById('announceGameList');
  const sendBtn = document.getElementById('announceSendBtn');

  bindOptionToggles();

  listNode?.addEventListener('change', () => {
    state.selectedSlug = listNode.value;
    renderPreview();
  });

  searchNode?.addEventListener('input', () => {
    updateFilteredGames(searchNode.value);
  });

  sendBtn?.addEventListener('click', sendAnnouncement);

  try {
    await loadGames();
    updateFilteredGames('');
    setStatus('Select one game and one announcement option.');
  } catch (error) {
    setStatus(error.message || 'Unable to load game list.', 'error');
  }

  refreshSendButton();
}

bootstrap();
