/* ============================================================
   OMEGA ADMIN CONTROL SYSTEM
   ------------------------------------------------------------
   • Client-side CMS for games.json
   • Live validation + safe exports
   • SEO stub generation
   • Undo buffer + change previews
   ============================================================ */

(() => {
    "use strict";

    const SITE_BASE_URL = "https://www.cheekycommodoregamer.co.uk";
    const GAMES_JSON_URL = "../games/games.json";
    const YEAR_MIN = 1977;
    const YEAR_MAX = 2026;
    const YOUTUBE_ID_REGEX = /^[a-zA-Z0-9_-]{6,}$/;
    const CLEAN_ID_REGEX = /^[a-z0-9]+(?:_[a-z0-9]+)*$/;
    const CLEAN_SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
    const CANONICAL_GENRES = [
        "Action Adventure Games",
        "Adventure Games",
        "Arcade Games",
        "BPJS Games",
        "Cartridge Games",
        "Casino Games",
        "Collection",
        "Fighting Games",
        "Horror Games",
        "Licensed Games",
        "Miscellaneous",
        "Platform Games",
        "Puzzle Games",
        "Quiz Games",
        "Racing Games",
        "Role Playing Games",
        "Shooting Games",
        "Sports Games",
        "Strategy Games",
        "Top Picks"
    ];
    const CATEGORY_TAGS = {
        topPicks: "Top Picks",
        bpjs: "BPJS Games",
        licensed: "Licensed Games",
        collection: "Collection"
    };
    const SORT_KEY_ORDER = [
        "system",
        "id",
        "slug",
        "title",
        "sorttitle",
        "year",
        "genres",
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

    const state = {
        baseGames: [],
        workingGames: [],
        draftGame: null,
        selectedIndex: null,
        history: [],
        validation: { errors: [], warnings: [] }
    };

    const elements = {
        status: document.getElementById("adminStatus"),
        statusDetail: document.getElementById("adminStatusDetail"),
        source: document.getElementById("adminSource"),
        fetchBtn: document.getElementById("adminFetch"),
        uploadInput: document.getElementById("adminUpload"),
        clearBtn: document.getElementById("adminClear"),
        newBtn: document.getElementById("adminNew"),
        undoBtn: document.getElementById("adminUndo"),
        discardBtn: document.getElementById("adminDiscard"),
        applyBtn: document.getElementById("adminApply"),
        copyJsonBtn: document.getElementById("adminCopyJson"),
        downloadJsonBtn: document.getElementById("adminDownloadJson"),
        downloadLibraryBtn: document.getElementById("adminDownloadLibrary"),
        downloadStubBtn: document.getElementById("adminDownloadStub"),
        downloadStubsBtn: document.getElementById("adminDownloadStubs"),
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
        categoryTopPicks: document.getElementById("categoryTopPicks"),
        categoryBpjs: document.getElementById("categoryBpjs"),
        categoryLicensed: document.getElementById("categoryLicensed"),
        categoryCollection: document.getElementById("categoryCollection"),
        tabButtons: Array.from(document.querySelectorAll(".admin-tab")),
        tabPanels: Array.from(document.querySelectorAll("[data-admin-panel]")),
        form: document.getElementById("adminEditor"),
        jsonPreview: document.getElementById("adminJsonPreview"),
        changeList: document.querySelector("[data-admin-change-list]"),
        descriptionCount: document.querySelector("[data-admin-description-count]")
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
        autoThumb: document.getElementById("adminThumbAuto")
    };

    const emptyNotices = Array.from(document.querySelectorAll("[data-admin-empty]"));

    const listManagers = [];

    const clone = (value) => JSON.parse(JSON.stringify(value));

    const setStatus = (message, detail = "", state = "idle") => {
        if (elements.status) {
            elements.status.textContent = message;
            elements.status.dataset.state = state;
        }
        if (elements.statusDetail) {
            elements.statusDetail.textContent = detail;
            elements.statusDetail.dataset.state = state;
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
        developer: ""
    });

    const normalizeArray = (value) => {
        if (!value) return [];
        if (Array.isArray(value)) return value.filter(Boolean).map(item => String(item).trim()).filter(Boolean);
        return String(value).split(",").map(item => item.trim()).filter(Boolean);
    };

    const normalizeGame = (raw) => {
        const base = defaultGame();
        const credits = raw && raw.credits ? raw.credits : {};
        const normalized = {
            ...base,
            ...raw,
            system: String(raw.system || base.system).trim() || "C64",
            id: String(raw.id || "").trim(),
            slug: String(raw.slug || "").trim(),
            title: String(raw.title || "").trim(),
            sorttitle: String(raw.sorttitle || "").trim(),
            year: raw.year === 0 ? 0 : (raw.year ? Number(raw.year) : ""),
            genres: normalizeArray(raw.genres),
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
            developer: String(raw.developer || credits.developer || "").trim()
        };

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

    const buildSeoStubHtml = (game) => {
        const slug = game.slug || generateSlug(game.title || "game");
        const title = game.title || "Untitled Game";
        const description = game.description || `${title} on ${game.system || "C64"}.`;
        const canonicalUrl = `${SITE_BASE_URL}/games/${slug}.html`;
        const imageUrl = game.thumbnail ? `${SITE_BASE_URL}/${game.thumbnail}` : `${SITE_BASE_URL}/resources/images/ccgamer-logo.png`;
        const publisher = getPublisher(game) || "Unknown";
        const year = game.year ? String(game.year) : "Unknown";

        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${title} | Cheeky Commodore Gamer</title>
    <meta name="description" content="${escapeHtml(description)}" />
    <link rel="canonical" href="${canonicalUrl}" />
    <meta property="og:title" content="${title} | Cheeky Commodore Gamer" />
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
                    <a class="ccg-btn ccg-btn--primary" href="/games/game.html?id=${game.id || generateId(title)}">View the full interactive game page</a>
                    <a class="ccg-btn ccg-btn--ghost" href="/games/index.html">Browse all games</a>
                </div>
            </section>
        </main>
        <footer class="ccg-footer">
            <p class="ccg-footer__text">© <span data-ccg-year></span> Cheeky Commodore Gamer.</p>
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

    const refreshDashboard = () => {
        const total = state.workingGames.length;
        const missingRatings = state.workingGames.filter(game => !game.ccg_rating).length;
        const missingPdfs = state.workingGames.filter(game => !game.pdf).length;
        const missingCredits = state.workingGames.filter(game => !hasCredits(game)).length;
        elements.totalCount.textContent = total;
        elements.missingRatings.textContent = missingRatings;
        elements.missingPdfs.textContent = missingPdfs;
        elements.missingCredits.textContent = missingCredits;
        elements.warningCount.textContent = state.validation.warnings.length;
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
    };

    const validateLibrary = (games) => {
        const errors = [];
        const warnings = [];
        const idMap = new Map();
        const slugMap = new Map();
        games.forEach((game) => {
            if (game.id) idMap.set(game.id, (idMap.get(game.id) || 0) + 1);
            if (game.slug) slugMap.set(game.slug, (slugMap.get(game.slug) || 0) + 1);
        });

        games.forEach((game) => {
            const prefix = `${game.title || game.id || "Untitled"}`;
            if (!game.id) errors.push(`${prefix}: missing ID.`);
            if (!game.slug) errors.push(`${prefix}: missing slug.`);
            if (!game.title) errors.push(`${prefix}: missing title.`);
            if (!game.sorttitle) warnings.push(`${prefix}: missing sort title.`);
            if (!game.genres || !game.genres.length) warnings.push(`${prefix}: missing genres.`);
            if (game.id && idMap.get(game.id) > 1) errors.push(`${prefix}: duplicate ID ${game.id}.`);
            if (game.slug && slugMap.get(game.slug) > 1) errors.push(`${prefix}: duplicate slug ${game.slug}.`);
            if (game.thumbnail && !game.thumbnail.startsWith("resources/images/")) warnings.push(`${prefix}: thumbnail path should be under resources/images/.`);
            if (game.pdf && !isValidUrl(game.pdf)) errors.push(`${prefix}: invalid PDF URL.`);
            if (game.disk && game.disk.some(disk => !isValidUrl(disk))) errors.push(`${prefix}: invalid disk URL.`);
            if (game.lemon && game.lemon.some(link => !isValidUrl(link))) warnings.push(`${prefix}: invalid Lemon link.`);
            if (game.videoid && !YOUTUBE_ID_REGEX.test(game.videoid)) warnings.push(`${prefix}: invalid YouTube ID.`);
            if (!hasCredits(game)) warnings.push(`${prefix}: missing credits.`);
        });

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
        if (!draft.year) warnings.push("Year is missing.");
        if (draft.year && (draft.year < YEAR_MIN || draft.year > YEAR_MAX)) warnings.push(`Year should be between ${YEAR_MIN} and ${YEAR_MAX}.`);
        if (!draft.genres.length) warnings.push("Select at least one genre.");
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
        applyCategoryTags(genres);
        syncCategoryToggles(genres);
        state.draftGame.genres = genres;

        renderPreview();
        renderChangeList();
        updateDescriptionCount();

        const draftValidation = validateDraft(state.draftGame);
        updateFieldHighlights(state.draftGame, draftValidation);
        if (draftValidation.errors.length || draftValidation.warnings.length) {
            setStatus(
                "Draft validation running.",
                `${draftValidation.errors.length} errors, ${draftValidation.warnings.length} warnings.`,
                draftValidation.errors.length ? "error" : "warning"
            );
        }
    };

    const getSelectedGenres = () => {
        const checkboxes = elements.genreGrid.querySelectorAll("input[type='checkbox']");
        return Array.from(checkboxes)
            .filter((checkbox) => checkbox.checked)
            .map((checkbox) => checkbox.value);
    };

    const categoryMap = [
        { checkbox: elements.categoryTopPicks, tag: CATEGORY_TAGS.topPicks },
        { checkbox: elements.categoryBpjs, tag: CATEGORY_TAGS.bpjs },
        { checkbox: elements.categoryLicensed, tag: CATEGORY_TAGS.licensed },
        { checkbox: elements.categoryCollection, tag: CATEGORY_TAGS.collection }
    ];

    const categoryToggleMap = new Map(categoryMap.map(({ checkbox, tag }) => [checkbox, tag]));

    const applyCategoryTags = (genres) => {
        categoryMap.forEach(({ checkbox, tag }) => {
            if (!checkbox) return;
            if (checkbox.checked && !genres.includes(tag)) {
                genres.push(tag);
            }
            if (!checkbox.checked) {
                const index = genres.indexOf(tag);
                if (index >= 0) genres.splice(index, 1);
            }
        });
    };

    const syncCategoryToggles = (genres) => {
        categoryMap.forEach(({ checkbox, tag }) => {
            if (!checkbox) return;
            checkbox.checked = genres.includes(tag);
        });
    };

    const setGenreCheckbox = (tag, checked) => {
        const checkbox = elements.genreGrid.querySelector(`input[value=\"${tag}\"]`);
        if (checkbox) checkbox.checked = checked;
    };

    const renderGenres = () => {
        elements.genreGrid.innerHTML = "";
        CANONICAL_GENRES.forEach((genre) => {
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
        syncCategoryToggles(genres);
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

        const draftValidation = validateDraft(state.draftGame);
        updateFieldHighlights(state.draftGame, draftValidation);
    };

    const updateFieldHighlights = (draft, validation) => {
        const fieldMap = [
            { input: inputs.title, invalid: !draft.title },
            { input: inputs.id, invalid: !draft.id || !CLEAN_ID_REGEX.test(draft.id) },
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

        if (validation.errors.length === 0 && validation.warnings.length === 0) {
            setStatus("Draft is clean.", "No validation issues detected.", "success");
        }
    };

    const renderPreview = () => {
        if (!state.draftGame) {
            elements.jsonPreview.textContent = "{}";
            return;
        }
        const preview = buildSortedGame(state.draftGame);
        elements.jsonPreview.textContent = JSON.stringify(preview, null, 2);
    };

    const renderChangeList = () => {
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

    const renderList = (listEl, values, emptyKey) => {
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
            renderList(listEl, values, "");
            inputEl.value = "";
            updateDraft();
        };
        buttonEl.addEventListener("click", addItem);
        inputEl.addEventListener("keydown", (event) => {
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
        state.selectedIndex = index;
        state.draftGame = clone(state.workingGames[index]);
        elements.editState.textContent = `Draft: ${state.draftGame.title || state.draftGame.id || "Untitled"}`;
        setStatus("Draft loaded.", "You are editing an existing entry.", "success");
        renderEditor();
    };

    const createNewEntry = () => {
        state.selectedIndex = null;
        state.draftGame = defaultGame();
        elements.editState.textContent = "Draft: new entry";
        setStatus("New draft created.", "Fill in the fields and apply changes to add it to the library.", "success");
        renderEditor();
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
        setStatus("Draft discarded.", "Select a game or create a new entry.", "warning");
    };

    const handleAutoIds = () => {
        const title = inputs.title.value || inputs.id.value || "";
        inputs.id.value = generateId(title);
        inputs.slug.value = generateSlug(title);
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
        exportJson(buildSortedGame(state.draftGame), `${state.draftGame.slug || "game"}.json`);
    };

    const downloadLibraryJson = () => {
        const payload = state.workingGames.map(game => buildSortedGame(game));
        exportJson(payload, "games.json");
    };

    const downloadSelectedStub = () => {
        if (!state.draftGame) return;
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
    };

    const downloadAllStubs = async () => {
        if (!state.workingGames.length) return;
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
        elements.totalCount.textContent = "0";
        elements.warningCount.textContent = "0";
        elements.missingRatings.textContent = "0";
        elements.missingPdfs.textContent = "0";
        elements.missingCredits.textContent = "0";
        renderPreview();
        renderChangeList();
        renderValidation();
        setStatus("Session cleared.", "Load a new file to continue.", "warning");
    };

    const handleFilters = () => renderGameList();

    const setupTabs = () => {
        elements.tabButtons.forEach((button) => {
            button.addEventListener("click", () => {
                const tab = button.dataset.adminTab;
                elements.tabButtons.forEach((btn) => {
                    const isActive = btn === button;
                    btn.classList.toggle("is-active", isActive);
                    btn.setAttribute("aria-selected", String(isActive));
                });
                elements.tabPanels.forEach((panel) => {
                    panel.hidden = panel.dataset.adminPanel !== tab;
                });
            });
        });
    };

    const attachListeners = () => {
        elements.fetchBtn.addEventListener("click", fetchGames);
        elements.uploadInput.addEventListener("change", (event) => uploadGames(event.target.files[0]));
        elements.clearBtn.addEventListener("click", clearSession);
        elements.newBtn.addEventListener("click", createNewEntry);
        elements.applyBtn.addEventListener("click", applyChanges);
        elements.discardBtn.addEventListener("click", discardDraft);
        elements.undoBtn.addEventListener("click", undoChanges);
        elements.copyJsonBtn.addEventListener("click", copyJson);
        elements.downloadJsonBtn.addEventListener("click", downloadSelectedJson);
        elements.downloadLibraryBtn.addEventListener("click", downloadLibraryJson);
        elements.downloadStubBtn.addEventListener("click", downloadSelectedStub);
        elements.downloadStubsBtn.addEventListener("click", downloadAllStubs);
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

        listManagers.length = 0;
        setupListManager(inputs.diskInput, inputs.diskAdd, inputs.diskList);
        setupListManager(inputs.publisherInput, inputs.publisherAdd, inputs.publisherList);
        setupListManager(inputs.coderInput, inputs.coderAdd, inputs.coderList);
        setupListManager(inputs.graphicsInput, inputs.graphicsAdd, inputs.graphicsList);
        setupListManager(inputs.musicianInput, inputs.musicianAdd, inputs.musicianList);
        setupListManager(inputs.rereleaserInput, inputs.rereleaserAdd, inputs.rereleaserList);
        setupListManager(inputs.lemonInput, inputs.lemonAdd, inputs.lemonList);

        const handleCategoryToggle = (event) => {
            const tag = categoryToggleMap.get(event.target);
            if (tag) {
                setGenreCheckbox(tag, event.target.checked);
            }
            updateDraft();
        };

        elements.genreGrid.addEventListener("change", updateDraft);
        elements.categoryTopPicks.addEventListener("change", handleCategoryToggle);
        elements.categoryBpjs.addEventListener("change", handleCategoryToggle);
        elements.categoryLicensed.addEventListener("change", handleCategoryToggle);
        elements.categoryCollection.addEventListener("change", handleCategoryToggle);
    };

    const hydrateFilters = () => {
        elements.filterGenre.innerHTML = "<option value=\"\">All genres</option>";
        CANONICAL_GENRES.forEach((genre) => {
            const option = document.createElement("option");
            option.value = genre;
            option.textContent = genre;
            elements.filterGenre.appendChild(option);
        });
    };

    const init = () => {
        renderGenres();
        hydrateFilters();
        setupTabs();
        attachListeners();
        renderPreview();
        renderChangeList();
        updateDescriptionCount();
    };

    init();
})();
