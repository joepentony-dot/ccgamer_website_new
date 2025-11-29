/* ==============================================================
   CHEEKY COMMODORE GAMER — HOMEPAGE LOADER (FINAL MAPPING)
   ============================================================== */

document.addEventListener("DOMContentLoaded", () => {
    setupPowerOn();
    loadGenres();
    loadFeaturedGames();
});

function setupPowerOn() {
    const powerOn = document.getElementById("power-on");
    const intro = document.getElementById("c64-intro");

    powerOn.addEventListener("click", () => {
        powerOn.style.display = "none";
        intro.style.display = "block";
    });
}

function loadGenres() {
    const container = document.getElementById("genre-buttons");

    const genres = [
        { name: "Arcade Games", file: "arcade.png", folder: "arcade" },
        { name: "Action Adventure Games", file: "action-adventure.png", folder: "action-adventure" },
        { name: "Adventure Games", file: "adventure.png", folder: "adventure" },
        { name: "BPJS Games", file: "bpjs.png", folder: "bpjs" },
        { name: "Cartridge Games", file: "cartridge.png", folder: "cartridge" },
        { name: "Casino Games", file: "casino.png", folder: "casino" },
        { name: "Fighting Games", file: "fighting.png", folder: "fighting" },
        { name: "Horror Games", file: "horror.png", folder: "horror" },
        { name: "Licensed Games", file: "licensed.png", folder: "licensed" },
        { name: "Platform Games", file: "platform.png", folder: "platform" },
        { name: "Puzzle Games", file: "puzzle.png", folder: "puzzle" },
        { name: "Quiz Games", file: "quiz.png", folder: "quiz" },
        { name: "Racing Games", file: "racing.png", folder: "racing" },
        { name: "Role Playing Games", file: "rpg.png", folder: "rpg" },
        { name: "Shooting Games", file: "shoot-em-up.png", folder: "shoot-em-up" },
        { name: "Sports Games", file: "sports.png", folder: "sports" },
        { name: "Strategy Games", file: "strategy.png", folder: "strategy" }
        // Top Picks is a collection, not a genre
    ];

    genres.forEach(g => {
        const btn = document.createElement("a");
        btn.className = "genre-btn";
        btn.href = `games/genres/${toSlug(g.name)}.html`;

        const img = document.createElement("img");
        img.src = `resources/images/genres/${g.file}`;
        img.alt = g.name;

        btn.appendChild(img);
        container.appendChild(btn);
    });
}

function toSlug(name) {
    return name.toLowerCase().replace(/\s+/g, '-');
}

async function loadFeaturedGames() {
    const container = document.getElementById("featured-games");

    try {
        const response = await fetch("games/games.json");
        const games = await response.json();

        const featured = games.filter(g =>
            g.genres && g.genres.includes("Top Picks")
        ).slice(0, 8);

        const list = featured.length > 0 ? featured : games.slice(0, 8);

        list.forEach(game => {
            const card = document.createElement("a");
            card.className = "featured-card";
            card.href = `games/game.html?id=${encodeURIComponent(game.id)}`;

            const img = document.createElement("img");
            img.src = game.thumbnail;
            img.alt = game.title;

            card.appendChild(img);
            container.appendChild(card);
        });

    } catch (err) {
        console.error("Featured load error:", err);
        container.textContent = "Could not load featured games.";
    }
}
