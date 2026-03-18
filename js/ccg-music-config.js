(function () {
  "use strict";

  const DEFAULT_MUSIC_BASE_URL = "https://audio.cheekycommodoregamer.co.uk/";
  const urlCache = new Map();
  const probeCache = new Map();
  let missingConfigWarningShown = false;

  function ensureTrailingSlash(value, fallback) {
    const trimmed = String(value || "").trim() || fallback;
    return trimmed.endsWith("/") ? trimmed : `${trimmed}/`;
  }

  function getConfig() {
    const configuredBaseUrl = window.CCG_CONFIG && window.CCG_CONFIG.MUSIC_BASE_URL;

    window.CCG_CONFIG = Object.assign({}, window.CCG_CONFIG || {}, {
      MUSIC_BASE_URL: ensureTrailingSlash(configuredBaseUrl, DEFAULT_MUSIC_BASE_URL)
    });

    if (!String(configuredBaseUrl || "").trim() && !missingConfigWarningShown) {
      console.warn("[CCG music] Missing MUSIC_BASE_URL config. Falling back to default custom domain.");
      missingConfigWarningShown = true;
    }

    return window.CCG_CONFIG;
  }

  function normalizeSlug(slug) {
    return String(slug || "")
      .trim()
      .replace(/\.mp3$/i, "")
      .replace(/^\/+|\/+$/g, "");
  }

  function buildUrl(baseUrl, slug) {
    const normalizedSlug = normalizeSlug(slug);
    if (!normalizedSlug) return "";
    return `${ensureTrailingSlash(baseUrl, DEFAULT_MUSIC_BASE_URL)}${normalizedSlug}.mp3`;
  }

  async function canLoad(url) {
    if (!url) return false;
    if (probeCache.has(url)) return probeCache.get(url);

    const request = fetch(url, { method: "HEAD", cache: "force-cache" })
      .then((response) => response.ok)
      .catch(() => false);

    probeCache.set(url, request);
    const ok = await request;
    probeCache.set(url, ok);
    return ok;
  }

  async function resolveGameMusicUrl(slug) {
    const normalizedSlug = normalizeSlug(slug);
    if (!normalizedSlug) return "";

    if (urlCache.has(normalizedSlug)) {
      return urlCache.get(normalizedSlug);
    }

    const resolved = (async () => {
      const config = getConfig();
      const primaryUrl = buildUrl(config.MUSIC_BASE_URL, normalizedSlug);
      if (!primaryUrl) {
        return "";
      }

      return (await canLoad(primaryUrl)) ? primaryUrl : "";
    })();

    urlCache.set(normalizedSlug, resolved);
    const finalUrl = await resolved;
    urlCache.set(normalizedSlug, finalUrl);
    return finalUrl;
  }

  getConfig();

  window.CCGMusic = Object.assign({}, window.CCGMusic || {}, {
    normalizeSlug,
    resolveGameMusicUrl,
    buildPrimaryUrl(slug) {
      return buildUrl(getConfig().MUSIC_BASE_URL, slug);
    }
  });
})();
