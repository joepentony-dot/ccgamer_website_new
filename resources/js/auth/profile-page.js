import { getSupabaseClient } from './supabase-client.js';

const DEBUG = typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('debug');
const TOP_PICKS_LIMIT = 10;
const CANONICAL_SITE_ORIGIN = 'https://www.cheekycommodoregamer.co.uk';
const PROFILE_AVATAR_BUCKET = 'profile-avatars';
const PROFILE_AVATAR_SIZE = 512;
const PROFILE_AVATAR_SOURCE_MAX_BYTES = 8 * 1024 * 1024;
const PROFILE_AVATAR_OUTPUT_MAX_BYTES = 2 * 1024 * 1024;
const PROFILE_AVATAR_FALLBACK = '/favicon.ico';

export function deriveTopPickSlugs(rows) {
  return new Set(
    (Array.isArray(rows) ? rows : [])
      .map((row) => String(row?.game_slug || '').trim())
      .filter(Boolean)
  );
}

export function canAddTopPick(currentCount, limit = TOP_PICKS_LIMIT) {
  return Number(currentCount) < limit;
}

function log(...args) {
  if (DEBUG) console.log('[profile]', ...args);
}

function setMessage(messageBox, text, type = '') {
  if (!messageBox) return;
  messageBox.textContent = text;
  messageBox.classList.remove('auth-error', 'auth-success');
  if (type === 'error') messageBox.classList.add('auth-error');
  if (type === 'success') messageBox.classList.add('auth-success');
}

function formatJoinDate(rawValue) {
  if (!rawValue) return '—';
  const parsed = new Date(rawValue);
  if (Number.isNaN(parsed.getTime())) return '—';

  try {
    return parsed.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  } catch (error) {
    console.error('[profile] Failed to format join date', error, { rawValue });
    return '—';
  }
}

function profileDefaults(user) {
  return {
    id: user.id,
    email: user.email || null,
    display_name:
      user.user_metadata?.display_name
      || user.user_metadata?.full_name
      || user.user_metadata?.name
      || 'Member',
    notify_new_games: false,
    notify_newsletter: false,
    notify_weekly_challenge: true
  };
}

async function fetchProfile(supabaseClient, userId) {
  return supabaseClient
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();
}

async function ensureProfileRow(supabaseClient, user) {
  const firstRead = await fetchProfile(supabaseClient, user.id);

  if (firstRead.error) {
    console.error('[profile] Profile read failed', firstRead.error, { userId: user.id });
    return { profile: null, error: firstRead.error };
  }

  if (firstRead.data) {
    return { profile: firstRead.data, error: null };
  }

  const insertPayload = profileDefaults(user);
  const { error: createError } = await supabaseClient
    .from('profiles')
    .upsert(insertPayload, { onConflict: 'id' });

  if (createError) {
    console.error('[profile] Profile auto-create failed', createError, { userId: user.id, insertPayload });
    return { profile: null, error: createError };
  }

  const secondRead = await fetchProfile(supabaseClient, user.id);
  if (secondRead.error || !secondRead.data) {
    const missingError = secondRead.error || new Error('Profile row still missing after create');
    console.error('[profile] Profile re-read failed after create', missingError, { userId: user.id });
    return { profile: null, error: missingError };
  }

  return { profile: secondRead.data, error: null };
}

function isLegacyIdFallback(value, user) {
  const text = String(value || '').trim().toLowerCase();
  const prefix = String(user?.id || '').slice(0, 8).toLowerCase();
  return Boolean(text && prefix && text === prefix);
}

function resolveProfileDisplayName(user, profile) {
  const candidates = [profile?.display_name, profile?.username];
  for (const candidate of candidates) {
    const text = String(candidate || '').trim();
    if (!text || isLegacyIdFallback(text, user)) continue;
    return text;
  }
  return 'Member';
}

function renderProfile(user, profile) {
  const displayNameEl = document.getElementById('displayName');
  const emailValueEl = document.getElementById('emailValue');
  const joinDateEl = document.getElementById('joinDate');

  if (displayNameEl) displayNameEl.textContent = resolveProfileDisplayName(user, profile);
  if (emailValueEl) emailValueEl.textContent = 'Hidden for privacy';
  if (joinDateEl) joinDateEl.textContent = formatJoinDate(profile.created_at || profile.joined_at || user.created_at);

  const avatarEl = document.getElementById('profileAvatar');
  if (avatarEl) {
    avatarEl.src = String(profile.avatar_url || '').trim() || PROFILE_AVATAR_FALLBACK;
  }

  const notifyNewGames = document.getElementById('notifyNewGames');
  if (notifyNewGames) notifyNewGames.checked = Boolean(profile.notify_new_games);

  const notifyNewsletter = document.getElementById('notifyNewsletter');
  if (notifyNewsletter) notifyNewsletter.checked = Boolean(profile.notify_newsletter);

  const notifyWeeklyChallenge = document.getElementById('notifyWeeklyChallenge');
  if (notifyWeeklyChallenge) notifyWeeklyChallenge.checked = profile.notify_weekly_challenge !== false;
}

function normalizeSlugCandidate(candidate) {
  const raw = String(candidate || '').trim().toLowerCase();
  if (!raw) return '';
  return raw
    .replace(/_/g, '-')
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]+/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function resolveFavouriteSlug(entry) {
  const slugFromRow = normalizeSlugCandidate(entry?.game_slug);
  if (slugFromRow) return slugFromRow;

  const slugFromGame = normalizeSlugCandidate(entry?.game?.slug);
  if (slugFromGame) return slugFromGame;

  const idFromGame = normalizeSlugCandidate(entry?.game?.id);
  if (idFromGame) return idFromGame;

  return normalizeSlugCandidate(entry?.game_id);
}

function buildCanonicalGameUrl(slug) {
  return `${CANONICAL_SITE_ORIGIN}/games/${slug}/`;
}

function resolveSingleGameThumbBasePath() {
  let pathname = window.location.pathname || '';
  const repoMarker = '/ccgamer_website_new/';
  if (pathname.includes(repoMarker)) {
    pathname = pathname.slice(pathname.indexOf(repoMarker) + repoMarker.length);
  }

  const isTrailingSlashPath = pathname.endsWith('/') || pathname.endsWith('index.html');
  pathname = pathname.replace(/^\/+|\/+$/g, '');
  const segments = pathname ? pathname.split('/') : [];
  const isPrettyGamePath = segments[0] === 'games'
    && segments.length >= 2
    && !segments[1].includes('.html');
  const isDirectoryPath = isTrailingSlashPath || isPrettyGamePath;
  const depth = Math.max(segments.length - (isDirectoryPath ? 0 : 1), 0);
  const prefix = '../'.repeat(depth || 1);

  return `${prefix}resources/images/thumbnails/all/`;
}

function resolveGameThumb(raw, slug = '') {
  const basePath = resolveSingleGameThumbBasePath();
  let filename = `${slug || '1942'}.jpg`;

  if (raw) {
    filename = String(raw).trim().replace(/^\/+/, '');
    filename = filename.replace('resources/images/thumbnails/all/', '')
      .replace('resources/images/thumbnails/', '')
      .replace('resources/images/', '');
  }

  return `${basePath}${filename}`;
}

async function fetchGameIndex() {
  try {
    const response = await fetch('/games/games.json', { cache: 'no-store' });
    if (!response.ok) return new Map();
    const games = await response.json();
    const index = new Map();
    (Array.isArray(games) ? games : []).forEach((game) => {
      const slug = String(game?.slug || '').trim();
      if (!slug) return;
      index.set(slug, {
        title: String(game?.title || slug),
        system: String(game?.system || game?.platform || '').trim(),
        year: String(game?.year || game?.release_year || '').trim(),
        thumbnail: String(game?.thumbnail || game?.thumb || game?.cover || '').trim()
      });
    });
    return index;
  } catch (error) {
    console.error('[profile] Failed to load game index', error);
    return new Map();
  }
}

async function copyShareLink(url) {
  if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
    await navigator.clipboard.writeText(url);
    return;
  }

  const input = document.createElement('input');
  input.type = 'text';
  input.value = url;
  document.body.appendChild(input);
  input.select();
  document.execCommand('copy');
  input.remove();
}

function renderFavouritesList({ favourites, topPicks, gameIndex, onRemove, onTopPickToggle, onShare }) {
  const list = document.getElementById('favouriteGamesList');
  const topPicksHeading = document.getElementById('topPicksHeading');
  if (!list) return;

  list.innerHTML = '';

  const hasFavourites = Array.isArray(favourites) && favourites.length > 0;
  if (topPicksHeading) topPicksHeading.hidden = !hasFavourites;

  if (!hasFavourites) {
    const empty = document.createElement('li');
    empty.className = 'profile-favourites-list__empty';
    empty.textContent = 'No favourite games yet.';
    list.appendChild(empty);
    return;
  }

  favourites.forEach((entry) => {
    const slug = resolveFavouriteSlug(entry);
    if (!slug) return;

    const isTopPick = topPicks.has(slug);
    const gameMeta = gameIndex.get(slug) || {};

    const item = document.createElement('li');
    item.className = `profile-favourite-card${isTopPick ? ' profile-favourite-card--top-pick' : ''}`;

    const thumb = document.createElement('img');
    thumb.className = 'profile-favourite-card__thumb';
    thumb.src = resolveGameThumb(gameMeta.thumbnail, slug);
    thumb.alt = `${gameMeta.title || slug} thumbnail`;
    thumb.loading = 'lazy';

    const content = document.createElement('div');
    content.className = 'profile-favourite-card__content';

    const titleWrap = document.createElement('div');
    titleWrap.className = 'profile-favourite-card__title-wrap';

    if (isTopPick) {
      const star = document.createElement('span');
      star.className = 'profile-favourite-card__star';
      star.setAttribute('aria-label', 'Top Pick');
      star.textContent = '★';
      titleWrap.appendChild(star);
    }

    const link = document.createElement('a');
    link.className = 'profile-favourite-card__title';
    link.href = `/games/${slug}/`;
    link.textContent = gameMeta.title || slug;
    titleWrap.appendChild(link);

    const metaValues = [gameMeta.system, gameMeta.year].filter(Boolean);
    if (metaValues.length) {
      const meta = document.createElement('p');
      meta.className = 'profile-favourite-card__meta';
      meta.textContent = metaValues.join(' • ');
      content.appendChild(meta);
    }

    const actions = document.createElement('div');
    actions.className = 'profile-favourite-card__actions';

    const topPickLabel = document.createElement('label');
    topPickLabel.className = 'profile-favourite-card__top-pick-toggle';

    const topPickCheckbox = document.createElement('input');
    topPickCheckbox.type = 'checkbox';
    topPickCheckbox.checked = isTopPick;
    topPickCheckbox.setAttribute('aria-label', `Mark ${gameMeta.title || slug} as Top Pick`);
    topPickCheckbox.addEventListener('change', () => onTopPickToggle(slug, topPickCheckbox));

    const topPickText = document.createElement('span');
    topPickText.textContent = 'Top Pick';

    topPickLabel.append(topPickCheckbox, topPickText);

    const shareButton = document.createElement('button');
    shareButton.type = 'button';
    shareButton.className = 'auth-btn profile-favourite-card__share';
    shareButton.textContent = 'Share';
    shareButton.addEventListener('click', () => onShare(slug));

    const removeButton = document.createElement('button');
    removeButton.type = 'button';
    removeButton.className = 'auth-btn profile-favourite-card__remove';
    removeButton.textContent = 'Remove';
    removeButton.addEventListener('click', () => onRemove(slug, removeButton));

    content.prepend(titleWrap);
    actions.append(topPickLabel, shareButton, removeButton);

    item.append(thumb, content, actions);

    list.appendChild(item);
  });
}

async function fetchFavourites(supabaseClient, userId) {
  const { data, error } = await supabaseClient
    .from('profile_favourites')
    .select('*')
    .eq('profile_id', userId)
    .order('created_at', { ascending: true });

  if (error) {
    const missingTableCodes = new Set(['42P01', 'PGRST205']);
    if (missingTableCodes.has(String(error.code || ''))) {
      return [];
    }
    throw error;
  }

  return Array.isArray(data) ? data : [];
}

async function fetchTopPicks(supabaseClient, userId) {
  const { data, error } = await supabaseClient
    .from('profile_top_picks')
    .select('game_slug, created_at')
    .eq('profile_id', userId)
    .order('created_at', { ascending: true });

  if (error) {
    const missingTableCodes = new Set(['42P01', 'PGRST205']);
    if (missingTableCodes.has(String(error.code || ''))) {
      return [];
    }
    throw error;
  }

  return Array.isArray(data) ? data : [];
}

function decodeAvatarImage(file) {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const image = new Image();

    image.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(image);
    };

    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Could not read this image.'));
    };

    image.src = objectUrl;
  });
}

async function buildAvatarBlob(file) {
  if (!file) throw new Error('Choose an image first.');

  const allowedTypes = new Set(['image/jpeg', 'image/png', 'image/webp']);
  if (!allowedTypes.has(String(file.type || '').toLowerCase())) {
    throw new Error('Avatar must be a JPG, PNG or WebP image.');
  }

  if (Number(file.size || 0) > PROFILE_AVATAR_SOURCE_MAX_BYTES) {
    throw new Error('Avatar source image must be 8 MB or smaller.');
  }

  const image = await decodeAvatarImage(file);
  const sourceWidth = Number(image.naturalWidth || image.width || 0);
  const sourceHeight = Number(image.naturalHeight || image.height || 0);
  if (!sourceWidth || !sourceHeight) throw new Error('Could not read this image.');

  const side = Math.min(sourceWidth, sourceHeight);
  const sourceX = Math.max(0, (sourceWidth - side) / 2);
  const sourceY = Math.max(0, (sourceHeight - side) / 2);

  const canvas = document.createElement('canvas');
  canvas.width = PROFILE_AVATAR_SIZE;
  canvas.height = PROFILE_AVATAR_SIZE;

  const context = canvas.getContext('2d', { alpha: false });
  if (!context) throw new Error('Image processing is unavailable in this browser.');

  context.fillStyle = '#071321';
  context.fillRect(0, 0, PROFILE_AVATAR_SIZE, PROFILE_AVATAR_SIZE);
  context.drawImage(
    image,
    sourceX,
    sourceY,
    side,
    side,
    0,
    0,
    PROFILE_AVATAR_SIZE,
    PROFILE_AVATAR_SIZE
  );

  const blob = await new Promise((resolve) => {
    canvas.toBlob(resolve, 'image/webp', 0.86);
  });

  if (!blob) throw new Error('Could not prepare this avatar.');
  if (blob.size > PROFILE_AVATAR_OUTPUT_MAX_BYTES) {
    throw new Error('Prepared avatar exceeds the 2 MB upload limit.');
  }

  return blob;
}

async function removeStoredAvatars(supabaseClient, userId) {
  const { data: files, error: listError } = await supabaseClient.storage
    .from(PROFILE_AVATAR_BUCKET)
    .list(userId, { limit: 20 });

  if (listError) throw listError;

  const paths = (Array.isArray(files) ? files : [])
    .filter((file) => file?.name && file.name !== '.emptyFolderPlaceholder')
    .map((file) => `${userId}/${file.name}`);

  if (!paths.length) return;

  const { error: removeError } = await supabaseClient.storage
    .from(PROFILE_AVATAR_BUCKET)
    .remove(paths);

  if (removeError) throw removeError;
}

async function saveAvatarUrl(supabaseClient, userId, avatarUrl) {
  const { error } = await supabaseClient
    .from('profiles')
    .update({ avatar_url: avatarUrl })
    .eq('id', userId);

  if (error) throw error;
}

async function uploadProfileAvatar({ supabaseClient, user, file, messageBox }) {
  if (!file) return false;

  const changeButton = document.getElementById('profileAvatarChange');
  const removeButton = document.getElementById('profileAvatarRemove');
  if (changeButton) changeButton.disabled = true;
  if (removeButton) removeButton.disabled = true;
  setMessage(messageBox, 'Preparing avatar…');

  try {
    const blob = await buildAvatarBlob(file);
    await removeStoredAvatars(supabaseClient, user.id);

    const path = `${user.id}/avatar.webp`;
    const { error: uploadError } = await supabaseClient.storage
      .from(PROFILE_AVATAR_BUCKET)
      .upload(path, blob, {
        cacheControl: '3600',
        upsert: true,
        contentType: 'image/webp'
      });

    if (uploadError) throw uploadError;

    const { data: publicData } = supabaseClient.storage
      .from(PROFILE_AVATAR_BUCKET)
      .getPublicUrl(path);

    const baseUrl = String(publicData?.publicUrl || '').trim();
    if (!baseUrl) throw new Error('Avatar URL was not returned by storage.');

    const avatarUrl = `${baseUrl}?v=${Date.now()}`;
    await saveAvatarUrl(supabaseClient, user.id, avatarUrl);

    const avatarEl = document.getElementById('profileAvatar');
    if (avatarEl) avatarEl.src = avatarUrl;
    setMessage(messageBox, 'Avatar updated.', 'success');
    return true;
  } catch (error) {
    console.error('[profile] Avatar upload failed', error, { userId: user.id });
    setMessage(messageBox, error?.message || 'Could not update avatar. Please try again.', 'error');
    return false;
  } finally {
    const input = document.getElementById('profileAvatarInput');
    if (input) input.value = '';
    if (changeButton) changeButton.disabled = false;
    if (removeButton) removeButton.disabled = false;
  }
}
async function removeProfileAvatar({ supabaseClient, user, messageBox }) {
  const changeButton = document.getElementById('profileAvatarChange');
  const removeButton = document.getElementById('profileAvatarRemove');
  if (changeButton) changeButton.disabled = true;
  if (removeButton) removeButton.disabled = true;
  setMessage(messageBox, 'Removing avatar…');

  try {
    await removeStoredAvatars(supabaseClient, user.id);
    await saveAvatarUrl(supabaseClient, user.id, '');

    const avatarEl = document.getElementById('profileAvatar');
    if (avatarEl) avatarEl.src = PROFILE_AVATAR_FALLBACK;
    setMessage(messageBox, 'Avatar removed.', 'success');
    return true;
  } catch (error) {
    console.error('[profile] Avatar removal failed', error, { userId: user.id });
    setMessage(messageBox, 'Could not remove avatar. Please try again.', 'error');
    return false;
  } finally {
    if (changeButton) changeButton.disabled = false;
    if (removeButton) removeButton.disabled = false;
  }
}

function bindAvatarControls({ supabaseClient, user, messageBox }) {
  const input = document.getElementById('profileAvatarInput');
  const changeButton = document.getElementById('profileAvatarChange');
  const removeButton = document.getElementById('profileAvatarRemove');

  changeButton?.addEventListener('click', () => input?.click());

  input?.addEventListener('change', async () => {
    const file = input.files?.[0] || null;
    await uploadProfileAvatar({ supabaseClient, user, file, messageBox });
    input.value = '';
  });

  removeButton?.addEventListener('click', async () => {
    await removeProfileAvatar({ supabaseClient, user, messageBox });
  });
}

async function savePreferences({ supabaseClient, user, messageBox }) {
  const notifyNewGames = Boolean(document.getElementById('notifyNewGames')?.checked);
  const notifyNewsletter = Boolean(document.getElementById('notifyNewsletter')?.checked);
  const notifyWeeklyChallenge = Boolean(document.getElementById('notifyWeeklyChallenge')?.checked);

  const updates = {
    notify_new_games: notifyNewGames,
    notify_newsletter: notifyNewsletter,
    notify_weekly_challenge: notifyWeeklyChallenge
  };
  const { error: updateError } = await supabaseClient
    .from('profiles')
    .update(updates)
    .eq('id', user.id);

  if (updateError) {
    console.error('[profile] Failed to save preferences', updateError, { userId: user.id, updates });
    setMessage(messageBox, 'Could not save preferences. Please try again.', 'error');
    return false;
  }

  const { profile: refreshedProfile, error: refreshError } = await ensureProfileRow(supabaseClient, user);
  if (refreshError || !refreshedProfile) {
    console.error('[profile] Re-fetch after save failed', refreshError, { userId: user.id });
    setMessage(messageBox, 'Preferences saved, but refresh failed. Reload to verify.', 'success');
    return true;
  }

  renderProfile(user, refreshedProfile);
  setMessage(messageBox, 'Preferences saved.', 'success');
  return true;
}

if (typeof document !== 'undefined') {
document.addEventListener('DOMContentLoaded', async () => {
  const messageBox = document.getElementById('profileMessage');
  const prefsForm = document.getElementById('prefsForm');

  try {
    const supabaseClient = await getSupabaseClient();
    const { data: authData, error: userError } = await supabaseClient.auth.getUser();
    const user = authData?.user || null;

    if (userError) console.error('[profile] getUser failed', userError);

    if (!user) {
      window.location.href = '/auth/login.html';
      return;
    }

    const { profile, error: profileError } = await ensureProfileRow(supabaseClient, user);
    if (profileError || !profile) {
      console.error('[profile] Unable to load profile', profileError, { userId: user.id });
      setMessage(messageBox, 'Could not load profile settings right now.', 'error');
      return;
    }

    const gameIndex = await fetchGameIndex();
    const state = {
      favourites: [],
      topPicks: new Set()
    };

    const renderCurrentFavourites = () => {
      renderFavouritesList({
        favourites: state.favourites,
        topPicks: state.topPicks,
        gameIndex,
        onRemove: handleRemoveFavourite,
        onTopPickToggle: handleTopPickToggle,
        onShare: handleShareFavourite
      });
    };

    const refreshFavourites = async () => {
      try {
        const [favourites, topPicksRows] = await Promise.all([
          fetchFavourites(supabaseClient, user.id),
          fetchTopPicks(supabaseClient, user.id)
        ]);

        state.favourites = favourites;
        const favouriteSlugSet = new Set(favourites.map((entry) => resolveFavouriteSlug(entry)).filter(Boolean));
        state.topPicks = deriveTopPickSlugs(topPicksRows);
        state.topPicks.forEach((slug) => {
          if (!favouriteSlugSet.has(slug)) state.topPicks.delete(slug);
        });

        renderCurrentFavourites();
      } catch (error) {
        console.error('[profile] Failed to load favourites', error, { userId: user.id });
        renderFavouritesList({ favourites: [], topPicks: new Set(), gameIndex, onRemove: () => {}, onTopPickToggle: () => {}, onShare: () => {} });
      }
    };

    const handleShareFavourite = async (slug) => {
      const canonicalUrl = buildCanonicalGameUrl(slug);
      try {
        await copyShareLink(canonicalUrl);
        setMessage(messageBox, 'Link copied.', 'success');
      } catch (error) {
        console.error('[profile] Failed to copy game link', error, { canonicalUrl });
        setMessage(messageBox, 'Could not copy link right now.', 'error');
      }
    };

    const handleTopPickToggle = async (slug, checkboxEl) => {
      const isChecked = Boolean(checkboxEl.checked);
      const wasTopPick = state.topPicks.has(slug);

      if (isChecked && !wasTopPick && !canAddTopPick(state.topPicks.size)) {
        checkboxEl.checked = false;
        setMessage(messageBox, `You can only choose up to ${TOP_PICKS_LIMIT} Top Picks.`, 'error');
        return;
      }

      if (isChecked === wasTopPick) return;

      checkboxEl.disabled = true;
      if (isChecked) {
        state.topPicks.add(slug);
      } else {
        state.topPicks.delete(slug);
      }
      renderCurrentFavourites();

      if (isChecked) {
        const { error: insertError } = await supabaseClient
          .from('profile_top_picks')
          .insert({ profile_id: user.id, game_slug: slug });

        if (insertError) {
          console.error('[profile] Failed to save top pick', insertError, { userId: user.id, slug });
          state.topPicks.delete(slug);
          renderCurrentFavourites();
          setMessage(messageBox, 'Could not save Top Pick right now.', 'error');
          return;
        }

        setMessage(messageBox, 'Top Pick added.', 'success');
        return;
      }

      const { error: deleteError } = await supabaseClient
        .from('profile_top_picks')
        .delete()
        .eq('profile_id', user.id)
        .eq('game_slug', slug);

      if (deleteError) {
        console.error('[profile] Failed to remove top pick', deleteError, { userId: user.id, slug });
        state.topPicks.add(slug);
        renderCurrentFavourites();
        setMessage(messageBox, 'Could not remove Top Pick right now.', 'error');
        return;
      }

      setMessage(messageBox, 'Top Pick removed.', 'success');
    };

    const handleRemoveFavourite = async (slug, buttonEl) => {
      buttonEl.disabled = true;
      const { error: removeError } = await supabaseClient
        .from('profile_favourites')
        .delete()
        .eq('profile_id', user.id)
        .eq('game_slug', slug);

      if (removeError) {
        console.error('[profile] Failed to remove favourite', removeError, { userId: user.id, slug });
        setMessage(messageBox, 'Could not remove favourite right now.', 'error');
        buttonEl.disabled = false;
        return;
      }

      const { error: removeTopPickError } = await supabaseClient
        .from('profile_top_picks')
        .delete()
        .eq('profile_id', user.id)
        .eq('game_slug', slug);

      if (removeTopPickError) {
        console.error('[profile] Failed to remove linked top pick after favourite delete', removeTopPickError, { userId: user.id, slug });
      }

      state.topPicks.delete(slug);
      setMessage(messageBox, 'Favourite removed.', 'success');
      await refreshFavourites();
    };

    renderProfile(user, profile);
    bindAvatarControls({ supabaseClient, user, messageBox });
    await refreshFavourites();
    log('Profile loaded', { userId: user.id });

    if (prefsForm) {
      prefsForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        setMessage(messageBox, '');
        const saved = await savePreferences({ supabaseClient, user, messageBox });
        if (saved) {
          await refreshFavourites();
        }
      });
    }
  } catch (error) {
    console.error('[profile] Init failed', error);
    setMessage(messageBox, 'Could not load profile settings right now.', 'error');
  }
});
}
