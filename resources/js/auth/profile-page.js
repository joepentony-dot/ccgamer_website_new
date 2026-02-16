const DEBUG = new URLSearchParams(window.location.search).has('debug');

function log(...args) {
  if (DEBUG) console.log('[profile]', ...args);
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
    .single();

  if (error || !profile) {
    messageBox.textContent = 'Could not load profile settings right now.';
    messageBox.classList.add('auth-error');
    log('Profile load error', error);
    return;
  }

  document.getElementById('displayName').textContent =
    profile.display_name || '—';
  document.getElementById('emailValue').textContent =
    profile.email || user.email || '—';
  document.getElementById('joinDate').textContent =
    new Date(profile.joined_at).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });

  document.getElementById('newsletterOptIn').checked =
    !!profile.newsletter_monthly;
  document.getElementById('notifyNewGames').checked =
    !!profile.notify_new_games;
  document.getElementById('notifyC64').checked =
    !!profile.notify_c64;
  document.getElementById('notifyAmiga').checked =
    !!profile.notify_amiga;

  const form = document.getElementById('prefsForm');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    messageBox.textContent = '';

    const updates = {
      newsletter_monthly: document.getElementById('newsletterOptIn').checked,
      notify_new_games: document.getElementById('notifyNewGames').checked,
      notify_c64: document.getElementById('notifyC64').checked,
      notify_amiga: document.getElementById('notifyAmiga').checked
    };

    const { error: updateError } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', user.id);

    if (updateError) {
      messageBox.textContent = 'Could not save preferences.';
      messageBox.classList.add('auth-error');
      log('Update error', updateError);
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
