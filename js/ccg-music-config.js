(function () {
  "use strict";

  // ✅ WORKING R2 URL
  const DEFAULT_MUSIC_BASE_URL = "https://pub-2f6ac7261f6347f59524930d84e71a92.r2.dev/";

  const urlCache = new Map();
  const availabilityCache = new Map();
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
      console.warn("[CCG music] Missing MUSIC_BASE_URL config. Falling back to R2 public URL.");
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

  async function musicExists(url) {
    if (!url) return false;

    if (availabilityCache.has(url)) {
      return availabilityCache.get(url);
    }

    const request = (async () => {
      try {
        const response = await fetch(url, {
          method: "HEAD",
          cache: "no-store"
        });

        if (response.ok) {
          return true;
        }
      } catch (error) {
        console.warn("[CCG music] Music HEAD check failed, attempting fallback GET.", url, error);
      }

      try {
        const response = await fetch(url, {
          method: "GET",
          headers: { Range: "bytes=0-1" },
          cache: "no-store"
        });
        return response.ok;
      } catch (error) {
        console.error("[CCG music] Music GET fallback failed.", url, error);
        return false;
      }
    })();

    availabilityCache.set(url, request);
    const exists = await request;
    availabilityCache.set(url, exists);
    return exists;
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

      const exists = await musicExists(primaryUrl);
      return exists ? primaryUrl : "";
    })();

    urlCache.set(normalizedSlug, resolved);
    const finalUrl = await resolved;
    urlCache.set(normalizedSlug, finalUrl);
    return finalUrl;
  }

  getConfig();

  window.CCGMusic = Object.assign({}, window.CCGMusic || {}, {
    normalizeSlug,
    musicExists,
    resolveGameMusicUrl,
    buildPrimaryUrl(slug) {
      return buildUrl(getConfig().MUSIC_BASE_URL, slug);
    }
  });
})();
