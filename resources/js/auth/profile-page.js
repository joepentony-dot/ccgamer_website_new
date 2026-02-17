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

  const messageBox = document.getElementById('profileMessage');

  const { data: { user }, error: userError } = await supabase.auth.getUser();

  if (userError || !user) {
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

    const { error: updateError } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', user.id);

    if (updateError) {
      messageBox.textContent = 'Could not save preferences.';
      messageBox.classList.add('auth-error');
      console.error('[profile] Update error', updateError, { userId: user.id, updates });
      return;
    }

    messageBox.textContent = 'Preferences saved.';
    messageBox.classList.remove('auth-error');
    messageBox.classList.add('auth-success');
    log('Preferences updated');
  });

  const logoutBtn = document.getElementById('logoutBtn');
  logoutBtn.addEventListener('click', async () => {
    await supabase.auth.signOut();
    window.location.href = '/';
  });
});
