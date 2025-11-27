// ================================
// CCG - COMPLETE INDEX BUILDER
// ================================

(function () {
    const container = document.getElementById("index-accordion");
    if (!container) return; // Not on complete-index.html

    const statusEl = document.getElementById("index-status");

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
                if (!Array.isArray(json)) throw new Error("games.json is not an array");
                window.__CCG_GAMES_CACHE__ = json;
                return json;
            });
    }

    function createSection(letter, games) {
        const basePath = getGamesBasePath();
        const section = document.createElement("section");
        section.className = "index-section";

        const headerBtn = document.createElement("button");
        headerBtn.className = "accordion-header";
        headerBtn.type = "button";
        headerBtn.textContent = letter + " (" + games.length + ")";

        const body = document.createElement("div");
        body.className = "accordion-body";

        const table = document.createElement("table");
        table.className = "index-table-inner";

        const thead = document.createElement("thead");
        thead.innerHTML = `
            <tr>
                <th>Title</th>
                <th>System</th>
                <th>Genres</th>
                <th>Video</th>
            </tr>
        `;
        table.appendChild(thead);

        const tbody = document.createElement("tbody");

        games.forEach(game => {
            const tr = document.createElement("tr");

            const titleCell = document.createElement("td");
            const detailUrl = basePath + "game.html?id=" + encodeURIComponent(game.slug);
            titleCell.innerHTML = `<a href="${detailUrl}">${escapeHtml(game.title || "")}</a>`;

            const systemCell = document.createElement("td");
            systemCell.textContent = game.system || "";

            const genresCell = document.createElement("td");
            genresCell.textContent = Array.isArray(game.genres)
                ? game.genres.join(", ")
                : "";

            const videoCell = document.createElement("td");
            if (game.videoId) {
                const link = document.createElement("a");
                link.href = "https://www.youtube.com/watch?v=" + encodeURIComponent(game.videoId);
                link.target = "_blank";
                link.rel = "noopener";
                link.textContent = "Watch";
                videoCell.appendChild(link);
            } else {
                videoCell.textContent = "";
            }

            tr.appendChild(titleCell);
            tr.appendChild(systemCell);
            tr.appendChild(genresCell);
            tr.appendChild(videoCell);
            tbody.appendChild(tr);
        });

        table.appendChild(tbody);
        body.appendChild(table);
        section.appendChild(headerBtn);
        section.appendChild(body);

        return section;
    }

    if (statusEl) statusEl.textContent = "Loading complete index…";

    fetchGamesJson()
        .then(games => {
            if (!games.length) {
                if (statusEl) statusEl.textContent = "No games found.";
                return;
            }

            // Sort A–Z by title
            games.sort((a, b) =>
                (a.title || "").localeCompare(b.title || "", "en", { sensitivity: "base" })
            );

            // Group by first letter
            const groups = new Map();
            games.forEach(game => {
                const first = (game.title || "").charAt(0).toUpperCase();
                const key = /[A-Z]/.test(first) ? first : "#";
                if (!groups.has(key)) groups.set(key, []);
                groups.get(key).push(game);
            });

            const letters = Array.from(groups.keys()).sort((a, b) => {
                if (a === "#") return 1;
                if (b === "#") return -1;
                return a.localeCompare(b);
            });

            container.innerHTML = "";

            letters.forEach(letter => {
                const section = createSection(letter, groups.get(letter));
                container.appendChild(section);
            });

            if (statusEl) {
                statusEl.textContent =
                    "Indexed " + games.length + " games across " + letters.length + " sections.";
            }

            // Let accordion-index.js wire up the toggles
        })
        .catch(err => {
            console.error("Error building complete index:", err);
            if (statusEl) statusEl.textContent = "Error loading complete index.";
        });
})();
