/* ============================================================
   CCG PLATFORM COMPARISON LINK
   ------------------------------------------------------------
   Adds a comparison link only when the current game has both a
   Commodore 64 and an Amiga record in the main archive.
============================================================ */

(function () {
    "use strict";

    if (window.CCG_PLATFORM_COMPARE_LINK_READY) return;
    window.CCG_PLATFORM_COMPARE_LINK_READY = true;

    const RESERVED = new Set([
        "genres", "collections", "publishers", "developers", "years",
        "platforms", "downloads", "compare", "index.html"
    ]);

    function normalize(value) {
        return String(value || "")
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/[’']/g, "")
            .replace(/\b(the|a|an)\b/g, " ")
            .replace(/[^a-z0-9]+/g, " ")
            .replace(/\s+/g, " ")
            .trim();
    }

    function system(value) {
        const current = String(value || "").toUpperCase();
        if (current.includes("AMIGA")) return "AMIGA";
        if (current.includes("C64") || current.includes("COMMODORE 64")) return "C64";
        return current;
    }

    function currentSlug() {
        const match = location.pathname.match(/\/games\/([^/]+)\/?(?:index\.html)?$/i);
        if (!match) return "";
        const slug = String(match[1] || "").toLowerCase();
        return RESERVED.has(slug) ? "" : slug;
    }

    function titleKey(game) {
        return normalize(game?.sorttitle || game?.title);
    }

    function insertionTarget() {
        return document.querySelector(
            ".game-hero__actions, .game-quick-actions, .game-hero__content, .game-hero, .ccg-page--single-game main"
        );
    }

    function injectLink(pair) {
        if (document.querySelector("[data-ccg-platform-compare-link]")) return;
        const target = insertionTarget();
        if (!target) return;

        const link = document.createElement("a");
        link.className = "ccg-compare-link";
        link.href = `/games/compare/?game=${encodeURIComponent(pair.key)}`;
        link.setAttribute("data-ccg-platform-compare-link", "true");
        link.textContent = "Compare C64 & Amiga versions";
        target.appendChild(link);
    }

    async function init() {
        const slug = currentSlug();
        if (!slug) return;

        try {
            const response = await fetch("/games/games.json", { cache: "no-store" });
            if (!response.ok) return;
            const games = await response.json();
            if (!Array.isArray(games)) return;

            const current = games.find((game) => String(game?.slug || "").toLowerCase() === slug);
            if (!current) return;
            const key = titleKey(current);
            const matches = games.filter((game) => titleKey(game) === key);
            const hasC64 = matches.some((game) => system(game.system) === "C64");
            const hasAmiga = matches.some((game) => system(game.system) === "AMIGA");
            if (hasC64 && hasAmiga) injectLink({ key });
        } catch (error) {}
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init, { once: true });
    } else {
        init();
    }
})();
