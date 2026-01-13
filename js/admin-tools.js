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

    const ID_REGEX = /^[a-z0-9_]+$/;
    const SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
    const YOUTUBE_ID_REGEX = /^[a-zA-Z0-9_-]{6,}$/;
    const THUMBNAIL_PREFIX = "resources/images/thumbnails/all/";
    const SYSTEMS = ["C64", "AMIGA"];
    const ARTICLE_REGEX = /^(the|a|an)\s+/i;

    let baseGames = [];
    let workingGames = [];
    let addedGames = [];
    let autoId = true;
    let autoSlug = true;
    let autoSortTitle = true;

    /* --------------------------------------------------------
       DOM REFERENCES
    -------------------------------------------------------- */
    const statusEl = document.getElementById("adminStatus");
    const fileInput = document.getElementById("adminFileInput");
    const refreshBtn = document.getElementById("adminRefresh");
    const downloadBtn = document.getElementById("adminDownload");
    const clearBtn = document.getElementById("adminClear");
    const sourceOpen = document.getElementById("adminSourceOpen");
    const errorPanel = document.querySelector("[data-admin-errors]");
    const errorList = document.querySelector("[data-admin-error-list]");

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

    const fieldErrors = {
        system: document.querySelector('[data-admin-error="system"]'),
        title: document.querySelector('[data-admin-error="title"]'),
        sorttitle: document.querySelector('[data-admin-error="sorttitle"]'),
        id: document.querySelector('[data-admin-error="id"]'),
        slug: document.querySelector('[data-admin-error="slug"]'),
        year: document.querySelector('[data-admin-error="year"]'),
        videoid: document.querySelector('[data-admin-error="videoid"]'),
        thumbnail: document.querySelector('[data-admin-error="thumbnail"]')
    };

    const fieldInputs = {
        system: systemInput,
        title: titleInput,
        sorttitle: sortTitleInput,
        id: idInput,
        slug: slugInput,
        year: yearInput,
        videoid: videoInput,
        thumbnail: thumbnailInput
    };

    /* --------------------------------------------------------
       HELPERS
    -------------------------------------------------------- */
    function setStatus(msg, isError = false) {
        if (!statusEl) return;
        statusEl.textContent = msg;
        statusEl.dataset.state = isError ? "error" : "success";
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

    function updateBadges() {
        if (gameCountEl) gameCountEl.textContent = baseGames.length;
        if (addedCountEl) addedCountEl.textContent = addedGames.length;
        if (totalCountEl) totalCountEl.textContent = workingGames.length;
    }

    function getDefaultSourceUrl() {
        return "../games/games.json";
    }

    function syncSourceLink() {
        if (!sourceOpen) return;
        sourceOpen.href = getDefaultSourceUrl();
    }

    function deriveSortTitle(title) {
        const trimmed = String(title || "").trim();
        if (!trimmed) return "";
        const stripped = trimmed.replace(ARTICLE_REGEX, "");
        return stripped || trimmed;
    }

    function toSlug(title) {
        return String(title || "")
            .toLowerCase()
            .trim()
            .replace(/['“”"’]/g, "")
            .replace(/[^a-z0-9\s-]/g, "")
            .replace(/\s+/g, "-")
            .replace(/-+/g, "-")
            .replace(/^-+|-+$/g, "");
    }

    function toSnake(title) {
        return String(title || "")
            .toLowerCase()
            .trim()
            .replace(/['“”"’]/g, "")
            .replace(/[^a-z0-9\s-]/g, "")
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
        const trimmed = String(value || "").trim().toUpperCase();
        if (trimmed === "AMIGA") return "AMIGA";
        return "C64";
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
        autoId = true;
        autoSlug = true;
        autoSortTitle = true;
        clearFieldErrors();
    }

    function updateAutoFields() {
        if (!titleInput) return;
        const title = titleInput.value;
        if (autoSortTitle && sortTitleInput) {
            sortTitleInput.value = deriveSortTitle(title);
        }
        if (autoId && idInput) {
            idInput.value = toSnake(title);
        }
        if (autoSlug && slugInput) {
            slugInput.value = toSlug(title);
        }
    }

    function normalizeGame(raw) {
        return {
            system: normalizeSystem(raw.system),
            id: String(raw.id || "").trim(),
            slug: String(raw.slug || "").trim(),
            title: String(raw.title || "").trim(),
            sorttitle: String(raw.sorttitle || "").trim(),
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

        if (!game.id) {
            setFieldError("id", "ID is required.");
            isValid = false;
        } else if (!ID_REGEX.test(game.id)) {
            setFieldError("id", "Use lowercase letters, numbers, and underscores only.");
            isValid = false;
        }

        if (!game.slug) {
            setFieldError("slug", "Slug is required.");
            isValid = false;
        } else if (!SLUG_REGEX.test(game.slug)) {
            setFieldError("slug", "Use lowercase letters, numbers, and single hyphens only.");
            isValid = false;
        }

        if (raw.year && !Number.isInteger(Number(raw.year))) {
            setFieldError("year", "Year must be a number.");
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
        if (allGames.some(existing => existing.id === game.id)) {
            setFieldError("id", `ID "${game.id}" is already in use.`);
            isValid = false;
        }
        if (allGames.some(existing => existing.slug === game.slug)) {
            setFieldError("slug", `Slug "${game.slug}" is already in use.`);
            isValid = false;
        }

        return isValid;
    }

    function validateAllGames(games) {
        const errors = [];
        if (!Array.isArray(games)) {
            errors.push("games.json must be an array.");
            return errors;
        }

        const seenIds = new Set();
        const seenSlugs = new Set();

        games.forEach((game, index) => {
            const prefix = `Entry ${index + 1}`;
            if (!game || typeof game !== "object") {
                errors.push(`${prefix}: entry is not an object.`);
                return;
            }
            if (!SYSTEMS.includes(game.system)) {
                errors.push(`${prefix}: system must be C64 or AMIGA.`);
            }
            if (!game.title) {
                errors.push(`${prefix}: title is required.`);
            }
            if (!game.sorttitle) {
                errors.push(`${prefix}: sorttitle is required.`);
            }
            if (!game.id) {
                errors.push(`${prefix}: id is required.`);
            } else if (!ID_REGEX.test(game.id)) {
                errors.push(`${prefix}: id "${game.id}" is invalid.`);
            } else if (seenIds.has(game.id)) {
                errors.push(`${prefix}: id "${game.id}" is duplicated.`);
            } else {
                seenIds.add(game.id);
            }
            if (!game.slug) {
                errors.push(`${prefix}: slug is required.`);
            } else if (!SLUG_REGEX.test(game.slug)) {
                errors.push(`${prefix}: slug "${game.slug}" is invalid.`);
            } else if (seenSlugs.has(game.slug)) {
                errors.push(`${prefix}: slug "${game.slug}" is duplicated.`);
            } else {
                seenSlugs.add(game.slug);
            }
            if (game.year && !Number.isInteger(Number(game.year))) {
                errors.push(`${prefix}: year must be numeric.`);
            }
        });

        return errors;
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

            baseGames = data;
            workingGames = [...data].sort(compareSortTitle);
            addedGames = [];
            updateBadges();
            setStatus(`Loaded ${baseGames.length} live games.`);
            renderGamesList(searchInput ? searchInput.value : "");
            renderAddedPreview();
            clearForm();
            setExportErrors([]);
        } catch (err) {
            console.error(err);
            setStatus(`Failed to load live games.json from ${url}`, true);
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
                    baseGames = parsed;
                    workingGames = [...parsed].sort(compareSortTitle);
                    addedGames = [];
                    updateBadges();
                    renderGamesList(searchInput ? searchInput.value : "");
                    renderAddedPreview();
                    clearForm();
                    setExportErrors([]);
                    setStatus("Uploaded JSON loaded successfully.");
                } catch (err) {
                    setStatus("Invalid JSON file.", true);
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
            const raw = Object.fromEntries(formData.entries());
            const game = normalizeGame(raw);

            if (!validateNewGame(raw, game)) {
                setStatus("Fix the highlighted fields before adding.", true);
                return;
            }

            insertSorted(game);
            addedGames = [game, ...addedGames];

            updateBadges();
            renderGamesList(searchInput ? searchInput.value : "");
            renderAddedPreview();
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
            const errors = validateAllGames(merged);
            if (errors.length) {
                setStatus("Export blocked. Fix errors before downloading.", true);
                setExportErrors(errors);
                return;
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

            setExportErrors([]);
            setStatus("Merged games.json downloaded.");
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
            setExportErrors([]);
            setStatus("Added games cleared. Live games remain loaded.");
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
    }

    if (sortTitleInput) {
        sortTitleInput.addEventListener("input", () => {
            autoSortTitle = false;
            if (fieldErrors.sorttitle && !fieldErrors.sorttitle.hidden) {
                setFieldError("sorttitle", "");
            }
        });
    }

    if (idInput) {
        idInput.addEventListener("input", () => {
            autoId = false;
            if (fieldErrors.id && !fieldErrors.id.hidden) {
                setFieldError("id", "");
            }
        });
    }

    if (slugInput) {
        slugInput.addEventListener("input", () => {
            autoSlug = false;
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

    if (resetAutoBtn) {
        resetAutoBtn.addEventListener("click", () => {
            autoId = true;
            autoSlug = true;
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

    syncSourceLink();
    fetchLiveGames();
    updateAutoFields();
})();
