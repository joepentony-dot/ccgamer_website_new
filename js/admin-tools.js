/* ============================================================
   CCG ADMIN TOOLS — CLIENT-SIDE JSON STAGING
   ------------------------------------------------------------
   • Fetches live games.json
   • Allows upload + merge
   • Adds new games with safe ID/slug/sort title generation
   • Inserts alphabetically by sort title
   • Exports validated JSON via Blob download
   • ZERO backend / ZERO auto-publish
   ============================================================ */

(function () {
    "use strict";

    const wizardShellPresent = Boolean(
        document.querySelector('[data-admin-shell]') ||
        document.querySelector('main[data-admin-shell]') ||
        document.querySelector('.omega-admin-shell')
    );
    const wizardMetaContext = document.querySelector('meta[name="ccg-context"][content="admin"]');
    const wizardTitlePresent = (document.title || '').includes('CCG Game Builder');
    const legacyForm = document.getElementById('adminGameForm');
    const legacyStatus = document.getElementById('adminStatus');

    if (wizardShellPresent || (wizardMetaContext && wizardTitlePresent) || !legacyForm) {
        console.info('[CCG-ADMIN-TOOLS] Disabled on this page (owned by Game Builder or missing legacy DOM).');
        return;
    }

    void legacyStatus;

    function CCG_isTypingTarget(e) {
        const el = e.target;
        if (!el) return false;
        if (el.isContentEditable) return true;
        const tag = el.tagName?.toLowerCase();
        return tag === "input" || tag === "textarea" || tag === "select";
    }

    const CLEAN_ID_REGEX = /^[a-z0-9]+(?:_[a-z0-9]+)*$/;
    const CLEAN_SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
    const YOUTUBE_ID_REGEX = /^[a-zA-Z0-9_-]{6,}$/;
    const THUMBNAIL_PREFIX = "resources/images/thumbnails/all/";
    const SYSTEMS = ["C64", "AMIGA"];
    const YEAR_MIN = 1977;
    const YEAR_MAX = 2026;
    const SITE_BASE_URL = "https://www.cheekycommodoregamer.co.uk";
    const SEO_STUB_FALLBACK = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8" />

    <!-- Flat SEO stub for GitHub Pages: show /games/{slug}/ without server rewrites -->
    <script>
      (function () {
        history.replaceState(null, "", "/games/20-tons/");
      })();
    </script>

    <meta name="viewport" content="width=device-width, initial-scale=1.0" />

    <title>20 Tons | Cheeky Commodore Gamer</title>
    <meta name="description" content="20 Tons on Commodore — screenshots, manual, downloads and video." />

    <link rel="canonical" href="https://www.cheekycommodoregamer.co.uk/games/20-tons/" />

    <meta property="og:title" content="20 Tons | Cheeky Commodore Gamer" />
    <meta property="og:description" content="20 Tons on Commodore — screenshots, manual, downloads and video." />
    <meta property="og:type" content="website" />
    <meta property="og:url" content="https://www.cheekycommodoregamer.co.uk/games/20-tons/" />
    <meta property="og:image" content="https://www.cheekycommodoregamer.co.uk/resources/images/thumbnails/all/20_tons_new.png" />

    <link rel="icon" href="../favicon.ico" />

    <link href="https://fonts.googleapis.com/css2?family=Orbitron:wght@400;500;600;700&family=Roboto:wght@300;400;500;700&display=swap" rel="stylesheet" />

    <link rel="stylesheet" href="../resources/css/ccg-master.css" />
    <link rel="stylesheet" href="../resources/css/ccg-mode.css" />
    <link rel="stylesheet" href="../resources/css/ccg-effects.css" />
    <link rel="stylesheet" href="../resources/css/ccg-anim.css" />
    <link rel="stylesheet" href="../resources/css/ccg-overlays.css" />
    <link rel="stylesheet" href="../resources/css/ccg-cards.css" />
    <link rel="stylesheet" href="../resources/css/games.css" />
    <link rel="stylesheet" href="../resources/css/ccg-footer.css" />

    <script type="application/ld+json">
    {
        "@context": "https://schema.org",
        "@type": "VideoGame",
        "name": "20 Tons",
        "description": "20 Tons on Commodore — screenshots, manual, downloads and video.",
        "datePublished": "1985",
        "gamePlatform": "C64",
        "publisher": "64 Tape Computing",
        "image": "https://www.cheekycommodoregamer.co.uk/resources/images/thumbnails/all/20_tons_new.png",
        "url": "https://www.cheekycommodoregamer.co.uk/games/20-tons/"
    }
    </script>
</head>
<body class="ccg-body" data-ccg-mode="c64" data-mode="c64">

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
                    <img
                        class="game-hero__thumb"
                        src="../resources/images/thumbnails/all/20_tons_new.png"
                        alt="20 Tons cover"
                        loading="lazy"
                    />
                </div>

                <div class="game-hero__content">
                    <h1 class="game-hero__title">20 Tons</h1>

                    <div class="game-hero__meta">
                        <span class="game-meta__item">1985</span>
                        <span class="game-meta__sep">•</span>
                        <span class="game-meta__item">C64</span>
                        <span class="game-meta__sep">•</span>
                        <span class="game-meta__item">64 Tape Computing</span>
                    </div>
                </div>

            </div>
        </section>

        <section class="game-section">
            <p class="game-section__kicker">Overview</p>
            <h2 class="game-section__title">Game Summary</h2>

            <div class="game-description">
                20 Tons on Commodore — screenshots, manual, downloads and video.
            </div>
        </section>

        <section class="game-section">
            <p class="game-section__kicker">Explore</p>
            <h2 class="game-section__title">More Details</h2>

            <div class="game-downloads">
                <a class="ccg-btn ccg-btn--primary"
                   href="/games/20-tons/">
                    View the full interactive game page
                </a>

                <a class="ccg-btn ccg-btn--ghost"
                   href="/games/index.html">
                    Browse all games
                </a>
            </div>
        </section>

    </main>

    <footer class="ccg-footer">
        <p class="ccg-footer__text">
            © <span data-ccg-year></span> Cheeky Commodore Gamer.
            Not affiliated with Commodore, Amiga or publishers.
        </p>
    </footer>
</div>

<script src="../js/ccg-base.js" defer></script>

</body>
</html>
`;

    let baseGames = [];
    let workingGames = [];
    let addedGames = [];
    let autoSortTitle = true;
    let stubTemplateCache = null;
    let hasSourceData = false;
    const SHOW_ALL_WARNINGS = new URLSearchParams(window.location.search).has("adminDebugWarnings");
    const MAX_WARNING_ITEMS = 20;

    /* --------------------------------------------------------
       DOM REFERENCES
    -------------------------------------------------------- */
    const statusEl = document.getElementById("adminStatus");
    const fileInput = document.getElementById("adminFileInput");
    const refreshBtn = document.getElementById("adminRefresh");
    const downloadBtn = document.getElementById("adminDownload");
    const downloadStubsBtn = document.getElementById("adminDownloadStubs");
    const clearBtn = document.getElementById("adminClear");
    const sourceOpen = document.getElementById("adminSourceOpen");
    const errorPanel = document.querySelector("[data-admin-errors]");
    const errorList = document.querySelector("[data-admin-error-list]");
    const warningPanel = document.querySelector("[data-admin-warnings]");
    const warningList = document.querySelector("[data-admin-warning-list]");

    const form = document.getElementById("adminGameForm");
    const resetAutoBtn = document.querySelector("[data-admin-reset-auto]");

    const gameCountEl = document.querySelector("[data-admin-game-count]");
    const addedCountEl = document.querySelector("[data-admin-added-count]");
    const totalCountEl = document.querySelector("[data-admin-total-count]");

    const addedPreviewBody = document.getElementById("adminAddedPreview");
    const gamesListBody = document.getElementById("adminGameList");
    const searchInput = document.getElementById("adminSearch");

    const titleInput = document.getElementById("gameTitle");
    const sortTitleInput = document.getElementById("gameSortTitle");
    const idInput = document.getElementById("gameId");
    const slugInput = document.getElementById("gameSlug");
    const systemInput = document.getElementById("gameSystem");
    const yearInput = document.getElementById("gameYear");
    const videoInput = document.getElementById("gameVideo");
    const thumbnailInput = document.getElementById("gameThumbnail");
    const descriptionInput = document.getElementById("gameDescription");
    const developerInput = document.getElementById("gameDeveloper");
    const genreSelect = document.getElementById("gameGenreSelect");
    const genreSelectedList = document.querySelector("[data-admin-genre-selected]");
    const genreEmptyState = document.querySelector("[data-admin-genre-empty]");
    const clearGenresBtn = document.querySelector("[data-admin-clear-genres]");

    const fieldErrors = {
        system: document.querySelector('[data-admin-error="system"]'),
        title: document.querySelector('[data-admin-error="title"]'),
        sorttitle: document.querySelector('[data-admin-error="sorttitle"]'),
        id: document.querySelector('[data-admin-error="id"]'),
        slug: document.querySelector('[data-admin-error="slug"]'),
        year: document.querySelector('[data-admin-error="year"]'),
        videoid: document.querySelector('[data-admin-error="videoid"]'),
        thumbnail: document.querySelector('[data-admin-error="thumbnail"]'),
        genres: document.querySelector('[data-admin-error="genres"]')
    };

    const fieldInputs = {
        system: systemInput,
        title: titleInput,
        sorttitle: sortTitleInput,
        id: idInput,
        slug: slugInput,
        year: yearInput,
        videoid: videoInput,
        thumbnail: thumbnailInput,
        genres: genreSelect
    };

    /* --------------------------------------------------------
       HELPERS
    -------------------------------------------------------- */
    function setStatus(msg, state = "success") {
        if (!statusEl) return;
        statusEl.textContent = msg;
        statusEl.dataset.state = state;
    }

    function setFieldError(field, message) {
        const errorEl = fieldErrors[field];
        const inputEl = fieldInputs[field];
        if (errorEl) {
            errorEl.textContent = message || "";
            errorEl.hidden = !message;
        }
        if (inputEl) {
            if (message) {
                inputEl.setAttribute("aria-invalid", "true");
            } else {
                inputEl.removeAttribute("aria-invalid");
            }
        }
    }

    function clearFieldErrors() {
        Object.keys(fieldErrors).forEach((field) => setFieldError(field, ""));
    }

    function setExportErrors(errors) {
        if (!errorPanel || !errorList) return;
        if (!errors.length) {
            errorPanel.hidden = true;
            errorList.innerHTML = "";
            return;
        }
        errorList.innerHTML = "";
        errors.forEach(error => {
            const li = document.createElement("li");
            li.textContent = error;
            errorList.appendChild(li);
        });
        errorPanel.hidden = false;
    }

    function setExportWarnings(warnings) {
        if (!warningPanel || !warningList) return;
        if (!warnings.length) {
            warningPanel.hidden = true;
            warningList.innerHTML = "";
            return;
        }
        warningList.innerHTML = "";
        const warningsToShow = SHOW_ALL_WARNINGS ? warnings : warnings.slice(0, MAX_WARNING_ITEMS);
        warningsToShow.forEach(warning => {
            const li = document.createElement("li");
            li.textContent = warning;
            warningList.appendChild(li);
        });
        if (!SHOW_ALL_WARNINGS && warnings.length > MAX_WARNING_ITEMS) {
            const li = document.createElement("li");
            const remainingCount = warnings.length - MAX_WARNING_ITEMS;
            li.textContent = `...and ${remainingCount} more legacy warnings hidden (add ?adminDebugWarnings=1 to view).`;
            warningList.appendChild(li);
        }
        warningPanel.hidden = false;
    }

    function updateBadges() {
        if (gameCountEl) gameCountEl.textContent = baseGames.length;
        if (addedCountEl) addedCountEl.textContent = addedGames.length;
        if (totalCountEl) totalCountEl.textContent = workingGames.length;
    }

    function updateExportState() {
        const { errors, warnings } = validateGameLibrary(workingGames, { includeLegacyWarnings: hasSourceData });
        setExportErrors(errors);
        if (hasSourceData) {
            setExportWarnings(warnings);
        } else {
            setExportWarnings([]);
        }
        const hasErrors = errors.length > 0;
        const hasGames = workingGames.length > 0;
        if (downloadBtn) downloadBtn.disabled = hasErrors || !hasGames;
        const hasAddedGames = addedGames.length > 0;
        if (downloadStubsBtn) downloadStubsBtn.disabled = hasErrors || !hasAddedGames;
    }

    function getDefaultSourceUrl() {
        const root = window.ccgGetSiteRoot ? window.ccgGetSiteRoot() : "/";
        return `${root}games/games.json`;
    }

    function syncSourceLink() {
        if (!sourceOpen) return;
        sourceOpen.href = getDefaultSourceUrl();
    }

    function deriveSortTitle(title) {
        return String(title || "").trim();
    }

    function toSlug(title) {
        return String(title || "")
            .toLowerCase()
            .trim()
            .replace(/&/g, "and")
            .replace(/[^a-z0-9\s]/g, "")
            .replace(/\s+/g, "-")
            .replace(/-+/g, "-")
            .replace(/^-+|-+$/g, "");
    }

    function toSnake(title) {
        return String(title || "")
            .toLowerCase()
            .trim()
            .replace(/&/g, "and")
            .replace(/[^a-z0-9\s]/g, "")
            .replace(/\s+/g, "_")
            .replace(/_+/g, "_")
            .replace(/^_+|_+$/g, "");
    }

    function parseCommaList(value) {
        if (!value) return [];
        return String(value)
            .split(",")
            .map(item => item.trim())
            .filter(Boolean);
    }

    function normalizeThumbnail(path) {
        const value = String(path || "").trim();
        if (!value) return "";
        const normalized = value.replace(/\\/g, "/");
        if (normalized.includes("/")) {
            return normalized;
        }
        return `${THUMBNAIL_PREFIX}${normalized}`;
    }

    function normalizeSystem(value) {
        const trimmed = String(value || "").trim();
        if (!trimmed) return "";
        const upper = trimmed.toUpperCase();
        if (upper === "AMIGA") return "AMIGA";
        if (upper === "C64") return "C64";
        return trimmed;
    }

    function isValidYear(value) {
        if (value === null || value === undefined || value === "") return false;
        const year = Number(value);
        if (!Number.isInteger(year)) return false;
        if (String(year).length !== 4) return false;
        return year >= YEAR_MIN && year <= YEAR_MAX;
    }

    function ensureUniqueValue(baseValue, usedSet, separator) {
        if (!baseValue) return "";
        const normalizedBase = baseValue.toLowerCase();
        if (!usedSet.has(normalizedBase)) {
            usedSet.add(normalizedBase);
            return baseValue;
        }
        let counter = 2;
        let nextValue = `${baseValue}${separator}${counter}`;
        while (usedSet.has(nextValue.toLowerCase())) {
            counter += 1;
            nextValue = `${baseValue}${separator}${counter}`;
        }
        usedSet.add(nextValue.toLowerCase());
        return nextValue;
    }

    function getUniqueId(baseId) {
        const used = new Set(getAllGames().map(game => String(game.id || "").toLowerCase()).filter(Boolean));
        return ensureUniqueValue(baseId, used, "_");
    }

    function getUniqueSlug(baseSlug) {
        const used = new Set(getAllGames().map(game => String(game.slug || "").toLowerCase()).filter(Boolean));
        return ensureUniqueValue(baseSlug, used, "-");
    }

    function compareSortTitle(a, b) {
        const titleA = String(a.sorttitle || a.title || "");
        const titleB = String(b.sorttitle || b.title || "");
        return titleA.localeCompare(titleB, "en", { sensitivity: "base" });
    }

    function insertSorted(game) {
        workingGames = [...workingGames, game].sort(compareSortTitle);
    }

    function getAllGames() {
        return [...workingGames];
    }

    function clearForm() {
        if (!form) return;
        form.reset();
        autoSortTitle = true;
        selectedGenres = [];
        genreTouched = false;
        genreCleared = false;
        renderSelectedGenres();
        clearFieldErrors();
    }

    function getAutoIdSlug(title) {
        const trimmedTitle = String(title || "").trim();
        if (!trimmedTitle) {
            return { id: "", slug: "" };
        }
        const baseId = toSnake(trimmedTitle) || "untitled";
        const baseSlug = toSlug(trimmedTitle) || "untitled";
        return {
            id: getUniqueId(baseId),
            slug: getUniqueSlug(baseSlug)
        };
    }

   function updateAutoFields() {
    if (!titleInput) return;

    const titleValue = String(titleInput.value || "").trim();

    if (autoSortTitle && sortTitleInput) {
        sortTitleInput.value = deriveSortTitle(titleValue);
    }

    const autoValues = getAutoIdSlug(titleValue);

    if (idInput) {
        idInput.value = autoValues.id;
    }

    if (slugInput) {
        slugInput.value = autoValues.slug;
    }
}

    function normalizeGame(raw) {
        const title = String(raw.title || "").trim();
        const sorttitle = String(raw.sorttitle || "").trim() || title;
        return {
            system: normalizeSystem(raw.system),
            id: String(raw.id || "").trim(),
            slug: String(raw.slug || "").trim(),
            title,
            sorttitle,
            genres: parseCommaList(raw.genres),
            year: raw.year ? Number(raw.year) : "",
            developer: String(raw.developer || "").trim(),
            videoid: String(raw.videoid || "").trim(),
            lemon: parseCommaList(raw.lemon),
            thumbnail: normalizeThumbnail(raw.thumbnail),
            pdf: String(raw.pdf || "").trim(),
            disk: parseCommaList(raw.disk),
            description: String(raw.description || "").trim()
        };
    }

    function normalizeArrayField(value) {
        if (Array.isArray(value)) {
            return value.map(item => String(item || "").trim()).filter(Boolean);
        }
        return parseCommaList(value);
    }

    function normalizeImportedGame(raw) {
        if (!raw || typeof raw !== "object") return raw;
        const title = String(raw.title || "").trim();
        const sorttitle = String(raw.sorttitle || "").trim() || title;
        const yearValue = raw.year !== undefined && raw.year !== null && raw.year !== "" ? Number(raw.year) : "";
        return {
            ...raw,
            system: normalizeSystem(raw.system),
            id: String(raw.id || "").trim(),
            slug: String(raw.slug || "").trim(),
            title,
            sorttitle,
            genres: normalizeArrayField(raw.genres),
            year: yearValue,
            developer: String(raw.developer || "").trim(),
            videoid: String(raw.videoid || "").trim(),
            lemon: normalizeArrayField(raw.lemon),
            thumbnail: normalizeThumbnail(raw.thumbnail),
            pdf: String(raw.pdf || "").trim(),
            disk: normalizeArrayField(raw.disk),
            description: String(raw.description || "").trim()
        };
    }

    function prepareImportedGames(rawGames) {
        const normalized = rawGames.map(normalizeImportedGame);
        const usedSlugs = new Set();
        normalized.forEach(game => {
            if (game && typeof game === "object" && game.slug) {
                usedSlugs.add(String(game.slug).toLowerCase());
            }
        });
        normalized.forEach(game => {
            if (!game || typeof game !== "object") return;
            if (!game.sorttitle && game.title) {
                game.sorttitle = game.title;
            }
            if (!game.slug && game.title) {
                const baseSlug = toSlug(game.title);
                game.slug = ensureUniqueValue(baseSlug, usedSlugs, "-");
            }
        });
        return normalized;
    }

    function validateThumbnail(path) {
        if (!path) return { valid: true, message: "" };
        if (!/\.(jpg|jpeg|png|webp)$/i.test(path)) {
            return { valid: false, message: "Thumbnail must end in .jpg, .png, or .webp." };
        }
        return { valid: true, message: "" };
    }

    function validateNewGame(raw, game) {
        clearFieldErrors();
        let isValid = true;

        if (!SYSTEMS.includes(game.system)) {
            setFieldError("system", "System must be C64 or AMIGA.");
            isValid = false;
        }

        if (!game.title) {
            setFieldError("title", "Title is required.");
            isValid = false;
        }

        if (!game.sorttitle) {
            setFieldError("sorttitle", "Sort title is required.");
            isValid = false;
        }

        if (!game.genres || !game.genres.length) {
            setFieldError("genres", "At least one genre is required.");
            isValid = false;
        } else if (game.genres.some(genre => !CANONICAL_GENRES.includes(genre))) {
            setFieldError("genres", "Genres must be selected from the approved list.");
            isValid = false;
        }

        if (!game.id) {
            setFieldError("id", "ID is required.");
            isValid = false;
        } else if (!CLEAN_ID_REGEX.test(game.id)) {
            setFieldError("id", "Use lowercase letters, numbers, and underscores only.");
            isValid = false;
        }

        if (!game.slug) {
            setFieldError("slug", "Slug is required.");
            isValid = false;
        } else if (!CLEAN_SLUG_REGEX.test(game.slug)) {
            setFieldError("slug", "Use lowercase letters, numbers, and single hyphens only.");
            isValid = false;
        }

        if (!isValidYear(raw.year)) {
            setFieldError("year", `Year must be a 4-digit number between ${YEAR_MIN} and ${YEAR_MAX}.`);
            isValid = false;
        }

        const videoValue = String(raw.videoid || "").trim();
        if (videoValue && !YOUTUBE_ID_REGEX.test(videoValue)) {
            setFieldError("videoid", "Video ID looks invalid.");
            isValid = false;
        }

        const thumbnailValidation = validateThumbnail(game.thumbnail);
        if (!thumbnailValidation.valid) {
            setFieldError("thumbnail", thumbnailValidation.message);
            isValid = false;
        }

        const allGames = getAllGames();
        if (allGames.some(existing => String(existing.id || "").toLowerCase() === game.id.toLowerCase())) {
            setFieldError("id", `ID "${game.id}" is already in use.`);
            isValid = false;
        }
        if (allGames.some(existing => String(existing.slug || "").toLowerCase() === game.slug.toLowerCase())) {
            setFieldError("slug", `Slug "${game.slug}" is already in use.`);
            isValid = false;
        }

        return isValid;
    }

    function validateGameLibrary(games, options = {}) {
        const { includeLegacyWarnings = true } = options;
        const errors = [];
        const warnings = [];
        if (!Array.isArray(games)) {
            errors.push("games.json must be an array.");
            return { errors, warnings };
        }

        const seenIds = new Set();
        const seenSlugs = new Set();
        const addedIds = new Set(addedGames.map(game => String(game.id || "").toLowerCase()).filter(Boolean));

        games.forEach((game, index) => {
            const prefix = `Entry ${index + 1}`;
            if (!game || typeof game !== "object") {
                errors.push(`${prefix}: entry is not an object.`);
                return;
            }

            const id = String(game.id || "").trim();
            const slug = String(game.slug || "").trim();
            const title = String(game.title || "").trim();

            if (!game.system) {
                errors.push(`${prefix}: system is required.`);
            } else if (!SYSTEMS.includes(game.system)) {
                errors.push(`${prefix}: system must be C64 or AMIGA.`);
            }

            if (!title) {
                errors.push(`${prefix}: title is required.`);
            }

            if (!isValidYear(game.year)) {
                errors.push(`${prefix}: year must be a 4-digit number between ${YEAR_MIN} and ${YEAR_MAX}.`);
            }

            if (!id) {
                errors.push(`${prefix}: id is required.`);
            } else {
                const idKey = id.toLowerCase();
                if (seenIds.has(idKey)) {
                    errors.push(`${prefix}: id "${id}" is duplicated.`);
                } else {
                    seenIds.add(idKey);
                }
                if (includeLegacyWarnings && !CLEAN_ID_REGEX.test(id)) {
                    warnings.push(`${prefix}: id "${id}" does not match the clean format.`);
                }
            }

            if (slug) {
                const slugKey = slug.toLowerCase();
                if (seenSlugs.has(slugKey)) {
                    errors.push(`${prefix}: slug "${slug}" is duplicated.`);
                } else {
                    seenSlugs.add(slugKey);
                }
                if (includeLegacyWarnings && !CLEAN_SLUG_REGEX.test(slug)) {
                    warnings.push(`${prefix}: slug "${slug}" does not match the clean format.`);
                }
            }
        });

        return { errors, warnings };
    }

    function getGameDescription(game) {
        const fallback = `${game.title} on Commodore — screenshots, manual, downloads and video.`;
        return game.description || fallback;
    }

    function getPublisher(game) {
        return game.developer || "Unknown";
    }

    function getAbsoluteUrl(path) {
        if (!path) return "";
        if (/^https?:\/\//i.test(path)) return path;
        const trimmed = String(path).replace(/^\/+/, "");
        return `${SITE_BASE_URL}/${trimmed}`;
    }

    function getRelativeThumbnail(path) {
        if (!path) return "";
        if (/^https?:\/\//i.test(path)) return path;
        const trimmed = String(path).replace(/^\/+/, "");
        if (trimmed.startsWith("../")) return trimmed;
        return `../${trimmed}`;
    }

    async function loadStubTemplate() {
        if (stubTemplateCache) return stubTemplateCache;
        const slug = workingGames.find(game => game && game.slug)?.slug;
        if (slug) {
            try {
                const res = await fetch(`../games/${slug}.html`, { cache: "no-store" });
                if (res.ok) {
                    stubTemplateCache = await res.text();
                    return stubTemplateCache;
                }
            } catch (err) {
                console.warn("Failed to fetch existing SEO stub template.", err);
            }
        }
        stubTemplateCache = SEO_STUB_FALLBACK;
        return stubTemplateCache;
    }

    function buildSeoStubHtml(templateHtml, game) {
        const parser = new DOMParser();
        const doc = parser.parseFromString(templateHtml, "text/html");
        const titleText = `${game.title} | Cheeky Commodore Gamer`;
        const descriptionText = getGameDescription(game);
        const canonicalUrl = `${SITE_BASE_URL}/games/${game.slug}.html`;
        const ogImageUrl = getAbsoluteUrl(game.thumbnail);
        const relativeThumb = getRelativeThumbnail(game.thumbnail);
        const mode = game.system === "AMIGA" ? "amiga" : "c64";

        doc.title = titleText;

        const descriptionMeta = doc.querySelector('meta[name="description"]');
        if (descriptionMeta) descriptionMeta.setAttribute("content", descriptionText);

        const canonicalLink = doc.querySelector('link[rel="canonical"]');
        if (canonicalLink) canonicalLink.setAttribute("href", canonicalUrl);

        const ogTitle = doc.querySelector('meta[property="og:title"]');
        if (ogTitle) ogTitle.setAttribute("content", titleText);

        const ogDescription = doc.querySelector('meta[property="og:description"]');
        if (ogDescription) ogDescription.setAttribute("content", descriptionText);

        const ogUrl = doc.querySelector('meta[property="og:url"]');
        if (ogUrl) ogUrl.setAttribute("content", canonicalUrl);

        const ogImage = doc.querySelector('meta[property="og:image"]');
        if (ogImage) ogImage.setAttribute("content", ogImageUrl);

        const replaceScript = Array.from(doc.querySelectorAll("script")).find(script =>
            script.textContent.includes("history.replaceState")
        );
        if (replaceScript) {
            replaceScript.textContent = `
      (function () {
        history.replaceState(null, "", "/games/${game.slug}/");
      })();
    `.trim();
        }

        const jsonLdScript = doc.querySelector('script[type="application/ld+json"]');
        if (jsonLdScript) {
            try {
                const jsonData = JSON.parse(jsonLdScript.textContent);
                jsonData.name = game.title;
                jsonData.description = descriptionText;
                jsonData.datePublished = String(game.year);
                jsonData.gamePlatform = game.system;
                jsonData.publisher = getPublisher(game);
                jsonData.image = ogImageUrl;
                jsonData.url = canonicalUrl;
                jsonLdScript.textContent = JSON.stringify(jsonData, null, 4);
            } catch (err) {
                jsonLdScript.textContent = JSON.stringify({
                    "@context": "https://schema.org",
                    "@type": "VideoGame",
                    "name": game.title,
                    "description": descriptionText,
                    "datePublished": String(game.year),
                    "gamePlatform": game.system,
                    "publisher": getPublisher(game),
                    "image": ogImageUrl,
                    "url": canonicalUrl
                }, null, 4);
            }
        }

        const heroTitle = doc.querySelector(".game-hero__title");
        if (heroTitle) heroTitle.textContent = game.title;

        const heroItems = doc.querySelectorAll(".game-hero__meta .game-meta__item");
        if (heroItems[0]) heroItems[0].textContent = String(game.year);
        if (heroItems[1]) heroItems[1].textContent = game.system;
        if (heroItems[2]) heroItems[2].textContent = getPublisher(game);

        const heroThumb = doc.querySelector(".game-hero__thumb");
        if (heroThumb) {
            if (relativeThumb) heroThumb.setAttribute("src", relativeThumb);
            heroThumb.setAttribute("alt", `${game.title} cover`);
        }

        const descriptionEl = doc.querySelector(".game-description");
        if (descriptionEl) descriptionEl.textContent = descriptionText;

        const viewLink = doc.querySelector('.game-downloads a[href*="game.html"]');
        if (viewLink) {
            const resolvedSlug = (game.slug === "smash-t-5" || game.slug === "smash-t-v")
                ? "smash-tv"
                : (game.slug || game.id);
            viewLink.setAttribute("href", `/games/${resolvedSlug}/`);
        }

        if (doc.body) {
            doc.body.setAttribute("data-ccg-mode", mode);
            doc.body.setAttribute("data-mode", mode);
        }

        return `<!DOCTYPE html>\n${doc.documentElement.outerHTML}`;
    }

    function renderAddedPreview() {
        if (!addedPreviewBody) return;
        addedPreviewBody.innerHTML = "";
        if (!addedGames.length) {
            addedPreviewBody.innerHTML = "<tr><td colspan='4'>Nothing added yet.</td></tr>";
            return;
        }
        addedGames.slice(0, 12).forEach(game => {
            const tr = document.createElement("tr");
            tr.innerHTML = `
                <td>${game.title}</td>
                <td>${game.system}</td>
                <td>${game.year || "—"}</td>
                <td>${game.sorttitle}</td>
            `;
            addedPreviewBody.appendChild(tr);
        });
    }

    function renderGamesList(filter = "") {
        if (!gamesListBody) return;
        const term = filter.trim().toLowerCase();
        const allGames = [...workingGames].sort(compareSortTitle);
        const filtered = allGames.filter(game => {
            if (!term) return true;
            return (
                String(game.title || "").toLowerCase().includes(term) ||
                String(game.id || "").toLowerCase().includes(term) ||
                String(game.system || "").toLowerCase().includes(term)
            );
        });

        gamesListBody.innerHTML = "";
        if (!filtered.length) {
            gamesListBody.innerHTML = "<tr><td colspan='5'>No matching games.</td></tr>";
            return;
        }

        filtered.slice(0, 120).forEach(game => {
            const tr = document.createElement("tr");
            tr.innerHTML = `
                <td>${game.title}</td>
                <td>${game.system}</td>
                <td>${game.year || "—"}</td>
                <td>${game.id}</td>
                <td>${game.slug}</td>
            `;
            gamesListBody.appendChild(tr);
        });
    }

    /* --------------------------------------------------------
       FETCH LIVE JSON
    -------------------------------------------------------- */
    async function fetchLiveGames() {
        setStatus("Fetching live games.json…");
        const url = getDefaultSourceUrl();
        try {
            const res = await fetch(url, { cache: "no-store" });
            if (!res.ok) throw new Error(`Fetch failed (${res.status})`);
            const data = await res.json();

            if (!Array.isArray(data)) {
                throw new Error("Invalid games.json format");
            }

            const prepared = prepareImportedGames(data);
            baseGames = prepared;
            workingGames = [...prepared].sort(compareSortTitle);
            addedGames = [];
            hasSourceData = true;
            updateBadges();
            setStatus(`Loaded ${baseGames.length} live games.`);
            renderGamesList(searchInput ? searchInput.value : "");
            renderAddedPreview();
            clearForm();
            updateExportState();
        } catch (err) {
            console.error(`[CCG ADMIN] Failed to load live games.json from ${url}`, err);
            setStatus("Live games.json could not be loaded (expected on static hosting). Use Upload JSON to edit existing entries.", "info");
        }
    }

    /* --------------------------------------------------------
       FILE UPLOAD
    -------------------------------------------------------- */
    if (fileInput) {
        fileInput.addEventListener("change", () => {
            const file = fileInput.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = () => {
                try {
                    const parsed = JSON.parse(reader.result);
                    if (!Array.isArray(parsed)) {
                        throw new Error("Uploaded JSON must be an array");
                    }
                    const prepared = prepareImportedGames(parsed);
                    baseGames = prepared;
                    workingGames = [...prepared].sort(compareSortTitle);
                    addedGames = [];
                    hasSourceData = true;
                    updateBadges();
                    renderGamesList(searchInput ? searchInput.value : "");
                    renderAddedPreview();
                    clearForm();
                    updateExportState();
                    setStatus("Uploaded JSON loaded successfully.");
                } catch (err) {
                    setStatus("Invalid JSON file.", "error");
                }
            };
            reader.readAsText(file);
        });
    }

    /* --------------------------------------------------------
       ADD GAME
    -------------------------------------------------------- */
    if (form) {
        form.addEventListener("submit", (event) => {
            event.preventDefault();
            setExportErrors([]);

            const formData = new FormData(form);
            let raw = Object.fromEntries(formData.entries());
            raw.genres = [...selectedGenres];
            raw = normalizeNewEntryTextFields(raw);
            const autoValues = getAutoIdSlug(raw.title);
            raw.id = autoValues.id;
            raw.slug = autoValues.slug;
            if (titleInput) titleInput.value = raw.title || "";
            if (sortTitleInput) sortTitleInput.value = raw.sorttitle || "";
            if (descriptionInput) descriptionInput.value = raw.description || "";
            if (developerInput) developerInput.value = raw.developer || "";
            if (idInput) idInput.value = raw.id || "";
            if (slugInput) slugInput.value = raw.slug || "";
            const game = normalizeGame(raw);

            if (!validateNewGame(raw, game)) {
                setStatus("Fix the highlighted fields before adding.", "error");
                return;
            }

            insertSorted(game);
            addedGames = [game, ...addedGames];
            const intentState = genreCleared ? "cleared" : (genreTouched ? "modified" : "untouched");
            genreIntentById.set(game.id, intentState);

            updateBadges();
            renderGamesList(searchInput ? searchInput.value : "");
            renderAddedPreview();
            updateExportState();
            clearForm();
            setStatus(`Added "${game.title}" to the working library.`);
        });
    }

    /* --------------------------------------------------------
       EXPORT JSON
    -------------------------------------------------------- */
    if (downloadBtn) {
        downloadBtn.addEventListener("click", () => {
            const merged = [...workingGames].sort(compareSortTitle);
            const { errors, warnings } = validateGameLibrary(merged, { includeLegacyWarnings: hasSourceData });
            if (errors.length) {
                setStatus("Export blocked. Fix errors before downloading.", "error");
                setExportErrors(errors);
                if (hasSourceData) {
                    setExportWarnings(warnings);
                } else {
                    setExportWarnings([]);
                }
                return;
            }
            setExportErrors([]);
            if (hasSourceData) {
                setExportWarnings(warnings);
            } else {
                setExportWarnings([]);
            }

            const blob = new Blob([JSON.stringify(merged, null, 2)], {
                type: "application/json"
            });

            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            link.download = "games.json";
            document.body.appendChild(link);
            link.click();
            link.remove();
            URL.revokeObjectURL(url);

            setStatus("Merged games.json downloaded.");
        });
    }

    if (downloadStubsBtn) {
        downloadStubsBtn.addEventListener("click", async () => {
            if (!addedGames.length) {
                setStatus("No new games added for stub export.", "error");
                return;
            }

            const sessionGames = [...addedGames].sort(compareSortTitle);
            const { errors, warnings } = validateGameLibrary(sessionGames, { includeLegacyWarnings: hasSourceData });
            if (errors.length) {
                setStatus("Stub export blocked. Fix errors before downloading.", "error");
                setExportErrors(errors);
                if (hasSourceData) {
                    setExportWarnings(warnings);
                } else {
                    setExportWarnings([]);
                }
                return;
            }
            setExportErrors([]);
            if (hasSourceData) {
                setExportWarnings(warnings);
            } else {
                setExportWarnings([]);
            }

            if (typeof JSZip === "undefined") {
                setStatus("JSZip is not available for zip generation.", "error");
                return;
            }

            const gamesWithSlugs = sessionGames.filter(game => game && game.slug);
            if (!gamesWithSlugs.length) {
                setStatus("No games with slugs found for stub export.", "error");
                return;
            }

            setStatus("Building SEO stub zip…");
            const templateHtml = await loadStubTemplate();
            const zip = new JSZip();
            zip.file("README.txt", "Extract into /games/ (repo root). These are SEO stubs; do not edit manually unless necessary.");

            gamesWithSlugs.forEach(game => {
                const stubHtml = buildSeoStubHtml(templateHtml, game);
                zip.file(`games/${game.slug}.html`, stubHtml);
            });

            const blob = await zip.generateAsync({ type: "blob" });
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            link.download = "ccg-game-stubs.zip";
            document.body.appendChild(link);
            link.click();
            link.remove();
            URL.revokeObjectURL(url);

            setStatus("SEO stub HTML zip downloaded.");
        });
    }

    /* --------------------------------------------------------
       CLEAR ADDED
    -------------------------------------------------------- */
    if (clearBtn) {
        clearBtn.addEventListener("click", () => {
            workingGames = [...baseGames].sort(compareSortTitle);
            addedGames = [];
            updateBadges();
            renderAddedPreview();
            renderGamesList(searchInput ? searchInput.value : "");
            updateExportState();
            if (hasSourceData) {
                setStatus("Added games cleared. Existing dataset remains loaded.");
            } else {
                setStatus("No existing dataset loaded. New entries cleared.", "info");
            }
        });
    }

    if (searchInput) {
        searchInput.addEventListener("input", () => {
            renderGamesList(searchInput.value);
        });
    }

    if (titleInput) {
        titleInput.addEventListener("input", () => {
            updateAutoFields();
            if (fieldErrors.title && !fieldErrors.title.hidden) {
                setFieldError("title", "");
            }
        });
        titleInput.addEventListener("blur", () => {
            normalizeInputValue(titleInput, "title");
        });
    }

    if (sortTitleInput) {
        sortTitleInput.addEventListener("input", () => {
            autoSortTitle = false;
            if (fieldErrors.sorttitle && !fieldErrors.sorttitle.hidden) {
                setFieldError("sorttitle", "");
            }
        });
        sortTitleInput.addEventListener("blur", () => {
            normalizeInputValue(sortTitleInput, "sorttitle");
        });
    }

    if (idInput) {
        idInput.addEventListener("focus", () => {
            if (fieldErrors.id && !fieldErrors.id.hidden) {
                setFieldError("id", "");
            }
        });
    }

    if (slugInput) {
        slugInput.addEventListener("focus", () => {
            if (fieldErrors.slug && !fieldErrors.slug.hidden) {
                setFieldError("slug", "");
            }
        });
    }

    if (yearInput) {
        yearInput.addEventListener("input", () => {
            if (fieldErrors.year && !fieldErrors.year.hidden) {
                setFieldError("year", "");
            }
        });
    }

    if (descriptionInput) {
        descriptionInput.addEventListener("blur", () => {
            normalizeInputValue(descriptionInput, "description");
        });
    }

    if (developerInput) {
        developerInput.addEventListener("blur", () => {
            normalizeInputValue(developerInput, "developer");
        });
    }

    if (videoInput) {
        videoInput.addEventListener("input", () => {
            if (fieldErrors.videoid && !fieldErrors.videoid.hidden) {
                setFieldError("videoid", "");
            }
        });
    }

    if (thumbnailInput) {
        thumbnailInput.addEventListener("input", () => {
            if (fieldErrors.thumbnail && !fieldErrors.thumbnail.hidden) {
                setFieldError("thumbnail", "");
            }
        });
    }

    if (genreSelect) {
        genreSelect.addEventListener("change", () => {
            addGenre(genreSelect.value);
            genreSelect.value = "";
        });
    }

    if (genreSelectedList) {
        genreSelectedList.addEventListener("click", (event) => {
            const button = event.target.closest("button[data-genre-remove]");
            if (!button) return;
            removeGenre(button.dataset.genreRemove);
        });
    }

    if (clearGenresBtn) {
        clearGenresBtn.addEventListener("click", () => {
            clearGenres();
            setFieldError("genres", "");
        });
    }

    if (resetAutoBtn) {
        resetAutoBtn.addEventListener("click", () => {
            autoSortTitle = true;
            updateAutoFields();
            setStatus("Auto fields regenerated from title.");
        });
    }

    /* --------------------------------------------------------
       INIT
    -------------------------------------------------------- */
    if (refreshBtn) {
        refreshBtn.addEventListener("click", fetchLiveGames);
    }

    async function initAdminTools() {
        await waitForAuthReady();
        syncSourceLink();
        fetchLiveGames();
        renderSelectedGenres();
        updateAutoFields();
    }

    initAdminTools();
})();
