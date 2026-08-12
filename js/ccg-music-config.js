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

    const primaryUrl = buildUrl(getConfig().MUSIC_BASE_URL, normalizedSlug);
    urlCache.set(normalizedSlug, primaryUrl || "");
    return primaryUrl || "";
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

  function getAudioSource(audio) {
    if (!(audio instanceof HTMLAudioElement)) return "";
    const source = audio.querySelector("source[src]");
    return String(source?.getAttribute("src") || audio.currentSrc || audio.getAttribute("src") || "").trim();
  }

  function setComposerTrackUtilitiesHidden(card, hidden) {
    if (!(card instanceof Element)) return;
    card.querySelectorAll(".ccg-composer-game-thumb-overlay, .ccg-track-share, .ccg-composer-audio-wrap").forEach((node) => {
      node.hidden = Boolean(hidden);
    });
  }

  function markComposerTrackReady(card, status) {
    if (!(card instanceof Element)) return;
    card.dataset.ccgTrackState = "ready";
    card.classList.remove("ccg-composer-games__item--track-unavailable", "ccg-composer-games__item--track-checking");
    card.classList.add("ccg-composer-games__item--has-audio");

    if (status) {
      status.textContent = "Track ready";
      status.dataset.readyLabel = "Track ready";
      status.dataset.playingLabel = "Now playing";
      status.classList.remove("ccg-composer-game-status--unavailable");
    }

    setComposerTrackUtilitiesHidden(card, false);
  }

  function markComposerTrackUnavailable(card, status) {
    if (!(card instanceof Element)) return;
    card.dataset.ccgTrackState = "unavailable";
    card.classList.remove("ccg-composer-games__item--has-audio", "ccg-composer-games__item--track-checking", "is-playing");
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

  function verifyComposerTrackCard(card) {
    if (!(card instanceof Element)) return;

    // Generated composer pages ship static SEO fallback rows. Leave those intact
    // until music-composer-pages.js replaces them with interactive cards.
    if (card.classList.contains("ccg-composer-games__item--static")) return;

    const status = card.querySelector(".ccg-composer-game-status");
    if (!status) return;

    const audio = card.querySelector("audio");
    if (!(audio instanceof HTMLAudioElement)) {
      markComposerTrackUnavailable(card, status);
      return;
    }

    const sourceUrl = getAudioSource(audio);
    if (!sourceUrl) {
      markComposerTrackUnavailable(card, status);
      return;
    }

    if (card.dataset.ccgTrackProbeSource === sourceUrl &&
        (card.dataset.ccgTrackState === "checking" || card.dataset.ccgTrackState === "ready")) {
      return;
    }

    card.dataset.ccgTrackProbeSource = sourceUrl;
    card.dataset.ccgTrackState = "checking";
    card.classList.remove("ccg-composer-games__item--track-unavailable");
    card.classList.add("ccg-composer-games__item--track-checking");
    status.textContent = "Checking track…";
    status.dataset.readyLabel = "Track ready";
    status.dataset.playingLabel = "Now playing";
    status.classList.remove("ccg-composer-game-status--unavailable");
    setComposerTrackUtilitiesHidden(card, true);

    void probeAudioUrl(sourceUrl, {
      timeoutMs: 6000,
      logCtx: `[composer-card:${normalizeSlug(sourceUrl)}]`
    }).then((available) => {
      if (!card.isConnected) return;

      const currentAudio = card.querySelector("audio");
      const currentSource = getAudioSource(currentAudio);
      if (currentSource !== sourceUrl) return;

      if (available) {
        markComposerTrackReady(card, status);
      } else {
        markComposerTrackUnavailable(card, status);
      }
    }).catch(() => {
      if (card.isConnected) {
        markComposerTrackUnavailable(card, status);
      }
    });
  }

  function verifyComposerTrackCards(root = document) {
    if (!root || typeof root.querySelectorAll !== "function") return;
    if (root instanceof Element && root.matches(".ccg-composer-games__item")) {
      verifyComposerTrackCard(root);
    }
    root.querySelectorAll(".ccg-composer-games__item").forEach(verifyComposerTrackCard);
  }

  function verifyEssentialTrack(track) {
    if (!(track instanceof Element)) return;
    const audio = track.querySelector("audio");
    if (!(audio instanceof HTMLAudioElement)) return;

    const sourceUrl = getAudioSource(audio);
    if (!sourceUrl) {
      track.remove();
      return;
    }

    if (track.dataset.ccgTrackProbeSource === sourceUrl) return;
    track.dataset.ccgTrackProbeSource = sourceUrl;
    track.hidden = true;

    void probeAudioUrl(sourceUrl, {
      timeoutMs: 6000,
      logCtx: `[composer-essential:${normalizeSlug(sourceUrl)}]`
    }).then((available) => {
      if (!track.isConnected) return;
      if (available) {
        track.hidden = false;
      } else {
        track.remove();
      }
    }).catch(() => {
      if (track.isConnected) track.remove();
    });
  }

  function verifyEssentialTracks(root = document) {
    if (!root || typeof root.querySelectorAll !== "function") return;
    if (root instanceof Element && root.matches(".ccg-essential-track")) {
      verifyEssentialTrack(root);
    }
    root.querySelectorAll(".ccg-essential-track").forEach(verifyEssentialTrack);
  }

  function bindComposerIntegrityGuards() {
    rewriteLegacyComposerLinks(document);
    verifyComposerTrackCards(document);
    verifyEssentialTracks(document);

    if (!composerLinkObserver && document.body) {
      composerLinkObserver = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          mutation.addedNodes.forEach((node) => {
            if (!(node instanceof Element)) return;
            rewriteLegacyComposerLinks(node);
            verifyEssentialTracks(node);
          });
        });
      });
      composerLinkObserver.observe(document.body, { childList: true, subtree: true });
    }

    const gamesList = document.getElementById("composer-games");
    if (gamesList && !composerCardObserver) {
      composerCardObserver = new MutationObserver(() => verifyComposerTrackCards(gamesList));
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
    repairComposerTrackCards: verifyComposerTrackCards
  });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
