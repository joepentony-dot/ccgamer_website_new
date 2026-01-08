/* ============================================================
   CCG ADMIN TOOLS — CLIENT-SIDE JSON STAGING
   ------------------------------------------------------------
   • Fetches live games.json
   • Allows upload + merge
   • Stages new games safely
   • Prevents duplicate IDs
   • Exports merged JSON for manual commit
   • ZERO backend / ZERO auto-publish
   ============================================================ */

(function () {
    "use strict";

    const ID_REGEX = /^[a-z0-9_]+$/;
    const THUMBNAIL_PREFIX = "resources/images/thumbnails/all/";
    const DESCRIPTION_TARGET_MIN = 180;
    const DESCRIPTION_TARGET_MAX = 350;
    const DESCRIPTION_MIN_SOFT = 40;
    const YOUTUBE_ID_REGEX = /^[a-zA-Z0-9_-]{6,}$/;
    const SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

    let liveGames = [];
    let stagedGames = [];
    let editingContext = null;
    let slugAuto = true;

    /* --------------------------------------------------------
       DOM REFERENCES
    -------------------------------------------------------- */
    const statusEl = document.getElementById("adminStatus");
    const fileInput = document.getElementById("adminFileInput");
    const refreshBtn = document.getElementById("adminRefresh");
    const downloadBtn = document.getElementById("adminDownload");
    const clearBtn = document.getElementById("adminClear");
    const commitBtn = document.getElementById("adminCommit");
    const commitPanel = document.getElementById("adminCommitPanel");
    const commitCloseBtn = document.querySelector("[data-admin-commit-close]");
    const form = document.getElementById("adminGameForm");
    const previewBody = document.getElementById("adminGamePreview");
    const submitBtn = document.querySelector("[data-admin-submit]");
    const editBannerLabel = document.querySelector("[data-admin-editing-label]");
    const editCancelBtn = document.querySelector("[data-admin-edit-cancel]");
    const editSearch = document.getElementById("adminEditSearch");
    const editList = document.querySelector("[data-admin-edit-list]");
    const editCount = document.querySelector("[data-admin-edit-count]");
    const sourceInput = document.getElementById("adminSourceInput");
    const sourceOpen = document.getElementById("adminSourceOpen");

    const gameCountEl = document.querySelector("[data-admin-game-count]");
    const stagedCountEl = document.querySelector("[data-admin-staged-count]");
    const latestEls = document.querySelectorAll("[data-admin-latest]");

    const idInput = document.getElementById("gameId");
    const titleInput = document.getElementById("gameTitle");
    const descriptionInput = document.getElementById("gameDescription");
    const thumbInput = document.getElementById("gameThumb");
    const videoInput = document.getElementById("gameVideo");
    const slugInput = document.getElementById("gameSlug");
    const urlPreviewInput = document.getElementById("gameUrlPreview");
    const slugWarning = document.querySelector("[data-admin-slug-warning]");
    const descriptionCount = document.querySelector("[data-admin-description-count]");
    const descriptionWarning = document.querySelector("[data-admin-description-warning]");
    const videoStatus = document.querySelector("[data-admin-video-status]");
    const videoPreview = document.querySelector("[data-admin-video-preview]");
    const thumbnailStatus = document.querySelector("[data-admin-thumbnail-status]");
    const thumbnailPreview = document.querySelector("[data-admin-thumbnail-preview]");

    const fieldErrors = {
        id: document.querySelector('[data-admin-error="id"]'),
        slug: document.querySelector('[data-admin-error="slug"]'),
        description: document.querySelector('[data-admin-error="description"]'),
        thumbnail: document.querySelector('[data-admin-error="thumbnail"]'),
        videoid: document.querySelector('[data-admin-error="videoid"]')
    };

    const fieldInputs = {
        id: idInput,
        slug: slugInput,
        description: descriptionInput,
        thumbnail: thumbInput,
        videoid: videoInput
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

    function setInlineStatus(element, message, state) {
        if (!element) return;
        if (!message) {
            element.textContent = "";
            element.hidden = true;
            element.removeAttribute("data-state");
            return;
        }
        element.textContent = message;
        element.hidden = false;
        element.dataset.state = state;
    }

    function updateBadges() {
        if (gameCountEl) gameCountEl.textContent = liveGames.length;
        if (stagedCountEl) stagedCountEl.textContent = stagedGames.length;
        if (editCount) editCount.textContent = liveGames.length + stagedGames.length;
    }

    function getDefaultSourceUrl() {
        return "../games/games.json";
    }

    function getSourceUrl() {
        if (sourceInput && sourceInput.value.trim()) {
            return sourceInput.value.trim();
        }
        return getDefaultSourceUrl();
    }

    function syncSourceLink() {
        if (!sourceOpen) return;
        sourceOpen.href = getSourceUrl();
    }

    function deriveSlug(title) {
        return String(title || "")
            .toLowerCase()
            .trim()
            .replace(/_/g, "-")
            .replace(/[^a-z0-9\s-]/g, "")
            .replace(/\s+/g, "-")
            .replace(/-+/g, "-")
            .replace(/^-+|-+$/g, "");
    }

    function updateSlugPreview() {
        if (!slugInput) return;
        const slug = slugInput.value.trim();
        if (urlPreviewInput) {
            urlPreviewInput.value = slug
                ? `https://www.cheekycommodoregamer.co.uk/games/${slug}/`
                : "";
        }
        if (!slugWarning) return;
        if (!slug) {
            slugWarning.textContent = "Slug is required to generate the SEO URL.";
            slugWarning.hidden = false;
            return;
        }
        const isSlugValid = SLUG_REGEX.test(slug);
        if (!isSlugValid) {
            slugWarning.textContent = "Slug is invalid. Use lowercase letters, numbers, and single hyphens only.";
            slugWarning.hidden = false;
        } else {
            slugWarning.hidden = true;
            slugWarning.textContent = "";
        }
    }

    function extractThumbnailFilename(path) {
        if (!path) return "";
        const parts = String(path).split(/[/\\]/);
        return parts[parts.length - 1];
    }

    function normaliseGame(raw) {
        const thumbnailInput = raw.thumbnail ? String(raw.thumbnail).trim() : "";
        const thumbnail = thumbnailInput
            ? `${THUMBNAIL_PREFIX}${thumbnailInput}`
            : "";

        return {
            id: String(raw.id).trim(),
            slug: raw.slug
                ? String(raw.slug).trim()
                : deriveSlug(raw.title || ""),
            title: String(raw.title || "").trim(),
            year: raw.year ? Number(raw.year) : "",
            system: raw.system || "C64",
            genres: raw.genres
                ? raw.genres.split(",").map(g => g.trim()).filter(Boolean)
                : [],
            developer: raw.developer || "",
            description: raw.description ? String(raw.description).trim() : "",
            videoid: raw.videoid ? String(raw.videoid).trim() : "",
            thumbnail,
            manual: raw.manual || "",
            disk: raw.disk
                ? raw.disk.split(",").map(d => d.trim()).filter(Boolean)
                : [],
            lemon: raw.lemon
                ? raw.lemon.split(",").map(l => l.trim()).filter(Boolean)
                : []
        };
    }

    function setEditingContext(context) {
        editingContext = context;
        const isEditing = Boolean(context);
        if (editBannerLabel) {
            editBannerLabel.textContent = isEditing
                ? `Editing: ${context.title} (${context.id})`
                : "Creating a new game";
        }
        if (submitBtn) {
            submitBtn.textContent = isEditing ? "Update Game" : "Stage Game";
        }
        if (editCancelBtn) {
            editCancelBtn.hidden = !isEditing;
        }
        if (idInput) {
            idInput.readOnly = isEditing;
            if (isEditing) {
                idInput.setAttribute("aria-readonly", "true");
            } else {
                idInput.removeAttribute("aria-readonly");
            }
        }
    }

    function fillForm(game) {
        if (!form) return;
        form.querySelector("#gameId").value = game.id || "";
        if (slugInput) {
            if (game.slug) {
                slugInput.value = game.slug;
                slugAuto = false;
            } else {
                slugAuto = true;
                slugInput.value = deriveSlug(game.title || "");
            }
        }
        form.querySelector("#gameTitle").value = game.title || "";
        form.querySelector("#gameYear").value = game.year || "";
        form.querySelector("#gameSystem").value = game.system || "C64";
        form.querySelector("#gameGenres").value = game.genres.join(", ");
        form.querySelector("#gameDeveloper").value = game.developer || "";
        form.querySelector("#gameDescription").value = game.description || "";
        form.querySelector("#gameVideo").value = game.videoid || "";
        form.querySelector("#gameThumb").value = extractThumbnailFilename(game.thumbnail || "");
        form.querySelector("#gameManual").value = game.manual || "";
        form.querySelector("#gameDisk").value = game.disk.join(", ");
        form.querySelector("#gameLemon").value = game.lemon.join(", ");
        updateSlugPreview();
        updateDescriptionCounter();
        updateVideoPreview();
        updateThumbnailPreview();
    }

    function resetForm() {
        if (form) form.reset();
        clearFieldErrors();
        slugAuto = true;
        updateSlugPreview();
        updateDescriptionCounter();
        updateVideoPreview();
        updateThumbnailPreview();
        setEditingContext(null);
    }

    function getEditableGames() {
        const staged = stagedGames.map(game => ({ ...game, source: "staged" }));
        const live = liveGames.map(game => ({ ...game, source: "live" }));
        return [...staged, ...live];
    }

    function renderEditList(filter = "") {
        if (!editList) return;
        const term = filter.trim().toLowerCase();
        const items = getEditableGames().filter(game => {
            if (!term) return true;
            return (
                game.title.toLowerCase().includes(term) ||
                game.id.toLowerCase().includes(term)
            );
        });

        editList.innerHTML = "";

        if (!items.length) {
            const empty = document.createElement("li");
            empty.className = "admin-edit-empty";
            empty.textContent = term
                ? "No games match that search."
                : "Load games.json to begin editing.";
            editList.appendChild(empty);
            return;
        }

        items.slice(0, 60).forEach(game => {
            const li = document.createElement("li");
            li.className = "admin-edit-item";
            li.innerHTML = `
                <div>
                    <div class="admin-edit-title">${game.title}</div>
                    <div class="admin-edit-meta">${game.id} • ${game.system} • ${game.year || "Year unknown"}</div>
                    <span class="admin-edit-tag">${game.source}</span>
                </div>
                <button class="ccg-btn ccg-btn--ghost" type="button">Edit</button>
            `;
            li.querySelector("button").addEventListener("click", () => {
                fillForm(game);
                setEditingContext({ id: game.id, source: game.source, title: game.title });
                setStatus(`Editing "${game.title}".`);
                window.scrollTo({ top: 0, behavior: "smooth" });
            });
            editList.appendChild(li);
        });
    }

    function isDuplicateId(id) {
        if (editingContext && editingContext.id === id) {
            return false;
        }
        return [...liveGames, ...stagedGames].some(g => g.id === id);
    }

    function extractYouTubeId(value) {
        if (!value) return "";
        const trimmed = String(value).trim();
        if (!trimmed) return "";

        const urlPattern = /(youtube\.com|youtu\.be|^https?:\/\/|^www\.)/i;
        if (urlPattern.test(trimmed)) {
            let normalized = trimmed;
            if (!/^https?:\/\//i.test(normalized)) {
                normalized = `https://${normalized}`;
            }
            try {
                const url = new URL(normalized);
                if (url.hostname.includes("youtu.be")) {
                    return url.pathname.split("/").filter(Boolean)[0] || "";
                }
                if (url.hostname.includes("youtube.com")) {
                    const paramId = url.searchParams.get("v");
                    if (paramId) return paramId;
                    const pathParts = url.pathname.split("/").filter(Boolean);
                    const embedIndex = pathParts.indexOf("embed");
                    if (embedIndex >= 0 && pathParts[embedIndex + 1]) {
                        return pathParts[embedIndex + 1];
                    }
                    const shortsIndex = pathParts.indexOf("shorts");
                    if (shortsIndex >= 0 && pathParts[shortsIndex + 1]) {
                        return pathParts[shortsIndex + 1];
                    }
                }
            } catch (err) {
                return "";
            }
        }

        return trimmed;
    }

    function updateDescriptionCounter() {
        if (!descriptionInput) return;
        const value = descriptionInput.value.trim();
        const length = value.length;
        if (descriptionCount) {
            descriptionCount.textContent = length;
        }
        if (!descriptionWarning) return;

        if (!value) {
            setInlineStatus(descriptionWarning, "Description is empty. You can add it later, but SEO works best with 180–350 characters.", "warning");
            return;
        }
        if (length < DESCRIPTION_TARGET_MIN) {
            setInlineStatus(descriptionWarning, "Add more detail to reach the 180–350 character SEO target.", "warning");
            return;
        }
        if (length > DESCRIPTION_TARGET_MAX) {
            setInlineStatus(descriptionWarning, "Consider trimming the description to stay under 350 characters.", "warning");
            return;
        }
        setInlineStatus(descriptionWarning, "SEO length looks good.", "success");
    }

    function updateVideoPreview() {
        if (!videoInput) return;
        const rawValue = videoInput.value.trim();
        if (!rawValue) {
            setInlineStatus(videoStatus, "", "");
            if (videoPreview) {
                videoPreview.hidden = true;
                const img = videoPreview.querySelector("img");
                if (img) img.removeAttribute("src");
            }
            return;
        }
        const videoId = extractYouTubeId(rawValue);
        if (!videoId || !YOUTUBE_ID_REGEX.test(videoId)) {
            setInlineStatus(videoStatus, "Invalid YouTube link or ID.", "error");
            if (videoPreview) {
                videoPreview.hidden = true;
            }
            return;
        }
        setInlineStatus(videoStatus, `Video ID detected: ${videoId}`, "success");
        if (videoPreview) {
            const img = videoPreview.querySelector("img");
            if (img) {
                img.src = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
            }
            videoPreview.hidden = false;
        }
    }

    function validateThumbnailFilename(filename) {
        if (!filename) return { valid: true, message: "" };
        if (/[/\\]/.test(filename)) {
            return { valid: false, message: "Use the filename only, without folders." };
        }
        if (!/\.(jpg|png|webp)$/i.test(filename)) {
            return { valid: false, message: "Thumbnail must be a .jpg, .png, or .webp file." };
        }
        return { valid: true, message: "" };
    }

    function updateThumbnailPreview() {
        if (!thumbInput) return;
        const rawValue = thumbInput.value.trim();
        if (!rawValue) {
            setInlineStatus(thumbnailStatus, "", "");
            if (thumbnailPreview) {
                thumbnailPreview.hidden = true;
                const img = thumbnailPreview.querySelector("img");
                if (img) img.removeAttribute("src");
            }
            return;
        }

        const validation = validateThumbnailFilename(rawValue);
        if (!validation.valid) {
            setInlineStatus(thumbnailStatus, validation.message, "error");
            if (thumbnailPreview) thumbnailPreview.hidden = true;
            return;
        }

        const imgPath = `../${THUMBNAIL_PREFIX}${rawValue}`;
        if (thumbnailPreview) {
            const img = thumbnailPreview.querySelector("img");
            if (img) {
                img.onload = () => {
                    setInlineStatus(thumbnailStatus, "Thumbnail found.", "success");
                };
                img.onerror = () => {
                    setInlineStatus(thumbnailStatus, "Thumbnail not found yet. Check the filename before publishing.", "warning");
                };
                img.src = imgPath;
            }
            thumbnailPreview.hidden = false;
        }
    }

    function validateGame(raw, game) {
        clearFieldErrors();
        let isValid = true;

        if (!game.id) {
            setFieldError("id", "Game ID is required.");
            isValid = false;
        } else if (!ID_REGEX.test(game.id)) {
            setFieldError("id", "Use lowercase letters, numbers, and underscores only.");
            isValid = false;
        } else if (isDuplicateId(game.id)) {
            setFieldError("id", `ID "${game.id}" is already in use.`);
            isValid = false;
        }

        if (!game.slug) {
            setFieldError("slug", "Slug is required.");
            isValid = false;
        } else if (!SLUG_REGEX.test(game.slug)) {
            setFieldError("slug", "Slug must use lowercase letters, numbers, and single hyphens only.");
            isValid = false;
        }

        if (game.description && game.description.length < DESCRIPTION_MIN_SOFT) {
            setFieldError(
                "description",
                `Description should be at least ${DESCRIPTION_MIN_SOFT} characters for clarity.`
            );
            isValid = false;
        }

        const thumbnailInput = raw.thumbnail ? String(raw.thumbnail).trim() : "";
        if (thumbnailInput) {
            const validation = validateThumbnailFilename(thumbnailInput);
            if (!validation.valid) {
                setFieldError("thumbnail", validation.message);
                isValid = false;
            }
        }

        const videoValue = raw.videoid ? String(raw.videoid).trim() : "";
        if (videoValue) {
            const parsedVideoId = extractYouTubeId(videoValue);
            if (!parsedVideoId || !YOUTUBE_ID_REGEX.test(parsedVideoId)) {
                setFieldError("videoid", "Provide a valid YouTube URL or ID.");
                isValid = false;
            }
        }

        return isValid;
    }

    /* --------------------------------------------------------
       FETCH LIVE JSON
    -------------------------------------------------------- */
    async function fetchLiveGames() {
        setStatus("Fetching live games.json…");
        const url = getSourceUrl();
        try {
            const res = await fetch(url, { cache: "no-store" });
            if (!res.ok) throw new Error(`Fetch failed (${res.status})`);
            const data = await res.json();

            if (!Array.isArray(data)) {
                throw new Error("Invalid games.json format");
            }

            liveGames = data;
            updateBadges();
            setStatus(`Loaded ${liveGames.length} live games.`);
            renderEditList(editSearch ? editSearch.value : "");
            resetForm();
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
                    liveGames = parsed;
                    stagedGames = [];
                    updateBadges();
                    renderPreview();
                    renderEditList(editSearch ? editSearch.value : "");
                    resetForm();
                    setStatus("Uploaded JSON loaded successfully.");
                    syncSourceLink();
                } catch (err) {
                    setStatus("Invalid JSON file.", true);
                }
            };
            reader.readAsText(file);
        });
    }

    /* --------------------------------------------------------
       ADD GAME (STAGE)
    -------------------------------------------------------- */
    if (form) {
        form.addEventListener("submit", (e) => {
            e.preventDefault();

            const formData = new FormData(form);
            const raw = Object.fromEntries(formData.entries());
            const parsedVideoId = extractYouTubeId(raw.videoid || "");
            if (parsedVideoId) {
                raw.videoid = parsedVideoId;
                if (videoInput) {
                    videoInput.value = parsedVideoId;
                }
            }

            const game = normaliseGame(raw);

            if (!game.id || !game.title) {
                setStatus("ID and Title are required.", true);
                if (!game.id) {
                    setFieldError("id", "Game ID is required.");
                }
                return;
            }

            if (!validateGame(raw, game)) {
                setStatus("Fix the highlighted fields before staging.", true);
                return;
            }

            let statusMessage = `Game "${game.title}" staged.`;
            if (editingContext) {
                const target = editingContext.source === "staged" ? stagedGames : liveGames;
                const idx = target.findIndex(entry => entry.id === editingContext.id);
                if (idx >= 0) {
                    target[idx] = game;
                    statusMessage = `Game "${game.title}" updated.`;
                } else {
                    stagedGames.unshift(game);
                }
            } else {
                stagedGames.unshift(game);
            }

            updateBadges();
            renderPreview();
            renderLatest();
            resetForm();
            setStatus(statusMessage);
        });
    }

    /* --------------------------------------------------------
       PREVIEW TABLE
    -------------------------------------------------------- */
    function renderPreview() {
        if (!previewBody) return;

        previewBody.innerHTML = "";

        const preview = stagedGames.slice(0, 12);

        if (!preview.length) {
            previewBody.innerHTML =
                "<tr><td colspan='5'>Nothing staged yet.</td></tr>";
            return;
        }

        preview.forEach(game => {
            const tr = document.createElement("tr");
            tr.innerHTML = `
                <td>${game.title}</td>
                <td>${game.system}</td>
                <td>${game.year || "—"}</td>
                <td>${game.genres.join(", ")}</td>
                <td>${game.lemon.length || "—"}</td>
            `;
            previewBody.appendChild(tr);
        });
    }

    function renderLatest() {
        if (!latestEls.length) return;
        const latest = stagedGames[0];
        latestEls.forEach(el => {
            const key = el.dataset.adminLatest;
            if (!latest) {
                el.textContent = "—";
                return;
            }
            if (key === "lemon") {
                el.textContent = latest.lemon.length
                    ? latest.lemon.join(", ")
                    : "—";
                return;
            }
            if (key === "disk") {
                el.textContent = latest.disk.length
                    ? latest.disk.join(", ")
                    : "—";
                return;
            }
            el.textContent = latest[key] || "—";
        });
    }

    /* --------------------------------------------------------
       EXPORT JSON
    -------------------------------------------------------- */
    if (downloadBtn) {
        downloadBtn.addEventListener("click", () => {
            const merged = [...stagedGames, ...liveGames]
                .sort((a, b) => a.title.localeCompare(b.title));

            const invalidSlugs = merged.filter(game =>
                !game.slug || !SLUG_REGEX.test(String(game.slug).trim())
            );
            if (invalidSlugs.length) {
                setStatus("Export blocked: every game must have a valid slug before downloading.", true);
                return;
            }

            const blob = new Blob(
                [JSON.stringify(merged, null, 2)],
                { type: "application/json" }
            );

            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = "games.json";
            a.click();
            URL.revokeObjectURL(url);

            setStatus("Merged games.json downloaded.");
        });
    }

    /* --------------------------------------------------------
       CLEAR STAGED
    -------------------------------------------------------- */
    if (clearBtn) {
        clearBtn.addEventListener("click", () => {
            stagedGames = [];
            renderPreview();
            renderLatest();
            updateBadges();
            setStatus("Staged entries cleared.");
            resetForm();
        });
    }

    if (commitBtn && commitPanel) {
        commitBtn.addEventListener("click", () => {
            const isOpen = !commitPanel.hasAttribute("hidden");
            if (isOpen) {
                commitPanel.setAttribute("hidden", "hidden");
                commitBtn.setAttribute("aria-expanded", "false");
            } else {
                commitPanel.removeAttribute("hidden");
                commitBtn.setAttribute("aria-expanded", "true");
            }
        });
    }

    if (commitCloseBtn && commitPanel && commitBtn) {
        commitCloseBtn.addEventListener("click", () => {
            commitPanel.setAttribute("hidden", "hidden");
            commitBtn.setAttribute("aria-expanded", "false");
        });
    }

    if (editCancelBtn) {
        editCancelBtn.addEventListener("click", () => {
            resetForm();
            setStatus("Edit cancelled.");
        });
    }

    if (editSearch) {
        editSearch.addEventListener("input", () => {
            renderEditList(editSearch.value);
        });
    }

    if (idInput) {
        idInput.addEventListener("input", () => {
            updateSlugPreview();
            if (fieldErrors.id && !fieldErrors.id.hidden) {
                setFieldError("id", "");
            }
        });
    }

    if (titleInput) {
        titleInput.addEventListener("input", () => {
            if (slugAuto && slugInput) {
                slugInput.value = deriveSlug(titleInput.value);
            }
            updateSlugPreview();
        });
    }

    if (slugInput) {
        slugInput.addEventListener("input", () => {
            slugAuto = false;
            updateSlugPreview();
            if (fieldErrors.slug && !fieldErrors.slug.hidden) {
                setFieldError("slug", "");
            }
        });
    }

    if (descriptionInput) {
        descriptionInput.addEventListener("input", () => {
            updateDescriptionCounter();
            if (fieldErrors.description && !fieldErrors.description.hidden) {
                setFieldError("description", "");
            }
        });
    }

    if (thumbInput) {
        thumbInput.addEventListener("input", () => {
            updateThumbnailPreview();
            if (fieldErrors.thumbnail && !fieldErrors.thumbnail.hidden) {
                setFieldError("thumbnail", "");
            }
        });
    }

    if (videoInput) {
        videoInput.addEventListener("input", () => {
            updateVideoPreview();
            if (fieldErrors.videoid && !fieldErrors.videoid.hidden) {
                setFieldError("videoid", "");
            }
        });
    }

    /* --------------------------------------------------------
       INIT
    -------------------------------------------------------- */
    if (refreshBtn) {
        refreshBtn.addEventListener("click", fetchLiveGames);
    }

    if (sourceInput) {
        sourceInput.value = getDefaultSourceUrl();
        sourceInput.addEventListener("change", syncSourceLink);
    }

    syncSourceLink();
    fetchLiveGames();
    renderLatest();
    updateSlugPreview();
    updateDescriptionCounter();
    updateVideoPreview();
    updateThumbnailPreview();
})();
