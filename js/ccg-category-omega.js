/* ============================================================
   CCG CATEGORY OMEGA — GENRES + COLLECTIONS
   ------------------------------------------------------------
   Shared enhancement layer for:
   • /games/genres/
   • /games/collections/

   Goals:
   • stronger C64 + Amiga search intent in titles, H1s and copy
   • genre / collection-specific hero identity
   • useful internal archive links
   • richer index cards without changing existing routes
   • CollectionPage + Breadcrumb structured data support
============================================================ */

(function () {
    "use strict";

    if (window.CCG_CATEGORY_OMEGA_READY) return;
    window.CCG_CATEGORY_OMEGA_READY = true;

    const root = document.documentElement;
    const path = String(window.location.pathname || "");
    const pageId = String(root.getAttribute("data-ccg-page") || "").toLowerCase();
    const isGenrePath = /^\/games\/genres\//i.test(path);
    const isCollectionPath = /^\/games\/collections\//i.test(path);
    if (!isGenrePath && !isCollectionPath) return;

    const CSS_PATH = "/resources/css/ccg-category-omega.css";
    const SITE_NAME = "Cheeky Commodore Gamer";
    const SITE_ORIGIN = "https://www.cheekycommodoregamer.co.uk";

    const GENRES = Object.freeze({
        "action-adventure-games.html": {
            name: "Action Adventure",
            theme: "action-adventure",
            icon: "⚔",
            tagline: "Exploration, danger and arcade action across sprawling Commodore worlds.",
            description: "Explore C64 and Amiga action-adventure games, combining exploration, combat, puzzles and arcade action across classic Commodore releases.",
            card: "Exploration, combat and puzzles in the same adventure.",
            related: ["adventure-games.html", "platform-games.html", "role-playing-games.html", "shooting-games.html"]
        },
        "adventure-games.html": {
            name: "Adventure",
            theme: "adventure",
            icon: "🗝",
            tagline: "Mysteries, conversations and unforgettable worlds built for curious players.",
            description: "Browse C64 and Amiga adventure games, from text and graphic adventures to point-and-click classics, mysteries and story-led Commodore games.",
            card: "Story-led classics, mysteries and point-and-click adventures.",
            related: ["action-adventure-games.html", "puzzle-games.html", "role-playing-games.html", "horror-games.html"]
        },
        "arcade-games.html": {
            name: "Arcade",
            theme: "arcade",
            icon: "★",
            tagline: "High-score chasing, reflex tests and coin-op spirit on C64 and Amiga.",
            description: "Browse C64 and Amiga arcade games, including coin-op conversions, score attacks and fast arcade-style Commodore classics.",
            card: "High scores, coin-op conversions and fast arcade play.",
            related: ["shooting-games.html", "platform-games.html", "racing-games.html", "fighting-games.html"]
        },
        "casino-games.html": {
            name: "Casino Games",
            theme: "casino",
            icon: "◆",
            tagline: "Cards, tables and computerised wagers from the Commodore era.",
            description: "Explore C64 and Amiga casino games, including poker, blackjack, roulette, fruit machines and other gambling-themed Commodore releases.",
            card: "Poker, blackjack, roulette and gambling-themed releases.",
            related: ["quiz-games.html", "strategy-games.html", "miscellaneous.html", "puzzle-games.html"]
        },
        "fighting-games.html": {
            name: "Fighting Games",
            theme: "fighting",
            icon: "拳",
            tagline: "One-on-one battles, scrolling brawlers and joystick-testing rivalries.",
            description: "Browse C64 and Amiga fighting games, from one-on-one martial arts contests to scrolling beat 'em ups and arcade conversions.",
            card: "Martial arts, beat 'em ups and one-on-one battles.",
            related: ["arcade-games.html", "action-adventure-games.html", "shooting-games.html", "sports-games.html"]
        },
        "horror-games.html": {
            name: "Horror Games",
            theme: "horror",
            icon: "☠",
            tagline: "Dark mansions, monsters and uneasy nights in the Commodore archive.",
            description: "Explore C64 and Amiga horror games, including survival, gothic, monster and supernatural titles from the classic Commodore years.",
            card: "Gothic adventures, monsters and supernatural scares.",
            related: ["adventure-games.html", "action-adventure-games.html", "shooting-games.html", "role-playing-games.html"]
        },
        "miscellaneous.html": {
            name: "Miscellaneous Games",
            theme: "misc",
            icon: "✦",
            tagline: "The unusual, experimental and hard-to-file corners of C64 and Amiga gaming.",
            description: "Browse unusual C64 and Amiga games that sit outside the main genres, including experimental, novelty and hybrid Commodore releases.",
            card: "Experimental, unusual and hard-to-file Commodore games.",
            related: ["puzzle-games.html", "quiz-games.html", "arcade-games.html", "strategy-games.html"]
        },
        "platform-games.html": {
            name: "Platform Games",
            theme: "platform",
            icon: "▲",
            tagline: "Ladders, ledges, precision jumps and scrolling worlds from two generations of Commodore hardware.",
            description: "Browse C64 and Amiga platform games, from single-screen classics to scrolling platform adventures and mascot-era favourites.",
            card: "Jumping, climbing and scrolling platform classics.",
            related: ["arcade-games.html", "action-adventure-games.html", "puzzle-games.html", "shooting-games.html"]
        },
        "puzzle-games.html": {
            name: "Puzzle Games",
            theme: "puzzle",
            icon: "◇",
            tagline: "Logic, timing and brain-teasers where the next move matters more than the trigger finger.",
            description: "Browse C64 and Amiga puzzle games, including logic games, tile puzzlers, action puzzles and classic brain-teasers for Commodore computers.",
            card: "Logic games, action puzzles and brain-teasing classics.",
            related: ["strategy-games.html", "adventure-games.html", "quiz-games.html", "platform-games.html"]
        },
        "quiz-games.html": {
            name: "Quiz Games",
            theme: "quiz",
            icon: "?",
            tagline: "Trivia, game-show formats and questions that test more than joystick reflexes.",
            description: "Browse C64 and Amiga quiz games, including trivia, game-show adaptations and question-based Commodore releases.",
            card: "Trivia, game shows and question-based Commodore games.",
            related: ["puzzle-games.html", "casino-games.html", "miscellaneous.html", "strategy-games.html"]
        },
        "racing-games.html": {
            name: "Racing Games",
            theme: "racing",
            icon: "➤",
            tagline: "Arcade speed, road battles and driving simulations across C64 and Amiga.",
            description: "Browse C64 and Amiga racing games, from arcade racers and road battles to Formula One, rally and driving simulations across the Commodore era.",
            card: "Arcade racers, rally, road battles and driving simulations.",
            related: ["sports-games.html", "arcade-games.html", "shooting-games.html", "action-adventure-games.html"]
        },
        "role-playing-games.html": {
            name: "Role-Playing Games",
            theme: "rpg",
            icon: "✧",
            tagline: "Stats, quests, party building and long-form adventures across classic Commodore worlds.",
            description: "Browse C64 and Amiga role-playing games, including dungeon crawlers, fantasy RPGs, party adventures and character-driven Commodore classics.",
            card: "Quests, character building, dungeons and fantasy worlds.",
            related: ["adventure-games.html", "strategy-games.html", "action-adventure-games.html", "horror-games.html"]
        },
        "shooting-games.html": {
            name: "Shooting Games",
            theme: "shooting",
            icon: "✹",
            tagline: "Shoot 'em ups, run-and-gun action and relentless arcade firepower.",
            description: "Browse C64 and Amiga shooting games, including shoot 'em ups, run-and-gun action, space combat and arcade shooters.",
            card: "Shoot 'em ups, run-and-gun action and arcade firepower.",
            related: ["arcade-games.html", "action-adventure-games.html", "platform-games.html", "fighting-games.html"]
        },
        "sports-games.html": {
            name: "Sports Games",
            theme: "sports",
            icon: "●",
            tagline: "Football, athletics, golf, boxing and more from the home-computer sporting years.",
            description: "Browse C64 and Amiga sports games, including football, athletics, golf, boxing, tennis and other classic Commodore sporting releases.",
            card: "Football, athletics, golf, boxing and sporting classics.",
            related: ["racing-games.html", "fighting-games.html", "arcade-games.html", "strategy-games.html"]
        },
        "strategy-games.html": {
            name: "Strategy Games",
            theme: "strategy",
            icon: "♜",
            tagline: "Planning, resources and long battles where thinking ahead wins the day.",
            description: "Browse C64 and Amiga strategy games, including tactical battles, management games, simulations and long-form strategic Commodore classics.",
            card: "Tactics, management, simulations and long-form strategy.",
            related: ["role-playing-games.html", "puzzle-games.html", "adventure-games.html", "sports-games.html"]
        }
    });

    const COLLECTIONS = Object.freeze({
        "cartridge-games.html": {
            name: "Cartridge Games",
            theme: "cartridge",
            icon: "▣",
            tagline: "Instant-loading cartridge releases from the Commodore 64 library.",
            description: "Explore Commodore 64 cartridge games, from early releases to later C64GS-era cartridges and fast-loading editions in the CCG archive.",
            card: "Commodore cartridge releases and C64GS-era games.",
            related: ["licensed-games.html", "top-picks.html", "bpjs-indexed-games.html"]
        },
        "licensed-games.html": {
            name: "Licensed Games",
            theme: "licensed",
            icon: "★",
            tagline: "Film, TV, comic and celebrity licences brought to C64 and Amiga.",
            description: "Browse licensed C64 and Amiga games based on films, television, comics, celebrities and other major entertainment properties.",
            card: "Film, TV, comic and celebrity tie-ins on C64 and Amiga.",
            related: ["cartridge-games.html", "top-picks.html", "retro-specials.html"]
        },
        "bpjs-indexed-games.html": {
            name: "BPjS & BPjM Indexed Games",
            theme: "bpjs",
            icon: "#",
            tagline: "A specialist indexed slice of the CCG Commodore game archive.",
            description: "Explore BPjS and BPjM indexed Commodore 64 and Amiga games collected into one specialist CCG archive route.",
            card: "Specialist BPjS and BPjM indexed Commodore titles.",
            related: ["top-picks.html", "licensed-games.html", "cartridge-games.html"]
        },
        "top-picks.html": {
            name: "CCG Top Picks",
            theme: "top-picks",
            icon: "★",
            tagline: "Selected C64 and Amiga favourites from across the Cheeky Commodore Gamer archive.",
            description: "Browse Cheeky Commodore Gamer's selected C64 and Amiga favourites, bringing together standout Commodore games from across the archive.",
            card: "Selected C64 and Amiga favourites from the CCG archive.",
            related: ["licensed-games.html", "cartridge-games.html", "retro-specials.html"]
        },
        "amiga-demo-music.html": {
            name: "Amiga Demo Music",
            theme: "amiga-demo",
            icon: "♫",
            tagline: "Trackers, modules and scene music celebrating the Amiga demo tradition.",
            description: "Explore Amiga demo music, tracker modules and scene composers through the Cheeky Commodore Gamer Amiga music archive.",
            card: "Tracker modules, demo-scene music and Amiga composers.",
            related: ["retro-specials.html", "top-picks.html", "retro-events.html"]
        },
        "retro-events.html": {
            name: "Retro Events",
            theme: "retro-events",
            icon: "◆",
            tagline: "Shows, exhibitions and gatherings connected to the wider retro-computing scene.",
            description: "Explore retro gaming events, shows and exhibitions covered by Cheeky Commodore Gamer, with a focus on Commodore 64, Amiga and classic computing.",
            card: "Retro shows, exhibitions and Commodore community events.",
            related: ["retro-specials.html", "amiga-demo-music.html", "top-picks.html"]
        },
        "retro-specials.html": {
            name: "Retro Specials",
            theme: "retro-specials",
            icon: "✦",
            tagline: "Long-form C64 and Amiga features, rankings, magazine history and archive projects.",
            description: "Browse C64 and Amiga retro specials from Cheeky Commodore Gamer, including rankings, magazine retrospectives, publisher features and long-form Commodore archive projects.",
            card: "Long-form C64 and Amiga features, rankings and retrospectives.",
            related: ["top-picks.html", "retro-events.html", "amiga-demo-music.html"]
        }
    });

    function ensureCss() {
        if (document.querySelector(`link[href="${CSS_PATH}"]`)) return;
        const link = document.createElement("link");
        link.rel = "stylesheet";
        link.href = CSS_PATH;
        link.setAttribute("data-ccg-category-omega-style", "true");
        document.head.appendChild(link);
    }

    function filename() {
        const clean = path.replace(/\/+$/, "");
        if (!clean || /\/(genres|collections)$/i.test(clean)) return "index.html";
        return clean.split("/").pop() || "index.html";
    }

    function upsertMeta(selector, attribute, value) {
        let meta = document.querySelector(selector);
        if (!meta) {
            meta = document.createElement("meta");
            const pair = selector.match(/^meta\[([^=]+)="([^"]+)"\]$/);
            if (pair) meta.setAttribute(pair[1], pair[2]);
            document.head.appendChild(meta);
        }
        meta.setAttribute(attribute, value);
    }

    function setSeo(profile, kind) {
        const subject = profile.name.replace(/ Games$/i, "");
        const title = kind === "genre"
            ? `${subject} Games on C64 & Amiga | ${SITE_NAME}`
            : `${profile.name} – C64 & Amiga | ${SITE_NAME}`;

        document.title = title;
        upsertMeta('meta[name="description"]', "content", profile.description);
        upsertMeta('meta[property="og:title"]', "content", title);
        upsertMeta('meta[property="og:description"]', "content", profile.description);
        upsertMeta('meta[name="twitter:title"]', "content", title);
        upsertMeta('meta[name="twitter:description"]', "content", profile.description);
    }

    function addStructuredData(profile, kind) {
        if (document.querySelector('script[data-ccg-category-schema="true"]')) return;
        const canonical = document.querySelector('link[rel="canonical"]')?.href || `${SITE_ORIGIN}${path}`;
        const parentName = kind === "genre" ? "Genres" : "Collections";
        const parentUrl = kind === "genre" ? `${SITE_ORIGIN}/games/genres/` : `${SITE_ORIGIN}/games/collections/`;
        const schema = {
            "@context": "https://schema.org",
            "@graph": [
                {
                    "@type": "CollectionPage",
                    "@id": `${canonical}#category`,
                    url: canonical,
                    name: kind === "genre" ? `${profile.name} Games on Commodore 64 and Amiga` : `${profile.name} – Commodore 64 and Amiga`,
                    description: profile.description,
                    isPartOf: {
                        "@type": "WebSite",
                        name: SITE_NAME,
                        url: `${SITE_ORIGIN}/`
                    },
                    about: [
                        { "@type": "Thing", name: "Commodore 64" },
                        { "@type": "Thing", name: "Amiga" },
                        { "@type": "Thing", name: profile.name }
                    ]
                },
                {
                    "@type": "BreadcrumbList",
                    itemListElement: [
                        { "@type": "ListItem", position: 1, name: "Home", item: `${SITE_ORIGIN}/` },
                        { "@type": "ListItem", position: 2, name: "Games", item: `${SITE_ORIGIN}/games/` },
                        { "@type": "ListItem", position: 3, name: parentName, item: parentUrl },
                        { "@type": "ListItem", position: 4, name: profile.name, item: canonical }
                    ]
                }
            ]
        };
        const script = document.createElement("script");
        script.type = "application/ld+json";
        script.dataset.ccgCategorySchema = "true";
        script.textContent = JSON.stringify(schema);
        document.head.appendChild(script);
    }

    function addHeroKicker(heroInner, profile, kind) {
        if (!heroInner || heroInner.querySelector(".ccg-category-omega__kicker")) return;
        const kicker = document.createElement("p");
        kicker.className = "ccg-category-omega__kicker";
        kicker.textContent = kind === "genre"
            ? `C64 & Amiga ${profile.name.replace(/ Games$/i, "")} archive`
            : "Curated C64 & Amiga archive";
        heroInner.insertBefore(kicker, heroInner.firstChild);
    }

    function enhanceSingle(profile, kind) {
        ensureCss();
        setSeo(profile, kind);
        addStructuredData(profile, kind);

        document.body.dataset.ccgCategoryTheme = profile.theme;
        document.body.dataset.ccgCategoryKind = kind;

        const hero = document.querySelector(".ccg-genre-hero, .ccg-collection-hero");
        const heroInner = hero?.querySelector(".ccg-genre-hero__inner") || hero?.querySelector(".ccg-hero-inner");
        const title = hero?.querySelector("h1");
        const tagline = hero?.querySelector(".ccg-genre-hero__tagline, .ccg-hero-tagline");
        if (hero) {
            hero.classList.add("ccg-category-omega__hero");
            hero.dataset.ccgCategoryIcon = profile.icon;
        }
        addHeroKicker(heroInner, profile, kind);

        if (title) {
            title.textContent = kind === "genre"
                ? `${profile.name.replace(/ Games$/i, "")} Games on Commodore 64 & Amiga`
                : `${profile.name} – C64 & Amiga`;
        }
        if (tagline) tagline.textContent = profile.tagline;

        const intro = document.querySelector(".ccg-section--intro .ccg-section__intro:not(.ccg-section__intro-links):not(.ccg-collection-intro-links)");
        if (intro) intro.textContent = profile.description;

        addDiscoveryPanel(profile, kind);
    }

    function relatedHref(file, kind) {
        return kind === "genre" ? `/games/genres/${file}` : `/games/collections/${file}`;
    }

    function addDiscoveryPanel(profile, kind) {
        if (document.querySelector("[data-ccg-category-discovery]")) return;
        const mainGrid = document.querySelector(".ccg-genre-main, #genreGamesGrid")?.closest("section") || document.querySelector(".ccg-genre-main");
        const introSection = document.querySelector(".ccg-section--intro");
        const parent = mainGrid?.parentNode || introSection?.parentNode;
        if (!parent) return;

        const panel = document.createElement("section");
        panel.className = "ccg-category-omega__discovery";
        panel.dataset.ccgCategoryDiscovery = "true";
        panel.setAttribute("aria-label", `Explore more ${profile.name}`);

        const heading = document.createElement("div");
        heading.className = "ccg-category-omega__discovery-heading";
        heading.innerHTML = `
            <span class="ccg-category-omega__eyebrow">Explore the Commodore archive</span>
            <h2>${kind === "genre" ? `Browse C64 & Amiga ${profile.name}` : `More from ${profile.name}`}</h2>
            <p>${profile.description}</p>
        `;
        panel.appendChild(heading);

        const nav = document.createElement("nav");
        nav.className = "ccg-category-omega__links";
        nav.setAttribute("aria-label", "Related archive categories");

        const coreLinks = kind === "genre"
            ? [
                ["All C64 & Amiga Games", "/games/"],
                ["All Game Genres", "/games/genres/"],
                ["Curated Collections", "/games/collections/"]
            ]
            : [
                ["All C64 & Amiga Games", "/games/"],
                ["Browse by Genre", "/games/genres/"],
                ["All Collections", "/games/collections/"]
            ];

        coreLinks.forEach(([label, href]) => {
            const link = document.createElement("a");
            link.href = href;
            link.textContent = label;
            link.className = "ccg-category-omega__link ccg-category-omega__link--core";
            nav.appendChild(link);
        });

        (profile.related || []).forEach((file) => {
            const relatedProfile = kind === "genre" ? GENRES[file] : COLLECTIONS[file];
            if (!relatedProfile) return;
            const link = document.createElement("a");
            link.href = relatedHref(file, kind);
            link.textContent = relatedProfile.name;
            link.className = "ccg-category-omega__link";
            nav.appendChild(link);
        });

        panel.appendChild(nav);
        if (mainGrid && mainGrid.parentNode) mainGrid.parentNode.insertBefore(panel, mainGrid);
        else if (introSection) introSection.insertAdjacentElement("afterend", panel);
    }

    function indexProfileForLink(link, kind) {
        try {
            const url = new URL(link.getAttribute("href") || "", window.location.href);
            const file = url.pathname.split("/").pop() || "";
            return kind === "genre" ? GENRES[file] : COLLECTIONS[file];
        } catch (error) {
            return null;
        }
    }

    function enhanceIndex(kind) {
        ensureCss();
        document.body.dataset.ccgCategoryTheme = kind === "genre" ? "genre-index" : "collection-index";
        document.body.dataset.ccgCategoryKind = `${kind}-index`;

        if (kind === "genre") {
            const titleText = `C64 & Amiga Games by Genre | ${SITE_NAME}`;
            const description = "Browse Commodore 64 and Amiga games by genre, including racing, arcade, adventure, platform, shooting, strategy, RPG, puzzle, sports and more.";
            document.title = titleText;
            upsertMeta('meta[name="description"]', "content", description);
            upsertMeta('meta[property="og:title"]', "content", titleText);
            upsertMeta('meta[property="og:description"]', "content", description);
            upsertMeta('meta[name="twitter:title"]', "content", titleText);
            upsertMeta('meta[name="twitter:description"]', "content", description);

            const h1 = document.querySelector("h1");
            if (h1) h1.textContent = "C64 & Amiga Games by Genre";
            const tagline = document.querySelector(".ccg-hero-tagline");
            if (tagline) tagline.textContent = "Choose a genre and explore Commodore 64 and Amiga games across the CCG archive.";
        }

        const cardSelector = kind === "genre"
            ? ".ccg-genre-card[href]"
            : "a[href*='/games/collections/'], .ccg-collection-card[href], .collection-card[href]";

        document.querySelectorAll(cardSelector).forEach((link) => {
            const profile = indexProfileForLink(link, kind);
            if (!profile || link.dataset.ccgCategoryEnhanced === "true") return;
            link.dataset.ccgCategoryEnhanced = "true";
            link.dataset.ccgCategoryCardTheme = profile.theme;

            const title = link.querySelector("span, h2, h3, strong");
            if (title && !/C64|Amiga/i.test(title.textContent || "")) {
                title.textContent = profile.name;
            }

            const description = document.createElement("small");
            description.className = "ccg-category-omega__card-description";
            description.textContent = profile.card;
            link.appendChild(description);
        });
    }

    const file = filename();
    if (isGenrePath) {
        if (file === "index.html" || pageId === "genres-index") enhanceIndex("genre");
        else if (GENRES[file]) enhanceSingle(GENRES[file], "genre");
    }

    if (isCollectionPath) {
        if (file === "index.html" || pageId === "collections-index") enhanceIndex("collection");
        else if (COLLECTIONS[file]) enhanceSingle(COLLECTIONS[file], "collection");
    }
})();
