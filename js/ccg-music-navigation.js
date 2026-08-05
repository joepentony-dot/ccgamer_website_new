/* ============================================================
   CCG MUSIC HEADER BOOTSTRAP
   ------------------------------------------------------------
   Adds the established public header to generated music pages
   that previously contained only local breadcrumb navigation.
============================================================ */

(function () {
    "use strict";

    if (window.CCG_MUSIC_NAVIGATION_READY) return;
    window.CCG_MUSIC_NAVIGATION_READY = true;

    const STYLES = [
        "/resources/css/ccg-mode.css",
        "/resources/css/ccg-effects.css",
        "/resources/css/ccg-nav.css",
        "/resources/css/ccg-footer.css",
        "/resources/css/ccg-mobile-lite.css",
        "/resources/css/ccg-navigation-fit.css"
    ];

    const SCRIPTS = [
        "/js/ccg-global.js",
        "/js/ccg-nav.js",
        "/js/ccg-nav-core.js",
        "/js/ccg-mode-engine.js"
    ];

    function hasAsset(selector, path) {
        return Array.from(document.querySelectorAll(selector)).some((node) => {
            const value = node.getAttribute(selector === "script[src]" ? "src" : "href") || "";
            return value === path || value.endsWith(path);
        });
    }

    function ensureStyles() {
        STYLES.forEach((href) => {
            if (hasAsset('link[rel="stylesheet"][href]', href)) return;
            const link = document.createElement("link");
            link.rel = "stylesheet";
            link.href = href;
            link.setAttribute("data-ccg-music-nav-style", "true");
            document.head.appendChild(link);
        });
    }

    function currentSecondary(label) {
        return label === "Music Hub" ? ' aria-current="page"' : "";
    }

    function headerMarkup() {
        return `
<header class="ccg-header ccg-header--music-injected" data-ccg-header data-ccg-music-header>
  <div class="ccg-header-inner">
    <a href="/home.html" class="ccg-brand">
      <img src="/resources/images/ccgamer-logo.png" alt="Cheeky Commodore Gamer logo" class="ccg-brand__logo" loading="lazy" width="1500" height="1032" sizes="(max-width: 720px) 200px, 320px">
      <div class="ccg-brand__text">
        <div class="ccg-brand__kicker">Stay a while, stay forever!</div>
        <div class="ccg-brand__title"><span class="ccg-brand__neon-cheeky">CHEEKY COMMODORE</span><span class="ccg-brand__neon-sub">GAMER</span></div>
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
          <li><a href="/music/" class="ccg-nav__link" aria-current="page">Music Hub</a></li>
        </ul>
        <div class="ccg-nav__more">
          <button class="ccg-nav__more-toggle" type="button" aria-expanded="false" aria-controls="ccg-more-menu" data-ccg-more-toggle>More <span aria-hidden="true">▾</span></button>
          <div class="ccg-nav__more-menu" id="ccg-more-menu" data-ccg-more-menu hidden></div>
        </div>
      </div>
      <ul class="ccg-nav__list ccg-nav__list--secondary" data-ccg-nav-secondary>
        <li><a href="/zzap64/" class="ccg-nav__link">Zzap!64 Awards</a></li>
        <li><a href="/music/" class="ccg-nav__link"${currentSecondary("Music Hub")}>Music Hub</a></li>
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
      <div class="ccg-nav-drawer__header"><span class="ccg-nav-drawer__title">Navigate</span><button class="ccg-nav-drawer__close" type="button" aria-label="Close menu" data-ccg-drawer-close>✕</button></div>
      <div class="ccg-nav-drawer__section" data-ccg-drawer-primary><div class="ccg-nav-drawer__label">Primary</div></div>
      <div class="ccg-nav-drawer__section" data-ccg-drawer-secondary><div class="ccg-nav-drawer__label">Explore more</div></div>
    </div>
  </div>
  <div class="ccg-header-neon-strip"></div>
</header>`;
    }

    function ensureHeader() {
        if (document.querySelector(".ccg-header")) return;
        document.body.insertAdjacentHTML("afterbegin", headerMarkup());
        document.body.classList.add("ccg-has-injected-music-header");
    }

    function loadScriptsSequentially(index = 0) {
        if (index >= SCRIPTS.length) return;
        const src = SCRIPTS[index];
        if (hasAsset("script[src]", src)) {
            loadScriptsSequentially(index + 1);
            return;
        }

        const script = document.createElement("script");
        script.src = src;
        script.async = false;
        script.setAttribute("data-ccg-music-nav-script", "true");
        script.addEventListener("load", () => loadScriptsSequentially(index + 1), { once: true });
        script.addEventListener("error", () => loadScriptsSequentially(index + 1), { once: true });
        document.body.appendChild(script);
    }

    function init() {
        ensureStyles();
        ensureHeader();
        loadScriptsSequentially();
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init, { once: true });
    } else {
        init();
    }
})();
