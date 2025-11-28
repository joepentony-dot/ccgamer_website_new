// =====================================================
// CCG GAME PAGE LOADER – Adds PDF, Lemon64, Disk links
// =====================================================

document.addEventListener("DOMContentLoaded", () => {
    if (window.location.pathname.includes("game.html")) {
        loadSingleGame();
    }
});

async function loadSingleGame() {
    const params = new URLSearchParams(window.location.search);
    const gameId = params.get("id");

    const container = document.getElementById("game-content");

    try {
        const response = await fetch("../games.json");
        const games = await response.json();

        const game = games.find(g => g.id === gameId);

        if (!game) {
            container.innerHTML = "<p>Game not found.</p>";
            return;
        }

        container.innerHTML = `
            <div class="game-header">
                <img class="game-thumb" src="${game.thumbnail}" alt="${game.title}">
                <div class="game-info">
                    <h1>${game.title}</h1>
                    <p><strong>Year:</strong> ${game.year || "Unknown"}</p>
                    <p><strong>Developer:</strong> ${game.developer || "Unknown"}</p>
                    <p><strong>Composer:</strong> ${game.composer || "Unknown"}</p>
                </div>
            </div>

            <div class="links-section">
                <h2>Downloads & Extras</h2>

                ${game.pdf ? `<a href="${game.pdf}" target="_blank">📘 Download Manual (PDF)</a>` : ``}

                ${game.disklink ? `<a href="${game.disklink}" target="_blank">💾 Download Game Disk</a>` : ``}

                ${game.lemonlink ? `<a href="${game.lemonlink}" target="_blank">🍋 View on Lemon64</a>` : ``}
            </div>
        `;
    }
    catch (err) {
        container.innerHTML = "<p>Error loading game data.</p>";
        console.error(err);
    }
}
