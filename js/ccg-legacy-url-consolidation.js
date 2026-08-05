/* ============================================================
   CCG LEGACY URL CONSOLIDATION
   ------------------------------------------------------------
   Redirects obsolete public URL variants to their established
   canonical routes without touching generated game content.
============================================================ */

(function () {
    "use strict";

    function normaliseGameSlug(value) {
        return String(value || "")
            .trim()
            .toLowerCase()
            .replace(/_/g, "-")
            .replace(/[^a-z0-9-]+/g, "")
            .replace(/-+/g, "-")
            .replace(/^-|-$/g, "");
    }

    function replaceLocation(path) {
        const target = `${path}${window.location.hash || ""}`;
        if (`${window.location.pathname}${window.location.search}${window.location.hash}` === target) return;
        window.location.replace(target);
    }

    function consolidateBrowseGamesUrl() {
        if (!/^\/games\/index\.html$/i.test(window.location.pathname)) return false;
        replaceLocation("/games/");
        return true;
    }

    function consolidateLegacyGameUrl() {
        if (!/^\/games\/game\.html$/i.test(window.location.pathname)) return false;

        const params = new URLSearchParams(window.location.search || "");
        const candidate = params.get("slug") || params.get("id");
        const gameSlug = normaliseGameSlug(candidate);

        if (gameSlug) {
            replaceLocation(`/games/${gameSlug}/`);
            return true;
        }

        replaceLocation("/games/");
        return true;
    }

    function init() {
        if (consolidateBrowseGamesUrl()) return;
        consolidateLegacyGameUrl();
    }

    init();
})();
