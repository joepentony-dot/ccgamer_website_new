(function () {
  const SUPABASE_CDN = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js';
  const GLOBAL_KEY = '__ccgSupabaseState';
  const COMMUNITY_READINESS_KEY = '__ccgCommunityReadinessState';
  const DEV_WARN_KEY = '__ccgCommunityDevWarned';
  const AUTH_READY_KEY = '__ccgAuthReadyState';
  const AUTH_DEBUG_KEY = '__ccgAuthDebugState';
  const RPC_MISSING_KEY = '__ccgRpcMissingCache';

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
    lastAuthEvent: 'BOOT',
    contextReady: false,
    contextResolver: null,
    context: null,
    redirectPending: false,
    sessionReadyPromise: null
  });

  const authDebugState = window[AUTH_DEBUG_KEY] || (window[AUTH_DEBUG_KEY] = {
    enabled: false,
    overlay: null
  });

  const rpcMissingCache = window[RPC_MISSING_KEY] || (window[RPC_MISSING_KEY] = new Set());

  /* ===================================================
     OMEGA COMMUNITY SUPABASE URL LOCK
     Why: community APIs must use full https://<ref>.supabase.co
     to avoid malformed /rpc or /rest URLs and 404s.
     =================================================== */
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

  function logSupabaseDebug(scope, payload) {
    try {
      console.info('[CCG-SUPABASE-DEBUG] ' + scope, payload);
    } catch (_error) {}
  }

  async function getClient() {
    const url = normalizeSupabaseUrl(window.CCG_SUPABASE_URL);
    const key = window.CCG_SUPABASE_ANON_KEY;
    const storageKey = window.CCG_SUPABASE_STORAGE_KEY;

    if (!url || !key) throw new Error('Missing Supabase config. Update /js/ccg-supabase-config.js first.');
    if (window.CCG_SUPABASE_URL !== url) window.CCG_SUPABASE_URL = url;

    let supabaseHostname = 'invalid-url';
    try {
      supabaseHostname = new URL(url).hostname;
    } catch (_error) {}
    logSupabaseDebug('client-config', { hostname: supabaseHostname });

    await loadSupabaseLibrary();

    const configHash = url + '::' + key;
    if (window.__ccgSupabaseClient && window.__ccgSupabaseConfigHash === configHash) {
      window.supabase = window.__ccgSupabaseClient;
      globalState.client = window.__ccgSupabaseClient;
      globalState.configHash = configHash;
      return window.__ccgSupabaseClient;
    }

    if (globalState.client && globalState.configHash === configHash) return globalState.client;
    if (globalState.clientPromise && globalState.configHash === configHash) return globalState.clientPromise;

    globalState.configHash = configHash;
    globalState.clientPromise = Promise.resolve().then(() => {
      if (window.__ccgSupabaseClient && window.__ccgSupabaseConfigHash === configHash) return window.__ccgSupabaseClient;

      const authOptions = {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storage: window.localStorage
      };
      if (storageKey) authOptions.storageKey = storageKey;

      const client = window.supabase.createClient(url, key, { auth: authOptions });

      window.supabase = client;
      window.__ccgSupabaseClient = client;
      window.__ccgSupabaseConfigHash = configHash;
      console.info('[CCG-SUPABASE] client ready');
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

  function hasAuthRedirectParams() {
    const hash = window.location.hash || '';
    if (!hash) return false;
    return /access_token|refresh_token|type=|error=|error_description=/.test(hash);
  }

  function ensureAuthReadyPromise() {
    if (!window.CCG_AUTH_READY) {
      window.CCG_AUTH_READY = new Promise(function (resolve) {
        authReadyState.contextResolver = resolve;
      });
    }
  }

  function resolveAuthReadyContext(context) {
    ensureAuthReadyPromise();
    authReadyState.redirectPending = hasAuthRedirectParams();
    if (authReadyState.contextReady || authReadyState.redirectPending) return;
    if (!context || typeof context !== 'object') return;
    authReadyState.contextReady = true;
    authReadyState.context = context;
    if (authReadyState.contextResolver) {
      authReadyState.contextResolver(context);
    }
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
    ensureAuthReadyPromise();

    if (authReadyState.ready) {
      emitAuthReady(false);
      return authReadyState.session;
    }

    if (authReadyState.promise) return authReadyState.promise;

    authReadyState.promise = (async function () {
      try {
        const result = await client.auth.getSession();
        const session = result && result.data ? result.data.session || null : null;
        let user = session && session.user ? session.user : null;
        try {
          const userResult = await client.auth.getUser();
          user = userResult && userResult.data ? userResult.data.user || user : user;
        } catch (_error) {
          // If getUser fails, keep session user if available.
        }
        if (session && user && !session.user) {
          session.user = user;
        }
        authReadyState.session = session;
      } catch (error) {
        authReadyState.session = null;
        authReadyState.bootstrapError = error;
      }

      authReadyState.ready = true;
      emitAuthReady(true);
      if (!window.ccgCommunityAuth || typeof window.ccgCommunityAuth.getProfile !== 'function') {
        const session = authReadyState.session;
        const user = session && session.user ? session.user : null;
        const role = user && user.app_metadata && user.app_metadata.role ? user.app_metadata.role : null;
        resolveAuthReadyContext({
          user,
          session,
          role,
          isAuthenticated: Boolean(user)
        });
      }
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
      canModerate: role === 'admin' || role === 'editor' || role === 'mod'
    };
  }

  async function waitForSessionReady(options) {
    const timeoutMs = Number(options && options.timeoutMs) > 0 ? Number(options.timeoutMs) : 8000;
    if (authReadyState.sessionReadyPromise) return authReadyState.sessionReadyPromise;

    authReadyState.sessionReadyPromise = (async function () {
      await waitForAuth();
      if (authReadyState.contextReady && authReadyState.context) return authReadyState.context;

      const contextPromise = window.CCG_AUTH_READY || Promise.resolve(null);
      const timeoutPromise = new Promise(function (resolve) {
        window.setTimeout(function () {
          resolve(null);
        }, timeoutMs);
      });

      const context = await Promise.race([contextPromise, timeoutPromise]);
      if (context && typeof context === 'object') {
        return context;
      }
      return getCurrentUserContext();
    })().finally(function () {
      authReadyState.sessionReadyPromise = null;
    });

    return authReadyState.sessionReadyPromise;
  }

  /* ===============================================
     OMEGA COMMUNITY AUTH LOCK
     Prevents endless retry loop by ensuring auth
     context is validated and rebuilt once before
     surfacing a visible error to the UI.
     =============================================== */
  async function getCurrentUserContext() {
    const buildContext = async () => {
      const session = await waitForAuth();
      const user = session && session.user ? session.user : null;
      const profile = window.ccgCommunityAuth && typeof window.ccgCommunityAuth.getProfile === 'function'
        ? window.ccgCommunityAuth.getProfile()
        : null;
      const role = getRoleFromSources(session, profile);
      const isAuthenticated = Boolean(user);
      return {
        user,
        profile,
        session,
        isAuthenticated,
        role,
        permissions: getPermissionsFromRole(role, isAuthenticated)
      };
    };

    let lastError = null;
    for (let attempt = 0; attempt < 2; attempt += 1) {
      try {
        const context = await buildContext();
        if (!context || typeof context !== 'object') {
          throw new Error('Invalid auth context.');
        }
        resolveAuthReadyContext(context);
        logSupabaseDebug('auth-context', {
          userId: context.user ? context.user.id : null,
          hasAccessToken: Boolean(context.session && context.session.access_token)
        });
        return context;
      } catch (error) {
        lastError = error;
        try {
          const client = await getClient();
          await client.auth.refreshSession();
        } catch (refreshError) {
          lastError = refreshError || lastError;
        }
      }
    }

    console.error('[CCG-AUTH] getCurrentUserContext failed', lastError);
    throw lastError instanceof Error ? lastError : new Error('Unable to resolve auth context.');
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
      ensureAuthReadyPromise();
      bootstrapGlobalAuth();
    }, { once: true });
  } else {
    initAuthDebugOverlay();
    ensureAuthReadyPromise();
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
      const url = normalizeSupabaseUrl(window.CCG_SUPABASE_URL);
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
          'ratings?select=id&limit=1',
          'comments?select=id&limit=1',
          'badge_definitions?select=id&limit=1'
        ];

        const checks = await Promise.all(endpoints.map((endpoint) => fetch(base + endpoint, { method: 'GET', headers })));
        if (checks.some((response) => !response.ok)) {
          readinessState.checked = true;
          readinessState.available = false;
          readinessState.reason = 'not_configured';
          warnCommunityOnce('CCG community data endpoints are temporarily unavailable.');
          return { ready: false, reason: readinessState.reason };
        }
      } catch (_error) {
        readinessState.checked = true;
        readinessState.available = false;
        readinessState.reason = 'unavailable';
        warnCommunityOnce('CCG community data endpoints are temporarily unavailable.');
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


  function normalizeGameKey(gameRef) {
    if (!gameRef || typeof gameRef !== 'object') return '';
    const slug = String(gameRef.slug || gameRef.game_slug || '').trim().toLowerCase();
    const id = String(gameRef.id || gameRef.game_id || '').trim().toLowerCase();
    return slug || id;
  }

  async function callRpcSafe(client, functionName, params) {
    if (!client || typeof client.rpc !== 'function') {
      return { data: null, error: new Error('Supabase client unavailable.'), missing: true };
    }

    try {
      const response = await client.rpc(functionName, params || {});
      if (response.error) {
        const missing = isCommunityUnavailableError(response.error);
        if (missing) {
          const rpcUrl = normalizeSupabaseUrl(window.CCG_SUPABASE_URL) + '/rest/v1/rpc/' + functionName;
          if (!rpcMissingCache.has(rpcUrl)) {
            rpcMissingCache.add(rpcUrl);
            console.warn(`[CCG-COMMUNITY] rpc=missing url=${rpcUrl}`);
            console.warn('[CCG-COMMUNITY] Community service not deployed / RPC missing');
          }
        }
        return { data: null, error: response.error, missing: missing };
      }
      return { data: response.data || [], error: null, missing: false };
    } catch (error) {
      const missing = isCommunityUnavailableError(error);
      if (missing) {
        const rpcUrl = normalizeSupabaseUrl(window.CCG_SUPABASE_URL) + '/rest/v1/rpc/' + functionName;
        if (!rpcMissingCache.has(rpcUrl)) {
          rpcMissingCache.add(rpcUrl);
          console.warn(`[CCG-COMMUNITY] rpc=missing url=${rpcUrl}`);
          console.warn('[CCG-COMMUNITY] Community service not deployed / RPC missing');
        }
      }
      return { data: null, error: error, missing: missing };
    }
  }

  window.ccgSupabase = window.ccgSupabase || {};
  window.ccgSupabase.getClient = getClient;
  window.ccgSupabase.checkCommunityReadiness = checkCommunityReadiness;
  window.ccgSupabase.waitForAuth = waitForAuth;
  window.ccgSupabase.callRpcSafe = callRpcSafe;
  window.ccgSupabase.isCommunityUnavailableError = isCommunityUnavailableError;
  window.ccgSupabase.getCurrentUserContext = getCurrentUserContext;
  window.ccgSupabase.resolveAuthReadyContext = resolveAuthReadyContext;
  window.ccgSupabase.waitForSessionReady = waitForSessionReady;
  window.ccgSupabase.normalizeGameKey = normalizeGameKey;
})();
