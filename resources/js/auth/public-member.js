import { getSupabaseClient } from './supabase-client.js';

function text(value) {
  return String(value ?? '').trim();
}

function preferredSystemLabel(value) {
  if (value === 'c64') return 'Commodore 64';
  if (value === 'amiga') return 'Commodore Amiga';
  return 'Commodore 64 & Amiga';
}

function thumbnail(game) {
  const raw = text(game?.thumbnail || game?.thumb || game?.cover);
  if (/^https?:\/\//i.test(raw)) return raw;
  const filename = raw
    .replace(/^\/+/, '')
    .replace(/^resources\/images\/thumbnails\/all\//, '')
    .replace(/^resources\/images\/thumbnails\//, '')
    .replace(/^resources\/images\//, '')
    || `${game?.slug || '1942'}.jpg`;
  return `/resources/images/thumbnails/all/${filename}`;
}

function showError(message) {
  const loading = document.getElementById('publicMemberLoading');
  if (!loading) return;
  loading.hidden = false;
  loading.textContent = message;
}

async function loadGameIndex() {
  try {
    const response = await fetch('/games/games-search.json', { cache: 'default' });
    if (!response.ok) return new Map();
    const data = await response.json();
    return new Map((Array.isArray(data) ? data : []).map((game) => [text(game.slug), game]));
  } catch (error) {
    return new Map();
  }
}

function createGameCard(entry, gameIndex) {
  const gameSlug = text(entry?.game_slug);
  const game = gameIndex.get(gameSlug) || { slug: gameSlug, title: gameSlug };
  const link = document.createElement('a');
  link.className = 'public-member-game';
  link.href = `/games/${encodeURIComponent(gameSlug)}/`;

  const image = document.createElement('img');
  image.src = thumbnail(game);
  image.alt = '';
  image.loading = 'lazy';
  image.decoding = 'async';
  image.addEventListener('error', () => { image.src = '/resources/images/thumbnails/all/1942.jpg'; }, { once: true });

  const body = document.createElement('span');
  body.className = 'public-member-game__body';
  const title = document.createElement('span');
  title.className = 'public-member-game__title';
  title.textContent = text(game.title || game.name || gameSlug);
  const meta = document.createElement('span');
  meta.className = 'public-member-game__meta';
  meta.textContent = [game.system || game.platform, game.year, entry?.rating ? `${entry.rating}/10` : ''].filter(Boolean).join(' · ');
  body.append(title, meta);
  link.append(image, body);
  return link;
}

function renderGames(hostId, entries, gameIndex, emptyText) {
  const host = document.getElementById(hostId);
  if (!host) return;
  host.replaceChildren();
  if (!entries.length) {
    const empty = document.createElement('p');
    empty.className = 'public-member-empty';
    empty.textContent = emptyText;
    host.appendChild(empty);
    return;
  }
  entries.forEach((entry) => host.appendChild(createGameCard(entry, gameIndex)));
}

function renderBadges(entries) {
  const section = document.getElementById('publicMemberBadges');
  const host = document.getElementById('publicMemberBadgesGrid');
  if (!section || !host) return;
  host.replaceChildren();
  if (!entries.length) {
    section.hidden = true;
    return;
  }
  section.hidden = false;
  entries.forEach((entry) => {
    const badge = document.createElement('span');
    badge.className = 'public-member-badge';
    badge.textContent = text(entry.badge_key).replace(/[-_]+/g, ' ');
    host.appendChild(badge);
  });
}

function renderProfile(profile, gameIndex) {
  const joined = profile.joined_at ? new Date(profile.joined_at).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' }) : '';
  document.title = `${profile.display_name || profile.username} | CCG Member`;
  document.getElementById('publicMemberName').textContent = profile.display_name || profile.username || 'CCG Member';
  document.getElementById('publicMemberMeta').textContent = [
    `@${profile.username}`,
    preferredSystemLabel(profile.preferred_system),
    joined ? `Member since ${joined}` : ''
  ].filter(Boolean).join(' · ');
  document.getElementById('publicMemberBio').textContent = profile.bio || 'This member has not added a public bio yet.';

  const avatar = document.getElementById('publicMemberAvatar');
  if (avatar && profile.avatar_url) avatar.src = profile.avatar_url;

  renderGames('publicMemberTopPicksGrid', Array.isArray(profile.top_picks) ? profile.top_picks : [], gameIndex, 'No public Top Picks have been selected.');
  renderBadges(Array.isArray(profile.badges) ? profile.badges : []);

  const publicList = profile.public_list;
  const listSection = document.getElementById('publicMemberSharedList');
  if (publicList && Array.isArray(publicList.games)) {
    listSection.hidden = false;
    document.getElementById('publicMemberSharedListTitle').textContent = publicList.title || 'Public Collection';
    renderGames('publicMemberSharedListGrid', publicList.games, gameIndex, 'This public collection is currently empty.');
  } else {
    listSection.hidden = true;
  }

  document.getElementById('publicMemberLoading').hidden = true;
  document.getElementById('publicMemberHero').hidden = false;
  document.getElementById('publicMemberSections').hidden = false;
}

async function init() {
  const username = text(new URLSearchParams(window.location.search).get('u')).toLowerCase();
  if (!username) {
    showError('No public member username was supplied.');
    return;
  }

  try {
    const client = await getSupabaseClient();
    const [{ data, error }, gameIndex] = await Promise.all([
      client.rpc('get_public_member_profile', { member_handle: username }),
      loadGameIndex()
    ]);
    if (error) throw error;
    if (!data) {
      showError('This member profile is private, unavailable or does not exist.');
      return;
    }
    renderProfile(data, gameIndex);
  } catch (error) {
    console.error('[public-member] Profile load failed', error);
    showError('The public member profile could not be loaded right now.');
  }
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
else init();
