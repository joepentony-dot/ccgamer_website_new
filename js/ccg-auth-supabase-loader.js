(function () {
  const CCG_PROVIDER = 'ccg';
  const SUPABASE_CONFIG_FILE = 'ccg-supabase-config.js';
  const SUPABASE_CLIENT_FILE = 'ccg-supabase-client.js';

  function clean(value) {
    return String(value ?? '').trim();
  }

  function isLoopbackHost(hostname) {
    const host = clean(hostname).toLowerCase();
    return host === 'localhost' || host === '127.0.0.1' || host === '::1';
  }

  function readLocalPilotConfig() {
    try {
      const url = new URL(window.location.href);
      if (!isLoopbackHost(url.hostname)) return null;
      if (clean(url.searchParams.get('ccgAuthProvider')).toLowerCase() !== CCG_PROVIDER) return null;

      return {
        provider: CCG_PROVIDER,
        ccgBaseUrl: clean(url.searchParams.get('ccgAuthBaseUrl'))
      };
    } catch (_error) {
      return null;
    }
  }

  function readAuthRuntimeConfig() {
    const explicit = window.ccgAuthRuntimeConfig &&
      typeof window.ccgAuthRuntimeConfig === 'object' &&
      !Array.isArray(window.ccgAuthRuntimeConfig)
      ? window.ccgAuthRuntimeConfig
      : null;

    const source = explicit || readLocalPilotConfig() || {};
    return {
      provider: clean(source.provider).toLowerCase() === CCG_PROVIDER ? CCG_PROVIDER : 'supabase'
    };
  }

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

  const runtime = readAuthRuntimeConfig();
  if (runtime.provider === CCG_PROVIDER) {
    window.__ccgAuthSupabaseBootstrapSuppressed = true;
    window.CCG_AUTH_SUPABASE_READY = Promise.resolve(false);
    return;
  }

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
