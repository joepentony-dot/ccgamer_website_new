(function (global) {
  const COMPOSER_CANONICAL = {
    "chris hulsbeck": "Chris Hülsbeck",
    "chris huelsbeck": "Chris Hülsbeck",
    "chris hülsbeck": "Chris Hülsbeck",
    "clint bajakain": "Clint Bajakian",
    "oisten eide": "Oisten Eide"
  };
  const MUSIC_HUB_OMEGA_STYLES = "/resources/css/music-hub-omega.css";

  // Unicode transliteration and punctuation handling must match scripts/composer-utils.js exactly.
  function normalizeComposerName(name) {
    if (!name) return "";

    return String(name)
      .toLowerCase()
      .replace(/ø/g, "o")
      .replace(/ł/g, "l")
      .replace(/[đð]/g, "d")
      .replace(/þ/g, "th")
      .replace(/æ/g, "ae")
      .replace(/œ/g, "oe")
      .replace(/ß/g, "ss")
      .replace(/[’‘]/g, "'")
      .replace(/&/g, " and ")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }


const COMPOSER_NAME_SUFFIXES = new Set(["jr", "sr", "ii", "iii", "iv"]);

function shouldFileComposerByFullName(value) {
  const raw = String(value || "").trim();
  const normalized = normalizeComposerName(raw);
  if (!normalized || !normalized.includes(" ")) return true;
  return /\d/.test(raw) || /(?:^|\s)(?:and|of|the)(?:\s|$)/i.test(raw) || /[&+]/.test(raw);
}

function getComposerSortKey(value) {
  const canonical = getCanonicalComposer(value) || String(value || "").trim();
  const parts = canonical.split(/\s+/).filter(Boolean);
  if (parts.length <= 1 || shouldFileComposerByFullName(canonical)) {
    return normalizeComposerName(canonical);
  }

  let surnameIndex = parts.length - 1;
  while (surnameIndex > 0 && COMPOSER_NAME_SUFFIXES.has(normalizeComposerName(parts[surnameIndex]))) {
    surnameIndex -= 1;
  }

  const surname = normalizeComposerName(parts[surnameIndex]);
  const remainder = normalizeComposerName([
    ...parts.slice(0, surnameIndex),
    ...parts.slice(surnameIndex + 1)
  ].join(" "));
  return [surname, remainder].filter(Boolean).join(" ");
}

function getComposerSortLetter(value) {
  const first = getComposerSortKey(value).charAt(0).toUpperCase();
  return /^[A-Z]$/.test(first) ? first : "#";
}

function compareComposerNames(a, b) {
  return getComposerSortKey(a).localeCompare(getComposerSortKey(b), "en", { sensitivity: "base" }) ||
    normalizeComposerName(a).localeCompare(normalizeComposerName(b), "en", { sensitivity: "base" });
}


  function getCanonicalComposer(name) {
    const normalized = normalizeComposerName(name);
    return COMPOSER_CANONICAL[normalized] || String(name || "").trim();
  }

  function isMusicHub() {
    if (typeof document === "undefined") return false;
    return document.documentElement?.getAttribute("data-ccg-page") === "music-hub"
      || Boolean(document.querySelector(".ccg-music-hub"));
  }

  function loadMusicHubOmegaStyles() {
    if (!isMusicHub()) return;
    if (document.querySelector('link[data-ccg-music-hub-omega]')) return;

    const stylesheet = document.createElement("link");
    stylesheet.rel = "stylesheet";
    stylesheet.href = MUSIC_HUB_OMEGA_STYLES;
    stylesheet.setAttribute("data-ccg-music-hub-omega", "true");
    document.head.appendChild(stylesheet);
  }

  function setMusicHubAccordionState(group, isOpen, persist = true) {
    if (!(group instanceof Element)) return;
    const button = group.querySelector(":scope > .composer-accordion__header");
    const body = group.querySelector(":scope > .composer-accordion__body");
    if (!button || !body) return;

    const open = Boolean(isOpen);
    group.classList.toggle("is-open", open);
    button.setAttribute("aria-expanded", open ? "true" : "false");
    body.hidden = !open;
    if (persist) {
      group.dataset.ccgUserOpen = open ? "true" : "false";
    }
  }

  function prepareMusicHubAccordionGroup(group) {
    if (!(group instanceof Element)) return;
    const button = group.querySelector(":scope > .composer-accordion__header");
    const count = group.querySelector(":scope > .composer-accordion__header .composer-accordion__count");
    if (!button) return;

    if (!group.dataset.ccgUserOpen) {
      group.dataset.ccgUserOpen = button.getAttribute("aria-expanded") === "true" ? "true" : "false";
    }
    if (count && !count.dataset.ccgTotalCount) {
      count.dataset.ccgTotalCount = String(count.textContent || "").trim();
    }
  }

  function patchJulieDunnHubChip(accordion) {
    if (!(accordion instanceof Element)) return;
    const link = accordion.querySelector('a[href="/music/david-dunn/"], a[href$="/music/david-dunn/"]');
    if (!(link instanceof HTMLAnchorElement)) return;

    const count = link.querySelector("span");
    const countText = count ? String(count.textContent || "").trim() : "";
    link.textContent = "Julie Dunn";
    if (countText) {
      const countNode = document.createElement("span");
      countNode.textContent = countText;
      link.appendChild(countNode);
    }
    link.dataset.ccgSearch = normalizeComposerName("Julie Dunn David Dunn");
    link.setAttribute("aria-label", "Julie Dunn, historically credited as David Dunn");
  }

  function getMusicHubChipSearchText(chip) {
    if (!(chip instanceof Element)) return "";
    const stored = String(chip.dataset.ccgSearch || "").trim();
    if (stored) return stored;

    const href = chip instanceof HTMLAnchorElement ? String(chip.getAttribute("href") || "") : "";
    const aliases = href.endsWith("/music/david-dunn/") ? " David Dunn Julie Dunn" : "";
    const value = normalizeComposerName(`${chip.textContent || ""}${aliases}`);
    chip.dataset.ccgSearch = value;
    return value;
  }

  function applyMusicHubAccordionSearch(accordion, searchInput) {
    if (!(accordion instanceof Element) || !(searchInput instanceof HTMLInputElement)) return;
    const query = normalizeComposerName(searchInput.value);

    accordion.querySelectorAll(".composer-accordion__group").forEach((group) => {
      prepareMusicHubAccordionGroup(group);
      const chips = Array.from(group.querySelectorAll(".ccg-composer-chip"));
      let matches = 0;

      chips.forEach((chip) => {
        const visible = !query || getMusicHubChipSearchText(chip).includes(query);
        chip.hidden = !visible;
        if (visible) matches += 1;
      });

      const count = group.querySelector(":scope > .composer-accordion__header .composer-accordion__count");
      if (count) {
        count.textContent = query ? String(matches) : (count.dataset.ccgTotalCount || String(chips.length));
      }

      group.hidden = Boolean(query && matches === 0);
      if (query && matches > 0) {
        setMusicHubAccordionState(group, true, false);
      } else if (!query) {
        setMusicHubAccordionState(group, group.dataset.ccgUserOpen === "true", false);
      }
    });
  }

  function bindMusicHubAccordion() {
    if (!isMusicHub()) return;
    const accordion = document.getElementById("composer-discovery-accordion");
    const searchInput = document.getElementById("composer-discovery-search");
    if (!(accordion instanceof Element) || !(searchInput instanceof HTMLInputElement)) return;

    patchJulieDunnHubChip(accordion);
    accordion.querySelectorAll(".composer-accordion__group").forEach(prepareMusicHubAccordionGroup);

    if (accordion.dataset.ccgOmegaAccordionBound !== "true") {
      accordion.dataset.ccgOmegaAccordionBound = "true";
      accordion.addEventListener("click", (event) => {
        const target = event.target instanceof Element
          ? event.target.closest(".composer-accordion__header")
          : null;
        if (!(target instanceof HTMLButtonElement) || !accordion.contains(target)) return;

        const group = target.closest(".composer-accordion__group");
        if (!(group instanceof Element)) return;
        const nextOpen = target.getAttribute("aria-expanded") !== "true";
        setMusicHubAccordionState(group, nextOpen, true);
      });
    }

    if (searchInput.dataset.ccgOmegaSearchBound !== "true") {
      searchInput.dataset.ccgOmegaSearchBound = "true";
      let frame = 0;
      searchInput.addEventListener("input", () => {
        if (frame && typeof cancelAnimationFrame === "function") cancelAnimationFrame(frame);
        const apply = () => {
          frame = 0;
          applyMusicHubAccordionSearch(accordion, searchInput);
        };
        if (typeof requestAnimationFrame === "function") {
          frame = requestAnimationFrame(apply);
        } else {
          window.setTimeout(apply, 0);
        }
      });
    }

    applyMusicHubAccordionSearch(accordion, searchInput);
  }

  function ensureJonHareFeaturedCard(grid) {
    if (!(grid instanceof Element)) return;
    if (grid.querySelector('[data-slug="jon-hare"]')) return;

    const card = document.createElement("a");
    card.href = `${resolveMusicHubSiteRoot()}music/jon-hare/`;
    card.className = "composer-card composer-card--featured";
    card.dataset.slug = "jon-hare";
    card.innerHTML = `
      <div class="composer-thumb"><img src="/resources/images/composers/jon-hare.webp" alt="Jon Hare" loading="lazy"></div>
      <div class="composer-info">
        <h3>Jon Hare</h3>
        <p class="composer-platform">AMIGA</p>
        <p class="composer-count">4 Tracks</p>
      </div>
    `;
    grid.appendChild(card);
  }

  function resolveMusicHubSiteRoot() {
    const root = typeof global.ccgGetSiteRoot === "function" ? global.ccgGetSiteRoot() : "/";
    return root.endsWith("/") ? root : `${root}/`;
  }

  function lockMusicHubFeaturedGrid() {
    if (!isMusicHub()) return;
    const grid = document.querySelector(".composer-grid-featured");
    if (!(grid instanceof Element)) return;

    const featuredCount = grid.querySelectorAll(".composer-card--featured").length;
    const editorialReady = grid.dataset.ccgFeaturedManifest === "restored-20" || featuredCount >= 20;
    if (!editorialReady) return;

    ensureJonHareFeaturedCard(grid);
    const expandedFeaturedCount = grid.querySelectorAll(".composer-card--featured").length;
    if (expandedFeaturedCount < 21) return;

    grid.dataset.ccgFeaturedManifest = "omega-21";
    grid.classList.add("composer-grid-featured-omega");
    grid.classList.remove("composer-grid-featured");
    grid.dataset.ccgOmegaRuntimeLocked = "true";
  }

  function initMusicHubOmega() {
    if (!isMusicHub()) return;
    loadMusicHubOmegaStyles();
    lockMusicHubFeaturedGrid();
    bindMusicHubAccordion();
    document.documentElement.classList.add("ccg-music-hub-omega-ready");
  }

  function loadTrackShareAssets() {
    if (typeof document === "undefined") return;

    const isComposerPage = document.documentElement?.getAttribute("data-ccg-page") === "music-composer"
      || Boolean(document.querySelector(".ccg-composer-page"));
    if (!isComposerPage) return;

    if (!document.querySelector('link[data-ccg-music-track-share]')) {
      const stylesheet = document.createElement("link");
      stylesheet.rel = "stylesheet";
      stylesheet.href = "/resources/css/music-track-share.css";
      stylesheet.setAttribute("data-ccg-music-track-share", "true");
      document.head.appendChild(stylesheet);
    }

    if (!document.querySelector('script[data-ccg-music-track-share]')) {
      const script = document.createElement("script");
      script.src = "/js/music-track-share.js";
      script.setAttribute("data-ccg-music-track-share", "true");
      document.body.appendChild(script);
    }
  }

  global.normalizeComposerName = normalizeComposerName;
  global.getCanonicalComposer = getCanonicalComposer;
  global.getComposerSortKey = getComposerSortKey;
  global.getComposerSortLetter = getComposerSortLetter;
  global.compareComposerNames = compareComposerNames;
  global.COMPOSER_CANONICAL = COMPOSER_CANONICAL;
  global.CCGMusicHubOmega = Object.assign({}, global.CCGMusicHubOmega || {}, {
    refresh: initMusicHubOmega,
    refreshAccordion: bindMusicHubAccordion
  });

  loadTrackShareAssets();
  loadMusicHubOmegaStyles();

  if (isMusicHub()) {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", initMusicHubOmega, { once: true });
    } else {
      initMusicHubOmega();
    }
  }
})(window);