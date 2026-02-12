import { byId, setMessage } from './ui-helpers.js';
import { getCurrentUser, logoutUser } from './auth-core.js';

async function getClient() {
  await window.ccgSupabase.waitForAuth();
  return window.ccgSupabase.getClient();
}

function requireAuth() {
  window.location.replace('/auth/login.html?returnTo=' + encodeURIComponent('/community/profile.html'));
}

function formatDate(value) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-GB', { year: 'numeric', month: 'long', day: 'numeric' });
}

async function loadProfile() {
  const message = byId('profileMessage');
  const userRes = await getCurrentUser();
  const user = userRes?.data?.user;

  if (!user) {
    requireAuth();
    return;
  }

  if (!user.email_confirmed_at) {
    setMessage(message, 'Please confirm your email before using profile preferences.', 'error');
    byId('prefsForm').hidden = true;
    return;
  }

  const supabase = await getClient();
  const { data, error } = await supabase
    .from('profiles')
    .select('display_name,avatar_url,created_at,newsletter_opt_in,notify_new_games_opt_in,notify_platform_c64,notify_platform_amiga')
    .eq('id', user.id)
    .maybeSingle();

  if (error) {
    setMessage(message, 'Could not load profile settings right now.', 'error');
    return;
  }

  byId('displayName').textContent = data?.display_name || user.user_metadata?.username || user.email.split('@')[0];
  byId('emailValue').textContent = user.email || '—';
  byId('joinDate').textContent = formatDate(data?.created_at || user.created_at);

  const avatar = byId('profileAvatar');
  avatar.src = data?.avatar_url || '/favicon.ico';

  byId('newsletterOptIn').checked = Boolean(data?.newsletter_opt_in);
  byId('notifyNewGames').checked = Boolean(data?.notify_new_games_opt_in);
  byId('notifyC64').checked = data?.notify_platform_c64 !== false;
  byId('notifyAmiga').checked = data?.notify_platform_amiga !== false;

  byId('prefsForm').addEventListener('submit', async (event) => {
    event.preventDefault();
    setMessage(message, 'Saving preferences...', 'info');

    const payload = {
      display_name: byId('displayName').textContent,
      newsletter_opt_in: byId('newsletterOptIn').checked,
      notify_new_games_opt_in: byId('notifyNewGames').checked,
      notify_platform_c64: byId('notifyC64').checked,
      notify_platform_amiga: byId('notifyAmiga').checked
    };

    const { error: updateError } = await supabase.from('profiles').update(payload).eq('id', user.id);
    if (updateError) {
      setMessage(message, 'Unable to save preferences.', 'error');
      return;
    }

    setMessage(message, 'Preferences saved.', 'success');
  });

  byId('logoutBtn').addEventListener('click', async () => {
    await logoutUser();
    window.location.replace('/');
  });
}

loadProfile();
