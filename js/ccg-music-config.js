(function () {
  "use strict";

  const DEFAULT_MUSIC_BASE_URL = "https://pub-2f6ac7261f6347f59524930d84e71a92.r2.dev/";
  const DEFAULT_LOCAL_MUSIC_PATH = "/resources/audio/games/";
  const urlCache = new Map();
  const probeCache = new Map();

  function ensureTrailingSlash(value, fallback) {
    const trimmed = String(value || "").trim() || fallback;
    return trimmed.endsWith("/") ? trimmed : `${trimmed}/`;
  }

  window.CCG_CONFIG = Object.assign({}, window.CCG_CONFIG || {}, {
    MUSIC_BASE_URL: ensureTrailingSlash(window.CCG_CONFIG && window.CCG_CONFIG.MUSIC_BASE_URL, DEFAULT_MUSIC_BASE_URL),
    MUSIC_FALLBACK_PATH: ensureTrailingSlash(window.CCG_CONFIG && window.CCG_CONFIG.MUSIC_FALLBACK_PATH, DEFAULT_LOCAL_MUSIC_PATH)
  });

  function normalizeSlug(slug) {
    return String(slug || "")
      .trim()
      .replace(/\.mp3$/i, "")
      .replace(/^\/+|\/+$/g, "");
  }

  function buildUrl(baseUrl, slug) {
    return `${ensureTrailingSlash(baseUrl, DEFAULT_MUSIC_BASE_URL)}${slug}.mp3`;
  }

  function buildFallbackUrl(slug) {
    return buildUrl(window.CCG_CONFIG.MUSIC_FALLBACK_PATH, slug);
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
      const primaryUrl = buildUrl(window.CCG_CONFIG.MUSIC_BASE_URL, normalizedSlug);
      if (await canLoad(primaryUrl)) {
        return primaryUrl;
      }

      const fallbackUrl = buildFallbackUrl(normalizedSlug);
      if (fallbackUrl !== primaryUrl && await canLoad(fallbackUrl)) {
        return fallbackUrl;
      }

      return "";
    })();

    urlCache.set(normalizedSlug, resolved);
    const finalUrl = await resolved;
    urlCache.set(normalizedSlug, finalUrl);
    return finalUrl;
  }

  window.CCGMusic = Object.assign({}, window.CCGMusic || {}, {
    normalizeSlug,
    resolveGameMusicUrl,
    buildPrimaryUrl(slug) {
      const normalizedSlug = normalizeSlug(slug);
      return normalizedSlug ? buildUrl(window.CCG_CONFIG.MUSIC_BASE_URL, normalizedSlug) : "";
    },
    buildFallbackUrl(slug) {
      const normalizedSlug = normalizeSlug(slug);
      return normalizedSlug ? buildFallbackUrl(normalizedSlug) : "";
    }
  });
})();
