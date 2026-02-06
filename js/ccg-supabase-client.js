(function () {
  const SUPABASE_CDN = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js';
  const GLOBAL_KEY = '__ccgSupabaseState';
  const COMMUNITY_READINESS_KEY = '__ccgCommunityReadinessState';
  const DEV_WARN_KEY = '__ccgCommunityDevWarned';
  const AUTH_READY_KEY = '__ccgAuthReadyState';
  const AUTH_DEBUG_KEY = '__ccgAuthDebugState';

  const globalState = window[GLOBAL_KEY] || (window[GLOBAL_KEY] = {
    loadPromise: null,
    client: null,
    clientPromise: null,
    configHash: null
  });

  const readinessState = window[COMMUNITY_READINESS_KEY] || (window[COMMUNITY_READINESS_KEY] = {
    checked: false,
    available: true,
    checkPromise: null,
    reason: ''
  });

  const authReadyState = window[AUTH_READY_KEY] || (window[AUTH_READY_KEY] = {
    ready: false,
    promise: null,
    session: null,
    listenerAttached: false,
    authBootstrapped: false,
    bootstrapPromise: null,
    readyEventDispatched: false,
    lastAuthEventKey: '',
    bootstrapError: null,
    lastAuthEvent: 'BOOT'
  });

  const authDebugState = window[AUTH_DEBUG_KEY] || (window[AUTH_DEBUG_KEY] = {
    enabled: false,
    overlay: null
  });

  function getExistingLibraryScript() {
    return document.querySelector('script[src*="@supabase/supabase-js"], script[src*="supabase.min.js"]');
  }

  function loadSupabaseLibrary() {
    if (window.supabase && typeof window.supabase.createClient === 'function') return Promise.resolve();
    if (globalState.loadPromise) return globalState.loadPromise;

    globalState.loadPromise = new Promise((resolve, reject) => {
      const existing = getExistingLibraryScript();
      if (existing) {
        existing.addEventListener('load', () => resolve(), { once: true });
        existing.addEventListener('error', () => reject(new Error('Unable to load Supabase library from CDN.')), { once: true });
        window.setTimeout(() => {
          if (window.supabase && typeof window.supabase.createClient === 'function') resolve();
        }, 0);
        return;
      }

      const script = document.createElement('script');
      script.src = SUPABASE_CDN;
      script.async = true;
      script.defer = true;
      script.dataset.ccgSupabase = '1';
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Unable to load Supabase library from CDN.'));
      document.head.appendChild(script);
    });

    return globalState.loadPromise;
  }

  async function getClient() {
    const url = window.CCG_SUPABASE_URL;
    const key = window.CCG_SUPABASE_ANON_KEY;

    if (!url || !key) throw new Error('Missing Supabase config. Update /js/ccg-supabase-config.js first.');

    await loadSupabaseLibrary();

    const configHash = url + '::' + key;
    if (window.__ccgSupabaseClient && window.__ccgSupabaseConfigHash === configHash) {
      globalState.client = window.__ccgSupabaseClient;
      globalState.configHash = configHash;
      return window.__ccgSupabaseClient;
    }

    if (globalState.client && globalState.configHash === configHash) return globalState.client;
    if (globalState.clientPromise && globalState.configHash === configHash) return globalState.clientPromise;

    globalState.configHash = configHash;
    globalState.clientPromise = Promise.resolve().then(() => {
      if (window.__ccgSupabaseClient && window.__ccgSupabaseConfigHash === configHash) return window.__ccgSupabaseClient;

      const client = window.supabase.createClient(url, key, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
          storage: window.localStorage
        }
      });

      window.__ccgSupabaseClient = client;
      window.__ccgSupabaseConfigHash = configHash;
      return client;
    }).then((client) => {
      globalState.client = client;
      globalState.clientPromise = null;
      return client;
    }).catch((error) => {
      globalState.clientPromise = null;
      throw error;
    });

    return globalState.clientPromise;
  }

  function emitAuthReady(force) {
    if (authReadyState.readyEventDispatched && !force) return;
    authReadyState.readyEventDispatched = true;
    window.dispatchEvent(new CustomEvent('ccg:auth-ready', {
      detail: {
        session: authReadyState.session,
        user: authReadyState.session && authReadyState.session.user ? authReadyState.session.user : null,
        bootstrapped: authReadyState.authBootstrapped,
        error: authReadyState.bootstrapError || null
      }
    }));
    updateAuthDebugOverlay('READY');
  }

  function emitAuthChanged(eventName, session) {
    const allowedEvents = ['SIGNED_IN', 'SIGNED_OUT', 'TOKEN_REFRESHED', 'USER_UPDATED'];
    if (!allowedEvents.includes(eventName)) return;

    const userId = session && session.user ? session.user.id : 'anon';
    const accessToken = session && session.access_token ? session.access_token.slice(-12) : 'no-token';
    const dedupeKey = eventName + '::' + userId + '::' + accessToken;

    // Safeguard: skip duplicated auth notifications emitted by rapid hydration callbacks.
    if (authReadyState.lastAuthEventKey === dedupeKey) return;
    authReadyState.lastAuthEventKey = dedupeKey;
    authReadyState.lastAuthEvent = eventName;

    window.dispatchEvent(new CustomEvent('ccg:auth-changed', {
      detail: {
        event: eventName,
        session: session || null,
        user: session && session.user ? session.user : null
      }
    }));

    updateAuthDebugOverlay(eventName);
  }

  function ensureAuthListener(client) {
    if (authReadyState.listenerAttached || !client || !client.auth || typeof client.auth.onAuthStateChange !== 'function') return;

    // Safeguard: a single auth listener for the full app lifecycle to avoid leaks/duplicates.
    authReadyState.listenerAttached = true;
    client.auth.onAuthStateChange(function (eventName, session) {
      authReadyState.session = session || null;
      authReadyState.ready = true;
      emitAuthReady(false);
      emitAuthChanged(eventName, authReadyState.session);
    });
  }

  async function waitForAuth() {
    const client = await getClient();
    ensureAuthListener(client);

    if (authReadyState.ready) {
      emitAuthReady(false);
      return authReadyState.session;
    }

    if (authReadyState.promise) return authReadyState.promise;

    authReadyState.promise = (async function () {
      try {
        const result = await client.auth.getSession();
        authReadyState.session = result && result.data ? result.data.session || null : null;
      } catch (error) {
        authReadyState.session = null;
        authReadyState.bootstrapError = error;
      }

      authReadyState.ready = true;
      emitAuthReady(true);
      return authReadyState.session;
    })().finally(function () {
      authReadyState.promise = null;
    });

    return authReadyState.promise;
  }

  function bootstrapGlobalAuth() {
    if (authReadyState.authBootstrapped) return authReadyState.bootstrapPromise || Promise.resolve(authReadyState.session);

    authReadyState.authBootstrapped = true;
    authReadyState.bootstrapPromise = waitForAuth().catch(function (error) {
      authReadyState.bootstrapError = error;
      authReadyState.ready = true;
      authReadyState.session = null;
      emitAuthReady(true);
      return null;
    }).finally(function () {
      authReadyState.bootstrapPromise = null;
      updateAuthDebugOverlay('BOOTSTRAPPED');
    });

    return authReadyState.bootstrapPromise;
  }

  function getRoleFromSources(session, profile) {
    if (profile && profile.role) return profile.role;
    const user = session && session.user ? session.user : null;
    return user && user.app_metadata && user.app_metadata.role ? user.app_metadata.role : 'member';
  }

  function getPermissionsFromRole(role, isAuthenticated) {
    if (!isAuthenticated) return { canRate: false, canComment: false, canModerate: false };
    return {
      canRate: true,
      canComment: true,
      canModerate: role === 'admin' || role === 'mod'
    };
  }

  async function getCurrentUserContext() {
    const session = await waitForAuth();
    const user = session && session.user ? session.user : null;
    const profile = window.ccgCommunityAuth && typeof window.ccgCommunityAuth.getProfile === 'function'
      ? window.ccgCommunityAuth.getProfile()
      : null;
    const role = getRoleFromSources(session, profile);
    const isAuthenticated = Boolean(user);
    return {
      user,
      session,
      isAuthenticated,
      role,
      permissions: getPermissionsFromRole(role, isAuthenticated)
    };
  }

  function initAuthDebugOverlay() {
    const params = new URLSearchParams(window.location.search);
    if (params.get('ccgAuthDebug') !== '1') return;
    authDebugState.enabled = true;

    const overlay = document.createElement('aside');
    overlay.setAttribute('aria-hidden', 'true');
    overlay.style.cssText = 'position:fixed;right:8px;bottom:8px;z-index:9999;pointer-events:none;background:rgba(2,7,20,0.86);border:1px solid rgba(99,232,255,0.6);border-radius:10px;padding:8px 10px;max-width:260px;color:#d8faff;font:12px/1.35 monospace;box-shadow:0 0 14px rgba(76,224,255,0.28);';
    document.body.appendChild(overlay);
    authDebugState.overlay = overlay;
    updateAuthDebugOverlay('INIT');
  }

  function updateAuthDebugOverlay(lastEvent) {
    if (!authDebugState.enabled || !authDebugState.overlay) return;
    const session = authReadyState.session;
    const userId = session && session.user ? session.user.id : 'none';
    const exp = session && session.expires_at ? new Date(session.expires_at * 1000).toISOString() : 'n/a';
    authDebugState.overlay.textContent = [
      '[CCG Auth Debug]',
      'bootstrapped: ' + String(authReadyState.authBootstrapped),
      'hydrated: ' + String(authReadyState.ready),
      'listener: ' + String(authReadyState.listenerAttached),
      'user: ' + userId,
      'expires: ' + exp,
      'last-event: ' + (lastEvent || authReadyState.lastAuthEvent || 'BOOT')
    ].join('\n');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      initAuthDebugOverlay();
      bootstrapGlobalAuth();
    }, { once: true });
  } else {
    initAuthDebugOverlay();
    bootstrapGlobalAuth();
  }

  function isCommunityUnavailableError(error) {
    const code = String(error && error.code || '');
    const message = String(error && error.message || '').toLowerCase();
    return code === '42P01'
      || code === 'PGRST205'
      || code === 'PGRST301'
      || code === '404'
      || message.includes('relation')
      || message.includes('does not exist')
      || message.includes('not found')
      || message.includes('schema must be one of the following');
  }

  function warnCommunityOnce(message) {
    const isDev = /^(localhost|127\.0\.0\.1)$/.test(window.location.hostname);
    if (!isDev || window[DEV_WARN_KEY]) return;
    window[DEV_WARN_KEY] = true;
    console.warn(message);
  }

  async function checkCommunityReadiness() {
    if (readinessState.checked) return { ready: readinessState.available, reason: readinessState.reason };
    if (readinessState.checkPromise) return readinessState.checkPromise;

    readinessState.checkPromise = (async function () {
      const url = window.CCG_SUPABASE_URL;
      const key = window.CCG_SUPABASE_ANON_KEY;
      if (!url || !key) {
        readinessState.checked = true;
        readinessState.available = false;
        readinessState.reason = 'missing_config';
        return { ready: false, reason: readinessState.reason };
      }

      try {
        const base = url.replace(/\/$/, '') + '/rest/v1/';
        const headers = { apikey: key, Authorization: 'Bearer ' + key, Accept: 'application/json' };
        const endpoints = [
          'profiles?select=id&limit=1',
          'game_ratings?select=id&limit=1',
          'game_comments?select=id&limit=1'
        ];

        const checks = await Promise.all(endpoints.map((endpoint) => fetch(base + endpoint, { method: 'GET', headers })));
        if (checks.some((response) => !response.ok)) {
          readinessState.checked = true;
          readinessState.available = false;
          readinessState.reason = 'not_configured';
          warnCommunityOnce('CCG community tables are not configured yet. Disabling community data fetches.');
          return { ready: false, reason: readinessState.reason };
        }
      } catch (_error) {
        readinessState.checked = true;
        readinessState.available = false;
        readinessState.reason = 'unavailable';
        warnCommunityOnce('CCG community tables are not configured yet. Disabling community data fetches.');
        return { ready: false, reason: readinessState.reason };
      }

      readinessState.checked = true;
      readinessState.available = true;
      readinessState.reason = '';
      return { ready: true, reason: '' };
    })().finally(function () {
      readinessState.checkPromise = null;
    });

    return readinessState.checkPromise;
  }

  async function callRpcSafe(client, functionName, params) {
    if (!client || typeof client.rpc !== 'function') {
      return { data: null, error: new Error('Supabase client unavailable.'), missing: true };
    }

    try {
      const response = await client.rpc(functionName, params || {});
      if (response.error) return { data: null, error: response.error, missing: isCommunityUnavailableError(response.error) };
      return { data: response.data || [], error: null, missing: false };
    } catch (error) {
      return { data: null, error: error, missing: isCommunityUnavailableError(error) };
    }
  }

  window.ccgSupabase = window.ccgSupabase || {};
  window.ccgSupabase.getClient = getClient;
  window.ccgSupabase.checkCommunityReadiness = checkCommunityReadiness;
  window.ccgSupabase.waitForAuth = waitForAuth;
  window.ccgSupabase.callRpcSafe = callRpcSafe;
  window.ccgSupabase.isCommunityUnavailableError = isCommunityUnavailableError;
  window.ccgSupabase.getCurrentUserContext = getCurrentUserContext;
})();
