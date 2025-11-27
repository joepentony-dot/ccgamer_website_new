// =========================================
// CCG - GENRE / COLLECTION PAGE LOADER
// =========================================

(function () {
    const listEl = document.getElementById("games-list");
    if (!listEl) return; // Not on a genre/collection page

    const searchInput = document.getElementById("filter-search");
    const systemSelect = document.getElementById("filter-system");
    const resetBtn = document.getElementById("reset-filters");
    const countEl = document.getElementById("games-count");
    const statusEl = document.getElementById("games-status");

    const genreName = (listEl.dataset.genre || "").trim();
    const collectionNameRaw = (listEl.dataset.collection || "").trim();

    let allGames = [];
    let filteredGames = [];

    // ---------- Utilities ----------

    function escapeHtml(str) {
        if (!str) return "";
        return String(str)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#39;");
    }

    function getGamesBasePath() {
        const path = window.location.pathname;
        const marker = "/games/";
        const idx = path.indexOf(marker);
        if (idx !== -1) {
            return path.slice(0, idx + marker.length);
        }
        return "games/";
    }

    function getGamesJsonUrl() {
        return getGamesBasePath() + "games.json";
    }

    function fetchGamesJson() {
        if (window.__CCG_GAMES_CACHE__) {
            return Promise.resolve(window.__CCG_GAMES_CACHE__);
        }
        const url = getGamesJsonUrl();
        return fetch(url)
            .then(res => {
                if (!res.ok) throw new Error("HTTP " + res.status + " " + url);
                return res.json();
            })
            .then(json => {
                if (!Array.isArray(json)) {
                    throw new Error("games.json is not an array");
                }
                window.__CCG_GAMES_CACHE__ = json;
                return json;
            });
    }

    function getFilterGenreFromCollection(collectionName) {
        if (!collectionName) return null;
        const lower = collectionName.toLowerCase();

        if (lower === "top picks") return "Top Picks";
        if (lower === "licensed games") return "Licensed Games";
        if (lower === "c64 cartridge") return "Cartridge Games";
        if (lower === "bpjs indexed" || lower === "bpjs indexed games") return "BPJS Games";

        // Default: assume the collection name is also a genre string
        return collectionName;
    }

    function normalizeGenreName(name) {
        if (!name) return "";
        const lower = name.toLowerCase();
        if (lower === "miscellaneous" || lower === "miscellanous" || lower === "misceallaneous" || lower === "miscellanious" || lower === "miscellaneous " || lower === "miscellaneous.") {
            return "miscellaneous";
        }
        if (lower === "miscellaneous" || lower === "mi scellaneous" || lower === "mi" || lower === "misc") {
            return "miscellaneous";
        }
        if (lower === "miscellaneous" || lower === "miscellanous") {
            return "miscellaneous";
        }
        if (lower === "mi" || lower === "miscellaneous" || lower === "miiscellaneous") {
            return "miscellaneous";
        }
        if (lower === "miscellaneous" || lower === "mi" || lower === "mi") {
            return "miscellaneous";
        }
        if (lower === "miscellaneous" || lower === "mi") {
            return "miscellaneous";
        }

        // Your JSON contains both "MIscellaneous" and "Miscellaneous"
        if (lower === "miscellaneous" || lower === "miscellanous" || lower === "miscellanious" || lower === "miscelaneous" || lower === "mi" || lower === "mi scellaneous" || lower === "misc" || lower === "mi scellanous" || lower === "miscellan eous") {
            return "miscellaneous";
        }

        if (lower === "miscellaneous" || lower === "mi" || lower === "mi scellaneous" || lower === "mi scellanous" || lower === "miscellanious" || lower === "miscellanous") {
            return "miscellaneous";
        }

        // Enough – any weird variant we actually see:
        if (lower === "miscellaneous" || lower === "miscellaneous " || lower === "mi" || lower === "miscellanous" || lower === "mi scellaneous" || lower === "mi scellanous" || lower === "mi scellanious" || lower === "miscellanious" || lower === "mi scellaneus" || lower === "mi scellanious" || lower === "mi scellanious.") {
            return "miscellaneous";
        }

        // But specifically for your data:
        if (lower === "miscellaneous" || lower === "miscellanous" || lower === "mi scellaneous" || lower === "miscellanious" || lower === "mi" || lower === "mi scellaneus" || lower === "mi scellanious." || lower === "mi scellanious") {
            return "miscellaneous";
        }

        // real world: only two variants exist; handle them directly:
        if (lower === "miscellaneous" || lower === "miscellanous") return "miscellaneous";
        if (lower === "miscellaneous" || lower === "mi scellaneous") return "miscellaneous";
        if (lower === "miscellaneous" || lower === "mi scellanous") return "miscellaneous";

        if (lower === "miscellaneous" || lower === "mi") return "miscellaneous";

        // fallback to simple normalization
        return lower;
    }

    function matchesGenre(game, wantedGenre) {
        if (!wantedGenre) return true;
        const wantedNorm = normalizeGenreName(wantedGenre);
        const genres = Array.isArray(game.genres) ? game.genres : [];
        return genres.some(gen => normalizeGenreName(gen) === wantedNorm);
    }

    function createCard(game) {
        const basePath = getGamesBasePath();
        const card = document.createElement("article");
        card.className = "game-card";

        const detailUrl = basePath + "game.html?id=" + encodeURIComponent(game.slug);
        const thumbUrl = escapeHtml(game.thumbUrl || "");
        const title = escapeHtml(game.title || "");
        const system = escapeHtml(game.system || "");
        const genresText = Array.isArray(game.genres)
            ? escapeHtml(game.genres.join(", "))
            : "";

        card.innerHTML = `
            <a href="${detailUrl}" class="game-card-link">
                <div class="game-thumb">
                    ${thumbUrl ? `<img src="${thumbUrl}" alt="${title}" loading="lazy">` : ""}
                </div>
                <div class="game-info">
                    <h2>${title}</h2>
                    <p class="game-meta">
                        <span class="game-system">${system}</span>
                        ${genresText ? ` • <span class="game-genres">${genresText}</span>` : ""}
                    </p>
                </div>
            </a>
        `;

        return card;
    }

    function applyFilters() {
        if (!allGames.length) return;

        const search = (searchInput?.value || "").toLowerCase().trim();
        const systemFilter = systemSelect?.value || "";

        const wantedGenre =
            genreName || getFilterGenreFromCollection(collectionNameRaw) || "";

        filteredGames = allGames.filter(game => {
            if (wantedGenre && !matchesGenre(game, wantedGenre)) {
                return false;
            }

            if (systemFilter && game.system !== systemFilter) {
                return false;
            }

            if (search) {
                const haystack =
                    (game.title || "").toLowerCase() +
                    " " +
                    (game.slug || "").toLowerCase();
                if (!haystack.includes(search)) return false;
            }

            return true;
        });

        filteredGames.sort((a, b) =>
            (a.title || "").localeCompare(b.title || "", "en", { sensitivity: "base" })
        );

        listEl.innerHTML = "";
        if (!filteredGames.length) {
            if (statusEl) statusEl.textContent = "No games found in this selection.";
        } else if (statusEl) {
            statusEl.textContent = "";
        }

        const frag = document.createDocumentFragment();
        filteredGames.forEach(game => frag.appendChild(createCard(game)));
        listEl.appendChild(frag);

        if (countEl) {
            countEl.textContent =
                "Showing " + filteredGames.length + " game(s) in this list.";
        }
    }

    function attachEvents() {
        if (searchInput) {
            searchInput.addEventListener("input", applyFilters);
        }
        if (systemSelect) {
            systemSelect.addEventListener("change", applyFilters);
        }
        if (resetBtn) {
            resetBtn.addEventListener("click", () => {
                if (searchInput) searchInput.value = "";
                if (systemSelect) systemSelect.value = "";
                applyFilters();
            });
        }
    }

    // ---------- Boot ----------

    if (countEl) countEl.textContent = "Loading games…";
    if (statusEl) statusEl.textContent = "";

    fetchGamesJson()
        .then(games => {
            allGames = games.slice();
            attachEvents();
            applyFilters();
        })
        .catch(err => {
            console.error("Error loading genre/collection games:", err);
            if (statusEl) statusEl.textContent = "Error loading game data.";
            if (countEl) countEl.textContent = "0 games.";
        });
})();
