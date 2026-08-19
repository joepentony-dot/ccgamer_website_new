/* ============================================================
   CCG CATEGORY OMEGA — GENRES + COLLECTIONS
   Shared runtime enhancement for C64 / Amiga archive categories.
============================================================ */
(function () {
    "use strict";
    if (window.CCG_CATEGORY_OMEGA_READY) return;
    window.CCG_CATEGORY_OMEGA_READY = true;

    const path = String(window.location.pathname || "");
    const pageId = String(document.documentElement.getAttribute("data-ccg-page") || "").toLowerCase();
    const isGenre = /^\/games\/genres\//i.test(path);
    const isCollection = /^\/games\/collections\//i.test(path);
    if (!isGenre && !isCollection) return;

    const CSS_PATH = "/resources/css/ccg-category-omega.css";
    const SITE = "Cheeky Commodore Gamer";
    const ORIGIN = "https://www.cheekycommodoregamer.co.uk";

    const GENRES = Object.freeze({
        "action-adventure-games.html": ["Action Adventure", "action-adventure", "A", "Exploration, danger and arcade action across sprawling Commodore worlds.", "Explore C64 and Amiga action-adventure games, combining exploration, combat, puzzles and arcade action across classic Commodore releases.", "Exploration, combat and puzzles in the same adventure.", ["adventure-games.html", "platform-games.html", "role-playing-games.html", "shooting-games.html"]],
        "adventure-games.html": ["Adventure", "adventure", "?", "Mysteries, conversations and unforgettable worlds built for curious players.", "Browse C64 and Amiga adventure games, from text and graphic adventures to point-and-click classics, mysteries and story-led Commodore games.", "Story-led classics, mysteries and point-and-click adventures.", ["action-adventure-games.html", "puzzle-games.html", "role-playing-games.html", "horror-games.html"]],
        "arcade-games.html": ["Arcade", "arcade", "*", "High-score chasing, reflex tests and coin-op spirit on C64 and Amiga.", "Browse C64 and Amiga arcade games, including coin-op conversions, score attacks and fast arcade-style Commodore classics.", "High scores, coin-op conversions and fast arcade play.", ["shooting-games.html", "platform-games.html", "racing-games.html", "fighting-games.html"]],
        "casino-games.html": ["Casino Games", "casino", "D", "Cards, tables and computerised wagers from the Commodore era.", "Explore C64 and Amiga casino games, including poker, blackjack, roulette, fruit machines and other gambling-themed Commodore releases.", "Poker, blackjack, roulette and gambling-themed releases.", ["quiz-games.html", "strategy-games.html", "miscellaneous.html", "puzzle-games.html"]],
        "fighting-games.html": ["Fighting Games", "fighting", "F", "One-on-one battles, scrolling brawlers and joystick-testing rivalries.", "Browse C64 and Amiga fighting games, from one-on-one martial arts contests to scrolling beat 'em ups and arcade conversions.", "Martial arts, beat 'em ups and one-on-one battles.", ["arcade-games.html", "action-adventure-games.html", "shooting-games.html", "sports-games.html"]],
        "horror-games.html": ["Horror Games", "horror", "X", "Dark mansions, monsters and uneasy nights in the Commodore archive.", "Explore C64 and Amiga horror games, including survival, gothic, monster and supernatural titles from the classic Commodore years.", "Gothic adventures, monsters and supernatural scares.", ["adventure-games.html", "action-adventure-games.html", "shooting-games.html", "role-playing-games.html"]],
        "miscellaneous.html": ["Miscellaneous Games", "misc", "+", "The unusual, experimental and hard-to-file corners of C64 and Amiga gaming.", "Browse unusual C64 and Amiga games that sit outside the main genres, including experimental, novelty and hybrid Commodore releases.", "Experimental, unusual and hard-to-file Commodore games.", ["puzzle-games.html", "quiz-games.html", "arcade-games.html", "strategy-games.html"]],
        "platform-games.html": ["Platform Games", "platform", "^", "Ladders, ledges, precision jumps and scrolling worlds from two generations of Commodore hardware.", "Browse C64 and Amiga platform games, from single-screen classics to scrolling platform adventures and mascot-era favourites.", "Jumping, climbing and scrolling platform classics.", ["arcade-games.html", "action-adventure-games.html", "puzzle-games.html", "shooting-games.html"]],
        "puzzle-games.html": ["Puzzle Games", "puzzle", "[]", "Logic, timing and brain-teasers where the next move matters more than the trigger finger.", "Browse C64 and Amiga puzzle games, including logic games, tile puzzlers, action puzzles and classic brain-teasers for Commodore computers.", "Logic games, action puzzles and brain-teasing classics.", ["strategy-games.html", "adventure-games.html", "quiz-games.html", "platform-games.html"]],
        "quiz-games.html": ["Quiz Games", "quiz", "?", "Trivia, game-show formats and questions that test more than joystick reflexes.", "Browse C64 and Amiga quiz games, including trivia, game-show adaptations and question-based Commodore releases.", "Trivia, game shows and question-based Commodore games.", ["puzzle-games.html", "casino-games.html", "miscellaneous.html", "strategy-games.html"]],
        "racing-games.html": ["Racing Games", "racing", ">>", "Arcade speed, road battles and driving simulations across C64 and Amiga.", "Browse C64 and Amiga racing games, from arcade racers and road battles to Formula One, rally and driving simulations across the Commodore era.", "Arcade racers, rally, road battles and driving simulations.", ["sports-games.html", "arcade-games.html", "shooting-games.html", "action-adventure-games.html"]],
        "role-playing-games.html": ["Role-Playing Games", "rpg", "RPG", "Stats, quests, party building and long-form adventures across classic Commodore worlds.", "Browse C64 and Amiga role-playing games, including dungeon crawlers, fantasy RPGs, party adventures and character-driven Commodore classics.", "Quests, character building, dungeons and fantasy worlds.", ["adventure-games.html", "strategy-games.html", "action-adventure-games.html", "horror-games.html"]],
        "shooting-games.html": ["Shooting Games", "shooting", "+", "Shoot 'em ups, run-and-gun action and relentless arcade firepower.", "Browse C64 and Amiga shooting games, including shoot 'em ups, run-and-gun action, space combat and arcade shooters.", "Shoot 'em ups, run-and-gun action and arcade firepower.", ["arcade-games.html", "action-adventure-games.html", "platform-games.html", "fighting-games.html"]],
        "sports-games.html": ["Sports Games", "sports", "O", "Football, athletics, golf, boxing and more from the home-computer sporting years.", "Browse C64 and Amiga sports games, including football, athletics, golf, boxing, tennis and other classic Commodore sporting releases.", "Football, athletics, golf, boxing and sporting classics.", ["racing-games.html", "fighting-games.html", "arcade-games.html", "strategy-games.html"]],
        "strategy-games.html": ["Strategy Games", "strategy", "#", "Planning, resources and long battles where thinking ahead wins the day.", "Browse C64 and Amiga strategy games, including tactical battles, management games, simulations and long-form strategic Commodore classics.", "Tactics, management, simulations and long-form strategy.", ["role-playing-games.html", "puzzle-games.html", "adventure-games.html", "sports-games.html"]]
    });

    const COLLECTIONS = Object.freeze({
        "cartridge-games.html": ["Cartridge Games", "cartridge", "C64", "Instant-loading cartridge releases from the Commodore 64 library.", "Explore Commodore 64 cartridge games, from early releases to later C64GS-era cartridges and fast-loading editions in the CCG archive.", "Commodore cartridge releases and C64GS-era games.", ["licensed-games.html", "top-picks.html", "bpjs-indexed-games.html"]],
        "licensed-games.html": ["Licensed Games", "licensed", "TV", "Film, TV, comic and celebrity licences brought to C64 and Amiga.", "Browse licensed C64 and Amiga games based on films, television, comics, celebrities and other major entertainment properties.", "Film, TV, comic and celebrity tie-ins on C64 and Amiga.", ["cartridge-games.html", "top-picks.html", "retro-specials.html"]],
        "bpjs-indexed-games.html": ["BPjS & BPjM Indexed Games", "bpjs", "#", "A specialist indexed slice of the CCG Commodore game archive.", "Explore BPjS and BPjM indexed Commodore 64 and Amiga games collected into one specialist CCG archive route.", "Specialist BPjS and BPjM indexed Commodore titles.", ["top-picks.html", "licensed-games.html", "cartridge-games.html"]],
        "top-picks.html": ["CCG Top Picks", "top-picks", "*", "Selected C64 and Amiga favourites from across the Cheeky Commodore Gamer archive.", "Browse Cheeky Commodore Gamer's selected C64 and Amiga favourites, bringing together standout Commodore games from across the archive.", "Selected C64 and Amiga favourites from the CCG archive.", ["licensed-games.html", "cartridge-games.html", "retro-specials.html"]],
        "amiga-demo-music.html": ["Amiga Demo Music", "amiga-demo", "MOD", "Trackers, modules and scene music celebrating the Amiga demo tradition.", "Explore Amiga demo music, tracker modules and scene composers through the Cheeky Commodore Gamer Amiga music archive.", "Tracker modules, demo-scene music and Amiga composers.", ["retro-specials.html", "top-picks.html", "retro-events.html"]],
        "retro-events.html": ["Retro Events", "retro-events", "LIVE", "Shows, exhibitions and gatherings connected to the wider retro-computing scene.", "Explore retro gaming events, shows and exhibitions covered by Cheeky Commodore Gamer, with a focus on Commodore 64, Amiga and classic computing.", "Retro shows, exhibitions and Commodore community events.", ["retro-specials.html", "amiga-demo-music.html", "top-picks.html"]],
        "retro-specials.html": ["Retro Specials", "retro-specials", "CCG", "Long-form C64 and Amiga features, rankings, magazine history and archive projects.", "Browse C64 and Amiga retro specials from Cheeky Commodore Gamer, including rankings, magazine retrospectives, publisher features and long-form Commodore archive projects.", "Long-form C64 and Amiga features, rankings and retrospectives.", ["top-picks.html", "retro-events.html", "amiga-demo-music.html"]]
    });

    function profile(tuple) {
        if (!tuple) return null;
        return { name: tuple[0], theme: tuple[1], icon: tuple[2], tagline: tuple[3], description: tuple[4], card: tuple[5], related: tuple[6] || [] };
    }

    function ensureCss() {
        if (document.querySelector(`link[href="${CSS_PATH}"]`)) return;
        const link = document.createElement("link");
        link.rel = "stylesheet";
        link.href = CSS_PATH;
        document.head.appendChild(link);
    }

    function fileName() {
        const clean = path.replace(/\/+$/, "");
        if (/\/(genres|collections)$/i.test(clean)) return "index.html";
        return clean.split("/").pop() || "index.html";
    }

    function setMeta(selector, key, value) {
        const node = document.querySelector(selector);
        if (node) node.setAttribute(key, value);
    }

    function applyRuntimeSeo(item, kind) {
        const subject = item.name.replace(/ Games$/i, "");
        const title = kind === "genre" ? `${subject} Games on C64 & Amiga | ${SITE}` : `${item.name} – C64 & Amiga | ${SITE}`;
        document.title = title;
        setMeta('meta[name="description"]', "content", item.description);
        setMeta('meta[property="og:title"]', "content", title);
        setMeta('meta[property="og:description"]', "content", item.description);
        setMeta('meta[name="twitter:title"]', "content", title);
        setMeta('meta[name="twitter:description"]', "content", item.description);
    }

    function addSchema(item, kind) {
        if (document.querySelector('script[data-ccg-category-schema], script[data-ccg-category-static-schema]')) return;
        const canonical = document.querySelector('link[rel="canonical"]')?.href || `${ORIGIN}${path}`;
        const parentName = kind === "genre" ? "Genres" : "Collections";
        const parentUrl = kind === "genre" ? `${ORIGIN}/games/genres/` : `${ORIGIN}/games/collections/`;
        const subject = item.name.replace(/ Games$/i, "");
        const schema = {
            "@context": "https://schema.org",
            "@graph": [
                { "@type": "CollectionPage", "@id": `${canonical}#category`, url: canonical, name: kind === "genre" ? `${subject} Games on Commodore 64 and Amiga` : `${item.name} – Commodore 64 and Amiga`, description: item.description, isPartOf: { "@type": "WebSite", name: SITE, url: `${ORIGIN}/` }, about: [{ "@type": "Thing", name: "Commodore 64" }, { "@type": "Thing", name: "Amiga" }, { "@type": "Thing", name: item.name }] },
                { "@type": "BreadcrumbList", itemListElement: [{ "@type": "ListItem", position: 1, name: "Home", item: `${ORIGIN}/` }, { "@type": "ListItem", position: 2, name: "Games", item: `${ORIGIN}/games/` }, { "@type": "ListItem", position: 3, name: parentName, item: parentUrl }, { "@type": "ListItem", position: 4, name: item.name, item: canonical }] }
            ]
        };
        const script = document.createElement("script");
        script.type = "application/ld+json";
        script.dataset.ccgCategorySchema = "true";
        script.textContent = JSON.stringify(schema);
        document.head.appendChild(script);
    }

    function addKicker(heroInner, item, kind) {
        if (!heroInner || heroInner.querySelector(".ccg-category-omega__kicker")) return;
        const kicker = document.createElement("p");
        kicker.className = "ccg-category-omega__kicker";
        kicker.textContent = kind === "genre" ? `C64 & Amiga ${item.name.replace(/ Games$/i, "")} archive` : "Curated C64 & Amiga archive";
        heroInner.insertBefore(kicker, heroInner.firstChild);
    }

    function relatedHref(file, kind) {
        return kind === "genre" ? `/games/genres/${file}` : `/games/collections/${file}`;
    }

    function addDiscovery(item, kind, allProfiles) {
        if (document.querySelector("[data-ccg-category-discovery]")) return;
        const target = document.querySelector(".ccg-genre-main") || document.querySelector("#genreGamesGrid")?.closest("section");
        const intro = document.querySelector(".ccg-section--intro");
        const parent = target?.parentNode || intro?.parentNode;
        if (!parent) return;

        const section = document.createElement("section");
        section.className = "ccg-category-omega__discovery";
        section.dataset.ccgCategoryDiscovery = "true";
        section.innerHTML = `<div class="ccg-category-omega__discovery-heading"><span class="ccg-category-omega__eyebrow">Explore the Commodore archive</span><h2>${kind === "genre" ? `Browse C64 & Amiga ${item.name}` : `More from ${item.name}`}</h2><p>${item.description}</p></div>`;

        const nav = document.createElement("nav");
        nav.className = "ccg-category-omega__links";
        nav.setAttribute("aria-label", "Related archive categories");
        const core = kind === "genre"
            ? [["All C64 & Amiga Games", "/games/"], ["All Game Genres", "/games/genres/"], ["Curated Collections", "/games/collections/"]]
            : [["All C64 & Amiga Games", "/games/"], ["Browse by Genre", "/games/genres/"], ["All Collections", "/games/collections/"]];

        [...core, ...item.related.map((file) => [profile(allProfiles[file])?.name || file, relatedHref(file, kind)])].forEach(([label, href], index) => {
            const link = document.createElement("a");
            link.href = href;
            link.textContent = label;
            link.className = `ccg-category-omega__link${index < core.length ? " ccg-category-omega__link--core" : ""}`;
            nav.appendChild(link);
        });
        section.appendChild(nav);
        if (target?.parentNode) target.parentNode.insertBefore(section, target);
        else intro?.insertAdjacentElement("afterend", section);
    }

    function enhanceSingle(item, kind, allProfiles) {
        ensureCss();
        applyRuntimeSeo(item, kind);
        addSchema(item, kind);
        document.body.dataset.ccgCategoryTheme = item.theme;
        document.body.dataset.ccgCategoryKind = kind;

        const hero = document.querySelector(".ccg-genre-hero, .ccg-collection-hero");
        const heroInner = hero?.querySelector(".ccg-genre-hero__inner, .ccg-hero-inner");
        if (hero) {
            hero.classList.add("ccg-category-omega__hero");
            hero.dataset.ccgCategoryIcon = item.icon;
        }
        addKicker(heroInner, item, kind);

        const h1 = hero?.querySelector("h1");
        if (h1) h1.textContent = kind === "genre" ? `${item.name.replace(/ Games$/i, "")} Games on Commodore 64 & Amiga` : `${item.name} – C64 & Amiga`;
        const tagline = hero?.querySelector(".ccg-genre-hero__tagline, .ccg-hero-tagline");
        if (tagline) tagline.textContent = item.tagline;
        const intro = document.querySelector(".ccg-section--intro .ccg-section__intro:not(.ccg-section__intro-links):not(.ccg-collection-intro-links)");
        if (intro) intro.textContent = item.description;
        addDiscovery(item, kind, allProfiles);
    }

    function indexProfile(link, allProfiles) {
        try {
            const url = new URL(link.getAttribute("href") || "", window.location.href);
            return profile(allProfiles[url.pathname.split("/").pop() || ""]);
        } catch (error) {
            return null;
        }
    }

    function enhanceIndex(kind, allProfiles) {
        ensureCss();
        document.body.dataset.ccgCategoryTheme = kind === "genre" ? "genre-index" : "collection-index";
        document.body.dataset.ccgCategoryKind = `${kind}-index`;

        if (kind === "genre") {
            const title = `C64 & Amiga Games by Genre | ${SITE}`;
            const description = "Browse Commodore 64 and Amiga games by genre, including racing, arcade, adventure, platform, shooting, strategy, RPG, puzzle, sports and more.";
            document.title = title;
            setMeta('meta[name="description"]', "content", description);
            setMeta('meta[property="og:title"]', "content", title);
            setMeta('meta[property="og:description"]', "content", description);
            setMeta('meta[name="twitter:title"]', "content", title);
            setMeta('meta[name="twitter:description"]', "content", description);
            const h1 = document.querySelector("h1");
            if (h1) h1.textContent = "C64 & Amiga Games by Genre";
            const tagline = document.querySelector(".ccg-hero-tagline");
            if (tagline) tagline.textContent = "Choose a genre and explore Commodore 64 and Amiga games across the CCG archive.";
        }

        const selector = kind === "genre" ? "main .ccg-genre-card[href]" : "main .ccg-collection-card[href]";
        document.querySelectorAll(selector).forEach((link) => {
            const item = indexProfile(link, allProfiles);
            if (!item || link.dataset.ccgCategoryEnhanced === "true") return;
            link.dataset.ccgCategoryEnhanced = "true";
            link.dataset.ccgCategoryCardTheme = item.theme;

            const existingDescription = link.querySelector(".ccg-collection-card__description, .ccg-category-omega__card-description");
            if (existingDescription) {
                existingDescription.textContent = item.card;
                return;
            }
            const description = document.createElement("small");
            description.className = "ccg-category-omega__card-description";
            description.textContent = item.card;
            link.appendChild(description);
        });
    }

    const file = fileName();
    if (isGenre) {
        if (file === "index.html" || pageId === "genres-index") enhanceIndex("genre", GENRES);
        else {
            const item = profile(GENRES[file]);
            if (item) enhanceSingle(item, "genre", GENRES);
        }
    }
    if (isCollection) {
        if (file === "index.html" || pageId === "collections-index") enhanceIndex("collection", COLLECTIONS);
        else {
            const item = profile(COLLECTIONS[file]);
            if (item) enhanceSingle(item, "collection", COLLECTIONS);
        }
    }
})();
