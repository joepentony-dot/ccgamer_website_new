(function () {
  const state = {
    initialized: false,
    currentUser: null,
    currentProfile: null,
    modal: null,
    redirectTo: '/community/index.html'
  };

  function emitAuthChanged() {
    window.dispatchEvent(new CustomEvent('ccg:auth-changed', {
      detail: {
        user: state.currentUser,
        profile: state.currentProfile
      }
    }));
  }

  function esc(str) {
    return String(str || '').replace(/[&<>"']/g, function (c) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' })[c];
    });
  }

  function setMessage(msg, type) {
    const el = document.getElementById('ccg-auth-message');
    if (!el) return;
    el.textContent = msg || '';
    el.dataset.type = type || 'info';
  }

  function toggleView(view) {
    document.querySelectorAll('[data-ccg-auth-view]').forEach((panel) => {
      panel.hidden = panel.getAttribute('data-ccg-auth-view') !== view;
    });
  }

  function openModal(view) {
    if (!state.modal) createModal();
    state.modal.hidden = false;
    state.modal.setAttribute('aria-hidden', 'false');
    toggleView(view || 'welcome');
    setMessage('');
  }

  function closeModal() {
    if (!state.modal) return;
    state.modal.hidden = true;
    state.modal.setAttribute('aria-hidden', 'true');
  }

  function createModal() {
    const wrap = document.createElement('div');
    wrap.id = 'ccg-community-auth-modal';
    wrap.className = 'ccg-community-modal';
    wrap.hidden = true;
    wrap.setAttribute('aria-hidden', 'true');
    wrap.innerHTML = '' +
      '<div class="ccg-community-modal__backdrop" data-close-modal></div>' +
      '<div class="ccg-community-modal__panel" role="dialog" aria-modal="true" aria-label="Join or log in">' +
      '  <button class="ccg-community-modal__close" type="button" data-close-modal aria-label="Close">×</button>' +
      '  <div class="ccg-community-modal__header">' +
      '    <h2>CCG Community</h2>' +
      '    <p>Log in to rate and comment.</p>' +
      '  </div>' +
      '  <div class="ccg-community-auth__message" id="ccg-auth-message" aria-live="polite"></div>' +
      '  <section data-ccg-auth-view="welcome">' +
      '    <div class="ccg-community-auth__actions">' +
      '      <button type="button" class="ccg-community-btn" data-switch-view="signin">Log in</button>' +
      '      <button type="button" class="ccg-community-btn ccg-community-btn--ghost" data-switch-view="signup">Create account</button>' +
      '    </div>' +
      '  </section>' +
      '  <section data-ccg-auth-view="signin" hidden>' +
      '    <form id="ccg-signin-form" class="ccg-community-form">' +
      '      <label>Email<input type="email" name="email" required autocomplete="email"></label>' +
      '      <label>Password<input type="password" name="password" required autocomplete="current-password"></label>' +
      '      <button type="submit" class="ccg-community-btn">Sign in</button>' +
      '    </form>' +
      '    <button type="button" class="ccg-community-link-btn" data-switch-view="magic">Use magic link instead</button>' +
      '    <button type="button" class="ccg-community-link-btn" data-switch-view="signup">Need an account? Create one</button>' +
      '  </section>' +
      '  <section data-ccg-auth-view="signup" hidden>' +
      '    <form id="ccg-signup-form" class="ccg-community-form">' +
      '      <label>Email<input type="email" name="email" required autocomplete="email"></label>' +
      '      <label>Password<input type="password" name="password" required minlength="6" autocomplete="new-password"></label>' +
      '      <button type="submit" class="ccg-community-btn">Create account</button>' +
      '    </form>' +
      '    <button type="button" class="ccg-community-link-btn" data-switch-view="magic">Prefer magic link?</button>' +
      '    <button type="button" class="ccg-community-link-btn" data-switch-view="signin">Already have an account? Log in</button>' +
      '  </section>' +
      '  <section data-ccg-auth-view="magic" hidden>' +
      '    <form id="ccg-magic-form" class="ccg-community-form">' +
      '      <label>Email<input type="email" name="email" required autocomplete="email"></label>' +
      '      <p class="ccg-community-auth__hint">Magic link sends a one-time sign-in email.</p>' +
      '      <button type="submit" class="ccg-community-btn">Send magic link</button>' +
      '    </form>' +
      '    <button type="button" class="ccg-community-link-btn" data-switch-view="signin">Back to password login</button>' +
      '  </section>' +
      '  <section data-ccg-auth-view="username" hidden>' +
      '    <form id="ccg-username-form" class="ccg-community-form">' +
      '      <label>Choose a public username<input type="text" name="username" required minlength="3" maxlength="24" pattern="[A-Za-z0-9_\-]+"></label>' +
      '      <button type="submit" class="ccg-community-btn">Save profile</button>' +
      '    </form>' +
      '  </section>' +
      '</div>';

    document.body.appendChild(wrap);
    state.modal = wrap;

    wrap.addEventListener('click', function (event) {
      if (event.target.matches('[data-close-modal]')) closeModal();
      if (event.target.matches('[data-switch-view]')) toggleView(event.target.getAttribute('data-switch-view'));
    });

    const signinForm = wrap.querySelector('#ccg-signin-form');
    signinForm.addEventListener('submit', async function (event) {
      event.preventDefault();
      setMessage('Signing in…');
      const formData = new FormData(signinForm);
      const email = String(formData.get('email') || '').trim();
      const password = String(formData.get('password') || '');
      const supabase = await window.ccgSupabase.getClient();
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) return setMessage(error.message, 'error');
      setMessage('Welcome back!', 'success');
      closeModal();
    });

    const signupForm = wrap.querySelector('#ccg-signup-form');
    signupForm.addEventListener('submit', async function (event) {
      event.preventDefault();
      setMessage('Creating account…');
      const formData = new FormData(signupForm);
      const email = String(formData.get('email') || '').trim();
      const password = String(formData.get('password') || '');
      const supabase = await window.ccgSupabase.getClient();
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) return setMessage(error.message, 'error');
      setMessage('Account created. Check your email if confirmation is enabled.', 'success');
      toggleView('signin');
    });

    const magicForm = wrap.querySelector('#ccg-magic-form');
    magicForm.addEventListener('submit', async function (event) {
      event.preventDefault();
      setMessage('Sending magic link…');
      const formData = new FormData(magicForm);
      const email = String(formData.get('email') || '').trim();
      const supabase = await window.ccgSupabase.getClient();
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: window.location.origin + state.redirectTo
        }
      });
      if (error) return setMessage(error.message, 'error');
      setMessage('Magic link sent. Check your inbox.', 'success');
    });

    const usernameForm = wrap.querySelector('#ccg-username-form');
    usernameForm.addEventListener('submit', async function (event) {
      event.preventDefault();
      if (!state.currentUser) return;
      const formData = new FormData(usernameForm);
      const username = String(formData.get('username') || '').trim();
      if (!username) return setMessage('Please choose a username.', 'error');
      const supabase = await window.ccgSupabase.getClient();
      const { error } = await supabase
        .from('profiles')
        .upsert({
          id: state.currentUser.id,
          username,
          avatar_url: null
        }, { onConflict: 'id' });

      if (error) return setMessage(error.message, 'error');
      setMessage('Profile ready!', 'success');
      await refreshCurrentUser();
      closeModal();
    });
  }

  async function fetchProfile(userId) {
    const supabase = await window.ccgSupabase.getClient();
    const { data, error } = await supabase
      .from('profiles')
      .select('id, username, avatar_url, role, created_at')
      .eq('id', userId)
      .maybeSingle();

    if (error && error.code !== 'PGRST116') {
      console.warn('Profile fetch failed:', error.message);
      return null;
    }

    return data || null;
  }

  async function ensureProfile() {
    if (!state.currentUser) return null;
    const profile = await fetchProfile(state.currentUser.id);
    state.currentProfile = profile;
    if (!profile || !profile.username) {
      openModal('username');
      setMessage('Welcome! Please choose your public username.');
    }
    emitAuthChanged();
    return profile;
  }

  async function refreshCurrentUser() {
    const supabase = await window.ccgSupabase.getClient();
    const { data } = await supabase.auth.getUser();
    state.currentUser = data && data.user ? data.user : null;

    if (state.currentUser) {
      await ensureProfile();
    } else {
      state.currentProfile = null;
      emitAuthChanged();
    }
  }

  async function initAuth() {
    if (state.initialized) return;
    state.initialized = true;
    createModal();

    const supabase = await window.ccgSupabase.getClient();
    await refreshCurrentUser();

    supabase.auth.onAuthStateChange(async function () {
      await refreshCurrentUser();
    });
  }

  async function requireAuth() {
    await initAuth();
    if (!state.currentUser) {
      openModal('signin');
      return null;
    }
    if (!state.currentProfile || !state.currentProfile.username) {
      openModal('username');
      return null;
    }
    return state.currentUser;
  }

  async function logout() {
    const supabase = await window.ccgSupabase.getClient();
    await supabase.auth.signOut();
  }

  window.ccgCommunityAuth = {
    init: initAuth,
    openAuthModal: openModal,
    closeAuthModal: closeModal,
    requireAuth,
    logout,
    getUser: function () { return state.currentUser; },
    getProfile: function () { return state.currentProfile; },
    isAdminOrMod: function () {
      const role = state.currentProfile && state.currentProfile.role;
      return role === 'admin' || role === 'mod';
    },
    esc
  };

  document.addEventListener('DOMContentLoaded', function () {
    initAuth().catch(function (error) {
      console.warn('Community auth init failed:', error.message);
    });
  });
})();
