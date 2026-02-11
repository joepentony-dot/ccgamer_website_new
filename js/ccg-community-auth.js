(function () {
  const state = {
    initialized: false,
    currentUser: null,
    currentProfile: null,
    modal: null,
    refreshPromise: null
  };

  function normalizeSupabaseUrl(raw) {
    const value = String(raw || '').trim();
    if (!value) return '';
    if (/^https?:\/\//i.test(value)) return value.replace(/\/+$/, '');
    const cleaned = value.replace(/\/+$/, '');
    if (cleaned.includes('.supabase.co')) {
      return `https://${cleaned}`;
    }
    return `https://${cleaned}.supabase.co`;
  }

  function getSupabaseProjectRef() {
    try {
      const url = normalizeSupabaseUrl(window.CCG_SUPABASE_URL);
      return new URL(url).hostname.split('.')[0] || '';
    } catch {
      return '';
    }
  }

  function clearSupabaseStorage(storage, projectRef) {
    if (!storage) return;
    if (projectRef) {
      for (let i = storage.length - 1; i >= 0; i -= 1) {
        const key = storage.key(i);
        if (key && key.startsWith(`sb-${projectRef}-`)) {
          try {
            storage.removeItem(key);
          } catch {
            // ignore storage issues
          }
        }
      }
    }
    for (let i = storage.length - 1; i >= 0; i -= 1) {
      const key = storage.key(i);
      if (!key) continue;
      if (key.startsWith('ccg-community-profile') || key.startsWith('ccg-community-avatar')) {
        try {
          storage.removeItem(key);
        } catch {
          // ignore storage issues
        }
      }
    }

    const localKeys = ['ccg_username', 'ccg-user', 'ccg-auth-token', 'ccg-auth-refresh-token'];
    localKeys.forEach(function (key) {
      try {
        storage.removeItem(key);
      } catch {
        // ignore storage issues
      }
    });
  }

  function clearAuthCookies() {
    const cookies = document.cookie ? document.cookie.split(';') : [];
    cookies.forEach(function (pair) {
      const cookieName = pair.split('=')[0].trim();
      if (!cookieName) return;
      document.cookie = cookieName + '=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/';
    });
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

  function showToast(message, type) {
    const text = String(message || '').trim();
    if (!text) return;

    const existing = document.getElementById('ccg-community-toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.id = 'ccg-community-toast';
    toast.className = 'ccg-community-toast';
    toast.setAttribute('role', 'status');
    toast.dataset.type = type || 'info';
    toast.textContent = text;
    document.body.appendChild(toast);

    window.setTimeout(function () {
      toast.classList.add('is-visible');
    }, 10);

    window.setTimeout(function () {
      toast.classList.remove('is-visible');
      window.setTimeout(function () {
        if (toast.parentNode) toast.parentNode.removeChild(toast);
      }, 220);
    }, 3600);
  }

  function redirectToLogin(returnTo) {
    const target = new URL('/auth/login.html', window.location.origin);
    const fallbackReturn = window.location.pathname + window.location.search + window.location.hash;
    target.searchParams.set('returnTo', returnTo || fallbackReturn);
    window.location.href = target.pathname + target.search;
  }

  function sanitizeUsername(raw, fallback) {
    const source = String(raw || fallback || '').toLowerCase();
    const cleaned = source
      .replace(/[^a-z0-9_-]+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 24);
    if (cleaned.length >= 3) return cleaned;
    return ('player-' + Math.random().toString(36).slice(2, 8)).slice(0, 24);
  }

  function toggleView(view) {
    document.querySelectorAll('[data-ccg-auth-view]').forEach((panel) => {
      panel.hidden = panel.getAttribute('data-ccg-auth-view') !== view;
    });
  }

  function isCommunityUnavailableError(error) {
    const code = String(error && error.code || '');
    const message = String(error && error.message || '').toLowerCase();
    return code === '42P01' || code === 'PGRST205' || message.includes('relation') || message.includes('does not exist');
  }

  function communityUnavailableMessage() {
    return 'Community services are temporarily unavailable. Please try again shortly.';
  }

  function normalizeAuthError(error, context) {
    const raw = String(error && error.message || 'Unknown auth error');
    const lower = raw.toLowerCase();
    const details = { context: context || 'unknown', detail: raw, code: error && error.code ? String(error.code) : '', status: error && error.status ? Number(error.status) : null };

    let message = raw;
    if (lower.includes('failed to fetch') || lower.includes('network') || lower.includes('load failed')) {
      message = 'Network/CORS issue while contacting auth service. Please try again.';
    } else if (lower.includes('invalid login credentials') || lower.includes('invalid_grant')) {
      message = 'Invalid email or password.';
    } else if (lower.includes('rate limit') || details.status === 429) {
      message = 'Too many attempts. Please wait and try again.';
    } else if (lower.includes('session') || lower.includes('token') || lower.includes('jwt')) {
      message = 'Session error detected. Please sign in again.';
    }

    console.error('[CCG-AUTH] ' + details.context, details);
    return message;
  }

  async function safeGetClient() {
    try {
      return await window.ccgSupabase.getClient();
    } catch (_error) {
      setMessage(communityUnavailableMessage(), 'error');
      return null;
    }
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
      '    <button type="button" class="ccg-community-link-btn" data-switch-view="signup">Need an account? Create one</button>' +
      '  </section>' +
      '  <section data-ccg-auth-view="signup" hidden>' +
      '    <form id="ccg-signup-form" class="ccg-community-form">' +
      '      <label>Email<input type="email" name="email" required autocomplete="email"></label>' +
      '      <label>Password<input type="password" name="password" required minlength="6" autocomplete="new-password"></label>' +
      '      <button type="submit" class="ccg-community-btn">Create account</button>' +
      '    </form>' +
      '    <button type="button" class="ccg-community-link-btn" data-switch-view="signin">Already have an account? Log in</button>' +
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
      const supabase = await safeGetClient();
      if (!supabase) return;
      const result = await supabase.auth.signInWithPassword({ email, password });
      if (result.error) return setMessage(normalizeAuthError(result.error, 'modal-signin'), 'error');
      setMessage('Welcome back!', 'success');
      closeModal();
      await refreshCurrentUser();
    });

    const signupForm = wrap.querySelector('#ccg-signup-form');
    signupForm.addEventListener('submit', async function (event) {
      event.preventDefault();
      setMessage('Creating account…');
      const formData = new FormData(signupForm);
      const email = String(formData.get('email') || '').trim();
      const password = String(formData.get('password') || '');
      const supabase = await safeGetClient();
      if (!supabase) return;
      const result = await supabase.auth.signUp({ email, password });
      if (result.error) return setMessage(normalizeAuthError(result.error, 'modal-signup'), 'error');
      setMessage('Account created. Check your email if confirmation is enabled.', 'success');
      toggleView('signin');
    });

    const usernameForm = wrap.querySelector('#ccg-username-form');
    usernameForm.addEventListener('submit', async function (event) {
      event.preventDefault();
      if (!state.currentUser) return;
      const formData = new FormData(usernameForm);
      const username = String(formData.get('username') || '').trim();
      if (!username) return setMessage('Please choose a username.', 'error');
      const supabase = await safeGetClient();
      if (!supabase) return;

      const { error } = await supabase
        .from('profiles')
        .upsert({ id: state.currentUser.id, username, avatar_url: null }, { onConflict: 'id' });

      if (error) {
        if (isCommunityUnavailableError(error)) return setMessage(communityUnavailableMessage(), 'error');
        return setMessage(error.message, 'error');
      }
      setMessage('Profile ready!', 'success');
      await refreshCurrentUser();
      closeModal();
    });
  }

  async function fetchProfile(userId) {
    const supabase = await safeGetClient();
    if (!supabase) return null;

    const { data, error } = await supabase
      .from('profiles')
      .select('id, username, avatar_url, role, created_at')
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      if (error.code === 'PGRST116' || isCommunityUnavailableError(error)) return null;
      return null;
    }

    return data || null;
  }

  async function createFallbackProfile(user) {
    if (!user || !user.id) return null;
    const supabase = await safeGetClient();
    if (!supabase) return null;

    const fallbackUsername = sanitizeUsername(
      user.user_metadata && user.user_metadata.username,
      user.email ? user.email.split('@')[0] : user.id.slice(0, 8)
    );

    const payload = {
      id: user.id,
      username: fallbackUsername,
      display_name: user.user_metadata && user.user_metadata.display_name
        ? String(user.user_metadata.display_name).slice(0, 42)
        : fallbackUsername,
      bio: null,
      avatar_url: user.user_metadata && user.user_metadata.avatar_url ? String(user.user_metadata.avatar_url) : null
    };

    const { data, error } = await supabase
      .from('profiles')
      .upsert(payload, { onConflict: 'id' })
      .select('id, username, avatar_url, role, created_at, display_name, bio')
      .maybeSingle();

    if (error) {
      console.error('[CCG-AUTH] profile auto-create failed', error);
      return null;
    }
    return data || payload;
  }

  async function ensureProfile() {
    if (!state.currentUser) return null;
    const profile = await fetchProfile(state.currentUser.id);
    state.currentProfile = profile;
    if (!profile || !profile.username) {
      openModal('username');
      setMessage('Welcome! Please choose your public username.');
    }
    return profile;
  }

  async function refreshCurrentUser() {
    if (state.refreshPromise) return state.refreshPromise;

    state.refreshPromise = (async function () {
      const session = await window.ccgSupabase.waitForAuth();
      const user = session && session.user ? session.user : null;
      state.currentUser = user || null;

      if (state.currentUser) {
        const profile = await fetchProfile(state.currentUser.id);
        state.currentProfile = profile || await createFallbackProfile(state.currentUser);
        if (!profile || !profile.username) {
          openModal('username');
          setMessage('Welcome! Please choose your public username.');
        }
      } else {
        state.currentProfile = null;
      }

      const role = (state.currentProfile && state.currentProfile.role)
        || (state.currentUser && state.currentUser.app_metadata && state.currentUser.app_metadata.role)
        || null;
      window.ccgSupabase.resolveAuthReadyContext({
        user: state.currentUser,
        profile: state.currentProfile,
        session,
        isAuthenticated: Boolean(state.currentUser),
        role,
        permissions: {
          canRate: Boolean(state.currentUser),
          canComment: Boolean(state.currentUser),
          canModerate: role === 'admin' || role === 'editor' || role === 'mod'
        }
      });
    })().finally(function () {
      state.refreshPromise = null;
    });

    return state.refreshPromise;
  }

  async function initAuth() {
    if (state.initialized) return;
    state.initialized = true;
    createModal();

    const readiness = await window.ccgSupabase.checkCommunityReadiness();
    if (!readiness.ready) {
      setMessage(communityUnavailableMessage(), 'error');
      return;
    }

    await window.ccgSupabase.waitForAuth();
    await window.ccgSupabase.waitForSessionReady();
    await refreshCurrentUser();
  }

  async function requireAuth() {
    await initAuth();
    if (!state.currentUser) {
      redirectToLogin();
      return null;
    }
    if (!state.currentProfile || !state.currentProfile.username) {
      openModal('username');
      return null;
    }
    return state.currentUser;
  }

  async function logout() {
    const supabase = await safeGetClient();
    if (!supabase) return;
    const projectRef = getSupabaseProjectRef();
    /* ===================================================
       OMEGA LOGOUT LOCK — DO NOT REMOVE
       Why: Supabase auth caches can persist a session even
       after signOut unless storage keys are cleared.
       =================================================== */
    try {
      await supabase.auth.signOut({ scope: 'global' });
    } finally {
      clearSupabaseStorage(window.localStorage, projectRef);
      clearSupabaseStorage(window.sessionStorage, projectRef);
      clearAuthCookies();
      state.currentUser = null;
      state.currentProfile = null;
      window.CCG_AUTH = { loggedIn: false, user: null, profile: null, session: null, username: '' };
      window.dispatchEvent(new CustomEvent('ccg:auth-changed', { detail: { event: 'SIGNED_OUT', user: null, session: null } }));
      showToast('You have been logged out.', 'success');
    }
  }

  window.ccgCommunityAuth = {
    init: initAuth,
    openAuthModal: openModal,
    goToLogin: redirectToLogin,
    closeAuthModal: closeModal,
    requireAuth,
    logout,
    getUser: function () { return state.currentUser; },
    getProfile: function () { return state.currentProfile; },
    getProfileReady: function () { return refreshCurrentUser().then(function () { return state.currentProfile; }); },
    isAdminOrMod: function () {
      const role = state.currentProfile && state.currentProfile.role;
      return role === 'admin' || role === 'editor' || role === 'mod';
    },
    esc,
    showToast
  };

  document.addEventListener('DOMContentLoaded', function () {
    initAuth().catch(function () {
      setMessage(communityUnavailableMessage(), 'error');
    });
  });

  window.addEventListener('ccg:auth-ready', refreshCurrentUser);
  window.addEventListener('ccg:auth-changed', refreshCurrentUser);
})();
