/* ============================================================
   CCG MUSIC HEADER BOOTSTRAP
   ------------------------------------------------------------
   Adds the established public header to music pages that were
   built with local breadcrumbs only. The bootstrap owns the
   drawer and mode controls because it may load after the normal
   DOMContentLoaded event on generated and curated music pages.
============================================================ */

(function () {
    "use strict";

    if (window.CCG_MUSIC_NAVIGATION_READY) return;
    window.CCG_MUSIC_NAVIGATION_READY = true;

    const STYLES = [
        "/resources/css/ccg-mode.css",
        "/resources/css/ccg-effects.css",
        "/resources/css/ccg-nav.css",
        "/resources/css/ccg-buttons.css",
        "/resources/css/ccg-footer.css",
        "/resources/css/ccg-community.css",
        "/resources/css/ccg-mobile-lite.css",
        "/resources/css/ccg-amiga-mode.css",
        "/resources/css/ccg-amiga-mobile-fix.css"
    ];

    function normaliseAssetPath(value) {
        try {
            return new URL(value, window.location.origin).pathname;
        } catch (error) {
            return String(value || "");
        }
    }

    function ensureStyle(href) {
        const exists = Array.from(document.querySelectorAll('link[rel="stylesheet"][href]'))
            .some((link) => normaliseAssetPath(link.getAttribute("href")) === href);
        if (exists) return;
        const link = document.createElement("link");
        link.rel = "stylesheet";
        link.href = href;
        link.dataset.ccgMusicNavigationStyle = "true";
        document.head.appendChild(link);
    }

    function ensureScript(src) {
        const exists = Array.from(document.scripts)
            .some((script) => normaliseAssetPath(script.getAttribute("src")) === src);
        if (exists) return;
        const script = document.createElement("script");
        script.src = src;
        script.defer = true;
        script.dataset.ccgMusicNavigationScript = "true";
        document.body.appendChild(script);
    }

    function headerMarkup() {
        return `
<header class="ccg-header ccg-header--music-injected" data-ccg-header data-ccg-music-header>
  <div class="ccg-header-inner">
    <a href="/home.html" class="ccg-brand">
      <img src="/resources/images/ccgamer-logo.png" alt="Cheeky Commodore Gamer logo" class="ccg-brand__logo" loading="eager" width="1500" height="1032" sizes="(max-width: 720px) 200px, 320px">
      <div class="ccg-brand__text">
        <div class="ccg-brand__kicker">Stay a while, stay forever!</div>
        <div class="ccg-brand__title">
          <span class="ccg-brand__neon-cheeky">CHEEKY COMMODORE</span>
          <span class="ccg-brand__neon-sub">GAMER</span>
        </div>
      </div>
    </a>

    <button class="ccg-nav-toggle" type="button" aria-label="Toggle navigation" aria-expanded="false" aria-controls="ccg-primary-nav" data-ccg-nav-toggle>
      <span class="ccg-nav-toggle__bars" aria-hidden="true"><span></span><span></span><span></span></span>
      <span class="ccg-nav-toggle__label">Menu</span>
    </button>

    <nav class="ccg-nav" aria-label="Primary navigation" id="ccg-primary-nav">
      <div class="ccg-nav__bar">
        <ul class="ccg-nav__list ccg-nav__list--primary" data-ccg-nav-primary>
          <li><a href="/home.html" class="ccg-nav__link">Home</a></li>
          <li><a href="/games/" class="ccg-nav__link">Browse Games</a></li>
          <li><a href="/games/genres/" class="ccg-nav__link">Browse by Genre</a></li>
          <li><a href="/games/publishers/" class="ccg-nav__link">Publishers</a></li>
          <li><a href="/games/collections/" class="ccg-nav__link">Collections</a></li>
          <li><a href="/music/" class="ccg-nav__link ccg-nav__link--active" aria-current="page">Music Hub</a></li>
        </ul>
        <div class="ccg-nav__more" hidden>
          <button class="ccg-nav__more-toggle" type="button" aria-expanded="false" aria-controls="ccg-more-menu" data-ccg-more-toggle>More <span aria-hidden="true">▾</span></button>
          <div class="ccg-nav__more-menu" id="ccg-more-menu" data-ccg-more-menu hidden></div>
        </div>
      </div>

      <ul class="ccg-nav__list ccg-nav__list--secondary" data-ccg-nav-secondary>
        <li><a href="/zzap64/" class="ccg-nav__link">Zzap!64 Awards</a></li>
        <li><a href="/games/discover/" class="ccg-nav__link">Find Me a Game</a></li>
        <li><a href="/quiz/quiz.html" class="ccg-nav__link">Quiz</a></li>
        <li><a href="/emulation.html" class="ccg-nav__link">Emulation</a></li>
        <li><a href="/about.html" class="ccg-nav__link">About</a></li>
        <li><a href="/contact.html" class="ccg-nav__link">Contact</a></li>
      </ul>
    </nav>

    <div class="ccg-header-actions">
      <button class="ccg-mode-toggle" type="button" aria-label="Toggle between C64 and Amiga modes" data-ccg-mode-toggle>
        <span class="ccg-mode-toggle__pill">
          <span class="ccg-mode-toggle__label ccg-mode-toggle__label--c64">C64 MODE</span>
          <span class="ccg-mode-toggle__label ccg-mode-toggle__label--amiga">AMIGA MODE</span>
          <span class="ccg-mode-toggle__thumb"></span>
        </span>
      </button>
    </div>
  </div>

  <div class="ccg-nav-drawer" data-ccg-nav-drawer aria-hidden="true">
    <div class="ccg-nav-drawer__backdrop" data-ccg-drawer-close tabindex="-1"></div>
    <div class="ccg-nav-drawer__panel" role="dialog" aria-modal="true" aria-label="Navigation menu">
      <div class="ccg-nav-drawer__header">
        <span class="ccg-nav-drawer__title">Navigate</span>
        <button class="ccg-nav-drawer__close" type="button" aria-label="Close menu" data-ccg-drawer-close>✕</button>
      </div>
      <div class="ccg-nav-drawer__section" data-ccg-drawer-primary><div class="ccg-nav-drawer__label">Primary</div></div>
      <div class="ccg-nav-drawer__section" data-ccg-drawer-secondary><div class="ccg-nav-drawer__label">Explore more</div></div>
    </div>
  </div>

  <div class="ccg-header-neon-strip"></div>
</header>`;
    }

    function ensureHeader() {
        const existing = document.querySelector("[data-ccg-header]");
        if (existing) return existing;
        document.body.insertAdjacentHTML("afterbegin", headerMarkup());
        document.body.classList.add("ccg-has-injected-music-header");
        return document.querySelector("[data-ccg-music-header]");
    }

    function populateDrawer(header) {
        const primaryTarget = header.querySelector("[data-ccg-drawer-primary]");
        const secondaryTarget = header.querySelector("[data-ccg-drawer-secondary]");
        const primaryList = header.querySelector("[data-ccg-nav-primary]");
        const secondaryList = header.querySelector("[data-ccg-nav-secondary]");
        if (!primaryTarget || !secondaryTarget || !primaryList || !secondaryList) return;

        primaryTarget.innerHTML = '<div class="ccg-nav-drawer__label">Primary</div>';
        secondaryTarget.innerHTML = '<div class="ccg-nav-drawer__label">Explore more</div>';

        primaryList.querySelectorAll("a").forEach((link) => {
            const clone = link.cloneNode(true);
            clone.classList.add("ccg-nav__link--mobile");
            primaryTarget.appendChild(clone);
        });
        secondaryList.querySelectorAll("a").forEach((link) => {
            const clone = link.cloneNode(true);
            clone.classList.add("ccg-nav__link--mobile");
            secondaryTarget.appendChild(clone);
        });
    }

    function bindDrawer(header) {
        if (header.dataset.ccgMusicDrawerBound === "true") return;
        header.dataset.ccgMusicDrawerBound = "true";

        const toggle = header.querySelector("[data-ccg-nav-toggle]");
        const drawer = header.querySelector("[data-ccg-nav-drawer]");
        if (!toggle || !drawer) return;

        const close = () => {
            header.classList.remove("ccg-header--nav-open");
            document.body.classList.remove("ccg-body--nav-open");
            toggle.setAttribute("aria-expanded", "false");
            drawer.setAttribute("aria-hidden", "true");
        };

        const open = () => {
            populateDrawer(header);
            header.classList.add("ccg-header--nav-open");
            document.body.classList.add("ccg-body--nav-open");
            toggle.setAttribute("aria-expanded", "true");
            drawer.setAttribute("aria-hidden", "false");
        };

        toggle.addEventListener("click", () => {
            if (drawer.getAttribute("aria-hidden") === "false") close();
            else open();
        });
        header.querySelectorAll("[data-ccg-drawer-close]").forEach((node) => node.addEventListener("click", close));
        drawer.addEventListener("click", (event) => {
            if (event.target instanceof Element && event.target.closest("a")) close();
        });
        document.addEventListener("keydown", (event) => {
            if (event.key === "Escape") close();
        });
        window.addEventListener("resize", () => {
            if (window.innerWidth >= 1200) close();
        }, { passive: true });

        const lists = header.querySelectorAll("[data-ccg-nav-primary], [data-ccg-nav-secondary]");
        const observer = new MutationObserver(() => populateDrawer(header));
        lists.forEach((list) => observer.observe(list, { childList: true, subtree: true }));
        populateDrawer(header);
    }

    function applyMode(mode) {
        const nextMode = mode === "amiga" ? "amiga" : "c64";
        document.documentElement.setAttribute("data-ccg-mode", nextMode);
        document.documentElement.setAttribute("data-mode", nextMode);
        document.body.setAttribute("data-ccg-mode", nextMode);
        document.body.setAttribute("data-mode", nextMode);
        try { localStorage.setItem("ccg-mode", nextMode); } catch (error) {}

        const toggle = document.querySelector("[data-ccg-mode-toggle]");
        if (toggle) {
            toggle.setAttribute("aria-pressed", String(nextMode === "amiga"));
            toggle.setAttribute("aria-label", nextMode === "amiga" ? "Switch to C64 mode" : "Switch to Amiga mode");
            toggle.dataset.ccgActiveMode = nextMode;
        }
        window.dispatchEvent(new CustomEvent("ccg:mode-changed", { detail: { mode: nextMode } }));
    }

    function bindMode(header) {
        const toggle = header.querySelector("[data-ccg-mode-toggle]");
        if (!toggle || toggle.dataset.ccgMusicModeBound === "true") return;
        toggle.dataset.ccgMusicModeBound = "true";

        let saved = "c64";
        try { saved = localStorage.getItem("ccg-mode") || "c64"; } catch (error) {}
        applyMode(saved);
        toggle.addEventListener("click", () => {
            const current = document.body.getAttribute("data-ccg-mode") === "amiga" ? "amiga" : "c64";
            applyMode(current === "amiga" ? "c64" : "amiga");
        });
    }

    function init() {
        STYLES.forEach(ensureStyle);
        const header = ensureHeader();
        if (!header) return;
        bindDrawer(header);
        bindMode(header);
        ensureScript("/js/ccg-nav-core.js");
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init, { once: true });
    } else {
        init();
    }
})();
