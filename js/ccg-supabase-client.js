(function () {
  const SUPABASE_CDN = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js';
  let loadPromise = null;
  let client = null;

  function loadSupabaseLibrary() {
    if (window.supabase && typeof window.supabase.createClient === 'function') {
      return Promise.resolve();
    }

    if (loadPromise) return loadPromise;

    loadPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = SUPABASE_CDN;
      script.async = true;
      script.defer = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Unable to load Supabase library from CDN.'));
      document.head.appendChild(script);
    });

    return loadPromise;
  }

  async function getClient() {
    if (client) return client;

    await loadSupabaseLibrary();

    if (!window.CCG_SUPABASE_URL || !window.CCG_SUPABASE_ANON_KEY) {
      throw new Error('Missing Supabase config. Update /js/ccg-supabase-config.js first.');
    }

    client = window.supabase.createClient(
      window.CCG_SUPABASE_URL,
      window.CCG_SUPABASE_ANON_KEY,
      {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true
        }
      }
    );

    return client;
  }

  window.ccgSupabase = {
    getClient
  };
})();
