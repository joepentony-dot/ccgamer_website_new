(function () {
  const SUPABASE_CONFIG_FILE = 'ccg-supabase-config.js';
  const SUPABASE_CLIENT_FILE = 'ccg-supabase-client.js';

  function currentScriptBaseUrl() {
    const source = document.currentScript?.src || '/js/ccg-auth-supabase-loader.js';
    return new URL('./', new URL(source, window.location.href));
  }

  function loadScript(src) {
    const existing = Array.from(document.scripts || []).find((script) => script.src === src);
    if (existing?.dataset?.ccgLoaded === '1') return Promise.resolve();
    if (existing?.dataset?.ccgLoading === '1') {
      return new Promise((resolve, reject) => {
        existing.addEventListener('load', resolve, { once: true });
        existing.addEventListener('error', () => reject(new Error(`Unable to load ${src}`)), { once: true });
      });
    }

    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = src;
      script.async = false;
      script.defer = true;
      script.dataset.ccgLoading = '1';
      script.onload = () => {
        script.dataset.ccgLoading = '0';
        script.dataset.ccgLoaded = '1';
        resolve();
      };
      script.onerror = () => reject(new Error(`Unable to load ${src}`));
      document.head.appendChild(script);
    });
  }

  // Production account authority is Supabase. The temporary CCG/Render auth
  // pilot is deliberately retired from browser selection so runtime config or
  // query parameters cannot redirect login, registration or password recovery
  // away from the existing Supabase project.
  window.__ccgAuthProviderLocked = 'supabase';
  window.__ccgAuthSupabaseBootstrapSuppressed = false;

  const baseUrl = currentScriptBaseUrl();
  const configUrl = new URL(SUPABASE_CONFIG_FILE, baseUrl).href;
  const clientUrl = new URL(SUPABASE_CLIENT_FILE, baseUrl).href;

  window.CCG_AUTH_SUPABASE_READY = loadScript(configUrl)
    .then(() => loadScript(clientUrl))
    .then(() => true)
    .catch((error) => {
      console.error('[CCG-AUTH] Unable to initialize Supabase auth scripts.', error);
      return false;
    });
})();
