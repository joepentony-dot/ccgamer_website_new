/* ============================================================
   CCG DISCOVERY + ENGAGEMENT ENGINE — OMEGA
   ------------------------------------------------------------
   Shared public-page enhancement layer.

   • compact visual breadcrumbs
   • dynamic home-page archive pulse
   • publisher / year / genre / composer deep links on game pages
   • consent-aware navigation and search analytics
   • builds on existing global search, smart discovery and
     recently-viewed systems instead of replacing them
============================================================ */

(function () {
    "use strict";

    if (window.CCG_ENGAGEMENT_ENGINE_READY) return;
    window.CCG_ENGAGEMENT_ENGINE_READY = true;

    const root = document.documentElement;
    const pathname = String(window.location.pathname || "/");
    const pageId = String(root.getAttribute("data-ccg-page") || "").toLowerCase();

    if (pathname.startsWith("/admin/") || pageId === "intro") return;

    const CSS_PATH = "/resources/css/ccg-engagement-engine.css";
    const GAMES_INDEX_PATH = "/games/games-search.json";
    const RETRO_SPECIALS_PATH = "/data/retro-specials.json";
    const MIN_SEARCH_LENGTH = 2;

    const GENRE_ROUTES = new Map([
        ["action adventure", "action-adventure-games.html"],
        ["action-adventure", "action-adventure-games.html"],
        ["adventure", "adventure-games.html"],
        ["arcade", "arcade-games.html"],
        ["casino", "casino-games.html"],
        ["fighting", "fighting-games.html"],
        ["horror", "horror-games.html"],
        ["miscellaneous", "miscellaneous.html"],
        ["platform", "platform-games.html"],
        ["puzzle", "puzzle-games.html"],
        ["quiz", "quiz-games.html"],
        ["racing", "racing-games.html"],
        ["role playing", "role-playing-games.html"],
        ["role-playing", "role-playing-games.html"],
        ["rpg", "role-playing-games.html"],
        ["shooting", "shooting-games.html"],
        ["sports", "sports-games.html"],
        ["strategy", "strategy-games.html"]
    ]);

    const state = {
        gamesPromise: null,
        retroPromise: null,
        searchTimer: null,
        lastSearchSignature: ""
    };

    function ensureCss() {
        if (document.querySelector(`link[href="${CSS_PATH}"]`)) return;
        const link = document.createElement("link");
        link.rel = "stylesheet";
        link.href = CSS_PATH;
        link.setAttribute("data-ccg-engagement-engine-css", "true");
        document.head.appendChild(link);
    }

    function normalize(value) {
        return String(value || "")
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/[’']/g, "")
            .replace(/&/g, " and ")
            .replace(/[^a-z0-9]+/g, " ")
            .replace(/\s+/g, " ")
            .trim();
    }

    function slugify(value) {
        return normalize(value)
            .replace(/\s+/g, "-")
            .replace(/^-+|-+$/g, "");
    }

    function toArray(value) {
        if (Array.isArray(value)) return value.filter(Boolean);
        return value === undefined || value === null || value === "" ? [] : [value];
    }

    function titleCase(value) {
        return String(value || "")
            .replace(/[-_]+/g, " ")
            .split(/\s+/)
            .filter(Boolean)
            .map((part) => part.length <= 3 && part === part.toUpperCase()
                ? part
                : part.charAt(0).toUpperCase() + part.slice(1))
            .join(" ");
    }

    function readableHeading() {
        const heading = document.querySelector("main h1, .ccg-main h1, h1");
        return String(heading?.textContent || document.title || "")
            .replace(/\s*\|\s*Cheeky Commodore Gamer.*$/i, "")
            .replace(/\s+/g, " ")
            .trim();
    }

    function analyticsAllowed() {
        return root.getAttribute("data-ccg-consent-analytics") === "granted"
            && typeof window.gtag === "function";
    }

    function track(eventName, parameters) {
        if (!analyticsAllowed()) return;
        try {
            window.gtag("event", eventName, {
                ...(parameters || {}),
                ccg_page: pageId || "public",
                ccg_path: pathname
            });
        } catch (error) {
            // Analytics must never interfere with navigation.
        }
    }

    window.CCGTrackEvent = track;

    async function fetchArray(path, cacheMode) {
        const response = await fetch(path, { cache: cacheMode || "force-cache" });
        if (!response.ok) throw new Error(`${path} HTTP ${response.status}`);
        const data = await response.json();
        return Array.isArray(data) ? data : [];
    }

    function loadGames() {
        if (!state.gamesPromise) {
            state.gamesPromise = fetchArray(GAMES_INDEX_PATH, "force-cache").catch((error) => {
                console.warn("[ccg-engagement] Game index unavailable", error);
                return [];
            });
        }
        return state.gamesPromise;
    }

    function loadRetroSpecials() {
        if (!state.retroPromise) {
            state.retroPromise = fetchArray(RETRO_SPECIALS_PATH, "force-cache").catch((error) => {
                console.warn("[ccg-engagement] Retro-special index unavailable", error);
                return [];
            });
        }
        return state.retroPromise;
    }

    function currentGameSlug() {
        const bodySlug = document.body?.getAttribute("data-game-slug");
        if (bodySlug) return slugify(bodySlug);

        const stubSlug = window.CCG_GAME_STUB?.slug;
        if (stubSlug) return slugify(stubSlug);

        try {
            const query = new URLSearchParams(window.location.search);
            const querySlug = query.get("slug") || query.get("id");
            if (querySlug) return slugify(querySlug);
        } catch (error) {}

        const match = pathname.match(/\/games\/([^/]+)\/?(?:index\.html)?$/i);
        if (!match) return "";
        const slug = slugify(match[1]);
        const reserved = new Set([
            "game-html", "index-html", "genres", "collections", "publishers",
            "developers", "years", "platforms", "downloads", "discover"
        ]);
        return reserved.has(slug) ? "" : slug;
    }

    function findGame(games, suppliedGame) {
        if (suppliedGame && suppliedGame.title) return suppliedGame;
        const slug = currentGameSlug();
        return games.find((game) => slugify(game?.slug || game?.id) === slug) || null;
    }

    function genreHref(value) {
        const normalized = normalize(value);
        const route = GENRE_ROUTES.get(normalized) || `${slugify(value)}-games.html`;
        return `/games/genres/${route}`;
    }

    /* ========================================================
       BREADCRUMBS
    ======================================================== */

    function existingBreadcrumbs() {
        return document.querySelector(
            "nav[aria-label*='breadcrumb' i], .breadcrumbs, .ccg-breadcrumbs, .retro-video-page__breadcrumbs, [data-ccg-engagement-breadcrumbs]"
        );
    }

    function buildBreadcrumbModel(game) {
        const cleanPath = pathname.replace(/\/index\.html$/i, "/");
        if (cleanPath === "/" || /\/home\.html$/i.test(cleanPath)) return [];

        const heading = String(game?.title || readableHeading()).trim();
        const crumbs = [{ label: "Home", href: "/home.html" }];

        if (cleanPath === "/games/" || cleanPath === "/games/index.html") {
            crumbs.push({ label: "Games" });
            return crumbs;
        }

        if (cleanPath.startsWith("/games/genres/")) {
            crumbs.push({ label: "Games", href: "/games/" });
            crumbs.push({ label: "Genres", href: "/games/genres/" });
            if (!/\/games\/genres\/$/i.test(cleanPath)) crumbs.push({ label: heading || "Genre" });
            return crumbs;
        }

        if (cleanPath.startsWith("/games/collections/")) {
            crumbs.push({ label: "Games", href: "/games/" });
            crumbs.push({ label: "Collections", href: "/games/collections/" });
            if (!/\/games\/collections\/$/i.test(cleanPath)) crumbs.push({ label: heading || "Collection" });
            return crumbs;
        }

        if (cleanPath.startsWith("/games/publishers/")) {
            crumbs.push({ label: "Games", href: "/games/" });
            crumbs.push({ label: "Publishers", href: "/games/publishers/" });
            if (!/\/games\/publishers\/$/i.test(cleanPath)) crumbs.push({ label: heading || "Publisher" });
            return crumbs;
        }

        if (cleanPath.startsWith("/games/years/")) {
            crumbs.push({ label: "Games", href: "/games/" });
            crumbs.push({ label: "Release Year", href: "/games/years/" });
            if (!/\/games\/years\/$/i.test(cleanPath)) crumbs.push({ label: heading || "Year" });
            return crumbs;
        }

        if (cleanPath.startsWith("/games/") && (game || pageId === "single-game" || currentGameSlug())) {
            crumbs.push({ label: "Games", href: "/games/" });
            crumbs.push({ label: heading || "Game" });
            return crumbs;
        }

        if (cleanPath.startsWith("/music/")) {
            crumbs.push({ label: "Music", href: "/music/" });
            if (!/\/music\/$/i.test(cleanPath)) crumbs.push({ label: heading || "Composer" });
            return crumbs;
        }

        if (cleanPath.startsWith("/videos/")) {
            crumbs.push({ label: "Videos", href: "/videos/" });
            if (!/\/videos\/$/i.test(cleanPath)) crumbs.push({ label: heading || "Video" });
            return crumbs;
        }

        if (cleanPath.startsWith("/zzap64/")) {
            crumbs.push({ label: "Zzap!64", href: "/zzap64/" });
            if (!/\/zzap64\/$/i.test(cleanPath)) crumbs.push({ label: heading || "Archive" });
            return crumbs;
        }

        if (cleanPath.startsWith("/retro-specials/")) {
            crumbs.push({ label: "Retro Specials", href: "/games/collections/retro-specials.html" });
            if (!/\/retro-specials\/$/i.test(cleanPath)) crumbs.push({ label: heading || "Feature" });
            return crumbs;
        }

        if (cleanPath.startsWith("/retro-events/")) {
            crumbs.push({ label: "Retro Events", href: "/games/collections/retro-events.html" });
            if (!/\/retro-events\/$/i.test(cleanPath)) crumbs.push({ label: heading || "Event" });
            return crumbs;
        }

        if (heading) crumbs.push({ label: heading });
        return crumbs;
    }

    function renderBreadcrumbs(game) {
        if (existingBreadcrumbs()) return;
        const main = document.querySelector("main, .ccg-main");
        if (!main) return;

        const model = buildBreadcrumbModel(game);
        if (model.length < 2) return;

        const nav = document.createElement("nav");
        nav.className = "ccg-engagement-breadcrumbs";
        nav.setAttribute("aria-label", "Breadcrumb");
        nav.setAttribute("data-ccg-engagement-breadcrumbs", "true");

        const list = document.createElement("ol");
        list.className = "ccg-engagement-breadcrumbs__list";

        model.forEach((crumb, index) => {
            const item = document.createElement("li");
            item.className = "ccg-engagement-breadcrumbs__item";

            if (crumb.href && index !== model.length - 1) {
                const link = document.createElement("a");
                link.href = crumb.href;
                link.textContent = crumb.label;
                link.dataset.ccgBreadcrumb = crumb.label;
                item.appendChild(link);
            } else {
                const current = document.createElement("span");
                current.textContent = crumb.label;
                current.setAttribute("aria-current", "page");
                item.appendChild(current);
            }

            list.appendChild(item);
        });

        nav.appendChild(list);
        main.insertBefore(nav, main.firstChild);
    }

    /* ========================================================
       SINGLE GAME: DEEP ARCHIVE ROUTES
    ======================================================== */

    function buildGameDiscoveryLinks(game) {
        if (!game) return [];
        const links = [];
        const seen = new Set();

        function add(type, label, value, href) {
            const key = `${type}|${normalize(value)}`;
            if (!value || !href || seen.has(key)) return;
            seen.add(key);
            links.push({ type, label, value: String(value), href });
        }

        toArray(game.publisher).slice(0, 2).forEach((value) => {
            add("publisher", "Publisher", value, `/games/publishers/${slugify(value)}/`);
        });

        toArray(game.genres || game.genre).slice(0, 2).forEach((value) => {
            add("genre", "Genre", titleCase(value), genreHref(value));
        });

        if (game.year) {
            add("year", "Year", game.year, `/games/years/${encodeURIComponent(String(game.year))}/`);
        }

        toArray(game.composer).slice(0, 2).forEach((value) => {
            add("composer", "Composer", value, `/music/${slugify(value)}/`);
        });

        return links.slice(0, 7);
    }

    function renderGameDiscoveryLinks(game) {
        if (!game || document.querySelector("[data-ccg-game-discovery-links]")) return;
        const links = buildGameDiscoveryLinks(game);
        if (!links.length) return;

        const section = document.createElement("section");
        section.className = "ccg-game-discovery-links";
        section.setAttribute("data-ccg-game-discovery-links", "true");
        section.setAttribute("aria-labelledby", "ccg-game-discovery-links-title");

        const header = document.createElement("div");
        header.className = "ccg-game-discovery-links__header";
        header.innerHTML = `
            <p class="ccg-game-discovery-links__kicker">Keep Exploring</p>
            <h2 class="ccg-game-discovery-links__title" id="ccg-game-discovery-links-title">Explore ${String(game.title || "This Game")}</h2>
        `;

        const nav = document.createElement("nav");
        nav.className = "ccg-game-discovery-links__nav";
        nav.setAttribute("aria-label", `More archive routes connected to ${game.title || "this game"}`);

        links.forEach((entry) => {
            const link = document.createElement("a");
            link.className = "ccg-game-discovery-links__link";
            link.href = entry.href;
            link.dataset.ccgEngagementLink = entry.type;
            link.dataset.ccgEngagementValue = entry.value;

            const label = document.createElement("strong");
            label.textContent = `${entry.label}:`;
            link.append(label, document.createTextNode(entry.value));
            nav.appendChild(link);
        });

        section.append(header, nav);

        const related = document.querySelector(".game-section--related");
        if (related?.parentNode) {
            related.parentNode.insertBefore(section, related);
            return;
        }

        const main = document.querySelector("main, .ccg-main");
        main?.appendChild(section);
    }

    /* ========================================================
       HOME: LIVING ARCHIVE PULSE
    ======================================================== */

    function stableHash(value) {
        let hash = 2166136261;
        const text = String(value || "");
        for (let index = 0; index < text.length; index += 1) {
            hash ^= text.charCodeAt(index);
            hash = Math.imul(hash, 16777619);
        }
        return hash >>> 0;
    }

    function utcDayKey() {
        const now = new Date();
        return `${now.getUTCFullYear()}-${now.getUTCMonth() + 1}-${now.getUTCDate()}`;
    }

    function dailyGame(games, salt) {
        const usable = games.filter((game) => game?.title && game?.slug);
        if (!usable.length) return null;
        const index = stableHash(`${utcDayKey()}|${salt || "daily"}`) % usable.length;
        return usable[index];
    }

    function latestZzapSpecial(items) {
        return items
            .filter((item) => /zzap/i.test(String(item?.title || item?.slug || "")))
            .sort((a, b) => {
                const aDate = Date.parse(a?.created_at || a?.updated_at || "") || 0;
                const bDate = Date.parse(b?.created_at || b?.updated_at || "") || 0;
                return bDate - aDate || Number(b?.order || 0) - Number(a?.order || 0);
            })[0] || null;
    }

    function gameMeta(game) {
        return [
            game?.year,
            ...toArray(game?.publisher).slice(0, 1),
            ...toArray(game?.genres || game?.genre).slice(0, 1).map(titleCase)
        ].filter(Boolean).join(" · ");
    }

    function pulseCard(label, name, meta, href, type) {
        const card = document.createElement("a");
        card.className = "ccg-archive-pulse__card";
        card.href = href;
        card.dataset.ccgArchivePulse = type;

        const eyebrow = document.createElement("span");
        eyebrow.className = "ccg-archive-pulse__label";
        eyebrow.textContent = label;

        const title = document.createElement("span");
        title.className = "ccg-archive-pulse__name";
        title.textContent = name;

        const detail = document.createElement("span");
        detail.className = "ccg-archive-pulse__meta";
        detail.textContent = meta || "Explore the archive";

        card.append(eyebrow, title, detail);
        return card;
    }

    function renderHomePulse(games, specials) {
        if (pageId !== "home" || document.querySelector("[data-ccg-archive-pulse]")) return;
        const main = document.querySelector(".ccg-main--home, .ccg-page--home main, main");
        if (!main) return;

        const gameOfDay = dailyGame(games, "game-of-the-day");
        const archivePick = dailyGame(games, "archive-pick");
        const zzap = latestZzapSpecial(specials);

        if (!gameOfDay && !archivePick && !zzap) return;

        const section = document.createElement("section");
        section.className = "ccg-archive-pulse";
        section.setAttribute("data-ccg-archive-pulse", "true");
        section.setAttribute("aria-labelledby", "ccg-archive-pulse-title");

        const header = document.createElement("div");
        header.className = "ccg-archive-pulse__header";
        header.innerHTML = `
            <div>
                <p class="ccg-archive-pulse__kicker">Archive Pulse</p>
                <h2 class="ccg-archive-pulse__title" id="ccg-archive-pulse-title">Something Different Every Visit</h2>
            </div>
            <a class="ccg-archive-pulse__all" href="/games/">Browse all games →</a>
        `;

        const grid = document.createElement("div");
        grid.className = "ccg-archive-pulse__grid";

        if (gameOfDay) {
            grid.appendChild(pulseCard(
                "Game of the Day",
                gameOfDay.title,
                gameMeta(gameOfDay),
                `/games/${gameOfDay.slug}/`,
                "game-of-the-day"
            ));
        }

        if (archivePick) {
            grid.appendChild(pulseCard(
                "Archive Pick",
                archivePick.title,
                gameMeta(archivePick),
                `/games/${archivePick.slug}/`,
                "archive-pick"
            ));
        }

        if (zzap) {
            grid.appendChild(pulseCard(
                "Zzap!64 Feature",
                zzap.title || "Zzap!64 Archive",
                zzap.summary || "Sizzlers, Gold Medals and magazine history",
                `/retro-specials/${String(zzap.slug || zzap.id || "").replace(/^\/+|\/+$/g, "")}/`,
                "zzap-feature"
            ));
        }

        section.append(header, grid);

        const insertionPoint = main.querySelector(".ccg-home-search-command, .home-hero");
        if (insertionPoint?.parentNode) {
            insertionPoint.insertAdjacentElement("afterend", section);
        } else {
            main.insertBefore(section, main.firstChild);
        }
    }

    /* ========================================================
       CONSENT-AWARE ENGAGEMENT ANALYTICS
    ======================================================== */

    function describeLink(link) {
        return String(
            link?.dataset?.ccgEngagementValue ||
            link?.dataset?.ccgBreadcrumb ||
            link?.textContent ||
            ""
        ).replace(/\s+/g, " ").trim().slice(0, 120);
    }

    function bindClickAnalytics() {
        document.addEventListener("click", (event) => {
            const target = event.target instanceof Element ? event.target : null;
            const link = target?.closest("a[href]");
            if (!link) return;

            if (link.closest("[data-ccg-archive-pulse]")) {
                track("ccg_home_pulse_click", {
                    content_type: link.dataset.ccgArchivePulse || "archive-pulse",
                    item_name: describeLink(link),
                    link_url: link.href
                });
                return;
            }

            if (link.closest("[data-ccg-game-discovery-links]")) {
                track("ccg_discovery_click", {
                    discovery_type: link.dataset.ccgEngagementLink || "game-route",
                    item_name: describeLink(link),
                    link_url: link.href
                });
                return;
            }

            if (link.closest("[data-ccg-engagement-breadcrumbs]")) {
                track("ccg_breadcrumb_click", {
                    item_name: describeLink(link),
                    link_url: link.href
                });
                return;
            }

            if (link.matches(".ccg-global-search__result")) {
                const input = document.querySelector(".ccg-global-search__input");
                track("ccg_search_result_click", {
                    search_term: String(input?.value || "").trim().slice(0, 100),
                    item_name: describeLink(link),
                    link_url: link.href
                });
                return;
            }

            if (link.matches(".related-card, .related-card--smart")) {
                track("ccg_related_game_click", {
                    item_name: describeLink(link),
                    link_url: link.href
                });
                return;
            }

            if (link.matches(".ccg-recently-viewed__card")) {
                track("ccg_recent_game_click", {
                    item_name: describeLink(link),
                    link_url: link.href
                });
                return;
            }

            try {
                const url = new URL(link.href, window.location.href);
                if (/youtube\.com$|youtu\.be$/i.test(url.hostname.replace(/^www\./, ""))) {
                    track("ccg_youtube_outbound", {
                        item_name: describeLink(link),
                        link_url: url.href
                    });
                }
            } catch (error) {}
        }, { passive: true });
    }

    function bindSearchAnalytics() {
        document.addEventListener("input", (event) => {
            const input = event.target instanceof HTMLInputElement ? event.target : null;
            if (!input?.matches(".ccg-global-search__input")) return;

            window.clearTimeout(state.searchTimer);
            state.searchTimer = window.setTimeout(() => {
                const query = input.value.trim();
                if (query.length < MIN_SEARCH_LENGTH) return;

                const modal = input.closest(".ccg-global-search") || document;
                const count = modal.querySelectorAll(".ccg-global-search__result").length;
                const signature = `${normalize(query)}|${count}`;
                if (signature === state.lastSearchSignature) return;
                state.lastSearchSignature = signature;

                track("ccg_site_search", {
                    search_term: query.slice(0, 100),
                    result_count: count
                });

                const loading = modal.querySelector(".ccg-global-search__loading");
                if (count === 0 && !loading) {
                    track("ccg_search_zero", {
                        search_term: query.slice(0, 100)
                    });
                }
            }, 850);
        });
    }

    async function enhanceSingleGame(suppliedGame) {
        const isSingleGame = pageId === "single-game"
            || Boolean(document.querySelector(".ccg-page--single-game"))
            || Boolean(currentGameSlug());
        if (!isSingleGame) return;

        const games = await loadGames();
        const game = findGame(games, suppliedGame);
        if (!game) return;

        if (!existingBreadcrumbs()) renderBreadcrumbs(game);
        renderGameDiscoveryLinks(game);
    }

    async function init() {
        ensureCss();
        bindClickAnalytics();
        bindSearchAnalytics();

        if (pageId !== "single-game" && !currentGameSlug()) {
            renderBreadcrumbs(null);
        }

        if (pageId === "home") {
            const [games, specials] = await Promise.all([loadGames(), loadRetroSpecials()]);
            renderHomePulse(games, specials);
        }

        await enhanceSingleGame(null);
    }

    window.addEventListener("ccg:game-loaded", (event) => {
        void enhanceSingleGame(event.detail?.game || null);
    });

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", () => void init(), { once: true });
    } else {
        void init();
    }
})();
