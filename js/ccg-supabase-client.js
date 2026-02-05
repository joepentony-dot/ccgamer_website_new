(function () {
  const SUPABASE_CDN = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js';
  const GLOBAL_KEY = '__ccgSupabaseState';
  const COMMUNITY_READINESS_KEY = '__ccgCommunityReadinessState';
  const DEV_WARN_KEY = '__ccgCommunityDevWarned';

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

  function getExistingLibraryScript() {
    return document.querySelector('script[src*="@supabase/supabase-js"], script[src*="supabase.min.js"]');
  }

  function loadSupabaseLibrary() {
    if (window.supabase && typeof window.supabase.createClient === 'function') {
      return Promise.resolve();
    }

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

    if (!url || !key) {
      throw new Error('Missing Supabase config. Update /js/ccg-supabase-config.js first.');
    }

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
      if (window.__ccgSupabaseClient && window.__ccgSupabaseConfigHash === configHash) {
        return window.__ccgSupabaseClient;
      }

      const client = window.supabase.createClient(url, key, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true
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
    if (readinessState.checked) {
      return {
        ready: readinessState.available,
        reason: readinessState.reason
      };
    }

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
        const headers = {
          apikey: key,
          Authorization: 'Bearer ' + key,
          Accept: 'application/json'
        };
        const endpoints = [
          'profiles?select=id&limit=1',
          'game_ratings?select=id&limit=1',
          'game_comments?select=id&limit=1'
        ];

        const checks = await Promise.all(endpoints.map((endpoint) => fetch(base + endpoint, {
          method: 'GET',
          headers
        })));

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


  window.ccgSupabase = window.ccgSupabase || {};
  window.ccgSupabase.getClient = getClient;
  window.ccgSupabase.checkCommunityReadiness = checkCommunityReadiness;
})();
