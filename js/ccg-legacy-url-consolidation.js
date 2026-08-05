/* ============================================================
   CCG LEGACY URL CONSOLIDATION
   ------------------------------------------------------------
   Redirects obsolete public URL variants to their established
   canonical routes without touching generated game content.
============================================================ */

(function () {
    "use strict";

    if (window.CCG_LEGACY_URL_CONSOLIDATION_READY) return;
    window.CCG_LEGACY_URL_CONSOLIDATION_READY = true;

    const REPO_MARKER = "/ccgamer_website_new/";

    function getSiteRoot() {
        if (typeof window.ccgGetSiteRoot === "function") {
            const configured = String(window.ccgGetSiteRoot() || "/");
            return configured.endsWith("/") ? configured : `${configured}/`;
        }

        const pathname = String(window.location.pathname || "");
        return pathname.includes(REPO_MARKER) ? REPO_MARKER : "/";
    }

    function getRoutePath() {
        let pathname = String(window.location.pathname || "");
        if (pathname.includes(REPO_MARKER)) {
            pathname = pathname.slice(pathname.indexOf(REPO_MARKER) + REPO_MARKER.length - 1);
        }
        if (!pathname.startsWith("/")) pathname = `/${pathname}`;
        return pathname.replace(/\/{2,}/g, "/");
    }

    function normaliseLookup(value) {
        return String(value || "")
            .trim()
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/[^a-z0-9]+/g, "");
    }

    function normaliseGameSlug(value) {
        return String(value || "")
            .trim()
            .toLowerCase()
            .replace(/[’']/g, "")
            .replace(/_/g, "-")
            .replace(/[^a-z0-9-]+/g, "-")
            .replace(/-+/g, "-")
            .replace(/^-|-$/g, "");
    }

    function buildSitePath(relativePath) {
        const root = getSiteRoot();
        const clean = String(relativePath || "").replace(/^\/+/, "");
        return `${root}${clean}`.replace(/\/{2,}/g, "/");
    }

    function replaceLocation(relativePath) {
        const target = `${buildSitePath(relativePath)}${window.location.hash || ""}`;
        const current = `${window.location.pathname}${window.location.search}${window.location.hash}`;
        if (current === target) return;
        window.location.replace(target);
    }

    function consolidateBrowseGamesUrl() {
        if (!/^\/games\/index\.html$/i.test(getRoutePath())) return false;
        replaceLocation("games/");
        return true;
    }

    function findGame(games, candidate) {
        const raw = String(candidate || "").trim().toLowerCase();
        if (!raw || !Array.isArray(games)) return null;

        const exact = games.find((game) => {
            const id = String(game?.id || "").trim().toLowerCase();
            const slug = String(game?.slug || "").trim().toLowerCase();
            return id === raw || slug === raw;
        });
        if (exact) return exact;

        const key = normaliseLookup(raw);
        if (!key) return null;
        return games.find((game) => {
            return normaliseLookup(game?.id) === key || normaliseLookup(game?.slug) === key;
        }) || null;
    }

    async function loadGames() {
        if (Array.isArray(window.CCG_SINGLE_ALL_GAMES) && window.CCG_SINGLE_ALL_GAMES.length) {
            return window.CCG_SINGLE_ALL_GAMES;
        }

        const response = await fetch(buildSitePath("games/games.json"), { cache: "force-cache" });
        if (!response.ok) throw new Error(`games.json returned HTTP ${response.status}`);
        const games = await response.json();
        return Array.isArray(games) ? games : [];
    }

    async function consolidateLegacyGameUrl() {
        if (!/^\/games\/game\.html$/i.test(getRoutePath())) return false;

        const params = new URLSearchParams(window.location.search || "");
        const candidate = params.get("slug") || params.get("id");
        if (!candidate) {
            replaceLocation("games/");
            return true;
        }

        try {
            const game = findGame(await loadGames(), candidate);
            const canonicalSlug = normaliseGameSlug(game?.slug);
            if (canonicalSlug) {
                replaceLocation(`games/${canonicalSlug}/`);
                return true;
            }

            replaceLocation("games/");
            return true;
        } catch (error) {
            console.warn("[CCG ROUTES] Could not resolve the legacy game URL.", error);

            const slugCandidate = params.get("slug");
            const safeSlug = normaliseGameSlug(slugCandidate);
            if (safeSlug) {
                replaceLocation(`games/${safeSlug}/`);
                return true;
            }

            // Leave an unresolved legacy ID on the shared handler rather than
            // guessing a canonical route that may not exist.
            return false;
        }
    }

    async function init() {
        if (consolidateBrowseGamesUrl()) return;
        await consolidateLegacyGameUrl();
    }

    void init();
})();
