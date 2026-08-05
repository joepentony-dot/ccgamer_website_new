/* ============================================================
   CCG LEGACY URL CONSOLIDATION
   ------------------------------------------------------------
   Redirects obsolete browse-index URLs without creating a
   reciprocal redirect between canonical game folders and the
   shared game handler.
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

    /*
       Canonical game-folder pages currently forward to the shared
       renderer. The renderer must therefore never redirect back to
       the folder, otherwise the browser enters a permanent two-way
       reload loop.
    */
    consolidateBrowseGamesUrl();
})();
