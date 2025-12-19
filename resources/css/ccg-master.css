/* ============================================================
   CCG MASTER CSS — GLOBAL STRUCTURE & FOUNDATION LOCK
   HEADER/NAV ISOLATION FIX (H-FINAL)
============================================================ */

/* ============================================================
   ROOT VARIABLES
============================================================ */

:root {
    --ccg-font-main: 'Orbitron', system-ui, sans-serif;
    --ccg-font-body: 'Roboto', system-ui, -apple-system, BlinkMacSystemFont, sans-serif;

    --ccg-bg-dark: #000;
    --ccg-text-light: #e8ecff;
    --ccg-text-soft: #b5bbdf;

    /* HEADER CONTRACT */
    --ccg-header-height: 92px;
    --ccg-header-inner-height: 64px;

    --ccg-nav-pill-pad-y: 8px;
    --ccg-nav-pill-pad-x: 14px;

    --ccg-page-entry-pad: 32px;

    --accent-rgb: 0,170,255;
}

/* ============================================================
   RESET
============================================================ */

*,
*::before,
*::after {
    box-sizing: border-box;
}

html,
body {
    margin: 0;
    padding: 0;
    background: var(--ccg-bg-dark);
    color: var(--ccg-text-light);
    font-family: var(--ccg-font-body);
    overflow-x: hidden;
}

/* ============================================================
   PAGE WRAPPERS
============================================================ */

.ccg-page {
    min-height: 100vh;
    position: relative;
}

.ccg-main {
    width: min(1320px, 96%);
    margin: 0 auto;
    padding-top: var(--ccg-page-entry-pad);
    position: relative;
}

/* ============================================================
   HEADER — LOCKED STRUCTURE
============================================================ */

.ccg-header {
    position: relative;
    z-index: 10000; /* HARD TOP LAYER */

    height: var(--ccg-header-height);
    display: flex;
    align-items: center;

    background:
        linear-gradient(
            to bottom,
            rgba(0,0,0,0.96),
            rgba(0,0,0,0.82),
            rgba(0,0,0,0.65)
        );

    backdrop-filter: blur(6px);
    overflow: visible;
}

.ccg-header-inner {
    width: min(1320px, 96%);
    margin: 0 auto;
    height: var(--ccg-header-inner-height);

    display: grid;
    grid-template-columns: auto minmax(0, 1fr) auto;
    align-items: center;
    gap: 18px;

    overflow: visible;
}

/* ============================================================
   NAVIGATION — FIXED OVERFLOW
============================================================ */

.ccg-nav {
    display: flex;
    justify-content: center;
    align-items: center;
}

.ccg-nav__list {
    display: flex;
    gap: 12px;
    padding-inline: 28px;

    overflow-x: auto;
    overflow-y: visible; /* ✅ CRITICAL FIX */
    scrollbar-width: none;
}

.ccg-nav__list::-webkit-scrollbar {
    display: none;
}

.ccg-nav__link {
    display: inline-flex;
    align-items: center;
    justify-content: center;

    height: 36px;
    padding: var(--ccg-nav-pill-pad-y) var(--ccg-nav-pill-pad-x);
    border-radius: 999px;

    font-family: var(--ccg-font-main);
    font-size: 0.7rem;
    letter-spacing: 0.12em;
    text-transform: uppercase;

    background:
        linear-gradient(
            180deg,
            rgba(255,255,255,0.08),
            rgba(255,255,255,0.03)
        );

    border: 1px solid rgba(255,255,255,0.14);
    box-shadow: 0 6px 14px rgba(0,0,0,0.65);
}

/* ============================================================
   MORE ▾ DROPDOWN — FUNCTIONAL ONLY
============================================================ */

.ccg-nav__more {
    position: relative; /* anchor */
}

.ccg-nav__dropdown {
    position: absolute;
    top: calc(100% + 10px);
    right: 0;

    min-width: 220px;
    padding: 10px;

    display: none;
    z-index: 20000;

    background: rgba(0,0,0,0.95);
    border: 1px solid rgba(255,255,255,0.14);
    border-radius: 14px;

    box-shadow: 0 18px 48px rgba(0,0,0,0.9);
}

.ccg-nav__dropdown.is-open {
    display: block;
}

.ccg-nav__dropdown-link {
    display: block;
    padding: 10px 14px;
    border-radius: 8px;
    font-family: var(--ccg-font-main);
    font-size: 0.7rem;
    letter-spacing: 0.12em;
    text-transform: uppercase;
}

/* ============================================================
   HEADER ACTIONS
============================================================ */

.ccg-header-socials {
    display: flex;
    align-items: center;
    gap: 10px;
}

.ccg-mode-toggle {
    height: 36px;
    min-width: 86px;
    border-radius: 999px;
}

/* ============================================================
   PAGE HANDOFF — CONTRACT PRESERVED
============================================================ */

html[data-ccg-page="home"] .ccg-main {
    padding-top: 18px;
}

.ccg-page--games-index .ccg-main,
.ccg-page--collections-index .ccg-main,
.ccg-page--genres-index .ccg-main {
    padding-top: var(--ccg-page-entry-pad);
}

.ccg-page--single-game .ccg-main {
    padding-top: 14px;
}

/* ============================================================
   MODE COLOURS
============================================================ */

body[data-ccg-mode="c64"] {
    --accent-rgb: 0,170,255;
}

body[data-ccg-mode="amiga"] {
    --accent-rgb: 255,41,224;
}
