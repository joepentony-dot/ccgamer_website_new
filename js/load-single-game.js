async function loadGame() {
    const params = new URLSearchParams(window.location.search);
    const gameId = params.get("id");

    if (!gameId) {
        document.getElementById("game-content").innerHTML =
            "<p>No game ID provided.</p>";
        return;
    }

    try {
        const res = await fetch("../games.json");
        const games = await res.json();

        const game = games.find(g => String(g.id) === String(gameId));

        if (!game) {
            document.getElementById("game-content").innerHTML =
                "<p>Game not found.</p>";
            return;
        }

        renderGame(game);

    } catch (err) {
        document.getElementById("game-content").innerHTML =
            "<p>Error loading game data.</p>";
    }
}

function renderGame(g) {

    document.title = `${g.title} – CCG Game`;

    const html = `
        <div class="game-header">
            <img src="${g.thumbnail}" alt="${g.title}">
            <div>
                <h1>${g.title}</h1>

                <div class="meta">Released: ${g.year ?? "Unknown"}</div>
                <div class="meta">Developer: ${g.developer ?? "Unknown"}</div>
                <div class="meta">Composer: ${g.composer ?? "Unknown"}</div>

                <div class="links">
                    ${g.video ? `<a href="${g.video}" target="_blank">▶ Watch Video</a>` : ""}
                    ${g.disklink ? `<a href="${g.disklink}" target="_blank">💾 Download Disk Image</a>` : ""}
                    ${g.manual ? `<a href="${g.manual}" target="_blank">📘 Manual PDF</a>` : ""}
                    ${g.lemon ? `<a href="${g.lemon}" target="_blank">🍋 Lemon64 / LemonAmiga Page</a>` : ""}
                </div>
            </div>
        </div>

        <hr>

        <p>${g.description ?? "No description yet."}</p>
    `;

    document.getElementById("game-content").innerHTML = html;
}

loadGame();
