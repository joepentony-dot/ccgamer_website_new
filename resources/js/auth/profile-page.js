import { getSupabaseClient } from './supabase-client.js';

const DEBUG = new URLSearchParams(window.location.search).has('debug');

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
      || user.email?.split('@')[0]
      || 'Member',
    notify_new_games: false
  };
}

function removeLegacyPreferenceControls() {
  ['newsletterOptIn', 'notifyC64', 'notifyAmiga'].forEach((id) => {
    const input = document.getElementById(id);
    const label = input?.closest('label');
    if (label) label.remove();
  });

  const subtitle = document.querySelector('.auth-subtitle');
  if (subtitle) {
    subtitle.textContent = 'Manage account preferences and security.';
  }
}

function ensureProfileSections() {
  const card = document.querySelector('.auth-card');
  if (!card) return;

  let activitySection = document.getElementById('activitySummarySection');
  if (!activitySection) {
    activitySection = document.createElement('section');
    activitySection.id = 'activitySummarySection';
    activitySection.className = 'profile-subsection';
    activitySection.innerHTML = [
      '<h2 class="profile-subsection__title">Activity Summary</h2>',
      '<p class="profile-subsection__item">Games rated: —</p>',
      '<p class="profile-subsection__item">Comments made: —</p>'
    ].join('');
  }

  let favouritesSection = document.getElementById('favouriteGamesSection');
  if (!favouritesSection) {
    favouritesSection = document.createElement('section');
    favouritesSection.id = 'favouriteGamesSection';
    favouritesSection.className = 'profile-subsection';
    favouritesSection.innerHTML = [
      '<h2 class="profile-subsection__title">Favourite Games</h2>',
      '<ul id="favouriteGamesList" class="profile-favourites-list"></ul>'
    ].join('');
  }

  const actions = card.querySelector('.profile-actions');
  if (actions) {
    card.insertBefore(activitySection, actions);
    card.insertBefore(favouritesSection, actions);
  } else {
    card.appendChild(activitySection);
    card.appendChild(favouritesSection);
  }
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

function renderProfile(user, profile) {
  const displayNameEl = document.getElementById('displayName');
  const emailValueEl = document.getElementById('emailValue');
  const joinDateEl = document.getElementById('joinDate');

  if (displayNameEl) displayNameEl.textContent = profile.display_name || '—';
  if (emailValueEl) emailValueEl.textContent = profile.email || user.email || '—';
  if (joinDateEl) joinDateEl.textContent = formatJoinDate(profile.created_at || profile.joined_at || user.created_at);

  const notifyNewGames = document.getElementById('notifyNewGames');
  if (notifyNewGames) {
    notifyNewGames.checked = Boolean(profile.notify_new_games);
  }
}

async function fetchGameTitleIndex() {
  try {
    const response = await fetch('/games/games.json', { cache: 'no-store' });
    if (!response.ok) return new Map();
    const games = await response.json();
    const index = new Map();
    (Array.isArray(games) ? games : []).forEach((game) => {
      const slug = String(game?.slug || '').trim();
      if (!slug) return;
      index.set(slug, String(game?.title || slug));
    });
    return index;
  } catch (error) {
    console.error('[profile] Failed to load game title index', error);
    return new Map();
  }
}

function renderFavouritesList(slugs, titleIndex) {
  const list = document.getElementById('favouriteGamesList');
  if (!list) return;

  list.innerHTML = '';

  if (!Array.isArray(slugs) || !slugs.length) {
    const empty = document.createElement('li');
    empty.textContent = 'No favourite games yet.';
    list.appendChild(empty);
    return;
  }

  slugs.forEach((slug) => {
    const item = document.createElement('li');
    item.textContent = titleIndex.get(slug) || slug;
    list.appendChild(item);
  });
}

async function loadFavourites({ supabaseClient, userId }) {
  // Foundation: only read private favourites for the signed-in user.
  const { data, error } = await supabaseClient
    .from('profile_favourites')
    .select('game_slug, created_at')
    .eq('profile_id', userId)
    .order('created_at', { ascending: true });

  if (error) {
    const missingTableCodes = new Set(['42P01', 'PGRST205']);
    if (missingTableCodes.has(String(error.code || ''))) {
      renderFavouritesList([], new Map());
      return;
    }
    console.error('[profile] Failed to load favourites', error, { userId });
    renderFavouritesList([], new Map());
    return;
  }

  const slugs = (Array.isArray(data) ? data : [])
    .map((row) => String(row?.game_slug || '').trim())
    .filter(Boolean);

  const titleIndex = await fetchGameTitleIndex();
  renderFavouritesList(slugs, titleIndex);
}

async function savePreferences({ supabaseClient, user, messageBox }) {
  const notifyNewGames = Boolean(document.getElementById('notifyNewGames')?.checked);

  const updates = {
    notify_new_games: notifyNewGames
  };

  const { error } = await supabaseClient
    .from('profiles')
    .update(updates)
    .eq('id', user.id);

  if (error) {
    console.error('[profile] Update error', error, { userId: user.id, updates });
    setMessage(messageBox, 'Could not save preferences. Please try again.', 'error');
    return;
  }

  const { profile: refreshedProfile, error: refreshError } = await ensureProfileRow(supabaseClient, user);
  if (refreshError || !refreshedProfile) {
    console.error('[profile] Re-fetch after save failed', refreshError, { userId: user.id });
    setMessage(messageBox, 'Preferences saved, but refresh failed. Reload to verify.', 'success');
    return;
  }

  renderProfile(user, refreshedProfile);
  await loadFavourites({ supabaseClient, userId: user.id });

  // Future activity summary counts (ratings/comments) will be loaded here when those systems are stabilized.
  setMessage(messageBox, 'Preferences saved.', 'success');
}

document.addEventListener('DOMContentLoaded', async () => {
  const messageBox = document.getElementById('profileMessage');
  const prefsForm = document.getElementById('prefsForm');

  removeLegacyPreferenceControls();
  ensureProfileSections();

  try {
    const supabaseClient = await getSupabaseClient();
    const { data: authData, error: userError } = await supabaseClient.auth.getUser();
    const user = authData?.user || null;

    if (userError) {
      console.error('[profile] getUser failed', userError);
    }

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

    renderProfile(user, profile);
    await loadFavourites({ supabaseClient, userId: user.id });
    log('Profile loaded', { userId: user.id });

    if (prefsForm) {
      prefsForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        setMessage(messageBox, '');
        await savePreferences({ supabaseClient, user, messageBox });
      });
    }
  } catch (error) {
    console.error('[profile] Init failed', error);
    setMessage(messageBox, 'Could not load profile settings right now.', 'error');
  }
});
