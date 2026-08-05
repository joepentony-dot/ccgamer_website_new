import { getSupabaseClient } from './supabase-client.js';

const PHASE9_CSS = '/resources/css/public-member-profile-phase9.css';

function text(value) {
  return String(value ?? '').trim();
}

function ensureStylesheet() {
  if (document.querySelector(`link[href="${PHASE9_CSS}"]`)) return;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = PHASE9_CSS;
  document.head.appendChild(link);
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

function formatBadgeDate(value) {
  const date = new Date(value || 0);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('en-GB', {
    month: 'short',
    year: 'numeric'
  }).format(date);
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
    const badge = document.createElement('article');
    badge.className = 'public-member-badge public-member-badge--detailed';

    const mark = document.createElement('span');
    mark.className = 'public-member-badge__mark';
    mark.textContent = '✓';
    mark.setAttribute('aria-hidden', 'true');

    const body = document.createElement('div');
    body.className = 'public-member-badge__body';

    const title = document.createElement('strong');
    title.className = 'public-member-badge__title';
    title.textContent = text(
      entry.badge_name
      || entry.badge_key
      || 'Member achievement'
    ).replace(/[-_]+/g, ' ');

    const description = document.createElement('p');
    description.className = 'public-member-badge__description';
    description.textContent = text(entry.badge_description || 'CCG member achievement.');

    const date = formatBadgeDate(entry.assigned_at);
    if (date) {
      const meta = document.createElement('span');
      meta.className = 'public-member-badge__meta';
      meta.textContent = `Earned ${date}`;
      body.append(title, description, meta);
    } else {
      body.append(title, description);
    }

    badge.append(mark, body);
    host.appendChild(badge);
  });
}

function publicProfileUrl(username) {
  if (!username) return '';
  const url = new URL('/community/member.html', window.location.origin);
  url.searchParams.set('u', username);
  return url.toString();
}

async function copyPublicProfileLink(username, button) {
  const url = publicProfileUrl(username);
  if (!url) return;
  try {
    await navigator.clipboard.writeText(url);
    button.textContent = 'Link copied';
  } catch (error) {
    button.textContent = 'Copy unavailable';
  }
  window.setTimeout(() => { button.textContent = 'Copy profile link'; }, 1800);
}

function renderActions(profile, previewMode) {
  const hero = document.getElementById('publicMemberHero');
  if (!hero || document.getElementById('publicMemberActions')) return;

  const actions = document.createElement('div');
  actions.className = 'public-member-actions';
  actions.id = 'publicMemberActions';

  if (previewMode) {
    const back = document.createElement('a');
    back.className = 'auth-btn';
    back.href = '/community/profile.html#memberSettings';
    back.textContent = 'Back to Member Hub';
    actions.appendChild(back);
  }

  if (profile.username && profile.is_public) {
    const copy = document.createElement('button');
    copy.className = 'auth-btn';
    copy.type = 'button';
    copy.textContent = 'Copy profile link';
    copy.addEventListener('click', () => {
      void copyPublicProfileLink(profile.username, copy);
    });
    actions.appendChild(copy);
  }

  if (actions.childElementCount) hero.appendChild(actions);
}

function renderPreviewNotice(profile) {
  const main = document.getElementById('publicMemberPage');
  const loading = document.getElementById('publicMemberLoading');
  if (!main || document.getElementById('publicMemberPreviewNotice')) return;

  const notice = document.createElement('aside');
  notice.className = 'public-member-preview-notice';
  notice.id = 'publicMemberPreviewNotice';
  notice.innerHTML = `
    <strong>Private owner preview</strong>
    <span>${profile.is_public
      ? 'This matches the profile currently visible to visitors.'
      : 'Only you can see this preview. Visitors cannot see the profile until you enable the public-profile switch.'}</span>
  `;
  main.insertBefore(notice, loading);
}

function renderProfile(profile, gameIndex, { previewMode = false } = {}) {
  const joined = profile.joined_at ? new Date(profile.joined_at).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' }) : '';
  document.title = `${profile.display_name || profile.username || 'CCG Member'} | ${previewMode ? 'Profile Preview' : 'CCG Member'}`;
  document.getElementById('publicMemberName').textContent = profile.display_name || profile.username || 'CCG Member';
  document.getElementById('publicMemberMeta').textContent = [
    profile.username ? `@${profile.username}` : '',
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

  if (previewMode) renderPreviewNotice(profile);
  renderActions(profile, previewMode);

  document.getElementById('publicMemberLoading').hidden = true;
  document.getElementById('publicMemberHero').hidden = false;
  document.getElementById('publicMemberSections').hidden = false;
}

async function init() {
  ensureStylesheet();
  const params = new URLSearchParams(window.location.search);
  const previewMode = params.get('preview') === '1';
  const username = text(params.get('u')).toLowerCase();

  if (!previewMode && !username) {
    showError('No public member username was supplied.');
    return;
  }

  try {
    const client = await getSupabaseClient();
    const profileRequest = previewMode
      ? client.rpc('get_my_public_profile_preview')
      : client.rpc('get_public_member_profile', { member_handle: username });

    const [{ data, error }, gameIndex] = await Promise.all([
      profileRequest,
      loadGameIndex()
    ]);

    if (error) throw error;
    if (!data) {
      showError(previewMode
        ? 'Sign in to preview your public-profile settings.'
        : 'This member profile is private, unavailable or does not exist.');
      return;
    }
    renderProfile(data, gameIndex, { previewMode });
  } catch (error) {
    console.error('[public-member] Profile load failed', error);
    showError(previewMode
      ? 'The owner preview is awaiting the Phase 9 database migration.'
      : 'The public member profile could not be loaded right now.');
  }
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
else void init();
