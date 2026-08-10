/* ============================================================
   CCG ZZAP!64 GAME REVIEW LINKS
   ------------------------------------------------------------
   Adds every verified Zzap!64 scan associated with the current
   CCG game. The compact review data is split into small chunks so
   a game page only downloads the chunk that can contain its slug.
============================================================ */

(function () {
    "use strict";

    if (window.CCG_ZZAP64_GAME_REVIEWS_RUNTIME_READY) return;
    window.CCG_ZZAP64_GAME_REVIEWS_RUNTIME_READY = true;

    const BASE = "/data/zzap64-game-reviews/";
    const APPLIED_ATTR = "data-ccg-zzap-all-reviews";
    let applying = false;
    let cachedRows = null;
    let observer = null;

    function currentSlug() {
        const match = String(window.location.pathname || "").match(/\/games\/([^/?#]+)\/(?:index\.html)?$/i);
        if (!match || !match[1]) return "";
        try {
            return decodeURIComponent(match[1]).trim().toLowerCase();
        } catch {
            return String(match[1]).trim().toLowerCase();
        }
    }

    function chunkName(slug) {
        const first = String(slug || "").charAt(0).toLowerCase();
        if (!first) return "";
        if (/\d/.test(first) || first < "e") return "0-d.json";
        if (first < "i") return "e-h.json";
        if (first < "m") return "i-l.json";
        if (first < "q") return "m-p.json";
        if (first < "u") return "q-t.json";
        return "u-z.json";
    }

    function reviewUrl(issue, page) {
        const numericIssue = Number(issue);
        const numericPage = Number(page);
        if (!Number.isInteger(numericIssue) || numericIssue < 1) return "";
        if (!Number.isInteger(numericPage) || numericPage < 1) return "";
        return `https://www.zzap64.co.uk/cgi-bin/displaypage.pl?issue=${numericIssue}&page=${numericPage}`;
    }

    async function loadRows() {
        if (cachedRows) return cachedRows;
        const slug = currentSlug();
        const chunk = chunkName(slug);
        if (!slug || !chunk) return [];
        try {
            const response = await fetch(`${BASE}${chunk}`, { cache: "default" });
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const data = await response.json();
            cachedRows = Array.isArray(data?.games?.[slug]) ? data.games[slug] : [];
        } catch (error) {
            cachedRows = [];
            console.warn("[CCG] Zzap!64 game review data unavailable:", error);
        }
        return cachedRows;
    }

    function ensureUtilityHubVisible(container) {
        const card = document.getElementById("game-reading-card");
        const hub = document.getElementById("game-utility-hub-section");
        if (container) container.hidden = false;
        if (card) card.hidden = false;
        if (hub) hub.hidden = false;
    }

    function linkExists(container, href) {
        return Array.from(container.querySelectorAll("a[href]")).some((link) => link.href === href);
    }

    async function applyLinks() {
        if (applying) return;
        const container = document.getElementById("gameLemonLinks");
        if (!container) return;
        applying = true;
        try {
            const rows = await loadRows();
            if (!rows.length) return;

            rows.forEach((row, index) => {
                if (!Array.isArray(row) || row.length < 2) return;
                const issue = Number(row[0]);
                const page = Number(row[1]);
                const href = reviewUrl(issue, page);
                if (!href || linkExists(container, href)) return;

                const link = document.createElement("a");
                link.className = "game-pill game-pill--zzap64";
                link.href = href;
                link.target = "_blank";
                link.rel = "noopener noreferrer external";
                link.setAttribute(APPLIED_ATTR, "true");
                link.textContent = rows.length > 1
                    ? `Read Zzap!64 Review ${index + 1} · Issue ${issue}, p${page}`
                    : `Read Zzap!64 Review · Issue ${issue}, p${page}`;
                container.appendChild(link);
            });

            ensureUtilityHubVisible(container);
        } finally {
            applying = false;
        }
    }

    function observeReadingLinks() {
        const container = document.getElementById("gameLemonLinks");
        if (!container || observer) return;
        observer = new MutationObserver(() => {
            if (!applying) queueMicrotask(applyLinks);
        });
        observer.observe(container, { childList: true });
    }

    function init() {
        if (!document.documentElement.matches('[data-ccg-page="single-game"]') && !document.querySelector(".ccg-page--single-game")) return;
        applyLinks();
        observeReadingLinks();
        window.setTimeout(applyLinks, 500);
        window.setTimeout(applyLinks, 1500);
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init, { once: true });
    } else {
        init();
    }
})();
