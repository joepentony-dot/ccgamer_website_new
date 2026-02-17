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
    newsletter_monthly: false,
    notify_new_games: false,
    notify_c64: false,
    notify_amiga: false,
    newsletter_opt_in: false,
    notify_new_games_opt_in: false,
    notify_platform_c64: false,
    notify_platform_amiga: false
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

  const newsletterOptIn = document.getElementById('newsletterOptIn');
  const notifyNewGames = document.getElementById('notifyNewGames');
  const notifyC64 = document.getElementById('notifyC64');
  const notifyAmiga = document.getElementById('notifyAmiga');

  if (newsletterOptIn) {
    newsletterOptIn.checked = Boolean(profile.newsletter_monthly ?? profile.newsletter_opt_in);
  }
  if (notifyNewGames) {
    notifyNewGames.checked = Boolean(profile.notify_new_games ?? profile.notify_new_games_opt_in);
  }
  if (notifyC64) {
    notifyC64.checked = Boolean(profile.notify_c64 ?? profile.notify_platform_c64);
  }
  if (notifyAmiga) {
    notifyAmiga.checked = Boolean(profile.notify_amiga ?? profile.notify_platform_amiga);
  }
}

async function savePreferences({ supabaseClient, user, messageBox }) {
  const newsletter = Boolean(document.getElementById('newsletterOptIn')?.checked);
  const notifyNewGames = Boolean(document.getElementById('notifyNewGames')?.checked);
  const notifyC64 = Boolean(document.getElementById('notifyC64')?.checked);
  const notifyAmiga = Boolean(document.getElementById('notifyAmiga')?.checked);

  const updates = {
    newsletter_monthly: newsletter,
    notify_new_games: notifyNewGames,
    notify_c64: notifyC64,
    notify_amiga: notifyAmiga,
    newsletter_opt_in: newsletter,
    notify_new_games_opt_in: notifyNewGames,
    notify_platform_c64: notifyC64,
    notify_platform_amiga: notifyAmiga
  };

  const { error: updateError } = await supabaseClient
    .from('profiles')
    .update(updates)
    .eq('id', user.id);

  if (updateError) {
    console.error('[profile] Update error', updateError, { userId: user.id, updates });
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
  setMessage(messageBox, 'Preferences saved.', 'success');
}

document.addEventListener('DOMContentLoaded', async () => {
  const messageBox = document.getElementById('profileMessage');
  const prefsForm = document.getElementById('prefsForm');

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
