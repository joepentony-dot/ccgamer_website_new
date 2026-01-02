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
    const form = document.getElementById("adminGameForm");
    const previewBody = document.getElementById("adminGamePreview");

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

    function isDuplicateId(id) {
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

            stagedGames.unshift(game);
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
