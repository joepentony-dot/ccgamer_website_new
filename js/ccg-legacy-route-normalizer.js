/* ============================================================
   CCG LEGACY ROUTE NORMALIZER
   ------------------------------------------------------------
   Consolidates old game URLs onto the canonical folder format
   without reloading the interactive game page.
============================================================ */

(function () {
    "use strict";

    if (window.CCG_LEGACY_ROUTE_NORMALIZER_READY) return;
    window.CCG_LEGACY_ROUTE_NORMALIZER_READY = true;

    const SITE_ORIGIN = "https://www.cheekycommodoregamer.co.uk";
    const GAME_HANDLER_PATH = "/games/game.html";
    const RESERVED_GAME_PATHS = new Set([
        "game",
        "index",
        "genres",
        "collections",
        "publishers",
        "developers",
        "years",
        "compare",
        "discover",
        "seo"
    ]);

    function safeDecode(value) {
        const raw = String(value || "").trim();
        if (!raw) return "";
        try {
            return decodeURIComponent(raw);
        } catch (error) {
            return raw;
        }
    }

    function normalizeToken(value) {
        return safeDecode(value)
            .toLowerCase()
            .replace(/[’']/g, "")
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/-+/g, "-")
            .replace(/^-|-$/g, "");
    }

    function normalizePathname(pathname) {
        let path = String(pathname || "");
        const repoMarker = "/ccgamer_website_new/";
        if (path.includes(repoMarker)) {
            path = path.slice(path.indexOf(repoMarker) + repoMarker.length - 1);
        }
        if (!path.startsWith("/")) path = `/${path}`;
        return path.replace(/\/{2,}/g, "/");
    }

    function isLegacyGameHandler(pathname) {
        const path = normalizePathname(pathname).replace(/\/+$/g, "");
        return path === GAME_HANDLER_PATH || path === "/games/game";
    }

    function canonicalGamePath(slug) {
        const safeSlug = normalizeToken(slug);
        return safeSlug ? `/games/${safeSlug}/` : "";
    }

    function updateCanonicalMetadata(path) {
        if (!path) return;
        const absolute = `${SITE_ORIGIN}${path}`;
        const canonical = document.querySelector('link[rel="canonical"]');
        const ogUrl = document.querySelector('meta[property="og:url"]');
        const twitterUrl = document.querySelector('meta[name="twitter:url"]');

        canonical?.setAttribute("href", absolute);
        ogUrl?.setAttribute("content", absolute);
        twitterUrl?.setAttribute("content", absolute);
    }

    function replaceAddress(path) {
        if (!path || normalizePathname(window.location.pathname) === path) {
            updateCanonicalMetadata(path);
            return;
        }

        try {
            const next = `${path}${window.location.hash || ""}`;
            window.history.replaceState(window.history.state, "", next);
            updateCanonicalMetadata(path);
            window.dispatchEvent(new CustomEvent("ccg:legacy-route-normalized", {
                detail: { path }
            }));
        } catch (error) {
            console.warn("[CCG ROUTES] Could not normalize the legacy game URL.", error);
        }
    }

    function gameMatchesId(game, token) {
        const raw = String(token || "").trim().toLowerCase();
        if (!raw) return false;

        const id = String(game?.id || "").trim().toLowerCase();
        const slug = String(game?.slug || "").trim().toLowerCase();
        return id === raw
            || slug === raw
            || normalizeToken(id) === normalizeToken(raw)
            || normalizeToken(slug) === normalizeToken(raw);
    }

    async function resolveLegacyId(id) {
        if (!id) return "";
        try {
            const response = await fetch("/games/games.json", { cache: "force-cache" });
            if (!response.ok) return "";
            const games = await response.json();
            if (!Array.isArray(games)) return "";
            const game = games.find((entry) => gameMatchesId(entry, id));
            return String(game?.slug || "").trim();
        } catch (error) {
            console.warn("[CCG ROUTES] Legacy game ID lookup failed.", error);
            return "";
        }
    }

    async function normalizeCurrentGameHandler() {
        if (!isLegacyGameHandler(window.location.pathname)) return;

        const params = new URLSearchParams(window.location.search || "");
        const slugParam = safeDecode(params.get("slug"));
        const idParam = safeDecode(params.get("id"));

        if (slugParam) {
            replaceAddress(canonicalGamePath(slugParam));
            return;
        }

        if (!idParam) return;
        const resolvedSlug = await resolveLegacyId(idParam);
        if (resolvedSlug) replaceAddress(canonicalGamePath(resolvedSlug));
    }

    function canonicalizeAnchor(anchor) {
        if (!(anchor instanceof HTMLAnchorElement)) return;
        const rawHref = anchor.getAttribute("href");
        if (!rawHref || rawHref.startsWith("#") || /^(mailto:|tel:|javascript:)/i.test(rawHref)) return;

        let url;
        try {
            url = new URL(rawHref, window.location.href);
        } catch (error) {
            return;
        }

        if (url.origin !== window.location.origin) return;
        const path = normalizePathname(url.pathname);

        if (path === "/games/index.html") {
            anchor.href = `/games/${url.search}${url.hash}`;
            return;
        }

        if (isLegacyGameHandler(path)) {
            const slugParam = safeDecode(url.searchParams.get("slug"));
            if (slugParam) {
                anchor.href = `${canonicalGamePath(slugParam)}${url.hash}`;
            }
            return;
        }

        const flatMatch = path.match(/^\/games\/([^/]+)\.html$/i);
        if (!flatMatch) return;
        const flatSlug = normalizeToken(flatMatch[1]);
        if (!flatSlug || RESERVED_GAME_PATHS.has(flatSlug)) return;
        anchor.href = `/games/${flatSlug}/${url.search}${url.hash}`;
    }

    function normalizeAnchors(root = document) {
        root.querySelectorAll?.("a[href]").forEach(canonicalizeAnchor);
    }

    function markFallbackContent() {
        const notFound = document.getElementById("gameNotFound");
        if (notFound) notFound.setAttribute("data-nosnippet", "");

        document.querySelectorAll('a[href="/games/index.html"], a[href$="/games/index.html"]')
            .forEach((anchor) => anchor.setAttribute("href", "/games/"));
    }

    function bindLinkNormalization() {
        document.addEventListener("click", (event) => {
            const target = event.target instanceof Element ? event.target.closest("a[href]") : null;
            if (target) canonicalizeAnchor(target);
        }, true);
    }

    function initDomWork() {
        markFallbackContent();
        normalizeAnchors();
        bindLinkNormalization();
    }

    void normalizeCurrentGameHandler();

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", initDomWork, { once: true });
    } else {
        initDomWork();
    }
})();
