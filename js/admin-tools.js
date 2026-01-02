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

    const LIVE_JSON_PATH = "../games/games.json";

    let liveGames = [];
    let stagedGames = [];

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

    const gameCountEl = document.querySelector("[data-admin-game-count]");
    const stagedCountEl = document.querySelector("[data-admin-staged-count]");
    const latestEls = document.querySelectorAll("[data-admin-latest]");

    /* --------------------------------------------------------
       HELPERS
    -------------------------------------------------------- */
    function setStatus(msg, isError = false) {
        if (!statusEl) return;
        statusEl.textContent = msg;
        statusEl.dataset.state = isError ? "error" : "success";
    }

    function updateBadges() {
        if (gameCountEl) gameCountEl.textContent = liveGames.length;
        if (stagedCountEl) stagedCountEl.textContent = stagedGames.length;
        if (editCount) editCount.textContent = liveGames.length + stagedGames.length;
    }

    function normaliseGame(raw) {
        return {
            id: String(raw.id).trim(),
            title: String(raw.title || "").trim(),
            year: raw.year ? Number(raw.year) : "",
            system: raw.system || "C64",
            genres: raw.genres
                ? raw.genres.split(",").map(g => g.trim()).filter(Boolean)
                : [],
            developer: raw.developer || "",
            description: raw.description ? String(raw.description).trim() : "",
            videoid: raw.videoid || "",
            thumbnail: raw.thumbnail || "",
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
    }

    function fillForm(game) {
        if (!form) return;
        form.querySelector("#gameId").value = game.id || "";
        form.querySelector("#gameTitle").value = game.title || "";
        form.querySelector("#gameYear").value = game.year || "";
        form.querySelector("#gameSystem").value = game.system || "C64";
        form.querySelector("#gameGenres").value = game.genres.join(", ");
        form.querySelector("#gameDeveloper").value = game.developer || "";
        form.querySelector("#gameDescription").value = game.description || "";
        form.querySelector("#gameVideo").value = game.videoid || "";
        form.querySelector("#gameThumb").value = game.thumbnail || "";
        form.querySelector("#gameManual").value = game.manual || "";
        form.querySelector("#gameDisk").value = game.disk.join(", ");
        form.querySelector("#gameLemon").value = game.lemon.join(", ");
    }

    function resetForm() {
        if (form) form.reset();
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

    /* --------------------------------------------------------
       FETCH LIVE JSON
    -------------------------------------------------------- */
    async function fetchLiveGames() {
        setStatus("Fetching live games.json…");
        try {
            const res = await fetch(LIVE_JSON_PATH, { cache: "no-store" });
            if (!res.ok) throw new Error("Fetch failed");
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
            setStatus("Failed to load live games.json", true);
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
            const game = normaliseGame(raw);

            if (!game.id || !game.title) {
                setStatus("ID and Title are required.", true);
                return;
            }

            if (!game.description) {
                setStatus("Description is required.", true);
                return;
            }

            if (isDuplicateId(game.id)) {
                setStatus(`Duplicate ID "${game.id}" detected.`, true);
                return;
            }

            if (editingContext) {
                const target = editingContext.source === "staged" ? stagedGames : liveGames;
                const idx = target.findIndex(entry => entry.id === editingContext.id);
                if (idx >= 0) {
                    target[idx] = game;
                    setStatus(`Game "${game.title}" updated.`);
                } else {
                    stagedGames.unshift(game);
                    setStatus(`Game "${game.title}" staged.`);
                }
            } else {
                stagedGames.unshift(game);
                setStatus(`Game "${game.title}" staged.`);
            }

            updateBadges();
            renderPreview();
            renderLatest();
            form.reset();

            setStatus(`Game "${game.title}" staged.`);
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

    /* --------------------------------------------------------
       INIT
    -------------------------------------------------------- */
    if (refreshBtn) {
        refreshBtn.addEventListener("click", fetchLiveGames);
    }

    fetchLiveGames();
    renderLatest();
})();
