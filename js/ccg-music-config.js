(function () {
  "use strict";

  const DEFAULT_MUSIC_BASE_URL = "https://pub-2f6ac7261f6347f59524930d84e71a92.r2.dev/";
  const MUSIC_NAVIGATION_SCRIPT = "/js/ccg-music-navigation.js";
  const LEGACY_COMPOSER_PATH = "/music/composer.html";

  const urlCache = new Map();
  const probeCache = new Map();
  let missingConfigWarningShown = false;
  let composerLinkObserver = null;
  let composerCardObserver = null;

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

  function probeAudioUrl(url, options = {}) {
    const normalizedUrl = String(url || "").trim();
    if (!normalizedUrl) return Promise.resolve(false);
    if (probeCache.has(normalizedUrl)) return probeCache.get(normalizedUrl);

    const timeoutMs = Number.isFinite(options.timeoutMs) ? options.timeoutMs : 6000;
    const sharedProbe = window.CCGSharedMusicPlayer &&
      typeof window.CCGSharedMusicPlayer._probeAudioMetadata === "function"
      ? window.CCGSharedMusicPlayer._probeAudioMetadata
      : null;

    if (sharedProbe) {
      const sharedResult = Promise.resolve(sharedProbe(normalizedUrl, {
        timeoutMs,
        logCtx: options.logCtx || "[music-config]"
      }))
        .then((result) => Boolean(result && result.ok))
        .catch(() => false);
      probeCache.set(normalizedUrl, sharedResult);
      return sharedResult;
    }

    if (typeof Audio !== "function") {
      return Promise.resolve(true);
    }

    const probe = new Promise((resolve) => {
      const audio = new Audio();
      audio.preload = "metadata";
      audio.src = normalizedUrl;

      let finished = false;
      let timeoutId = null;

      const cleanup = () => {
        audio.removeEventListener("loadedmetadata", onReady);
        audio.removeEventListener("error", onError);
        if (timeoutId) window.clearTimeout(timeoutId);
        try { audio.removeAttribute("src"); } catch (_) {}
      };

      const finish = (available) => {
        if (finished) return;
        finished = true;
        cleanup();
        resolve(Boolean(available));
      };

      const onReady = () => finish(true);
      const onError = () => finish(false);

      audio.addEventListener("loadedmetadata", onReady, { once: true });
      audio.addEventListener("error", onError, { once: true });

      try { audio.load(); } catch (_) {}
      timeoutId = window.setTimeout(() => finish(false), timeoutMs);
    });

    probeCache.set(normalizedUrl, probe);
    return probe;
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
      if (!primaryUrl) return "";

      const available = await probeAudioUrl(primaryUrl, {
        timeoutMs: 6000,
        logCtx: `[game:${normalizedSlug}]`
      });
      return available ? primaryUrl : "";
    })();

    urlCache.set(normalizedSlug, resolved);
    const finalUrl = await resolved;
    urlCache.set(normalizedSlug, finalUrl);
    return finalUrl;
  }

  function transliterateComposerText(value) {
    return String(value || "")
      .toLowerCase()
      .replace(/ø/g, "o")
      .replace(/ł/g, "l")
      .replace(/[đð]/g, "d")
      .replace(/þ/g, "th")
      .replace(/æ/g, "ae")
      .replace(/œ/g, "oe")
      .replace(/ß/g, "ss");
  }

  function normalizeComposerKey(value) {
    return transliterateComposerText(value)
      .trim()
      .replace(/\s+/g, " ")
      .replace(/[’‘]/g, "'")
      .replace(/&/g, " and ")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function composerSlugFromName(value) {
    const key = normalizeComposerKey(value);
    if (!key) return "";

    if (key === "chris hulsbeck" || key === "chris huelsbeck") {
      return "chris-huelsbeck";
    }

    return key.replace(/\s+/g, "-");
  }

  function resolveSiteRoot() {
    const root = typeof window.ccgGetSiteRoot === "function" ? window.ccgGetSiteRoot() : "/";
    return root.endsWith("/") ? root : `${root}/`;
  }

  function rewriteLegacyComposerLink(link) {
    if (!(link instanceof HTMLAnchorElement)) return;
    const rawHref = String(link.getAttribute("href") || "").trim();
    if (!rawHref || !rawHref.includes("composer.html")) return;

    let url;
    try {
      url = new URL(rawHref, window.location.href);
    } catch (_) {
      return;
    }

    if (!url.pathname.endsWith(LEGACY_COMPOSER_PATH)) return;
    const name = String(url.searchParams.get("name") || "").trim();
    if (!name) return;

    const slug = composerSlugFromName(name);
    if (!slug) return;

    link.setAttribute("href", `${resolveSiteRoot()}music/${slug}/`);
  }

  function rewriteLegacyComposerLinks(root = document) {
    if (!root || typeof root.querySelectorAll !== "function") return;
    if (root instanceof HTMLAnchorElement) rewriteLegacyComposerLink(root);
    root.querySelectorAll('a[href*="composer.html"]').forEach(rewriteLegacyComposerLink);
  }

  function repairComposerTrackCard(card) {
    if (!(card instanceof Element)) return;
    const hasAudio = Boolean(card.querySelector("audio"));
    const status = card.querySelector(".ccg-composer-game-status");

    if (hasAudio) {
      card.classList.remove("ccg-composer-games__item--track-unavailable");
      if (status) {
        status.classList.remove("ccg-composer-game-status--unavailable");
      }
      return;
    }

    card.classList.remove("ccg-composer-games__item--has-audio", "is-playing");
    card.classList.add("ccg-composer-games__item--track-unavailable");

    if (status) {
      status.textContent = "Track not yet uploaded";
      status.dataset.readyLabel = "Track not yet uploaded";
      status.dataset.playingLabel = "Track not yet uploaded";
      status.classList.add("ccg-composer-game-status--unavailable");
    }

    card.querySelectorAll(".ccg-composer-game-thumb-overlay, .ccg-track-share, .ccg-composer-audio-wrap").forEach((node) => node.remove());

    const thumb = card.querySelector(".ccg-composer-game-thumb-wrap");
    if (thumb) {
      thumb.removeAttribute("role");
      thumb.removeAttribute("tabindex");
      thumb.removeAttribute("aria-label");
    }
  }

  function repairComposerTrackCards(root = document) {
    if (!root || typeof root.querySelectorAll !== "function") return;
    if (root instanceof Element && root.matches(".ccg-composer-games__item")) {
      repairComposerTrackCard(root);
    }
    root.querySelectorAll(".ccg-composer-games__item").forEach(repairComposerTrackCard);
  }

  function bindComposerIntegrityGuards() {
    rewriteLegacyComposerLinks(document);
    repairComposerTrackCards(document);

    if (!composerLinkObserver && document.body) {
      composerLinkObserver = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          mutation.addedNodes.forEach((node) => {
            if (!(node instanceof Element)) return;
            rewriteLegacyComposerLinks(node);
          });
        });
      });
      composerLinkObserver.observe(document.body, { childList: true, subtree: true });
    }

    const gamesList = document.getElementById("composer-games");
    if (gamesList && !composerCardObserver) {
      composerCardObserver = new MutationObserver(() => repairComposerTrackCards(gamesList));
      composerCardObserver.observe(gamesList, { childList: true, subtree: true });
    }

    document.addEventListener("click", (event) => {
      const link = event.target instanceof Element ? event.target.closest('a[href*="composer.html"]') : null;
      if (link) rewriteLegacyComposerLink(link);
    }, true);
  }

  function ensureMusicNavigation() {
    if (window.CCG_MUSIC_NAVIGATION_READY) return;
    const exists = Array.from(document.scripts).some((script) => {
      const source = script.getAttribute("src") || "";
      try {
        return new URL(source, window.location.origin).pathname === MUSIC_NAVIGATION_SCRIPT;
      } catch (error) {
        return source === MUSIC_NAVIGATION_SCRIPT;
      }
    });
    if (exists) return;

    const script = document.createElement("script");
    script.src = MUSIC_NAVIGATION_SCRIPT;
    script.defer = true;
    script.dataset.ccgMusicNavigationLoader = "true";
    document.body.appendChild(script);
  }

  function init() {
    ensureMusicNavigation();
    bindComposerIntegrityGuards();
  }

  getConfig();

  window.CCGMusic = Object.assign({}, window.CCGMusic || {}, {
    normalizeSlug,
    resolveGameMusicUrl,
    buildPrimaryUrl(slug) {
      return buildUrl(getConfig().MUSIC_BASE_URL, slug);
    },
    probeAudioUrl,
    composerSlugFromName,
    rewriteLegacyComposerLinks,
    repairComposerTrackCards
  });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
