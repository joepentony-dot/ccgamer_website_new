/* ============================================================
   OMEGA ADMIN CONTROL SYSTEM
   ------------------------------------------------------------
   • Wizard + workspace layout
   • Guided editor with validation
   • Safe exports + SEO stub generation
   ============================================================ */

(() => {
    "use strict";

    // CLIENT-SIDE ONLY: not real security, just discourages casual browsing.
    const ADMIN_GATE_PASSPHRASE = "c64";

    const SITE_BASE_URL = "https://www.cheekycommodoregamer.co.uk";
    const GAMES_JSON_URL = "../games/games.json";
    const YEAR_MIN = 1977;
    const YEAR_MAX = 2026;
    const YOUTUBE_ID_REGEX = /^[a-zA-Z0-9_-]{6,}$/;
    const CLEAN_ID_REGEX = /^[a-z0-9]+(?:_[a-z0-9]+)*$/;
    const CLEAN_SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
    const ENFORCEMENT_FLAG = "_ccg_enforced";
    const MIGRATION_FLAG = "_ccg_migrated";
    const isEditableTarget = (target) => {
        const tag = target?.tagName?.toLowerCase();
        return tag === "input" || tag === "textarea" || target?.isContentEditable === true;
    };
    const GAME_GENRES = [
        "action-adventure",
        "adventure",
        "arcade",
        "casino",
        "fighting",
        "horror",
        "miscellaneous",
        "platform",
        "puzzle",
        "quiz",
        "racing",
        "role-playing",
        "shooting",
        "sports",
        "strategy"
    ];
    const COLLECTION_FLAGS = [
        { id: "bpjs", label: "BPJS Games", page: "bpjs-indexed-games.html" },
        { id: "cartridge", label: "Cartridge Games", page: "cartridge-games.html" },
        { id: "licensed", label: "Licensed Games", page: "licensed-games.html" },
        { id: "top-picks", label: "Top Picks", page: "top-picks.html" }
    ];
    const LEGACY_GENRE_MAP = new Map([
        ["action adventure games", "action-adventure"],
        ["action-adventure", "action-adventure"],
        ["adventure games", "adventure"],
        ["adventure", "adventure"],
        ["arcade games", "arcade"],
        ["arcade", "arcade"],
        ["casino games", "casino"],
        ["casino", "casino"],
        ["fighting games", "fighting"],
        ["fighting", "fighting"],
        ["horror games", "horror"],
        ["horror", "horror"],
        ["miscellaneous", "miscellaneous"],
        ["miscellaneous games", "miscellaneous"],
        ["platform games", "platform"],
        ["platform", "platform"],
        ["puzzle games", "puzzle"],
        ["puzzle", "puzzle"],
        ["quiz games", "quiz"],
        ["quiz", "quiz"],
        ["racing games", "racing"],
        ["racing", "racing"],
        ["role playing games", "role-playing"],
        ["role-playing", "role-playing"],
        ["shooting games", "shooting"],
        ["shooting", "shooting"],
        ["sports games", "sports"],
        ["sports", "sports"],
        ["strategy games", "strategy"],
        ["strategy", "strategy"]
    ]);
    const LEGACY_COLLECTION_MAP = new Map([
        ["bpjs games", "bpjs"],
        ["bpjs", "bpjs"],
        ["cartridge games", "cartridge"],
        ["cartridge", "cartridge"],
        ["licensed games", "licensed"],
        ["licensed", "licensed"],
        ["top picks", "top-picks"],
        ["top-picks", "top-picks"]
    ]);
    const GENRE_PAGE_MAP = new Map([
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
        ["role-playing", "role-playing-games.html"],
        ["shooting", "shooting-games.html"],
        ["sports", "sports-games.html"],
        ["strategy", "strategy-games.html"]
    ]);
    const SORT_KEY_ORDER = [
        "system",
        "id",
        "slug",
        "title",
        "sorttitle",
        "year",
        "genres",
        "collections",
        "videoid",
        "thumbnail",
        "pdf",
        "disk",
        "lemon",
        "description",
        "ccg_rating",
        "ccg_rating_reason",
        "credits",
        "developer"
    ];

    const BOX3D_FOLDER = "resources/images/games/boxes-3d/";
    const BOX3D_MAX_WIDTH = 420;
    const BOX3D_QUALITY = 0.82;

    const STEP_IDS = [1, 2, 3, 4, 5, 6];
    const SUBSTEPS = ["identity", "classification", "media", "editorial", "credits", "references"];

    const state = {
        baseGames: [],
        workingGames: [],
        draftGame: null,
        selectedIndex: null,
        history: [],
        validation: { errors: [], warnings: [] },
        stagedThumb: null,
        stagedBox3d: null,
        currentStep: 1,
        currentSubstep: "identity"
    };

    const elements = {
        status: document.getElementById("adminStatus"),
        statusDetail: document.getElementById("adminStatusDetail"),
        source: document.getElementById("adminSource"),
        libraryStatus: document.getElementById("adminLibraryStatus"),
        currentGame: document.getElementById("adminCurrentGame"),
        draftState: document.getElementById("adminDraftState"),
        validationSummary: document.getElementById("adminValidationSummary"),
        fetchBtn: document.getElementById("adminFetch"),
        uploadInput: document.getElementById("adminUpload"),
        clearBtn: document.getElementById("adminClear"),
        newBtn: document.getElementById("adminNew"),
        undoBtn: document.getElementById("adminUndo"),
        discardBtn: document.getElementById("adminDiscard"),
        applyBtn: document.getElementById("adminApply"),
        jumpExportBtn: document.getElementById("adminJumpExport"),
        copyJsonBtn: document.getElementById("adminCopyJson"),
        downloadJsonBtn: document.getElementById("adminDownloadJson"),
        downloadLibraryBtn: document.getElementById("adminDownloadLibrary"),
        downloadStubBtn: document.getElementById("adminDownloadStub"),
        downloadStubsBtn: document.getElementById("adminDownloadStubs"),
        downloadSitemapBtn: document.getElementById("adminDownloadSitemap"),
        downloadPackageBtn: document.getElementById("adminDownloadPackage"),
        exportPagesStatus: document.getElementById("adminExportPagesStatus"),
        exportSitemapStatus: document.getElementById("adminExportSitemapStatus"),
        exportPackageStatus: document.getElementById("adminExportPackageStatus"),
        editState: document.getElementById("adminEditState"),
        totalCount: document.querySelector("[data-admin-total-count]"),
        missingRatings: document.querySelector("[data-admin-missing-ratings]"),
        missingPdfs: document.querySelector("[data-admin-missing-pdfs]"),
        missingCredits: document.querySelector("[data-admin-missing-credits]"),
        warningCount: document.querySelector("[data-admin-warning-count]"),
        resultCount: document.querySelector("[data-admin-result-count]"),
        validationEmpty: document.querySelector("[data-admin-validation-empty]"),
        errorPanel: document.querySelector("[data-admin-errors]"),
        errorList: document.querySelector("[data-admin-error-list]"),
        warningPanel: document.querySelector("[data-admin-warnings]"),
        warningList: document.querySelector("[data-admin-warning-list]"),
        searchInput: document.getElementById("adminSearch"),
        filterSystem: document.getElementById("adminFilterSystem"),
        filterGenre: document.getElementById("adminFilterGenre"),
        filterYear: document.getElementById("adminFilterYear"),
        filterRating: document.getElementById("adminFilterRating"),
        sortSelect: document.getElementById("adminSort"),
        gameList: document.getElementById("adminGameList"),
        genreGrid: document.querySelector("[data-admin-genre-grid]"),
        collectionTopPicks: document.getElementById("collectionTopPicks"),
        collectionBpjs: document.getElementById("collectionBpjs"),
        collectionCartridge: document.getElementById("collectionCartridge"),
        collectionLicensed: document.getElementById("collectionLicensed"),
        tabButtons: Array.from(document.querySelectorAll(".admin-tab")),
        tabPanels: Array.from(document.querySelectorAll("[data-admin-panel]")),
        form: document.getElementById("adminEditor"),
        jsonPreview: document.getElementById("adminJsonPreview"),
        changeList: document.querySelector("[data-admin-change-list]"),
        descriptionCount: document.querySelector("[data-admin-description-count]"),
        substepStatus: document.getElementById("adminSubstepStatus"),
        stepButtons: Array.from(document.querySelectorAll(".admin-step-btn")),
        stepPanels: Array.from(document.querySelectorAll("[data-step-panel]")),
        contextPanels: Array.from(document.querySelectorAll("[data-context]")),
        taskNewBtn: document.getElementById("adminTaskNew"),
        taskEditBtn: document.getElementById("adminTaskEdit"),
        taskFixBtn: document.getElementById("adminTaskFix"),
        previewGameLink: document.getElementById("adminPreviewGameLink"),
        previewThumbLink: document.getElementById("adminPreviewThumbLink"),
        previewManualLink: document.getElementById("adminPreviewManualLink"),
        previewDiskLink: document.getElementById("adminPreviewDiskLink"),
        missingFilter: document.getElementById("adminMissingFilter"),
        missingRefresh: document.getElementById("adminMissingRefresh"),
        missingList: document.getElementById("adminMissingList"),
        missingHint: document.getElementById("adminMissingHint"),
        cmdSlug: document.getElementById("adminCmdSlug"),
        cmdSitemap: document.getElementById("adminCmdSitemap"),
        cmdGit: document.getElementById("adminCmdGit"),
        cmdGsc: document.getElementById("adminCmdGsc"),
        copySlugCmd: document.getElementById("adminCopySlugCmd"),
        copySitemapCmd: document.getElementById("adminCopySitemapCmd"),
        copyGitCmd: document.getElementById("adminCopyGitCmd"),
        copyGscCmd: document.getElementById("adminCopyGscCmd"),
        box3dUpload: document.getElementById("adminBox3dUpload"),
        box3dDownload: document.getElementById("adminBox3dDownload"),
        box3dPreview: document.getElementById("adminBox3dPreview"),
        box3dStatus: document.getElementById("adminBox3dStatus"),
        box3dFilename: document.getElementById("adminBox3dFilename"),
        gate: document.getElementById("adminGate"),
        gateInput: document.getElementById("adminGateInput"),
        gateUnlock: document.getElementById("adminGateUnlock"),
        gateStatus: document.getElementById("adminGateStatus")
    };

    const inputs = {
        system: document.getElementById("gameSystem"),
        title: document.getElementById("gameTitle"),
        sortTitle: document.getElementById("gameSortTitle"),
        id: document.getElementById("gameId"),
        slug: document.getElementById("gameSlug"),
        year: document.getElementById("gameYear"),
        videoId: document.getElementById("gameVideoId"),
        thumbnail: document.getElementById("gameThumbnail"),
        pdf: document.getElementById("gamePdf"),
        diskInput: document.getElementById("gameDiskInput"),
        diskAdd: document.getElementById("gameDiskAdd"),
        diskList: document.getElementById("gameDiskList"),
        description: document.getElementById("gameDescription"),
        rating: document.getElementById("gameRating"),
        ratingReason: document.getElementById("gameRatingReason"),
        publisherInput: document.getElementById("gamePublisherInput"),
        publisherAdd: document.getElementById("gamePublisherAdd"),
        publisherList: document.getElementById("gamePublisherList"),
        producer: document.getElementById("gameProducer"),
        coderInput: document.getElementById("gameCoderInput"),
        coderAdd: document.getElementById("gameCoderAdd"),
        coderList: document.getElementById("gameCoderList"),
        graphicsInput: document.getElementById("gameGraphicsInput"),
        graphicsAdd: document.getElementById("gameGraphicsAdd"),
        graphicsList: document.getElementById("gameGraphicsList"),
        musicianInput: document.getElementById("gameMusicianInput"),
        musicianAdd: document.getElementById("gameMusicianAdd"),
        musicianList: document.getElementById("gameMusicianList"),
        rereleaserInput: document.getElementById("gameRereleaserInput"),
        rereleaserAdd: document.getElementById("gameRereleaserAdd"),
        rereleaserList: document.getElementById("gameRereleaserList"),
        developer: document.getElementById("gameDeveloper"),
        lemonInput: document.getElementById("gameLemonInput"),
        lemonAdd: document.getElementById("gameLemonAdd"),
        lemonList: document.getElementById("gameLemonList"),
        autoId: document.getElementById("adminAutoId"),
        autoSort: document.getElementById("adminAutoSort"),
        autoThumb: document.getElementById("adminThumbAuto"),
        thumbUpload: document.getElementById("gameThumbUpload"),
        thumbDownload: document.getElementById("gameThumbDownload")
    };

    const emptyNotices = Array.from(document.querySelectorAll("[data-admin-empty]"));
    const listManagers = [];

    const clone = (value) => JSON.parse(JSON.stringify(value));

    const setStatus = (message, detail = "", stateLabel = "idle") => {
        if (elements.status) {
            elements.status.textContent = message;
            elements.status.dataset.state = stateLabel;
        }
        if (elements.statusDetail) {
            elements.statusDetail.textContent = detail;
            elements.statusDetail.dataset.state = stateLabel;
        }
    };

    const defaultGame = () => ({
        system: "C64",
        id: "",
        slug: "",
        title: "",
        sorttitle: "",
        year: "",
        genres: [],
        collections: [],
        videoid: "",
        thumbnail: "",
        pdf: "",
        disk: [],
        lemon: [],
        description: "",
        ccg_rating: "",
        ccg_rating_reason: "",
        credits: {
            publisher: [],
            producer: "",
            coder: [],
            graphics: [],
            musician: [],
            re_releaser: [],
            developer: ""
        },
        developer: "",
        [ENFORCEMENT_FLAG]: true
    });

    const normalizeArray = (value) => {
        if (!value) return [];
        if (Array.isArray(value)) return value.filter(Boolean).map(item => String(item).trim()).filter(Boolean);
        return String(value).split(",").map(item => item.trim()).filter(Boolean);
    };

    const normalizeGenresAndCollections = (rawGenres) => {
        const genres = new Set();
        const collections = new Set();
        normalizeArray(rawGenres).forEach((item) => {
            const key = String(item || "").trim().toLowerCase();
            if (!key) return;
            if (LEGACY_COLLECTION_MAP.has(key)) {
                collections.add(LEGACY_COLLECTION_MAP.get(key));
                return;
            }
            if (LEGACY_GENRE_MAP.has(key)) {
                genres.add(LEGACY_GENRE_MAP.get(key));
                return;
            }
            if (GAME_GENRES.includes(key)) {
                genres.add(key);
            }
        });
        return {
            genres: Array.from(genres),
            collections: Array.from(collections)
        };
    };

    const normalizeCollections = (rawCollections) => {
        const collections = new Set();
        normalizeArray(rawCollections).forEach((item) => {
            const key = String(item || "").trim().toLowerCase();
            if (!key) return;
            if (LEGACY_COLLECTION_MAP.has(key)) {
                collections.add(LEGACY_COLLECTION_MAP.get(key));
                return;
            }
            if (COLLECTION_FLAGS.some(flag => flag.id === key)) {
                collections.add(key);
            }
        });
        return Array.from(collections);
    };

    const sortCollections = (collections) => {
        const order = COLLECTION_FLAGS.map(flag => flag.id);
        return Array.from(new Set(collections)).sort((a, b) => order.indexOf(a) - order.indexOf(b));
    };

    const normalizeGame = (raw) => {
        const base = defaultGame();
        const credits = raw && raw.credits ? raw.credits : {};
        const legacyClassification = normalizeGenresAndCollections(raw ? raw.genres : []);
        const normalizedCollections = normalizeCollections(raw ? raw.collections : []);
        const collections = sortCollections([...legacyClassification.collections, ...normalizedCollections]);
        const normalized = {
            ...base,
            ...raw,
            system: String(raw.system || base.system).trim() || "C64",
            id: String(raw.id || "").trim(),
            slug: String(raw.slug || "").trim(),
            title: String(raw.title || "").trim(),
            sorttitle: String(raw.sorttitle || "").trim(),
            year: raw.year === 0 ? 0 : (raw.year ? Number(raw.year) : ""),
            genres: legacyClassification.genres,
            collections,
            videoid: String(raw.videoid || "").trim(),
            thumbnail: String(raw.thumbnail || "").trim(),
            pdf: String(raw.pdf || "").trim(),
            disk: normalizeArray(raw.disk),
            lemon: normalizeArray(raw.lemon),
            description: String(raw.description || "").trim(),
            ccg_rating: raw.ccg_rating === 0 ? 0 : (raw.ccg_rating ? Number(raw.ccg_rating) : ""),
            ccg_rating_reason: String(raw.ccg_rating_reason || "").trim(),
            credits: {
                publisher: normalizeArray(credits.publisher),
                producer: String(credits.producer || "").trim(),
                coder: normalizeArray(credits.coder),
                graphics: normalizeArray(credits.graphics),
                musician: normalizeArray(credits.musician),
                re_releaser: normalizeArray(credits.re_releaser),
                developer: String(credits.developer || raw.developer || "").trim()
            },
            developer: String(raw.developer || credits.developer || "").trim(),
            [ENFORCEMENT_FLAG]: Boolean(raw && raw[ENFORCEMENT_FLAG]),
            [MIGRATION_FLAG]: Boolean(raw && raw[MIGRATION_FLAG])
        };
        if (normalized[MIGRATION_FLAG]) {
            return normalized;
        }
        if (normalized.slug && isLegacyRecord(normalized)) {
            const fixedId = normalizeLegacyIdFromSlug(normalized.slug);
            if (fixedId && fixedId !== normalized.id) {
                normalized.id = fixedId;
                normalized[MIGRATION_FLAG] = true;
            }
        }
        return normalized;
    };

    const isValidUrl = (value) => {
        if (!value) return true;
        try {
            const url = new URL(value);
            return Boolean(url.protocol && url.host);
        } catch (error) {
            return false;
        }
    };

    const generateSlug = (value) => {
        return String(value || "")
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/(^-|-$)+/g, "")
            .trim();
    };

    const generateId = (value) => {
        return String(value || "")
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "_")
            .replace(/(^_|_$)+/g, "")
            .trim();
    };

    const deriveIdFromSlug = (slug) => {
        return String(slug || "").replace(/-/g, "_");
    };

    const normalizeLegacyIdFromSlug = (slug) => {
        return String(slug || "")
            .replace(/-/g, "_")
            .toLowerCase()
            .replace(/[^a-z0-9_]/g, "")
            .replace(/_+/g, "_")
            .replace(/(^_|_$)+/g, "")
            .trim();
    };

    const isLegacyRecord = (game) => {
        if (!game) return false;
        const missingMetadata = !game[ENFORCEMENT_FLAG];
        const invalidLegacyId = Boolean(game.id && !CLEAN_ID_REGEX.test(game.id));
        const slugMismatch = Boolean(game.slug && game.id && deriveIdFromSlug(game.slug) !== game.id);
        return missingMetadata || invalidLegacyId || slugMismatch;
    };

    const generateSortTitle = (value) => {
        const trimmed = String(value || "").trim();
        return trimmed.replace(/^(the |a |an )/i, "").trim() || trimmed;
    };

    const buildSortedGame = (game) => {
        const sorted = {};
        SORT_KEY_ORDER.forEach((key) => {
            if (key in game) {
                sorted[key] = game[key];
            }
        });
        Object.keys(game).forEach((key) => {
            if (!(key in sorted)) {
                sorted[key] = game[key];
            }
        });
        return sorted;
    };

    const sortGames = (games, mode) => {
        const copy = [...games];
        if (mode === "year") {
            copy.sort((a, b) => (a.year || 0) - (b.year || 0));
        } else if (mode === "rating") {
            copy.sort((a, b) => (b.ccg_rating || 0) - (a.ccg_rating || 0));
        } else {
            copy.sort((a, b) => String(a.sorttitle || "").localeCompare(String(b.sorttitle || "")));
        }
        return copy;
    };

    const getPublisher = (game) => {
        const credits = game.credits || {};
        if (credits.publisher && credits.publisher.length) return credits.publisher[0];
        return game.developer || "";
    };

    const buildCanonicalIndexHtml = (game) => {
        const slug = game.slug || generateSlug(game.title || "game");
        const title = game.title || "Untitled Game";
        const description = game.description || `${title} on ${game.system || "C64"}.`;
        const canonicalUrl = `${SITE_BASE_URL}/games/${slug}/`;
        const imageUrl = game.thumbnail ? `${SITE_BASE_URL}/${game.thumbnail}` : `${SITE_BASE_URL}/resources/images/ccgamer-logo.png`;
        const publisher = getPublisher(game) || "Unknown Publisher";
        const year = game.year ? String(game.year) : "Unknown";
        const redirectTarget = `/games/${slug}/`;

        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8" />
    <meta http-equiv="refresh" content="0; url=${redirectTarget}" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />

    <title>${escapeHtml(title)} | Cheeky Commodore Gamer</title>
    <meta name="description" content="${escapeHtml(description)}" />

    <link rel="canonical" href="${canonicalUrl}" />

    <meta property="og:title" content="${escapeHtml(title)} | Cheeky Commodore Gamer" />
    <meta property="og:description" content="${escapeHtml(description)}" />
    <meta property="og:type" content="website" />
    <meta property="og:url" content="${canonicalUrl}" />
    <meta property="og:image" content="${imageUrl}" />

    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${escapeHtml(title)} | Cheeky Commodore Gamer" />
    <meta name="twitter:description" content="${escapeHtml(description)}" />
    <meta name="twitter:image" content="${imageUrl}" />

    <style>
        html, body {
            background: #000;
            margin: 0;
            padding: 0;
            overflow: hidden;
            opacity: 0;
        }
    </style>

    <script>
        (function () {
            try {
                window.location.replace("${redirectTarget}");
            } catch (e) {
                window.location.href = "${redirectTarget}";
            }
        })();
    </script>

    <script type="application/ld+json">
${JSON.stringify({
            "@context": "https://schema.org",
            "@type": "VideoGame",
            "name": title,
            "description": description,
            "datePublished": year,
            "gamePlatform": game.system || "C64",
            "publisher": publisher,
            "image": imageUrl,
            "url": canonicalUrl
        }, null, 4)}
    </script>

</head>
<body>
</body>
</html>`;
    };

    const buildSeoStubHtml = (game) => {
        const slug = game.slug || generateSlug(game.title || "game");
        const title = game.title || "Untitled Game";
        const description = game.description || `${title} on ${game.system || "C64"}.`;
        const canonicalUrl = `${SITE_BASE_URL}/games/${slug}/`;
        const imageUrl = game.thumbnail ? `${SITE_BASE_URL}/${game.thumbnail}` : `${SITE_BASE_URL}/resources/images/ccgamer-logo.png`;
        const publisher = getPublisher(game) || "Unknown";
        const year = game.year ? String(game.year) : "Unknown";

        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${title} |  Commodore Gamer</title>
    <meta name="description" content="${escapeHtml(description)}" />
    <link rel="canonical" href="${canonicalUrl}" />
    <meta property="og:title" content="${title} |  Commodore Gamer" />
    <meta property="og:description" content="${escapeHtml(description)}" />
    <meta property="og:type" content="website" />
    <meta property="og:url" content="${canonicalUrl}" />
    <meta property="og:image" content="${imageUrl}" />
    <link rel="icon" href="../favicon.ico" />
    <link rel="stylesheet" href="../resources/css/ccg-master.css" />
    <link rel="stylesheet" href="../resources/css/ccg-mode.css" />
    <link rel="stylesheet" href="../resources/css/ccg-effects.css" />
    <link rel="stylesheet" href="../resources/css/ccg-anim.css" />
    <link rel="stylesheet" href="../resources/css/ccg-overlays.css" />
    <link rel="stylesheet" href="../resources/css/ccg-cards.css" />
    <link rel="stylesheet" href="../resources/css/games.css" />
    <link rel="stylesheet" href="../resources/css/ccg-footer.css" />
    <script type="application/ld+json">
    ${JSON.stringify({
            "@context": "https://schema.org",
            "@type": "VideoGame",
            "name": title,
            "description": description,
            "datePublished": year,
            "gamePlatform": game.system || "C64",
            "publisher": publisher,
            "image": imageUrl,
            "url": canonicalUrl
        }, null, 4)}
    </script>
    <script type="application/ld+json">
    ${JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            "itemListElement": [
                {
                    "@type": "ListItem",
                    "position": 1,
                    "name": "Home",
                    "item": `${SITE_BASE_URL}/home.html`
                },
                {
                    "@type": "ListItem",
                    "position": 2,
                    "name": "Games",
                    "item": `${SITE_BASE_URL}/games/index.html`
                },
                {
                    "@type": "ListItem",
                    "position": 3,
                    "name": title,
                    "item": canonicalUrl
                }
            ]
        }, null, 4)}
    </script>
</head>
<body class="ccg-body" data-ccg-mode="c64">
    <div class="ccg-bg">
        <div class="ccg-bg-starfield"></div>
        <div class="ccg-bg-grid"></div>
        <div class="ccg-bg-crt-overlay"></div>
    </div>
    <div class="ccg-page">
        <main class="ccg-main">
            <section class="game-hero">
                <div class="game-hero__inner">
                    <div class="game-hero__media">
                        <img class="game-hero__thumb" src="../${game.thumbnail || "resources/images/ccgamer-logo.png"}" alt="${escapeHtml(title)} cover" loading="lazy" />
                    </div>
                    <div class="game-hero__content">
                        <h1 class="game-hero__title">${escapeHtml(title)}</h1>
                        <div class="game-hero__meta">
                            <span class="game-meta__item">${year}</span>
                            <span class="game-meta__sep">•</span>
                            <span class="game-meta__item">${game.system || "C64"}</span>
                            <span class="game-meta__sep">•</span>
                            <span class="game-meta__item">${escapeHtml(publisher || "Unknown")}</span>
                        </div>
                    </div>
                </div>
            </section>
            <section class="game-section">
                <p class="game-section__kicker">Overview</p>
                <h2 class="game-section__title">Game Summary</h2>
                <div class="game-description">${escapeHtml(description)}</div>
            </section>
            <section class="game-section">
                <p class="game-section__kicker">Explore</p>
                <h2 class="game-section__title">More Details</h2>
                <div class="game-downloads">
                    <a class="ccg-btn ccg-btn--primary" href="/games/${slug}/">View the full interactive game page</a>
                    <a class="ccg-btn ccg-btn--ghost" href="/games/index.html">Browse all games</a>
                </div>
            </section>
        </main>
        <footer class="ccg-footer">
            <p class="ccg-footer__text">© <span data-ccg-year></span>  Commodore Gamer.</p>
        </footer>
    </div>
    <script src="../js/ccg-base.js" defer></script>
</body>
</html>`;
    };

    const escapeHtml = (value) => String(value || "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/\"/g, "&quot;")
        .replace(/'/g, "&#39;");

    const escapeXml = (value) => String(value || "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/\"/g, "&quot;")
        .replace(/'/g, "&apos;");

    const getIsoDate = () => new Date().toISOString().split("T")[0];

    const generateSitemapXml = (gamesLibrary) => {
        const urls = new Set();
        const now = getIsoDate();
        const addUrl = (path) => {
            const trimmed = String(path || "").trim();
            if (!trimmed) return;
            const loc = trimmed.startsWith("http") ? trimmed : `${SITE_BASE_URL}${trimmed.startsWith("/") ? "" : "/"}${trimmed}`;
            urls.add(loc);
        };

        addUrl("/");
        addUrl("/games/");
        addUrl("/games/index.html");

        addUrl("/games/genres/");
        addUrl("/games/genres/index.html");
        GAME_GENRES.forEach((genre) => {
            const page = GENRE_PAGE_MAP.get(genre);
            if (page) addUrl(`/games/genres/${page}`);
        });

        addUrl("/games/collections/");
        addUrl("/games/collections/index.html");
        COLLECTION_FLAGS.forEach((collection) => {
            addUrl(`/games/collections/${collection.page}`);
        });

        (gamesLibrary || []).forEach((game) => {
            const slug = String(game.slug || "").trim();
            if (!slug || !CLEAN_SLUG_REGEX.test(slug)) return;
            addUrl(`/games/${slug}/`);
            addUrl(`/games/${slug}.html`);
        });

        const entries = Array.from(urls)
            .sort()
            .map((loc) => {
                return [
                    "  <url>",
                    `    <loc>${escapeXml(loc)}</loc>`,
                    `    <lastmod>${escapeXml(now)}</lastmod>`,
                    "  </url>"
                ].join("\n");
            })
            .join("\n");

        return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries}\n</urlset>`;
    };

    const buildSitemapUrlSet = (gamesLibrary) => {
        const urls = new Set();
        const addUrl = (path) => {
            const trimmed = String(path || "").trim();
            if (!trimmed) return;
            const loc = trimmed.startsWith("http") ? trimmed : `${SITE_BASE_URL}${trimmed.startsWith("/") ? "" : "/"}${trimmed}`;
            urls.add(loc);
        };

        addUrl("/");
        addUrl("/games/");
        addUrl("/games/index.html");
        addUrl("/games/genres/");
        addUrl("/games/genres/index.html");
        GAME_GENRES.forEach((genre) => {
            const page = GENRE_PAGE_MAP.get(genre);
            if (page) addUrl(`/games/genres/${page}`);
        });
        addUrl("/games/collections/");
        addUrl("/games/collections/index.html");
        COLLECTION_FLAGS.forEach((collection) => {
            addUrl(`/games/collections/${collection.page}`);
        });

        (gamesLibrary || []).forEach((game) => {
            const slug = String(game.slug || "").trim();
            if (!slug || !CLEAN_SLUG_REGEX.test(slug)) return;
            addUrl(`/games/${slug}/`);
            addUrl(`/games/${slug}.html`);
        });
        return urls;
    };

    const refreshDashboard = () => {
        const total = state.workingGames.length;
        const missingRatings = state.workingGames.filter(game => !game.ccg_rating).length;
        const missingPdfs = state.workingGames.filter(game => !game.pdf).length;
        const missingCredits = state.workingGames.filter(game => !hasCredits(game)).length;
        if (elements.totalCount) elements.totalCount.textContent = total;
        if (elements.missingRatings) elements.missingRatings.textContent = missingRatings;
        if (elements.missingPdfs) elements.missingPdfs.textContent = missingPdfs;
        if (elements.missingCredits) elements.missingCredits.textContent = missingCredits;
        if (elements.warningCount) elements.warningCount.textContent = state.validation.warnings.length;
    };

    const hasCredits = (game) => {
        if (!game || !game.credits) return false;
        const credits = game.credits;
        return Boolean(
            (credits.publisher && credits.publisher.length) ||
            credits.producer ||
            (credits.coder && credits.coder.length) ||
            (credits.graphics && credits.graphics.length) ||
            (credits.musician && credits.musician.length) ||
            (credits.re_releaser && credits.re_releaser.length) ||
            credits.developer
        );
    };

    const renderValidation = () => {
        const { errors, warnings } = state.validation;
        if (!elements.errorList || !elements.warningList) return;
        elements.errorList.innerHTML = "";
        elements.warningList.innerHTML = "";
        if (!errors.length && !warnings.length) {
            elements.validationEmpty.hidden = false;
            elements.errorPanel.hidden = true;
            elements.warningPanel.hidden = true;
            return;
        }
        elements.validationEmpty.hidden = true;
        if (errors.length) {
            errors.forEach((error) => {
                const li = document.createElement("li");
                li.textContent = error;
                elements.errorList.appendChild(li);
            });
            elements.errorPanel.hidden = false;
        } else {
            elements.errorPanel.hidden = true;
        }
        if (warnings.length) {
            warnings.forEach((warning) => {
                const li = document.createElement("li");
                li.textContent = warning;
                elements.warningList.appendChild(li);
            });
            elements.warningPanel.hidden = false;
        } else {
            elements.warningPanel.hidden = true;
        }
    };

    const updateValidation = () => {
        state.validation = validateLibrary(state.workingGames);
        refreshDashboard();
        renderValidation();
        updateStatusBar();
    };

    const validateLibrary = (games) => {
        const errors = [];
        const warnings = [];
        const idMap = new Map();
        const slugMap = new Map();
        const sitemapUrls = buildSitemapUrlSet(games);
        let migratedCount = 0;
        games.forEach((game) => {
            if (game.id) idMap.set(game.id, (idMap.get(game.id) || 0) + 1);
            if (game.slug) slugMap.set(game.slug, (slugMap.get(game.slug) || 0) + 1);
            if (game && game[MIGRATION_FLAG]) migratedCount += 1;
        });

        games.forEach((game) => {
            const prefix = `${game.title || game.id || "Untitled"}`;
            const isMigrated = Boolean(game && game[MIGRATION_FLAG]);
            const pushIssue = (message, severity = "error") => {
                if (severity === "error" && isMigrated) {
                    warnings.push(message);
                    return;
                }
                if (severity === "error") {
                    errors.push(message);
                    return;
                }
                warnings.push(message);
            };
            if (!game.id) pushIssue(`${prefix}: missing ID.`);
            if (!game.slug) {
                pushIssue(`${prefix}: missing slug.`);
                warnings.push(`${prefix}: orphan page risk (no slug for canonical/stub).`);
            }
            if (!game.title) pushIssue(`${prefix}: missing title.`);
            if (!game.sorttitle) warnings.push(`${prefix}: missing sort title.`);
            if (!game.genres || !game.genres.length) warnings.push(`${prefix}: missing genres.`);
            if (game.genres && game.genres.some((genre) => !GAME_GENRES.includes(genre))) {
                pushIssue(`${prefix}: invalid genre detected.`);
            }
            if (game.collections && game.collections.some((flag) => !COLLECTION_FLAGS.some((item) => item.id === flag))) {
                pushIssue(`${prefix}: invalid collection flag detected.`);
            }
            if (game.slug && !CLEAN_SLUG_REGEX.test(game.slug)) {
                pushIssue(`${prefix}: slug contains invalid characters (broken URL).`);
            }
            if (game.id && !CLEAN_ID_REGEX.test(game.id)) {
                pushIssue(`${prefix}: ID contains invalid characters.`);
            }
            if (game.slug && game.id && deriveIdFromSlug(game.slug) !== game.id) {
                pushIssue(`${prefix}: ID must match slug (slug → underscore).`);
            }
            if (game.id && idMap.get(game.id) > 1) pushIssue(`${prefix}: duplicate ID ${game.id}.`);
            if (game.slug && slugMap.get(game.slug) > 1) pushIssue(`${prefix}: duplicate slug ${game.slug}.`);
            if (game.thumbnail && !game.thumbnail.startsWith("resources/images/")) warnings.push(`${prefix}: thumbnail path should be under resources/images/.`);
            if (game.pdf && !isValidUrl(game.pdf)) pushIssue(`${prefix}: invalid PDF URL.`);
            if (game.disk && game.disk.some(disk => !isValidUrl(disk))) pushIssue(`${prefix}: invalid disk URL.`);
            if (game.lemon && game.lemon.some(link => !isValidUrl(link))) warnings.push(`${prefix}: invalid Lemon link.`);
            if (game.videoid && !YOUTUBE_ID_REGEX.test(game.videoid)) warnings.push(`${prefix}: invalid YouTube ID.`);
            if (!hasCredits(game)) warnings.push(`${prefix}: missing credits.`);

            if (!game.slug || !CLEAN_SLUG_REGEX.test(game.slug)) {
                warnings.push(`${prefix}: missing canonical folder (requires valid slug).`);
                warnings.push(`${prefix}: missing SEO stub (requires valid slug).`);
                return;
            }

            const canonicalUrl = `${SITE_BASE_URL}/games/${game.slug}/`;
            const stubUrl = `${SITE_BASE_URL}/games/${game.slug}.html`;
            if (!sitemapUrls.has(canonicalUrl) || !sitemapUrls.has(stubUrl)) {
                warnings.push(`${prefix}: sitemap missing canonical or stub entry.`);
            }
        });

        if (migratedCount) {
            warnings.unshift(`Legacy entries auto-migrated: ${migratedCount}`);
        }

        return { errors, warnings };
    };

    const validateDraft = (draft) => {
        const errors = [];
        const warnings = [];
        const id = draft.id;
        const slug = draft.slug;
        const idDupe = id && state.workingGames.some((game, index) => index !== state.selectedIndex && game.id === id);
        const slugDupe = slug && state.workingGames.some((game, index) => index !== state.selectedIndex && game.slug === slug);

        if (!draft.title) errors.push("Title is required.");
        if (!draft.id) errors.push("ID is required.");
        if (!draft.slug) errors.push("Slug is required.");
        if (draft.id && !CLEAN_ID_REGEX.test(draft.id)) errors.push("ID must be lowercase alphanumeric with underscores.");
        if (draft.slug && !CLEAN_SLUG_REGEX.test(draft.slug)) errors.push("Slug must be lowercase alphanumeric with hyphens.");
        if (idDupe) errors.push("ID must be unique.");
        if (slugDupe) errors.push("Slug must be unique.");
        if (slug && id && deriveIdFromSlug(slug) !== id) {
            errors.push("ID must match slug (slug → underscore).");
            warnings.push("ID/slug mismatch detected. Use auto-generate to sync.");
        }
        if (!draft.year) warnings.push("Year is missing.");
        if (draft.year && (draft.year < YEAR_MIN || draft.year > YEAR_MAX)) warnings.push(`Year should be between ${YEAR_MIN} and ${YEAR_MAX}.`);
        if (!draft.genres.length) warnings.push("Select at least one genre.");
        if (draft.genres.some((genre) => !GAME_GENRES.includes(genre))) errors.push("One or more genres are invalid.");
        if (draft.collections && draft.collections.some((flag) => !COLLECTION_FLAGS.some((item) => item.id === flag))) {
            errors.push("One or more collection flags are invalid.");
        }
        if (draft.videoid && !YOUTUBE_ID_REGEX.test(draft.videoid)) warnings.push("YouTube ID looks invalid.");
        if (draft.thumbnail && !draft.thumbnail.startsWith("resources/images/")) warnings.push("Thumbnail path should live under resources/images/.");
        if (draft.pdf && !isValidUrl(draft.pdf)) errors.push("PDF URL is invalid.");
        if (draft.disk.some(link => !isValidUrl(link))) errors.push("One or more disk URLs are invalid.");
        if (draft.lemon.some(link => !isValidUrl(link))) warnings.push("One or more Lemon links are invalid.");
        if (draft.ccg_rating && (draft.ccg_rating < 1 || draft.ccg_rating > 10)) warnings.push("Rating must be between 1 and 10.");

        return { errors, warnings };
    };

    const updateDraft = () => {
        if (!state.draftGame) return;
        state.draftGame = {
            ...state.draftGame,
            system: inputs.system.value,
            title: inputs.title.value.trim(),
            sorttitle: inputs.sortTitle.value.trim(),
            id: inputs.id.value.trim(),
            slug: inputs.slug.value.trim(),
            year: inputs.year.value ? Number(inputs.year.value) : "",
            videoid: inputs.videoId.value.trim(),
            thumbnail: inputs.thumbnail.value.trim(),
            pdf: inputs.pdf.value.trim(),
            disk: getListValues(inputs.diskList),
            description: inputs.description.value.trim(),
            ccg_rating: inputs.rating.value ? Number(inputs.rating.value) : "",
            ccg_rating_reason: inputs.ratingReason.value.trim(),
            credits: {
                publisher: getListValues(inputs.publisherList),
                producer: inputs.producer.value.trim(),
                coder: getListValues(inputs.coderList),
                graphics: getListValues(inputs.graphicsList),
                musician: getListValues(inputs.musicianList),
                re_releaser: getListValues(inputs.rereleaserList),
                developer: inputs.developer.value.trim()
            },
            developer: inputs.developer.value.trim(),
            lemon: getListValues(inputs.lemonList)
        };

        const genres = getSelectedGenres();
        const collections = getSelectedCollections();
        state.draftGame.genres = genres;
        state.draftGame.collections = sortCollections(collections);

        renderPreview();
        renderChangeList();
        updateDescriptionCount();
        updatePreviewLinks();
        updateBox3dFilenameDisplay();

        const draftValidation = validateDraft(state.draftGame);
        updateFieldHighlights(state.draftGame, draftValidation);
        updateStatusBar();
        if (draftValidation.errors.length || draftValidation.warnings.length) {
            setStatus(
                "Draft validation running.",
                `${draftValidation.errors.length} errors, ${draftValidation.warnings.length} warnings.`,
                draftValidation.errors.length ? "error" : "warning"
            );
        }
    };

    const updateStatusBar = () => {
        const loaded = state.workingGames.length > 0;
        if (elements.libraryStatus) {
            elements.libraryStatus.textContent = loaded ? "Loaded" : "Not loaded";
        }
        if (elements.currentGame) {
            if (state.draftGame) {
                elements.currentGame.textContent = `${state.draftGame.title || "Untitled"} (${state.draftGame.slug || state.draftGame.id || "draft"})`;
            } else {
                elements.currentGame.textContent = "None";
            }
        }
        if (elements.draftState) {
            const dirty = state.draftGame && diffGame(state.selectedIndex !== null ? state.workingGames[state.selectedIndex] : null, state.draftGame).length > 0;
            elements.draftState.textContent = dirty ? "Unsaved changes" : "Clean";
        }
        if (elements.validationSummary) {
            elements.validationSummary.textContent = `${state.validation.errors.length} errors / ${state.validation.warnings.length} warnings`;
        }
        updateStepAvailability();
    };

    const getSelectedGenres = () => {
        const checkboxes = elements.genreGrid.querySelectorAll("input[type='checkbox']");
        return Array.from(checkboxes)
            .filter((checkbox) => checkbox.checked)
            .map((checkbox) => checkbox.value);
    };

    const collectionMap = [
        { checkbox: elements.collectionTopPicks, id: "top-picks" },
        { checkbox: elements.collectionBpjs, id: "bpjs" },
        { checkbox: elements.collectionCartridge, id: "cartridge" },
        { checkbox: elements.collectionLicensed, id: "licensed" }
    ];

    const collectionToggleMap = new Map(collectionMap.map(({ checkbox, id }) => [checkbox, id]));

    const getSelectedCollections = () => {
        return collectionMap
            .filter(({ checkbox }) => checkbox && checkbox.checked)
            .map(({ id }) => id);
    };

    const syncCollectionToggles = (collections) => {
        const collectionSet = new Set(collections || []);
        collectionMap.forEach(({ checkbox, id }) => {
            if (!checkbox) return;
            checkbox.checked = collectionSet.has(id);
        });
    };

    const renderGenres = () => {
        if (!elements.genreGrid) return;
        elements.genreGrid.innerHTML = "";
        GAME_GENRES.forEach((genre) => {
            const label = document.createElement("label");
            label.className = "admin-toggle";
            const input = document.createElement("input");
            input.type = "checkbox";
            input.value = genre;
            label.appendChild(input);
            label.appendChild(document.createTextNode(` ${genre}`));
            elements.genreGrid.appendChild(label);
        });
    };

    const syncGenreSelection = (genres) => {
        const genreSet = new Set(genres);
        const checkboxes = elements.genreGrid.querySelectorAll("input[type='checkbox']");
        checkboxes.forEach((checkbox) => {
            checkbox.checked = genreSet.has(checkbox.value);
        });
        syncCollectionToggles(state.draftGame ? state.draftGame.collections : []);
    };

    const renderEditor = () => {
        if (!state.draftGame) return;
        const game = state.draftGame;
        inputs.system.value = game.system || "C64";
        inputs.title.value = game.title || "";
        inputs.sortTitle.value = game.sorttitle || "";
        inputs.id.value = game.id || "";
        inputs.slug.value = game.slug || "";
        inputs.year.value = game.year || "";
        inputs.videoId.value = game.videoid || "";
        inputs.thumbnail.value = game.thumbnail || "";
        inputs.pdf.value = game.pdf || "";
        inputs.description.value = game.description || "";
        inputs.rating.value = game.ccg_rating || "";
        inputs.ratingReason.value = game.ccg_rating_reason || "";
        inputs.producer.value = game.credits.producer || "";
        inputs.developer.value = game.credits.developer || game.developer || "";

        renderList(inputs.diskList, game.disk, "disk");
        renderList(inputs.publisherList, game.credits.publisher, "publisher");
        renderList(inputs.coderList, game.credits.coder, "coder");
        renderList(inputs.graphicsList, game.credits.graphics, "graphics");
        renderList(inputs.musicianList, game.credits.musician, "musician");
        renderList(inputs.rereleaserList, game.credits.re_releaser, "re_releaser");
        renderList(inputs.lemonList, game.lemon, "lemon");

        syncGenreSelection(game.genres || []);

        renderPreview();
        renderChangeList();
        updateDescriptionCount();
        updatePreviewLinks();
        updateBox3dFilenameDisplay();

        const draftValidation = validateDraft(state.draftGame);
        updateFieldHighlights(state.draftGame, draftValidation);
        updateStatusBar();
    };

    const updateFieldHighlights = (draft, validation) => {
        const idMismatch = draft.slug && draft.id && deriveIdFromSlug(draft.slug) !== draft.id;
        const fieldMap = [
            { input: inputs.title, invalid: !draft.title },
            { input: inputs.id, invalid: !draft.id || !CLEAN_ID_REGEX.test(draft.id) || idMismatch },
            { input: inputs.slug, invalid: !draft.slug || !CLEAN_SLUG_REGEX.test(draft.slug) },
            { input: inputs.year, invalid: draft.year && (draft.year < YEAR_MIN || draft.year > YEAR_MAX) },
            { input: inputs.pdf, invalid: draft.pdf && !isValidUrl(draft.pdf) },
            { input: inputs.videoId, invalid: draft.videoid && !YOUTUBE_ID_REGEX.test(draft.videoid) }
        ];

        fieldMap.forEach(({ input, invalid }) => {
            if (!input) return;
            input.classList.toggle("is-error", invalid);
        });

        const hasDiskIssues = draft.disk.some(link => !isValidUrl(link));
        inputs.diskInput.classList.toggle("is-error", hasDiskIssues);
        const hasLemonIssues = draft.lemon.some(link => !isValidUrl(link));
        inputs.lemonInput.classList.toggle("is-error", hasLemonIssues);

        inputs.year.classList.toggle("is-warning", !draft.year);

        if (validation.errors.length === 0 && validation.warnings.length === 0) {
            setStatus("Draft is clean.", "No validation issues detected.", "success");
        }
    };

    const renderPreview = () => {
        if (!elements.jsonPreview) return;
        if (!state.draftGame) {
            elements.jsonPreview.textContent = "{}";
            return;
        }
        const preview = buildSortedGame(state.draftGame);
        elements.jsonPreview.textContent = JSON.stringify(preview, null, 2);
    };

    const renderChangeList = () => {
        if (!elements.changeList) return;
        elements.changeList.innerHTML = "";
        if (!state.draftGame) {
            const msg = document.createElement("p");
            msg.className = "admin-status-inline";
            msg.textContent = "No changes detected yet.";
            elements.changeList.appendChild(msg);
            return;
        }
        const original = state.selectedIndex !== null ? state.workingGames[state.selectedIndex] : null;
        const diffs = diffGame(original, state.draftGame);
        if (!diffs.length) {
            const msg = document.createElement("p");
            msg.className = "admin-status-inline";
            msg.textContent = "No changes detected yet.";
            elements.changeList.appendChild(msg);
            return;
        }
        const list = document.createElement("ul");
        list.className = "admin-diff-list";
        diffs.forEach((diff) => {
            const li = document.createElement("li");
            li.textContent = `${diff.field}: ${diff.before} → ${diff.after}`;
            list.appendChild(li);
        });
        elements.changeList.appendChild(list);
    };

    const diffGame = (original, draft) => {
        if (!original) {
            return [{ field: "New entry", before: "-", after: draft.title || draft.id || "draft" }];
        }
        const diffs = [];
        SORT_KEY_ORDER.forEach((key) => {
            if (!(key in draft)) return;
            const before = formatDiffValue(original[key]);
            const after = formatDiffValue(draft[key]);
            if (before !== after) {
                diffs.push({ field: key, before, after });
            }
        });
        return diffs;
    };

    const formatDiffValue = (value) => {
        if (Array.isArray(value)) return value.join(", ") || "(empty)";
        if (value && typeof value === "object") return "[object]";
        return value === "" || value === null || value === undefined ? "(empty)" : String(value);
    };

    const renderList = (listEl, values) => {
        if (!listEl) return;
        listEl.innerHTML = "";
        (values || []).forEach((value) => {
            const li = document.createElement("li");
            li.className = "admin-list-item";
            li.dataset.value = value;
            const span = document.createElement("span");
            span.textContent = value;
            const remove = document.createElement("button");
            remove.type = "button";
            remove.className = "ccg-btn ccg-btn--ghost admin-list-remove";
            remove.textContent = "Remove";
            remove.addEventListener("click", () => {
                li.remove();
                renderEmptyNotices();
                updateDraft();
            });
            li.appendChild(span);
            li.appendChild(remove);
            listEl.appendChild(li);
        });
        renderEmptyNotices();
    };

    const renderEmptyNotices = () => {
        emptyNotices.forEach((notice) => {
            const key = notice.dataset.adminEmpty;
            let listEl = null;
            if (key === "disk") listEl = inputs.diskList;
            if (key === "publisher") listEl = inputs.publisherList;
            if (key === "coder") listEl = inputs.coderList;
            if (key === "graphics") listEl = inputs.graphicsList;
            if (key === "musician") listEl = inputs.musicianList;
            if (key === "re_releaser") listEl = inputs.rereleaserList;
            if (key === "lemon") listEl = inputs.lemonList;
            if (!listEl) return;
            notice.hidden = Boolean(listEl.children.length);
        });
    };

    const getListValues = (listEl) => {
        return Array.from(listEl.querySelectorAll(".admin-list-item")).map(item => item.dataset.value).filter(Boolean);
    };

    const setupListManager = (inputEl, buttonEl, listEl) => {
        const addItem = () => {
            const value = inputEl.value.trim();
            if (!value) return;
            const values = getListValues(listEl);
            if (values.includes(value)) {
                inputEl.value = "";
                return;
            }
            values.push(value);
            renderList(listEl, values);
            inputEl.value = "";
            updateDraft();
        };
        buttonEl.addEventListener("click", addItem);
        inputEl.addEventListener("keydown", (event) => {
            // ADMIN INPUT SAFETY LOCK — DO NOT REMOVE
            // Prevents quiz/hotkey logic from blocking form typing
            if (isEditableTarget(event.target)) return;

            if (event.key === "Enter") {
                event.preventDefault();
                addItem();
            }
        });
        listManagers.push({ inputEl, buttonEl, listEl });
    };

    const renderGameList = () => {
        const term = elements.searchInput.value.trim().toLowerCase();
        const system = elements.filterSystem.value;
        const genre = elements.filterGenre.value;
        const year = elements.filterYear.value.trim();
        const rating = elements.filterRating.value ? Number(elements.filterRating.value) : null;
        const sorted = sortGames(state.workingGames, elements.sortSelect.value);

        const filtered = sorted.filter((game) => {
            if (system && game.system !== system) return false;
            if (genre && (!game.genres || !game.genres.includes(genre))) return false;
            if (year && String(game.year) !== year) return false;
            if (rating !== null && (game.ccg_rating || 0) < rating) return false;
            if (!term) return true;
            const haystack = `${game.title} ${game.id} ${game.slug} ${game.system}`.toLowerCase();
            return haystack.includes(term);
        });

        elements.resultCount.textContent = filtered.length;
        elements.gameList.innerHTML = "";
        if (!filtered.length) {
            const row = document.createElement("tr");
            const cell = document.createElement("td");
            cell.colSpan = 5;
            cell.textContent = "No matches found.";
            row.appendChild(cell);
            elements.gameList.appendChild(row);
            return;
        }
        filtered.forEach((game) => {
            const row = document.createElement("tr");
            row.innerHTML = `
                <td>${escapeHtml(game.title || "(untitled)")}</td>
                <td>${escapeHtml(game.system || "")}</td>
                <td>${escapeHtml(game.year || "")}</td>
                <td>${escapeHtml(game.id || "")}</td>
                <td>${escapeHtml(game.slug || "")}</td>
            `;
            row.addEventListener("click", () => selectGame(game));
            elements.gameList.appendChild(row);
        });
    };

    const selectGame = (game) => {
        const index = state.workingGames.findIndex(item => item.id === game.id && item.slug === game.slug);
        if (index === -1) return;
        selectGameByIndex(index);
    };

    const selectGameByIndex = (index) => {
        state.selectedIndex = index;
        state.draftGame = clone(state.workingGames[index]);
        elements.editState.textContent = `Draft: ${state.draftGame.title || state.draftGame.id || "Untitled"}`;
        setStatus("Draft loaded.", "You are editing an existing entry.", "success");
        resetBox3dStage();
        renderEditor();
        setStep(3);
    };

    const createNewEntry = () => {
        state.selectedIndex = null;
        state.draftGame = defaultGame();
        elements.editState.textContent = "Draft: new entry";
        setStatus("New draft created.", "Fill in the fields and apply changes to add it to the library.", "success");
        resetBox3dStage();
        renderEditor();
        setStep(3);
        setSubstep("identity");
    };

    const applyChanges = () => {
        if (!state.draftGame) return;
        updateDraft();
        const validation = validateDraft(state.draftGame);
        if (validation.errors.length) {
            setStatus("Fix validation errors before applying.", validation.errors.join(" "), "error");
            return;
        }
        if (state.selectedIndex !== null) {
            const confirmOverwrite = window.confirm("Overwrite this entry with the current draft?");
            if (!confirmOverwrite) return;
        }
        state.history.push(clone(state.workingGames));
        if (state.history.length > 30) state.history.shift();
        elements.undoBtn.disabled = state.history.length === 0;

        if (state.selectedIndex !== null) {
            state.workingGames[state.selectedIndex] = clone(state.draftGame);
        } else {
            state.workingGames.push(clone(state.draftGame));
            state.workingGames = sortGames(state.workingGames, "sorttitle");
        }

        updateValidation();
        renderGameList();
        setStatus("Changes applied.", "Remember to export and commit manually.", "success");
    };

    const undoChanges = () => {
        if (!state.history.length) return;
        state.workingGames = state.history.pop();
        elements.undoBtn.disabled = state.history.length === 0;
        updateValidation();
        renderGameList();
        setStatus("Undo complete.", "Reverted to previous library snapshot.", "warning");
    };

    const discardDraft = () => {
        if (!state.draftGame) return;
        const confirmDiscard = window.confirm("Discard the current draft? Unsaved changes will be lost.");
        if (!confirmDiscard) return;
        state.draftGame = null;
        state.selectedIndex = null;
        elements.editState.textContent = "Draft: none";
        renderPreview();
        renderChangeList();
        updatePreviewLinks();
        updateStatusBar();
        resetBox3dStage();
        setStatus("Draft discarded.", "Select a game or create a new entry.", "warning");
    };

    const handleAutoIds = () => {
        const title = inputs.title.value || inputs.id.value || "";
        const slug = generateSlug(title);
        inputs.slug.value = slug;
        inputs.id.value = deriveIdFromSlug(slug);
        updateDraft();
    };

    const handleAutoSort = () => {
        const title = inputs.title.value || "";
        inputs.sortTitle.value = generateSortTitle(title);
        updateDraft();
    };

    const handleAutoThumbnail = () => {
        const id = inputs.id.value || generateId(inputs.title.value);
        if (!id) return;
        inputs.thumbnail.value = `resources/images/thumbnails/all/${id}.png`;
        updateDraft();
    };

    const updateDescriptionCount = () => {
        if (!elements.descriptionCount) return;
        const length = inputs.description.value.trim().length;
        elements.descriptionCount.textContent = `${length} chars`;
    };

    const findSlugMismatch = (games) => {
        return (games || []).find((game) => {
            if (!game || !game.slug || !game.id) return false;
            if (game[MIGRATION_FLAG]) return false;
            return deriveIdFromSlug(game.slug) !== game.id;
        });
    };

    const setExportIndicator = (element, ready, label) => {
        if (!element) return;
        element.textContent = `${ready ? "✔" : "○"} ${label}`;
        element.dataset.state = ready ? "success" : "idle";
    };

    const exportJson = (payload, filename) => {
        const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(url);
    };

    const hasBlockingDraftErrors = () => {
        if (!state.draftGame) return false;
        const validation = validateDraft(state.draftGame);
        if (!validation.errors.length) return false;
        setStatus("Export blocked.", validation.errors.join(" "), "error");
        return true;
    };

    const copyJson = async () => {
        if (!state.draftGame) return;
        const payload = buildSortedGame(state.draftGame);
        try {
            await navigator.clipboard.writeText(JSON.stringify(payload, null, 2));
            setStatus("JSON copied.", "Draft JSON copied to clipboard.", "success");
        } catch (error) {
            setStatus("Copy failed.", "Clipboard access not available.", "error");
        }
    };

    const downloadSelectedJson = () => {
        if (!state.draftGame) return;
        if (hasBlockingDraftErrors()) return;
        exportJson(buildSortedGame(state.draftGame), `${state.draftGame.slug || "game"}.json`);
    };

    const downloadLibraryJson = () => {
        if (hasBlockingDraftErrors()) return;
        const payload = state.workingGames.map(game => buildSortedGame(game));
        exportJson(payload, "games.json");
    };

    const downloadSelectedStub = () => {
        if (!state.draftGame) return;
        if (hasBlockingDraftErrors()) return;
        const stub = buildSeoStubHtml(state.draftGame);
        const slug = state.draftGame.slug || generateSlug(state.draftGame.title);
        const blob = new Blob([stub], { type: "text/html" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `${slug}.html`;
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(url);
        setExportIndicator(elements.exportPagesStatus, true, "Pages generated");
    };

    const downloadAllStubs = async () => {
        if (!state.workingGames.length) return;
        if (hasBlockingDraftErrors()) return;
        if (typeof JSZip === "undefined") {
            setStatus("JSZip missing.", "SEO stubs cannot be zipped without JSZip.", "error");
            return;
        }
        const zip = new JSZip();
        state.workingGames.forEach((game) => {
            const slug = game.slug || generateSlug(game.title);
            const stub = buildSeoStubHtml(game);
            zip.file(`${slug}.html`, stub);
        });
        const blob = await zip.generateAsync({ type: "blob" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = "ccg-seo-stubs.zip";
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(url);
        setExportIndicator(elements.exportPagesStatus, true, "Pages generated");
    };

    const downloadSitemapOnly = () => {
        if (!state.workingGames.length) return;
        if (hasBlockingDraftErrors()) return;
        const xml = generateSitemapXml(state.workingGames);
        const blob = new Blob([xml], { type: "application/xml" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = "sitemap.xml";
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(url);
        setExportIndicator(elements.exportSitemapStatus, true, "Sitemap generated");
    };

    const downloadFullGamePackage = async () => {
        if (!state.draftGame) return;
        if (hasBlockingDraftErrors()) return;
        if (typeof JSZip === "undefined") {
            setStatus("JSZip missing.", "Full package cannot be zipped without JSZip.", "error");
            return;
        }
        const slug = state.draftGame.slug || generateSlug(state.draftGame.title);
        if (!slug || !CLEAN_SLUG_REGEX.test(slug)) {
            setStatus("Export blocked.", "A valid slug is required to build a package.", "error");
            return;
        }
        const zip = new JSZip();
        const gamesPayload = state.workingGames.map(game => buildSortedGame(game));
        zip.file("games/games.json", JSON.stringify(gamesPayload, null, 2));
        zip.file(`games/${slug}.html`, buildSeoStubHtml(state.draftGame));
        zip.file(`games/${slug}/index.html`, buildCanonicalIndexHtml(state.draftGame));
        zip.file("sitemap.xml", generateSitemapXml(state.workingGames));
        const blob = await zip.generateAsync({ type: "blob" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `ccg-game-${slug}.zip`;
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(url);
        setExportIndicator(elements.exportPagesStatus, true, "Pages generated");
        setExportIndicator(elements.exportSitemapStatus, true, "Sitemap generated");
        setExportIndicator(elements.exportPackageStatus, true, "Package ready");
    };

    const loadGames = (games, sourceLabel) => {
        state.baseGames = games.map(game => normalizeGame(game));
        state.workingGames = clone(state.baseGames);
        state.draftGame = null;
        state.selectedIndex = null;
        state.history = [];
        elements.undoBtn.disabled = true;
        elements.source.textContent = `Source: ${sourceLabel}`;
        setStatus("Games loaded.", "Select an entry to begin editing.", "success");
        updateValidation();
        renderGameList();
        renderPreview();
        renderChangeList();
        updatePreviewLinks();
        setExportIndicator(elements.exportPagesStatus, false, "Pages generated");
        setExportIndicator(elements.exportSitemapStatus, false, "Sitemap generated");
        setExportIndicator(elements.exportPackageStatus, false, "Package ready");
        setStep(2);
    };

    const fetchGames = async () => {
        setStatus("Fetching games.json...", "Connecting to live data.", "warning");
        try {
            const response = await fetch(GAMES_JSON_URL, { cache: "no-store" });
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const data = await response.json();
            if (!Array.isArray(data)) throw new Error("games.json is not an array.");
            loadGames(data, "live games.json");
        } catch (error) {
            setStatus("Fetch failed.", error.message, "error");
        }
    };

    const uploadGames = (file) => {
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => {
            try {
                const data = JSON.parse(reader.result);
                if (!Array.isArray(data)) throw new Error("Uploaded JSON is not an array.");
                loadGames(data, `upload: ${file.name}`);
            } catch (error) {
                setStatus("Upload failed.", error.message, "error");
            }
        };
        reader.readAsText(file);
    };

    const clearSession = () => {
        const confirmClear = window.confirm("Clear the current session? This will discard loaded data.");
        if (!confirmClear) return;
        state.baseGames = [];
        state.workingGames = [];
        state.draftGame = null;
        state.selectedIndex = null;
        state.history = [];
        elements.undoBtn.disabled = true;
        elements.source.textContent = "Source: none.";
        elements.gameList.innerHTML = "<tr><td colspan=\"5\">Load games.json to view entries.</td></tr>";
        elements.resultCount.textContent = "0";
        if (elements.totalCount) elements.totalCount.textContent = "0";
        if (elements.warningCount) elements.warningCount.textContent = "0";
        if (elements.missingRatings) elements.missingRatings.textContent = "0";
        if (elements.missingPdfs) elements.missingPdfs.textContent = "0";
        if (elements.missingCredits) elements.missingCredits.textContent = "0";
        renderPreview();
        renderChangeList();
        renderValidation();
        updatePreviewLinks();
        updateStatusBar();
        setExportIndicator(elements.exportPagesStatus, false, "Pages generated");
        setExportIndicator(elements.exportSitemapStatus, false, "Sitemap generated");
        setExportIndicator(elements.exportPackageStatus, false, "Package ready");
        setStatus("Session cleared.", "Load a new file to continue.", "warning");
        resetBox3dStage();
        setStep(1);
    };

    const handleFilters = () => renderGameList();

    const setStep = (step) => {
        if (!STEP_IDS.includes(step)) return;
        const targetBtn = elements.stepButtons.find(btn => Number(btn.dataset.step) === step);
        if (targetBtn && targetBtn.disabled) return;
        state.currentStep = step;
        elements.stepButtons.forEach((btn) => {
            const isActive = Number(btn.dataset.step) === step;
            btn.classList.toggle("is-active", isActive);
            btn.setAttribute("aria-selected", String(isActive));
        });
        elements.stepPanels.forEach((panel) => {
            panel.hidden = Number(panel.dataset.stepPanel) !== step;
        });
        elements.contextPanels.forEach((panel) => {
            panel.hidden = Number(panel.dataset.context) !== step;
        });
    };

    const updateStepAvailability = () => {
        const loaded = state.workingGames.length > 0;
        const hasDraft = Boolean(state.draftGame);
        elements.stepButtons.forEach((btn) => {
            const step = Number(btn.dataset.step);
            let enabled = true;
            if (step === 1) enabled = true;
            if (step === 2) enabled = loaded;
            if (step === 3) enabled = loaded && hasDraft;
            if (step === 4 || step === 5 || step === 6) enabled = loaded;
            btn.disabled = !enabled;
        });
    };

    const setSubstep = (tab) => {
        if (!SUBSTEPS.includes(tab)) return;
        state.currentSubstep = tab;
        elements.tabButtons.forEach((btn) => {
            const isActive = btn.dataset.adminTab === tab;
            btn.classList.toggle("is-active", isActive);
            btn.setAttribute("aria-selected", String(isActive));
        });
        elements.tabPanels.forEach((panel) => {
            panel.hidden = panel.dataset.adminPanel !== tab;
        });
        if (elements.substepStatus) {
            elements.substepStatus.textContent = tab.charAt(0).toUpperCase() + tab.slice(1);
        }
    };

    const validateIdentitySubstep = () => {
        if (!state.draftGame) return [];
        const errors = [];
        const title = inputs.title.value.trim();
        const id = inputs.id.value.trim();
        const slug = inputs.slug.value.trim();
        if (!title) errors.push("Title is required.");
        if (!id) errors.push("ID is required.");
        if (!slug) errors.push("Slug is required.");
        if (id && !CLEAN_ID_REGEX.test(id)) errors.push("ID format is invalid.");
        if (slug && !CLEAN_SLUG_REGEX.test(slug)) errors.push("Slug format is invalid.");
        if (slug && id && deriveIdFromSlug(slug) !== id) errors.push("ID must match slug (slug → underscore).");
        return errors;
    };

    const handleSubstepNext = (event) => {
        const next = event.currentTarget.dataset.substepNext;
        if (state.currentSubstep === "identity") {
            const errors = validateIdentitySubstep();
            const alert = event.currentTarget.closest(".admin-form-section").querySelector("[data-substep-alert]");
            if (alert) {
                alert.textContent = errors.length ? errors.join(" ") : "";
            }
            if (errors.length) return;
        }
        setSubstep(next);
    };

    const setupTabs = () => {
        elements.tabButtons.forEach((button) => {
            button.addEventListener("click", () => {
                const tab = button.dataset.adminTab;
                setSubstep(tab);
            });
        });
    };

    const updatePreviewLinks = () => {
        const draft = state.draftGame;
        const slug = draft ? (draft.slug || generateSlug(draft.title)) : "";
        const thumb = draft ? draft.thumbnail : "";
        const manual = draft ? draft.pdf : "";
        const disk = draft && draft.disk && draft.disk.length ? draft.disk[0] : "";

        if (elements.previewGameLink) {
            elements.previewGameLink.href = slug ? `/games/${slug}/` : "#";
            elements.previewGameLink.setAttribute("aria-disabled", String(!slug));
        }
        if (elements.previewThumbLink) {
            elements.previewThumbLink.href = thumb ? `/${thumb}` : "#";
            elements.previewThumbLink.setAttribute("aria-disabled", String(!thumb));
        }
        if (elements.previewManualLink) {
            elements.previewManualLink.href = manual || "#";
            elements.previewManualLink.setAttribute("aria-disabled", String(!manual));
        }
        if (elements.previewDiskLink) {
            elements.previewDiskLink.href = disk || "#";
            elements.previewDiskLink.setAttribute("aria-disabled", String(!disk));
        }
    };

    const copyToClipboard = async (text) => {
        const value = String(text || "").trim();
        if (!value) return false;
        try {
            if (navigator.clipboard && navigator.clipboard.writeText) {
                await navigator.clipboard.writeText(value);
                return true;
            }
        } catch (e) {}
        try {
            const ta = document.createElement("textarea");
            ta.value = value;
            ta.setAttribute("readonly", "");
            ta.style.position = "absolute";
            ta.style.left = "-9999px";
            document.body.appendChild(ta);
            ta.select();
            document.execCommand("copy");
            document.body.removeChild(ta);
            return true;
        } catch (e) {
            return false;
        }
    };

    const getMissingCandidates = (filterKey) => {
        const games = Array.isArray(state.workingGames) ? state.workingGames : [];
        const results = [];

        const missingMap = {
            missing_thumbnail: { label: "thumbnail", substep: "media" },
            missing_pdf: { label: "PDF/manual", substep: "media" },
            missing_disks: { label: "disk links", substep: "media" },
            missing_rating: { label: "rating", substep: "editorial" },
            missing_year: { label: "year", substep: "identity" },
            missing_publisher: { label: "publisher/developer", substep: "credits" },
            missing_description: { label: "description", substep: "editorial" },
            missing_video: { label: "YouTube/video", substep: "media" },
            missing_system: { label: "system/platform", substep: "identity" },
            missing_slug: { label: "slug", substep: "identity" }
        };

        for (let i = 0; i < games.length; i++) {
            const g = games[i] || {};
            const title = (g.title || "").toString().trim();
            const slug = generateSlug(g.slug || g.title || "");
            const thumb = (g.thumbnail || g.thumb || g.cover || g.image || "").toString().trim();
            const pdf = (g.pdf || g.manual || g.instructions || "").toString().trim();
            const disks = g.disks || g.disk || g.diskLinks || g.downloads || [];
            const rating = g.rating ?? g.ccgRating ?? g.score ?? g.ccg_rating;
            const year = (g.year || g.releaseYear || "").toString().trim();
            const pub = (g.publisher || g.developer || g.company || "").toString().trim();
            const desc = (g.description || g.desc || "").toString().trim();
            const video = (g.youtube || g.youtubeId || g.video || g.videoId || g.videoid || "").toString().trim();
            const system = (g.system || g.platform || "").toString().trim();

            let ok = false;

            switch (filterKey) {
                case "missing_thumbnail":
                    ok = !thumb;
                    break;
                case "missing_pdf":
                    ok = !pdf;
                    break;
                case "missing_disks":
                    ok = !Array.isArray(disks) || disks.length === 0;
                    break;
                case "missing_rating":
                    ok = rating === null || rating === undefined || String(rating).trim() === "";
                    break;
                case "missing_year":
                    ok = !year || year.toLowerCase().includes("unknown");
                    break;
                case "missing_publisher":
                    ok = !pub || pub.toLowerCase().includes("unknown");
                    break;
                case "missing_description":
                    ok = !desc;
                    break;
                case "missing_video":
                    ok = !video;
                    break;
                case "missing_system":
                    ok = !system;
                    break;
                case "missing_slug":
                    ok = !(g.slug && String(g.slug).trim());
                    break;
                default:
                    ok = false;
            }

            if (ok) {
                results.push({
                    index: i,
                    title: title || "(untitled)",
                    slug: slug || "(no-slug)",
                    missing: missingMap[filterKey]?.label || "missing data",
                    substep: missingMap[filterKey]?.substep || "identity"
                });
            }
        }

        return results;
    };

    const renderMissingList = () => {
        if (!elements.missingList || !elements.missingFilter) return;
        const key = elements.missingFilter.value;
        const items = getMissingCandidates(key);

        elements.missingList.innerHTML = "";
        if (elements.missingHint) elements.missingHint.hidden = true;

        if (!items.length) {
            const li = document.createElement("li");
            li.textContent = "Nothing found for this category 🎉";
            elements.missingList.appendChild(li);
            return;
        }

        items.slice(0, 200).forEach((it) => {
            const li = document.createElement("li");
            li.className = "admin-missing-item";
            li.innerHTML = `
                <div>
                    <strong>${escapeHtml(it.title)}</strong>
                    <span class="admin-muted">(${escapeHtml(it.slug)})</span>
                    <div class="admin-muted">Missing: ${escapeHtml(it.missing)}</div>
                </div>
                <button type="button" class="ccg-btn ccg-btn--ghost" data-miss-index="${it.index}" data-miss-substep="${it.substep}">Load into editor</button>
            `;
            elements.missingList.appendChild(li);
        });

        if (items.length > 200 && elements.missingHint) {
            elements.missingHint.hidden = false;
            elements.missingHint.textContent = `Showing first 200 of ${items.length}. Narrow your filter, then Find again.`;
        }
    };

    const handleMissingListClick = (event) => {
        const button = event.target.closest("[data-miss-index]");
        if (!button) return;
        const index = Number(button.dataset.missIndex);
        const substep = button.dataset.missSubstep;
        if (Number.isNaN(index)) return;
        selectGameByIndex(index);
        setSubstep(substep || "identity");
        setStep(3);
    };

    const guessThumbFilename = (slug, file) => {
        const safeSlug = generateSlug(slug || "");
        const rawName = file && file.name ? String(file.name) : "";
        const ext = (rawName.split(".").pop() || "webp").toLowerCase();
        const safeExt = ["webp", "png", "jpg", "jpeg"].includes(ext) ? ext : "webp";
        return `${safeSlug || "thumbnail"}.${safeExt}`;
    };

    const getBox3dSlug = () => generateSlug(inputs.slug.value || inputs.title.value || inputs.id.value || "");

    const updateBox3dFilenameDisplay = () => {
        if (!elements.box3dFilename) return "";
        const slug = getBox3dSlug();
        const filename = slug ? `${slug}.webp` : "slug.webp";
        elements.box3dFilename.textContent = filename;
        if (state.stagedBox3d && slug && state.stagedBox3d.slug !== slug) {
            if (elements.box3dStatus) {
                elements.box3dStatus.textContent = "Slug changed. Re-export to update the filename.";
            }
        }
        return filename;
    };

    const resetBox3dStage = (message = "No 3D box staged yet.") => {
        if (state.stagedBox3d && state.stagedBox3d.url) {
            URL.revokeObjectURL(state.stagedBox3d.url);
        }
        state.stagedBox3d = null;
        if (elements.box3dPreview) {
            elements.box3dPreview.removeAttribute("src");
            elements.box3dPreview.hidden = true;
        }
        if (elements.box3dStatus) {
            elements.box3dStatus.textContent = message;
        }
        if (elements.box3dDownload) {
            elements.box3dDownload.disabled = true;
        }
    };

    const loadImageFile = (file) => new Promise((resolve, reject) => {
        const img = new Image();
        const url = URL.createObjectURL(file);
        img.onload = () => {
            URL.revokeObjectURL(url);
            resolve(img);
        };
        img.onerror = () => {
            URL.revokeObjectURL(url);
            reject(new Error("Image could not be loaded."));
        };
        img.src = url;
    });

    const processBox3dFile = async (file, slug) => {
        const img = await loadImageFile(file);
        const scale = Math.min(1, BOX3D_MAX_WIDTH / img.width);
        const width = Math.max(1, Math.round(img.width * scale));
        const height = Math.max(1, Math.round(img.height * scale));
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) throw new Error("Canvas unavailable.");
        ctx.drawImage(img, 0, 0, width, height);
        const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/webp", BOX3D_QUALITY));
        if (!blob) throw new Error("WebP conversion failed.");
        return {
            blob,
            url: URL.createObjectURL(blob),
            filename: `${slug}.webp`,
            size: blob.size,
            width,
            height,
            slug
        };
    };

    const handleBox3dUpload = async (event) => {
        const file = event.target.files[0];
        if (!file) return;
        const slug = getBox3dSlug();
        updateBox3dFilenameDisplay();
        if (!slug) {
            resetBox3dStage("Add a slug before uploading 3D box art.");
            setStatus("Slug required.", "Enter a slug to auto-name the 3D box file.", "warning");
            return;
        }
        setStatus("Processing 3D box art…", "Optimising to WebP.", "warning");
        try {
            const result = await processBox3dFile(file, slug);
            if (state.stagedBox3d && state.stagedBox3d.url) {
                URL.revokeObjectURL(state.stagedBox3d.url);
            }
            state.stagedBox3d = result;
            if (elements.box3dPreview) {
                elements.box3dPreview.src = result.url;
                elements.box3dPreview.hidden = false;
            }
            if (elements.box3dDownload) {
                elements.box3dDownload.disabled = false;
            }
            if (elements.box3dStatus) {
                const sizeKb = Math.round(result.size / 1024);
                elements.box3dStatus.textContent = `Ready: ${result.width}×${result.height}px · ${sizeKb} KB`;
            }
            setStatus("3D box ready.", `Save to ${BOX3D_FOLDER}${result.filename}`, "success");
        } catch (error) {
            resetBox3dStage("3D box conversion failed.");
            setStatus("3D box conversion failed.", error.message || "Try a different image.", "error");
        }
    };

    const handleBox3dDownload = () => {
        if (!state.stagedBox3d) {
            setStatus("No 3D box staged.", "Upload an image first.", "warning");
            return;
        }
        const link = document.createElement("a");
        link.href = state.stagedBox3d.url;
        link.download = state.stagedBox3d.filename;
        document.body.appendChild(link);
        link.click();
        link.remove();
    };

    const handleThumbUpload = (event) => {
        const file = event.target.files[0];
        if (!file) return;
        state.stagedThumb = file;
        setStatus("Thumbnail staged.", `Ready to download ${guessThumbFilename(inputs.slug.value, file)}.`, "success");
    };

    const handleThumbDownload = () => {
        if (!state.stagedThumb) {
            setStatus("No thumbnail staged.", "Choose a thumbnail file first.", "warning");
            return;
        }
        const filename = guessThumbFilename(inputs.slug.value || inputs.id.value, state.stagedThumb);
        const url = URL.createObjectURL(state.stagedThumb);
        const link = document.createElement("a");
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(url);
    };

    const setupHelpToggles = () => {
        document.querySelectorAll("[data-help-toggle]").forEach((btn) => {
            btn.addEventListener("click", () => {
                const targetId = btn.dataset.helpToggle;
                const panel = document.getElementById(targetId);
                if (!panel) return;
                const isHidden = panel.hasAttribute("hidden");
                panel.toggleAttribute("hidden", !isHidden);
                btn.setAttribute("aria-expanded", String(isHidden));
            });
        });
    };

    const handleStepKeydown = (event) => {
        // ADMIN INPUT SAFETY LOCK — DO NOT REMOVE
        // Prevents quiz/hotkey logic from blocking form typing
        if (isEditableTarget(event.target)) return;

        const currentIndex = elements.stepButtons.findIndex(btn => btn === document.activeElement);
        if (currentIndex === -1) return;
        if (event.key === "ArrowDown" || event.key === "ArrowRight") {
            event.preventDefault();
            const next = elements.stepButtons[currentIndex + 1];
            if (next) next.focus();
        }
        if (event.key === "ArrowUp" || event.key === "ArrowLeft") {
            event.preventDefault();
            const prev = elements.stepButtons[currentIndex - 1];
            if (prev) prev.focus();
        }
    };

    const attachListeners = () => {
        elements.fetchBtn.addEventListener("click", fetchGames);
        elements.uploadInput.addEventListener("change", (event) => uploadGames(event.target.files[0]));
        elements.clearBtn.addEventListener("click", clearSession);
        elements.newBtn.addEventListener("click", createNewEntry);
        elements.applyBtn.addEventListener("click", applyChanges);
        elements.discardBtn.addEventListener("click", discardDraft);
        elements.undoBtn.addEventListener("click", undoChanges);
        elements.jumpExportBtn.addEventListener("click", () => setStep(5));
        elements.copyJsonBtn.addEventListener("click", copyJson);
        elements.downloadJsonBtn.addEventListener("click", downloadSelectedJson);
        elements.downloadLibraryBtn.addEventListener("click", downloadLibraryJson);
        elements.downloadStubBtn.addEventListener("click", downloadSelectedStub);
        elements.downloadStubsBtn.addEventListener("click", downloadAllStubs);
        elements.downloadSitemapBtn.addEventListener("click", downloadSitemapOnly);
        elements.downloadPackageBtn.addEventListener("click", () => {
            void downloadFullGamePackage();
        });
        elements.searchInput.addEventListener("input", handleFilters);
        elements.filterSystem.addEventListener("change", handleFilters);
        elements.filterGenre.addEventListener("change", handleFilters);
        elements.filterYear.addEventListener("input", handleFilters);
        elements.filterRating.addEventListener("change", handleFilters);
        elements.sortSelect.addEventListener("change", handleFilters);

        Object.values(inputs).forEach((input) => {
            if (!input || input.tagName === "BUTTON") return;
            input.addEventListener("input", updateDraft);
        });

        inputs.autoId.addEventListener("click", handleAutoIds);
        inputs.autoSort.addEventListener("click", handleAutoSort);
        inputs.autoThumb.addEventListener("click", handleAutoThumbnail);
        inputs.thumbUpload.addEventListener("change", handleThumbUpload);
        inputs.thumbDownload.addEventListener("click", handleThumbDownload);
        if (elements.box3dUpload) {
            elements.box3dUpload.addEventListener("change", (event) => {
                void handleBox3dUpload(event);
            });
        }
        if (elements.box3dDownload) {
            elements.box3dDownload.addEventListener("click", handleBox3dDownload);
        }

        listManagers.length = 0;
        setupListManager(inputs.diskInput, inputs.diskAdd, inputs.diskList);
        setupListManager(inputs.publisherInput, inputs.publisherAdd, inputs.publisherList);
        setupListManager(inputs.coderInput, inputs.coderAdd, inputs.coderList);
        setupListManager(inputs.graphicsInput, inputs.graphicsAdd, inputs.graphicsList);
        setupListManager(inputs.musicianInput, inputs.musicianAdd, inputs.musicianList);
        setupListManager(inputs.rereleaserInput, inputs.rereleaserAdd, inputs.rereleaserList);
        setupListManager(inputs.lemonInput, inputs.lemonAdd, inputs.lemonList);

        const handleCollectionToggle = (event) => {
            const flag = collectionToggleMap.get(event.target);
            if (flag) {
                updateDraft();
            }
        };

        elements.genreGrid.addEventListener("change", updateDraft);
        elements.collectionTopPicks.addEventListener("change", handleCollectionToggle);
        elements.collectionBpjs.addEventListener("change", handleCollectionToggle);
        elements.collectionCartridge.addEventListener("change", handleCollectionToggle);
        elements.collectionLicensed.addEventListener("change", handleCollectionToggle);

        elements.missingRefresh.addEventListener("click", renderMissingList);
        elements.missingList.addEventListener("click", handleMissingListClick);

        elements.copySlugCmd.addEventListener("click", async () => {
            const ok = await copyToClipboard(elements.cmdSlug.textContent);
            setStatus(ok ? "Command copied." : "Copy failed.", "Slug command ready to paste.", ok ? "success" : "error");
        });
        elements.copySitemapCmd.addEventListener("click", async () => {
            const ok = await copyToClipboard(elements.cmdSitemap.textContent);
            setStatus(ok ? "Command copied." : "Copy failed.", "Sitemap command ready to paste.", ok ? "success" : "error");
        });
        elements.copyGitCmd.addEventListener("click", async () => {
            const ok = await copyToClipboard(elements.cmdGit.textContent);
            setStatus(ok ? "Command copied." : "Copy failed.", "Git commands ready to paste.", ok ? "success" : "error");
        });
        elements.copyGscCmd.addEventListener("click", async () => {
            const ok = await copyToClipboard(elements.cmdGsc.textContent);
            setStatus(ok ? "Link copied." : "Copy failed.", "Sitemap link ready to paste.", ok ? "success" : "error");
        });

        elements.stepButtons.forEach((btn) => {
            btn.addEventListener("click", () => setStep(Number(btn.dataset.step)));
            btn.addEventListener("keydown", handleStepKeydown);
        });

        document.querySelectorAll(".admin-substep-next").forEach((btn) => {
            btn.addEventListener("click", handleSubstepNext);
        });

        elements.taskNewBtn.addEventListener("click", createNewEntry);
        elements.taskEditBtn.addEventListener("click", () => setStep(2));
        elements.taskFixBtn.addEventListener("click", () => setStep(4));
    };

    const hydrateFilters = () => {
        elements.filterGenre.innerHTML = "<option value=\"\">All genres</option>";
        GAME_GENRES.forEach((genre) => {
            const option = document.createElement("option");
            option.value = genre;
            option.textContent = genre;
            elements.filterGenre.appendChild(option);
        });
    };

    const setupGate = () => {
        if (!elements.gate || !elements.gateInput || !elements.gateUnlock || !elements.gateStatus) {
            return;
        }

        const unlockKey = "ccg-admin-unlocked";
        const gateDisabled = ADMIN_GATE_PASSPHRASE === "" || ADMIN_GATE_PASSPHRASE === null;
        const unlocked = sessionStorage.getItem(unlockKey) === "true";
        const fadeDuration = 200;

        const setGateStatus = (message, state = "") => {
            elements.gateStatus.textContent = message;
            if (state) {
                elements.gateStatus.dataset.state = state;
            } else {
                delete elements.gateStatus.dataset.state;
            }
        };

        const hideGateImmediate = () => {
            elements.gate.removeAttribute("hidden");
            elements.gate.style.display = "none";
            elements.gate.style.opacity = "";
            elements.gate.style.pointerEvents = "none";
            elements.gate.style.transition = "";
        };

        const showGate = () => {
            elements.gate.removeAttribute("hidden");
            elements.gate.style.display = "grid";
            elements.gate.style.opacity = "1";
            elements.gate.style.pointerEvents = "auto";
            elements.gate.style.transition = "opacity 200ms ease";
            setGateStatus("");
            elements.gateInput.focus();
        };

        const fadeOutGate = () => {
            elements.gate.style.transition = `opacity ${fadeDuration}ms ease`;
            elements.gate.style.pointerEvents = "none";
            requestAnimationFrame(() => {
                elements.gate.style.opacity = "0";
            });
            window.setTimeout(() => {
                elements.gate.style.display = "none";
                elements.gate.style.opacity = "";
                elements.gate.style.transition = "";
            }, fadeDuration);
        };

        const unlock = () => {
            const value = elements.gateInput.value.trim();
            if (value === ADMIN_GATE_PASSPHRASE) {
                sessionStorage.setItem(unlockKey, "true");
                setGateStatus("Access granted.", "success");
                fadeOutGate();
                return;
            }
            setGateStatus("Incorrect passphrase. Please try again.", "error");
            elements.gateInput.focus();
            elements.gateInput.select();
        };

        const handleKeydown = (event) => {
            // ADMIN INPUT SAFETY LOCK — DO NOT REMOVE
            // Prevents quiz/hotkey logic from blocking form typing
            if (isEditableTarget(event.target)) return;

            if (event.key === "Enter") {
                event.preventDefault();
                unlock();
            }
        };

        elements.gateUnlock.removeEventListener("click", unlock);
        elements.gateInput.removeEventListener("keydown", handleKeydown);
        elements.gateUnlock.addEventListener("click", unlock);
        elements.gateInput.addEventListener("keydown", handleKeydown);

        if (gateDisabled || unlocked) {
            hideGateImmediate();
            return;
        }

        showGate();
    };

    const init = () => {
        renderGenres();
        hydrateFilters();
        setupTabs();
        setupHelpToggles();
        attachListeners();
        renderPreview();
        renderChangeList();
        updateDescriptionCount();
        updatePreviewLinks();
        updateStatusBar();
        setExportIndicator(elements.exportPagesStatus, false, "Pages generated");
        setExportIndicator(elements.exportSitemapStatus, false, "Sitemap generated");
        setExportIndicator(elements.exportPackageStatus, false, "Package ready");
        resetBox3dStage();
        setSubstep("identity");
        setupGate();
    };

    init();
})();
