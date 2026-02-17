const DEBUG = new URLSearchParams(window.location.search).has('debug');

function log(...args) {
  if (DEBUG) console.log('[profile]', ...args);
}

function formatJoinDate(rawValue) {
  if (!rawValue) return '—';
  const parsed = new Date(rawValue);
  if (Number.isNaN(parsed.getTime())) return '—';
  return parsed.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
}

document.addEventListener('DOMContentLoaded', async () => {
  if (!window.supabase) {
    console.error('Supabase client not found');
    return;
  }

  if (window.supabase && typeof window.supabase.from === 'function') {
    return window.supabase;
  }

  throw new Error('Supabase client not available');
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
  const insertResult = await supabaseClient
    .from('profiles')
    .upsert(insertPayload, { onConflict: 'id' });

  if (insertResult.error) {
    console.error('[profile] Profile auto-create failed', insertResult.error, { userId: user.id, insertPayload });
    return { profile: null, error: insertResult.error };
  }

  const secondRead = await fetchProfile(supabaseClient, user.id);
  if (secondRead.error || !secondRead.data) {
    console.error('[profile] Profile re-read failed after create', secondRead.error || 'Missing row', { userId: user.id });
    return { profile: null, error: secondRead.error || new Error('Profile row still missing after create') };
  }

  return { profile: secondRead.data, error: null };
}

document.addEventListener('DOMContentLoaded', async () => {
  const messageBox = document.getElementById('profileMessage');

  let supabaseClient;
  try {
    supabaseClient = await getSupabaseClient();
  } catch (error) {
    console.error('[profile] Supabase client init failed', error);
    setMessage(messageBox, 'Could not load profile settings right now.', 'error');
    return;
  }

  const { data: authData, error: userError } = await supabaseClient.auth.getUser();
  const user = authData?.user || null;

  if (userError || !user) {
    if (userError) console.error('[profile] getUser failed', userError);
    window.location.href = '/auth/login.html';
    return;
  }

  log('User authenticated', user.id);

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle();

  if (error || !profile) {
    messageBox.textContent = 'Could not load profile settings right now.';
    messageBox.classList.add('auth-error');
    console.error('[profile] Profile load error', error || 'Missing profile row', { userId: user.id });
    return;
  }

  document.getElementById('displayName').textContent =
    profile.display_name || '—';
  document.getElementById('emailValue').textContent =
    profile.email || user.email || '—';
  document.getElementById('joinDate').textContent =
    formatJoinDate(profile.created_at || profile.joined_at);

  document.getElementById('newsletterOptIn').checked =
    Boolean(profile.newsletter_monthly ?? profile.newsletter_opt_in);
  document.getElementById('notifyNewGames').checked =
    Boolean(profile.notify_new_games ?? profile.notify_new_games_opt_in);
  document.getElementById('notifyC64').checked =
    Boolean(profile.notify_c64 ?? profile.notify_platform_c64);
  document.getElementById('notifyAmiga').checked =
    Boolean(profile.notify_amiga ?? profile.notify_platform_amiga);

  const form = document.getElementById('prefsForm');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    messageBox.textContent = '';
    messageBox.classList.remove('auth-error', 'auth-success');

    const newsletter = document.getElementById('newsletterOptIn').checked;
    const notifyNewGames = document.getElementById('notifyNewGames').checked;
    const notifyC64 = document.getElementById('notifyC64').checked;
    const notifyAmiga = document.getElementById('notifyAmiga').checked;

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

    const updateResult = await supabaseClient
      .from('profiles')
      .update(updates)
      .eq('id', user.id);

    if (updateError) {
      messageBox.textContent = 'Could not save preferences.';
      messageBox.classList.add('auth-error');
      console.error('[profile] Update error', updateError, { userId: user.id, updates });
      return;
    }

    const reread = await fetchProfile(supabaseClient, user.id);
    if (reread.error || !reread.data) {
      console.error('[profile] Re-read after save failed', reread.error || 'Missing row', { userId: user.id });
      setMessage(messageBox, 'Preferences saved.', 'success');
      return;
    }

    renderProfile(user, reread.data);
    setMessage(messageBox, 'Preferences saved.', 'success');
    log('Preferences updated');
  });
});
