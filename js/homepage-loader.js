/* ==============================================================
   CHEEKY COMMODORE GAMER — HOMEPAGE LOADER (FINAL FIXED VERSION)
   ============================================================== */

document.addEventListener("DOMContentLoaded", () => {
    setupPowerOn();
    loadGenres();
    loadFeaturedGames();
});

/* --------------------------------------------------------------
   1. Power On intro
-------------------------------------------------------------- */
function setupPowerOn() {
    const powerOn = document.getElementById("power-on");
    const intro = document.getElementById("c64-intro");

    powerOn.addEventListener("click", () => {
        powerOn.style.display = "none";
        intro.style.display = "block";
    });
}

/* --------------------------------------------------------------
   2. Load Genre Buttons
-------------------------------------------------------------- */
function loadGenres() {
    const container = document.getElementById("genre-buttons");

    // MATCH YOUR REAL FOLDER STRUCTURE (genres + .png icons)
    const genres = [
        { name: "Arcade Games", file: "arcade.png" },
        { name: "Action Adventure Games", file: "action-adventure.png" },
        { name: "Adventure Games", file: "adventure.png" },
        { name: "BPJS Games", file: "bpjs.png" },
        { name: "Cartridge Games", file: "cartridge.png" },
        { name: "Fighting Games", file: "fighting.png" },
        { name: "Horror Games", file: "horror.png" },
        { name: "Licensed Games", file: "licensed.png" },
        { name: "Miscellaneous", file: "misc.png" },
        { name: "Platform Games", file: "platform.png" },
        { name: "Puzzle Games", file: "puzzle.png" },
        { name: "Quiz Games", file: "quiz.png" },
        { name: "Racing Games", file: "racing.png" },
        { name: "Role Playing Games", file: "rpg.png" },
        { name: "Shooting Games", file: "shooting.png" },
        { name: "Sports Games", file: "sports.png" },
        { name: "Strategy Games", file: "strategy.png" }
        // NOTE: No Top Picks (Top Picks is a collection, not a genre)
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

/* --------------------------------------------------------------
   3. Featured Games
--------------------------
