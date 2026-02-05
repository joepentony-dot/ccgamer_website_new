(function () {
  const SUPABASE_CDN = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js';
  const GLOBAL_KEY = '__ccgSupabaseState';

  const globalState = window[GLOBAL_KEY] || (window[GLOBAL_KEY] = {
    loadPromise: null,
    client: null,
    configHash: null
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
    if (globalState.client && globalState.configHash === configHash) return globalState.client;

    globalState.client = window.supabase.createClient(url, key, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
      }
    });
    globalState.configHash = configHash;

    return globalState.client;
  }

  window.ccgSupabase = window.ccgSupabase || {};
  window.ccgSupabase.getClient = getClient;
})();
