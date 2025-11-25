// Loader for Cheeky Commodore Gamer pages (CSV-based)
// Uses published CSV from the master Google Sheet.

const CCG_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQWiuznK7CJeHvaMSAmdVyzDEdpeNQxXGjhqEzsvzLTV792D_B1B5pA55T6kV7maskDFkn0oU0CQ3JM/pub?gid=1584452405&single=true&output=csv";

// Cache so we only fetch/parse once per page load
let CCG_GAMES_CACHE = null;

// Normalise strings for comparison
function ccgNormalise(str) {
    return (str || "").toString().trim().toUpperCase();
}

// Fetch and parse the CSV into a simple array of game objects
async function ccgFetchGames() {
    if (CCG_GAMES_CACHE) return CCG_GAMES_CACHE;

    const response = await fetch(CCG_CSV_URL);
    if (!response.ok) {
        throw new Error("Failed to fetch CSV: " + response.status);
    }

    const csvText = await response.text();

    return new Promise((resolve, reject) => {
        if (typeof Papa === "undefined") {
            reject(new Error("PapaParse (Papa) is not loaded. Make sure papaparse.min.js is included before load-games.js."));
            return;
        }

        Papa.parse(csvText, {
            header: true,
            skipEmptyLines: true,
            complete: (results) => {
                const rows = results.data || [];

                const games = rows
                    .filter(row => row.gametitle && row.gametitle.trim() !== "")
                    .map((row, index) => {
                        const title = (row.gametitle || "").trim();
                        const sortTitle = (row.sorttitle || title).trim();

                        return {
                            id:        (row.gameid || `row-${index}`).trim(),
                            title:     title,
                            sortTitle: sortTitle,
                            genre:     (row.genre || "").trim(),
                            videoId:   (row.videoid || "").trim(),
                            lemon:     (row.lemonlinks || "").trim(),
                            thumb:     (row.thumblink || "").trim(),
                            pdf:       (row.pdflink || "").trim(),
                            disk:      (row.disklinks || "").trim()
                        };
                    });

                CCG_GAMES_CACHE = games;
                resolve(games);
            },
            error: (err) => {
                reject(err);
            }
        });
    });
}

// Sort key helper
function ccgSortKey(game) {
    return (game.sortTitle || game.title || "").toString().toLowerCase();
}

// Render a single card (used by genre pages)
function ccgRenderCard(g) {
    const displayTitle = (g.sortTitle || g.title || "").toString();
    const videoUrl = g.videoId ? `https://www.youtube.com/watch?v=${g.videoId}` : "";
    const lemonUrl = g.lemon || "";
    const pdfUrl   = g.pdf || "";
    const diskUrl  = g.disk || "";

    const thumbHtml = g.thumb
        ? `<img src="${g.thumb}" alt="${displayTitle}" loading="lazy" />`
        : `<div class="thumb-placeholder">NO IMAGE</div>`;

    const links = [];
    if (videoUrl) links.push(`<a href="${videoUrl}" target="_blank" title="Watch gameplay"><i class="fa-brands fa-youtube"></i></a>`);
    if (lemonUrl) links.push(`<a href="${lemonUrl}" target="_blank" title="More info"><i class="fa-solid fa-circle-info"></i></a>`);
    if (pdfUrl)   links.push(`<a href="${pdfUrl}" target="_blank" title="View manual (PDF)"><i class="fa-solid fa-book"></i></a>`);
    if (diskUrl)  links.push(`<a href="${diskUrl}" target="_blank" title="Download disk"><i class="fa-solid fa-floppy-disk"></i></a>`);

    return `
        <div class="game-card">
            <div class="game-thumb">${thumbHtml}</div>
            <div class="game-title">${displayTitle}</div>
            <div class="game-genre">${g.genre || ''}</div>
            <div class="game-links">
                ${links.join("\n") || '<span class="no-links">NO LINKS YET</span>'}
            </div>
        </div>
    `;
}

// Load games for a specific genre (matches the 'genre' column, case-insensitive, exact match)
async function loadGames(genreName) {
    const container = document.getElementById("games-list");
    if (!container) return;
    container.innerHTML = '<div class="loading-msg">LOADING GAMES...</div>';

    try {
        const allGames = await ccgFetchGames();
        const targetGenre = ccgNormalise(genreName);

        const games = allGames.filter(g => ccgNormalise(g.genre) === targetGenre);

        if (!games.length) {
            container.innerHTML = '<div class="loading-msg">NO GAMES FOUND FOR THIS CATEGORY YET.</div>';
            return;
        }

        games.sort((a, b) => {
            const aKey = ccgSortKey(a);
            const bKey = ccgSortKey(b);
            if (aKey < bKey) return -1;
            if (aKey > bKey) return 1;
            return 0;
        });

        const cards = games.map(ccgRenderCard).join("\n");
        container.innerHTML = `<div class="game-grid">${cards}</div>`;

    } catch (err) {
        console.error("Error loading games:", err);
        container.innerHTML = '<div class="loading-msg">ERROR LOADING GAME DATA.</div>';
    }
}

// Load complete A–Z index into an element with id="index-list"
async function loadCompleteIndex() {
    const container = document.getElementById("index-list");
    if (!container) return;
    container.innerHTML = '<div class="loading-msg">LOADING COMPLETE INDEX...</div>';

    try {
        let games = await ccgFetchGames();
        games = games.filter(g => (g.title || g.sortTitle));

        if (!games.length) {
            container.innerHTML = '<div class="loading-msg">NO GAMES FOUND.</div>';
            return;
        }

        games.sort((a, b) => {
            const aKey = ccgSortKey(a);
            const bKey = ccgSortKey(b);
            if (aKey < bKey) return -1;
            if (aKey > bKey) return 1;
            return 0;
        });

        // Group by first letter of sortTitle/title
        const groups = {};
        for (const g of games) {
            const key = (g.sortTitle || g.title || "?").toString().trim();
            const first = key.charAt(0).toUpperCase();
            const letter = /[A-Z]/.test(first) ? first : '#';
            if (!groups[letter]) groups[letter] = [];
            groups[letter].push(g);
        }

        const letters = Object.keys(groups).sort((a, b) => {
            if (a === '#') return 1;
            if (b === '#') return -1;
            if (a < b) return -1;
            if (a > b) return 1;
            return 0;
        });

        // Build letter nav
        const nav = letters.map(l => `<a href="#letter-${l}">${l}</a>`).join(' ');
        let html = `<div class="letter-nav">${nav}</div>`;

        for (const letter of letters) {
            const items = groups[letter];
            const rowsHtml = items.map(g => {
                const displayTitle = (g.sortTitle || g.title || "").toString();
                const videoUrl = g.videoId ? `https://www.youtube.com/watch?v=${g.videoId}` : "";
                const lemonUrl = g.lemon || "";
                const pdfUrl   = g.pdf || "";
                const diskUrl  = g.disk || "";

                const links = [];
                if (videoUrl) links.push(`<a href="${videoUrl}" target="_blank" title="Watch gameplay"><i class="fa-brands fa-youtube"></i></a>`);
                if (lemonUrl) links.push(`<a href="${lemonUrl}" target="_blank" title="More info"><i class="fa-solid fa-circle-info"></i></a>`);
                if (pdfUrl)   links.push(`<a href="${pdfUrl}" target="_blank" title="View manual (PDF)"><i class="fa-solid fa-book"></i></a>`);
                if (diskUrl)  links.push(`<a href="${diskUrl}" target="_blank" title="Download disk"><i class="fa-solid fa-floppy-disk"></i></a>`);

                const genre = g.genre || '';
                return `
                    <tr>
                        <td class="col-title">${displayTitle}</td>
                        <td class="col-genre">${genre}</td>
                        <td class="col-links">${links.join("\n") || ''}</td>
                    </tr>
                `;
            }).join("\n");

            html += `
                <section class="letter-section" id="letter-${letter}">
                    <h2>${letter}</h2>
                    <table class="index-table">
                        <tbody>
                            ${rowsHtml}
                        </tbody>
                    </table>
                </section>
            `;
        }

        container.innerHTML = html;

    } catch (err) {
        console.error("Error loading complete index:", err);
        container.innerHTML = '<div class="loading-msg">ERROR LOADING COMPLETE INDEX.</div>';
    }
}
