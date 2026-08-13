(function () {
  "use strict";

  const DEFAULT_MUSIC_BASE_URL = "https://pub-2f6ac7261f6347f59524930d84e71a92.r2.dev/";
  const MUSIC_NAVIGATION_SCRIPT = "/js/ccg-music-navigation.js";
  const LEGACY_COMPOSER_PATH = "/music/composer.html";
  const EDITORIAL_FEATURED_COMPOSERS = [
    { slug: "allister-brimble", name: "Allister Brimble", platform: "AMIGA / C64", tracks: 12, image: "/resources/images/composers/allister-brimble.jpg" },
    { slug: "barry-leitch", name: "Barry Leitch", platform: "AMIGA / C64", tracks: 8, image: "/resources/images/composers/barry-leitch.jpg" },
    { slug: "ben-daglish", name: "Ben Daglish", platform: "C64", tracks: 16, image: "/resources/images/composers/ben-daglish.jpg" },
    { slug: "chris-huelsbeck", name: "Chris Hülsbeck", platform: "AMIGA / C64", tracks: 6, image: "/resources/images/composers/chris-huelsbeck.jpg" },
    { slug: "david-dunn", name: "Julie Dunn", platform: "C64", tracks: 6, image: "/resources/images/composers/david-dunn.webp" },
    { slug: "david-whittaker", name: "David Whittaker", platform: "AMIGA / C64", tracks: 22, image: "/resources/images/composers/david-whittaker.jpg" },
    { slug: "fred-gray", name: "Fred Gray", platform: "C64", tracks: 13, image: "/resources/images/composers/fred-gray.jpg" },
    { slug: "martin-galway", name: "Martin Galway", platform: "C64", tracks: 17, image: "/resources/images/composers/martin-galway.jpg" },
    { slug: "rob-hubbard", name: "Rob Hubbard", platform: "AMIGA / C64", tracks: 32, image: "/resources/images/composers/rob-hubbard.jpg" },
    { slug: "jeroen-tel", name: "Jeroen Tel", platform: "AMIGA / C64", tracks: 9, image: "/resources/images/composers/jeroen-tel.jpg" },
    { slug: "jonathan-dunn", name: "Jonathan Dunn", platform: "AMIGA / C64", tracks: 11, image: "/resources/images/composers/jonathan-dunn.jpg" },
    { slug: "keith-tinman", name: "Keith Tinman", platform: "AMIGA / C64", tracks: 6, image: "/resources/images/composers/keith-tinman.jpg" },
    { slug: "mark-cooksey", name: "Mark Cooksey", platform: "C64", tracks: 9, image: "/resources/images/composers/mark-cooksey.jpg" },
    { slug: "matt-furniss", name: "Matt Furniss", platform: "C64", tracks: 6, image: "/resources/images/composers/matt-furniss.png" },
    { slug: "matt-gray", name: "Matt Gray", platform: "C64", tracks: 5, image: "/resources/images/composers/matt-gray.jpg" },
    { slug: "neil-brennan", name: "Neil Brennan", platform: "C64", tracks: 7, image: "/resources/images/composers/neil-brennan.jpg" },
    { slug: "richard-joseph", name: "Richard Joseph", platform: "AMIGA / C64", tracks: 17, image: "/resources/images/composers/richard-joseph.jpg" },
    { slug: "russell-lieblich", name: "Russell Lieblich", platform: "C64", tracks: 8, image: "/resources/images/composers/russell-lieblich.png" },
    { slug: "steve-turner", name: "Steve Turner", platform: "AMIGA / C64", tracks: 4, image: "/resources/images/composers/steve-turner.webp" },
    { slug: "paul-norman", name: "Paul Norman", platform: "C64", tracks: 4, image: "/resources/images/composers/paul-norman.webp" }
  ];

  const FEATURED_SIGNATURE = EDITORIAL_FEATURED_COMPOSERS
    .map((composer) => composer.slug)
    .join("|");
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

  function getComposerWebpPath(slug) {
    return `/resources/images/composers/${slug}.webp`;
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

  function getFeaturedGrid(root = document) {
    if (root instanceof Element) {
      if (root.matches(".composer-grid-featured")) return root;
      const descendant = root.querySelector(".composer-grid-featured");
      if (descendant) return descendant;
      return root.closest(".composer-grid-featured");
    }

    return document.querySelector(".composer-grid-featured");
  }

  function getFeaturedGridSignature(grid) {
    if (!(grid instanceof Element)) return "";
    return Array.from(grid.querySelectorAll(".composer-card--featured"))
      .map((card) => String(card.getAttribute("data-slug") || "").trim())
      .join("|");
  }

  function bindFeaturedImageFallbacks(grid) {
    if (!(grid instanceof Element)) return;

    grid.querySelectorAll(".composer-card--featured img[data-fallback-src]").forEach((image) => {
      if (!(image instanceof HTMLImageElement)) return;
      if (image.dataset.ccgWebpFallbackBound === "true") return;

      image.dataset.ccgWebpFallbackBound = "true";
      image.addEventListener("error", () => {
        const fallback = String(image.dataset.fallbackSrc || "").trim();
        if (!fallback || image.getAttribute("src") === fallback) return;
        image.setAttribute("src", fallback);
      });
    });
  }

  function ensureEditorialFeaturedComposers(root = document) {
    const grid = getFeaturedGrid(root);
    if (!grid) return;
    if (getFeaturedGridSignature(grid) === FEATURED_SIGNATURE) {
      bindFeaturedImageFallbacks(grid);
      return;
    }

    grid.innerHTML = EDITORIAL_FEATURED_COMPOSERS.map((composer) => `
      <a href="${resolveSiteRoot()}music/${composer.slug}/" class="composer-card composer-card--featured" data-slug="${composer.slug}">
        <div class="composer-thumb"><img src="${getComposerWebpPath(composer.slug)}" data-fallback-src="${composer.image}" alt="${composer.name}" loading="lazy"></div>
        <div class="composer-info">
          <h3>${composer.name}</h3>
          <p class="composer-platform">${composer.platform}</p>
          <p class="composer-count">${composer.tracks} Tracks</p>
        </div>
      </a>
    `).join("");
    grid.dataset.ccgFeaturedManifest = "restored-20";
    bindFeaturedImageFallbacks(grid);
  }

  function ensureEditorialComposerProfileImage(root = document) {
    const page = document.querySelector("[data-composer-slug]");
    if (!(page instanceof Element)) return;

    const slug = String(page.getAttribute("data-composer-slug") || "").trim();
    if (!slug) return;

    const composer = EDITORIAL_FEATURED_COMPOSERS.find((entry) => entry.slug === slug);
    const composerName = String(
      page.getAttribute("data-composer-name") ||
      composer?.name ||
      slug.replace(/-/g, " ")
    ).trim();

    const profile = page.querySelector('[data-ccg-research-profile="true"], .ccg-composer-profile');
    if (!(profile instanceof Element)) return;

    const base = `/resources/images/composers/${slug}`;
    const legacyImage = String(composer?.image || "").trim();
    const candidates = [
      `${base}.webp`,
      legacyImage,
      `${base}.jpg`,
      `${base}.jpeg`,
      `${base}.png`
    ].filter((value, index, values) => value && values.indexOf(value) === index);
    const probeSignature = candidates.join("|");

    if (profile.dataset.ccgComposerImageProbe === probeSignature) return;
    profile.dataset.ccgComposerImageProbe = probeSignature;

    const applyImage = (src) => {
      if (!profile.isConnected) return;

      let image = profile.querySelector(".ccg-composer-profile__image");
      if (!image) {
        image = document.createElement("img");
        image.className = "ccg-composer-profile__image";
        image.loading = "lazy";
        profile.insertAdjacentElement("afterbegin", image);
      }

      image.setAttribute("src", src);
      image.setAttribute("alt", composerName);
      profile.classList.remove("ccg-composer-profile--text-only");
      profile.dataset.ccgComposerImageState = "loaded";
    };

    const keepTextOnly = () => {
      if (!profile.isConnected) return;
      if (!profile.querySelector(".ccg-composer-profile__image")) {
        profile.classList.add("ccg-composer-profile--text-only");
      }
      profile.dataset.ccgComposerImageState = "missing";
    };

    const tryCandidate = (index) => {
      if (index >= candidates.length) {
        keepTextOnly();
        return;
      }

      const src = candidates[index];
      const probe = new Image();
      probe.onload = () => applyImage(src);
      probe.onerror = () => tryCandidate(index + 1);
      probe.src = src;
    };

    tryCandidate(0);
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
    if (card.dataset.ccgTrackState === "unavailable") return;

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
    if (card.classList.contains("ccg-composer-games__item--static")) return;

    const status = card.querySelector(".ccg-composer-game-status");
    if (!status) return;

    const audio = card.querySelector("audio");
    if (!(audio instanceof HTMLAudioElement)) return;

    const sourceUrl = getAudioSource(audio);
    if (!sourceUrl) return;

    if (card.dataset.ccgTrackProbeSource === sourceUrl && card.dataset.ccgTrackState === "ready") {
      return;
    }

    card.dataset.ccgTrackProbeSource = sourceUrl;
    markComposerTrackReady(card, status);

    if (audio.dataset.ccgComposerAvailabilityBound !== "true") {
      audio.dataset.ccgComposerAvailabilityBound = "true";
      audio.addEventListener("error", () => {
        if (!card.isConnected) return;
        if (getAudioSource(audio) !== sourceUrl) return;
        markComposerTrackUnavailable(card, status);
      }, { once: true });
    }

    audio.preload = "metadata";
    try { audio.load(); } catch (_) {}
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
    if (!sourceUrl) return;

    if (track.dataset.ccgTrackProbeSource === sourceUrl) return;
    track.dataset.ccgTrackProbeSource = sourceUrl;
    track.hidden = false;

    if (audio.dataset.ccgComposerAvailabilityBound !== "true") {
      audio.dataset.ccgComposerAvailabilityBound = "true";
      audio.addEventListener("error", () => {
        if (!track.isConnected) return;
        if (getAudioSource(audio) !== sourceUrl) return;
        track.remove();
      }, { once: true });
    }

    audio.preload = "metadata";
    try { audio.load(); } catch (_) {}
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
    ensureEditorialFeaturedComposers(document);
    ensureEditorialComposerProfileImage(document);

    if (!composerLinkObserver && document.body) {
      composerLinkObserver = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          mutation.addedNodes.forEach((node) => {
            if (!(node instanceof Element)) return;
            rewriteLegacyComposerLinks(node);
            verifyEssentialTracks(node);
            ensureEditorialFeaturedComposers(document);
            ensureEditorialComposerProfileImage(document);
          });
        });
      });
      composerLinkObserver.observe(document.body, { childList: true, subtree: true });
    }

    const gamesList = document.getElementById("composer-games");
    if (gamesList && !composerCardObserver) {
      composerCardObserver = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          mutation.addedNodes.forEach((node) => {
            if (!(node instanceof Element)) return;
            if (node.matches(".ccg-composer-games__item")) {
              verifyComposerTrackCard(node);
              return;
            }
            node.querySelectorAll(".ccg-composer-games__item").forEach(verifyComposerTrackCard);
          });
        });
      });
      composerCardObserver.observe(gamesList, { childList: true });
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