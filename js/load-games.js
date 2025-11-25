// Auto-generated loader for Cheeky Commodore Gamer pages
const CCG_SHEET_ID = "1kUniGNCLsTv4LaoVmcbflhi9Nnky5rCFumzKLI0IA44";
const CCG_SHEET_URL = `https://docs.google.com/spreadsheets/d/${CCG_SHEET_ID}/gviz/tq?tqx=out:json`;

// Parse Google Sheets GViz JSON into a plain array of rows
async function ccgFetchGames() {
    const response = await fetch(CCG_SHEET_URL);
    const text = await response.text();
    const jsonStart = text.indexOf('{');
    const jsonEnd = text.lastIndexOf('}') + 2;
    const jsonStr = text.substring(jsonStart, jsonEnd);
    const data = JSON.parse(jsonStr);
    return data.table.rows || [];
}

function ccgNormalise(str) {
    return (str || "").toString().trim().toUpperCase();
}

function ccgToGame(row) {
    const c = row.c || [];
    return {
        title:      (c[2] && c[2].v) || "",
        genre:      (c[3] && c[3].v) || "",
        videoId:    (c[4] && c[4].v) || "",
        lemon:      (c[5] && c[5].v) || "",
        thumb:      (c[6] && c[6].v) || "",
        pdf:        (c[7] && c[7].v) || "",
        disk:       (c[8] && c[8].v) || "",
        sortTitle:  (c[9] && c[9].v) || ""
    };
}

function ccgSortKey(game) {
    return (game.sortTitle || game.title || "").toString().toLowerCase();
}

// Load games for a specific genre or special category (matches Column D exactly, case-insensitive)
async function loadGames(genreName) {
    const container = document.getElementById("games-list");
    if (!container) return;
    container.innerHTML = '<div class="loading-msg">LOADING GAMES...</div>';

    try {
        const rows = await ccgFetchGames();
        const targetGenre = ccgNormalise(genreName);

        let games = [];
        for (const row of rows) {
            const c = row.c || [];
            const colGenre = ccgNormalise(c[3] && c[3].v);
            if (!colGenre || colGenre !== targetGenre) continue;
            games.push(ccgToGame(row));
        }

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

// Load complete A–Z index into an element with id="index-list"
async function loadCompleteIndex() {
    const container = document.getElementById("index-list");
    if (!container) return;
    container.innerHTML = '<div class="loading-msg">LOADING COMPLETE INDEX...</div>';

    try {
        const rows = await ccgFetchGames();
        let games = rows.map(ccgToGame).filter(g => (g.title || g.sortTitle));

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

        const letters = Object.keys(groups).sort((a,b) => {
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
