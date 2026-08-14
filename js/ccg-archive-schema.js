/* ============================================================
   CCG ARCHIVE STRUCTURED DATA
   ------------------------------------------------------------
   Adds missing CollectionPage, ItemList, BreadcrumbList and
   Quiz schema to archive routes without duplicating schema that
   is already rendered by an authoritative page generator.
============================================================ */

(function () {
    "use strict";

    if (window.CCG_ARCHIVE_SCHEMA_READY) return;
    window.CCG_ARCHIVE_SCHEMA_READY = true;

    const SITE_ORIGIN = "https://www.cheekycommodoregamer.co.uk";
    const SCHEMA_ID = "ccg-archive-schema";
    const GAME_DATA_PATH = "/games/games.json";
    const MAX_LIST_ITEMS = 200;
    const RESERVED_GAME_SEGMENTS = new Set([
        "index.html",
        "genres",
        "collections",
        "publishers",
        "developers",
        "years",
        "platforms",
        "downloads",
        "discover"
    ]);

    const ROOT_ARCHIVES = [
        {
            pattern: /^\/games\/?(?:index\.html)?$/i,
            key: "games",
            name: "Commodore 64 & Amiga Games",
            description: "Browse the Cheeky Commodore Gamer archive of Commodore 64 and Amiga games.",
            parent: null,
            itemKind: "games"
        },
        {
            pattern: /^\/games\/genres\/?(?:index\.html)?$/i,
            key: "genres",
            name: "C64 & Amiga Game Genres",
            description: "Browse Commodore 64 and Amiga games by genre.",
            parent: "Games",
            itemKind: "archives"
        },
        {
            pattern: /^\/games\/publishers\/?(?:index\.html)?$/i,
            key: "publishers",
            name: "C64 & Amiga Game Publishers",
            description: "Browse Commodore 64 and Amiga games by publisher.",
            parent: "Games",
            itemKind: "archives"
        },
        {
            pattern: /^\/games\/developers\/?(?:index\.html)?$/i,
            key: "developers",
            name: "C64 & Amiga Game Developers",
            description: "Browse Commodore 64 and Amiga games by developer.",
            parent: "Games",
            itemKind: "archives"
        },
        {
            pattern: /^\/games\/years\/?(?:index\.html)?$/i,
            key: "years",
            name: "C64 & Amiga Games by Year",
            description: "Browse Commodore 64 and Amiga games by release year.",
            parent: "Games",
            itemKind: "archives"
        },
        {
            pattern: /^\/games\/platforms\/?(?:index\.html)?$/i,
            key: "platforms",
            name: "Commodore Game Platforms",
            description: "Browse the CCG archive by Commodore 64 and Amiga platform.",
            parent: "Games",
            itemKind: "archives"
        },
        {
            pattern: /^\/games\/collections\/?(?:index\.html)?$/i,
            key: "collections",
            name: "Curated Commodore Game Collections",
            description: "Browse curated Commodore 64 and Amiga game collections.",
            parent: "Games",
            itemKind: "archives"
        },
        {
            pattern: /^\/games\/downloads\/?(?:index\.html)?$/i,
            key: "downloads",
            name: "Authorised C64 & Amiga Downloads",
            description: "Browse C64 and Amiga games with authorised, public-domain or creator-approved freeware downloads.",
            parent: "Games",
            itemKind: "games"
        },
        {
            pattern: /^\/music\/?(?:index\.html)?$/i,
            key: "music",
            name: "C64 & Amiga Music Hub",
            description: "Browse Commodore 64 and Amiga game music and composer archives.",
            parent: null,
            itemKind: "archives"
        },
        {
            pattern: /^\/retro-specials\/?(?:index\.html)?$/i,
            key: "retro-specials",
            name: "CCG Retro Specials",
            description: "Browse Cheeky Commodore Gamer long-form retro features and video collections.",
            parent: null,
            itemKind: "archives"
        },
        {
            pattern: /^\/zzap64\/?(?:index\.html)?$/i,
            key: "zzap64",
            name: "Zzap!64 Awards Archive",
            description: "Browse the searchable CCG archive of Zzap!64 awards and reviewed games.",
            parent: null,
            itemKind: "archives"
        }
    ];

    const DETAIL_ARCHIVES = [
        { pattern: /^\/games\/genres\/(?!index\.html)[^/]+\/?$/i, parentName: "Genres", parentUrl: "/games/genres/" },
        { pattern: /^\/games\/publishers\/(?!index\.html)[^/]+\/?$/i, parentName: "Publishers", parentUrl: "/games/publishers/" },
        { pattern: /^\/games\/developers\/(?!index\.html)[^/]+\/?$/i, parentName: "Developers", parentUrl: "/games/developers/" },
        { pattern: /^\/games\/years\/(?!index\.html)[^/]+\/?$/i, parentName: "Years", parentUrl: "/games/years/" },
        { pattern: /^\/games\/platforms\/(?!index\.html)[^/]+\/?$/i, parentName: "Platforms", parentUrl: "/games/platforms/" },
        { pattern: /^\/games\/collections\/(?!index\.html)[^/]+\/?$/i, parentName: "Collections", parentUrl: "/games/collections/" },
        { pattern: /^\/music\/(?!index\.html)[^/]+\/?$/i, parentName: "Music Hub", parentUrl: "/music/" },
        { pattern: /^\/retro-specials\/(?!index\.html)[^/]+\/?$/i, parentName: "Retro Specials", parentUrl: "/retro-specials/" }
    ];

    const state = {
        gamesPromise: null,
        timer: null,
        observer: null,
        lastSignature: ""
    };

    function normalisePath(pathname) {
        let path = String(pathname || "/").split(/[?#]/, 1)[0] || "/";
        if (!path.startsWith("/")) path = `/${path}`;
        return path.replace(/\/index\.html$/i, "/").replace(/\/{2,}/g, "/");
    }

    function absoluteUrl(value) {
        try {
            return new URL(value, SITE_ORIGIN).href;
        } catch (error) {
            return "";
        }
    }

    function canonicalUrl() {
        const declared = document.querySelector('link[rel="canonical"]')?.getAttribute("href");
        return absoluteUrl(declared || window.location.pathname);
    }

    function pageName(fallback = "CCG Archive") {
        return String(
            document.querySelector("main h1, .ccg-main h1, h1")?.textContent
            || document.title.split("|")[0]
            || fallback
        ).replace(/\s+/g, " ").trim();
    }

    function pageDescription(fallback) {
        return String(document.querySelector('meta[name="description"]')?.getAttribute("content") || fallback || "")
            .replace(/\s+/g, " ")
            .trim();
    }

    function titleCase(value) {
        return String(value || "")
            .replace(/\.html$/i, "")
            .replace(/[-_]+/g, " ")
            .split(/\s+/)
            .filter(Boolean)
            .map((part) => part.length <= 3 && part === part.toUpperCase()
                ? part
                : part.charAt(0).toUpperCase() + part.slice(1))
            .join(" ");
    }

    function collectExistingTypes() {
        const types = new Set();

        function visit(value) {
            if (!value) return;
            if (Array.isArray(value)) {
                value.forEach(visit);
                return;
            }
            if (typeof value !== "object") return;

            const rawType = value["@type"];
            if (Array.isArray(rawType)) rawType.forEach((type) => types.add(String(type)));
            else if (rawType) types.add(String(rawType));

            if (Array.isArray(value["@graph"])) value["@graph"].forEach(visit);
        }

        document.querySelectorAll('script[type="application/ld+json"]').forEach((script) => {
            if (script.id === SCHEMA_ID) return;
            try {
                visit(JSON.parse(script.textContent || "null"));
            } catch (error) {}
        });

        return types;
    }

    function isGameUrl(url) {
        try {
            const parsed = new URL(url, SITE_ORIGIN);
            if (parsed.origin !== SITE_ORIGIN) return false;
            const match = parsed.pathname.match(/^\/games\/([^/]+)\/?(?:index\.html)?$/i);
            if (!match) return false;
            return !RESERVED_GAME_SEGMENTS.has(String(match[1] || "").toLowerCase());
        } catch (error) {
            return false;
        }
    }

    function linkName(link, url) {
        const visible = String(
            link?.getAttribute("data-title")
            || link?.querySelector("h2, h3, h4, [class*='title'], [class*='name']")?.textContent
            || link?.getAttribute("aria-label")
            || link?.textContent
            || ""
        ).replace(/\s+/g, " ").trim();

        if (visible && visible.length <= 140) return visible;
        const parts = new URL(url).pathname.split("/").filter(Boolean);
        return titleCase(parts[parts.length - 1] || "Archive item");
    }

    function collectLinks(predicate) {
        const items = [];
        const seen = new Set();

        document.querySelectorAll("main a[href], .ccg-main a[href]").forEach((link) => {
            const url = absoluteUrl(link.getAttribute("href"));
            if (!url || seen.has(url) || !predicate(url)) return;
            seen.add(url);
            items.push({ name: linkName(link, url), url });
        });

        return items;
    }

    function collectGameLinks() {
        return collectLinks(isGameUrl);
    }

    function collectArchiveLinks(path) {
        const base = path.endsWith("/") ? path : `${path}/`;
        return collectLinks((url) => {
            const parsed = new URL(url);
            if (!parsed.pathname.startsWith(base)) return false;
            if (parsed.pathname === base || parsed.pathname === `${base}index.html`) return false;
            return !isGameUrl(url);
        });
    }

    async function loadGames() {
        if (state.gamesPromise) return state.gamesPromise;
        state.gamesPromise = fetch(GAME_DATA_PATH, { cache: "force-cache" })
            .then((response) => {
                if (!response.ok) throw new Error(`Games archive HTTP ${response.status}`);
                return response.json();
            })
            .then((data) => Array.isArray(data) ? data : [])
            .catch(() => []);
        return state.gamesPromise;
    }

    function gameListFromData(games) {
        const seen = new Set();
        return games
            .filter((game) => game && game.slug && game.title)
            .sort((a, b) => String(a.title).localeCompare(String(b.title), "en-GB"))
            .filter((game) => {
                const url = absoluteUrl(`/games/${String(game.slug).replace(/^\/+|\/+$/g, "")}/`);
                if (seen.has(url)) return false;
                seen.add(url);
                return true;
            })
            .map((game) => ({
                name: String(game.title).trim(),
                url: absoluteUrl(`/games/${String(game.slug).replace(/^\/+|\/+$/g, "")}/`)
            }));
    }

    function breadcrumbNode(items) {
        return {
            "@type": "BreadcrumbList",
            "@id": `${canonicalUrl()}#breadcrumbs`,
            itemListElement: items.map((item, index) => ({
                "@type": "ListItem",
                position: index + 1,
                name: item.name,
                item: absoluteUrl(item.url)
            }))
        };
    }

    function itemListNode(items, name) {
        return {
            "@type": "ItemList",
            "@id": `${canonicalUrl()}#items`,
            name,
            numberOfItems: items.length,
            itemListOrder: "https://schema.org/ItemListOrderAscending",
            itemListElement: items.slice(0, MAX_LIST_ITEMS).map((item, index) => ({
                "@type": "ListItem",
                position: index + 1,
                name: item.name,
                url: item.url
            }))
        };
    }

    function collectionPageNode(name, description, hasItems) {
        const node = {
            "@type": "CollectionPage",
            "@id": `${canonicalUrl()}#page`,
            name,
            description,
            url: canonicalUrl(),
            isPartOf: {
                "@type": "WebSite",
                "@id": `${SITE_ORIGIN}/#website`,
                name: "Cheeky Commodore Gamer",
                url: `${SITE_ORIGIN}/`
            }
        };
        if (hasItems) node.mainEntity = { "@id": `${canonicalUrl()}#items` };
        return node;
    }

    function rootBreadcrumbs(config) {
        const items = [{ name: "Home", url: "/" }];
        if (config.key !== "games" && config.parent === "Games") {
            items.push({ name: "Games", url: "/games/" });
        }
        items.push({ name: config.name, url: canonicalUrl() });
        return items;
    }

    function detailBreadcrumbs(config, name) {
        const items = [{ name: "Home", url: "/" }];
        if (config.parentUrl.startsWith("/games/")) {
            items.push({ name: "Games", url: "/games/" });
        }
        items.push({ name: config.parentName, url: config.parentUrl });
        items.push({ name, url: canonicalUrl() });
        return items;
    }

    function quizNodes(existingTypes) {
        const nodes = [];
        const url = canonicalUrl();
        const name = pageName("Commodore Gaming Quiz");
        const description = pageDescription("Test your Commodore 64 and Amiga knowledge with the CCG quiz.");

        if (!existingTypes.has("Quiz")) {
            nodes.push({
                "@type": "Quiz",
                "@id": `${url}#quiz`,
                name,
                description,
                url,
                educationalUse: "Assessment",
                learningResourceType: "Quiz",
                about: [
                    { "@type": "VideoGame", name: "Commodore 64 games" },
                    { "@type": "VideoGame", name: "Amiga games" }
                ],
                isPartOf: { "@id": `${SITE_ORIGIN}/#website` }
            });
        }

        if (!existingTypes.has("BreadcrumbList")) {
            nodes.push(breadcrumbNode([
                { name: "Home", url: "/" },
                { name: "Quiz", url }
            ]));
        }

        return nodes;
    }

    async function buildArchiveNodes(path, existingTypes) {
        const rootConfig = ROOT_ARCHIVES.find((entry) => entry.pattern.test(path));
        if (rootConfig) {
            let items = rootConfig.itemKind === "games"
                ? collectGameLinks()
                : collectArchiveLinks(path);

            if (rootConfig.key === "games" && items.length < 10) {
                items = gameListFromData(await loadGames());
            }

            const nodes = [];
            if (!existingTypes.has("CollectionPage")) {
                nodes.push(collectionPageNode(
                    rootConfig.name,
                    pageDescription(rootConfig.description),
                    items.length > 0
                ));
            }
            if (items.length && !existingTypes.has("ItemList")) {
                nodes.push(itemListNode(items, `${rootConfig.name} index`));
            }
            if (!existingTypes.has("BreadcrumbList")) {
                nodes.push(breadcrumbNode(rootBreadcrumbs(rootConfig)));
            }
            return nodes;
        }

        const detailConfig = DETAIL_ARCHIVES.find((entry) => entry.pattern.test(path));
        if (!detailConfig) return [];

        const name = pageName(titleCase(path.split("/").filter(Boolean).pop()));
        const description = pageDescription(`Browse ${name} in the Cheeky Commodore Gamer archive.`);
        const items = collectGameLinks();
        const nodes = [];

        if (!existingTypes.has("CollectionPage")) {
            nodes.push(collectionPageNode(name, description, items.length > 0));
        }
        if (items.length && !existingTypes.has("ItemList")) {
            nodes.push(itemListNode(items, `${name} games`));
        }
        if (!existingTypes.has("BreadcrumbList")) {
            nodes.push(breadcrumbNode(detailBreadcrumbs(detailConfig, name)));
        }

        return nodes;
    }

    function writeSchema(nodes) {
        const existing = document.getElementById(SCHEMA_ID);
        if (!nodes.length) {
            existing?.remove();
            state.lastSignature = "";
            return;
        }

        const payload = {
            "@context": "https://schema.org",
            "@graph": nodes
        };
        const content = JSON.stringify(payload);
        if (content === state.lastSignature) return;

        const script = existing || document.createElement("script");
        script.type = "application/ld+json";
        script.id = SCHEMA_ID;
        script.textContent = content;
        if (!existing) document.head.appendChild(script);
        state.lastSignature = content;
    }

    async function render() {
        const path = normalisePath(window.location.pathname);
        const isQuiz = /^\/quiz\/quiz\.html$/i.test(path) || /^\/quiz\/?$/i.test(path);
        const isArchive = ROOT_ARCHIVES.some((entry) => entry.pattern.test(path))
            || DETAIL_ARCHIVES.some((entry) => entry.pattern.test(path));
        if (!isQuiz && !isArchive) return;

        const existingTypes = collectExistingTypes();
        const nodes = isQuiz
            ? quizNodes(existingTypes)
            : await buildArchiveNodes(path, existingTypes);
        writeSchema(nodes);
    }

    function scheduleRender(delay = 80) {
        window.clearTimeout(state.timer);
        state.timer = window.setTimeout(() => void render(), delay);
    }

    function observeMain() {
        const main = document.querySelector("main, .ccg-main");
        if (!main || !("MutationObserver" in window)) return;
        state.observer = new MutationObserver(() => scheduleRender(120));
        state.observer.observe(main, { childList: true, subtree: true });
        window.setTimeout(() => state.observer?.disconnect(), 5000);
    }

    function init() {
        scheduleRender(0);
        window.setTimeout(() => scheduleRender(0), 700);
        window.setTimeout(() => scheduleRender(0), 1800);
        observeMain();
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init, { once: true });
    } else {
        init();
    }
})();
