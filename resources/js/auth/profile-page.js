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
  if (notifyNewGames) notifyNewGames.checked = Boolean(profile.notify_new_games);
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

function renderFavouritesList({ favourites, titleIndex, onRemove }) {
  const list = document.getElementById('favouriteGamesList');
  if (!list) return;

  list.innerHTML = '';

  if (!Array.isArray(favourites) || favourites.length === 0) {
    const empty = document.createElement('li');
    empty.textContent = 'No favourite games yet.';
    list.appendChild(empty);
    return;
  }

  favourites.forEach((entry) => {
    const slug = String(entry?.game_slug || '').trim();
    if (!slug) return;

    const item = document.createElement('li');

    const link = document.createElement('a');
    link.href = `/games/${slug}/`;
    link.textContent = titleIndex.get(slug) || slug;

    const spacer = document.createTextNode(' — ');

    const removeButton = document.createElement('button');
    removeButton.type = 'button';
    removeButton.className = 'auth-btn';
    removeButton.textContent = 'Remove';
    removeButton.addEventListener('click', () => onRemove(slug, removeButton));

    item.appendChild(link);
    item.appendChild(spacer);
    item.appendChild(removeButton);
    list.appendChild(item);
  });
}

async function fetchFavourites(supabaseClient, userId) {
  const { data, error } = await supabaseClient
    .from('profile_favourites')
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

async function savePreferences({ supabaseClient, user, messageBox }) {
  const notifyNewGames = Boolean(document.getElementById('notifyNewGames')?.checked);

  const updates = { notify_new_games: notifyNewGames };
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

    const titleIndex = await fetchGameTitleIndex();

    const refreshFavourites = async () => {
      try {
        const favourites = await fetchFavourites(supabaseClient, user.id);
        renderFavouritesList({
          favourites,
          titleIndex,
          onRemove: async (slug, buttonEl) => {
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

            setMessage(messageBox, 'Favourite removed.', 'success');
            await refreshFavourites();
          }
        });
      } catch (error) {
        console.error('[profile] Failed to load favourites', error, { userId: user.id });
        renderFavouritesList({ favourites: [], titleIndex, onRemove: () => {} });
      }
    };

    renderProfile(user, profile);
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
