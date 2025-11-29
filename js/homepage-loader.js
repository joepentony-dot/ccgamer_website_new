/* ==============================================================
   CHEEKY COMMODORE GAMER — HOMEPAGE LOADER (FINAL VERSION)
   --------------------------------------------------------------
   • Loads homepage genre buttons
   • Loads featured games from JSON
   • Handles the “Click to Power On” intro
   • Zero styling here — full CRT/rasterbars added later
   ============================================================== */

document.addEventListener("DOMContentLoaded", () => {
    setupPowerOn();
    loadGenres();
    loadFeaturedGames();
});

/* --------------------------------------------------------------
   1. “CLICK TO POWER ON” -> “Stay a while… stay forever!”
-------------------------------------------------------------- */
function setupPowerOn() {
    const powerOn = document.getElementById("power-on");
    const intro = document.getElementById("c64-intro");

    powerOn.addEventListener("click", () => {
        powerOn.style.display = "none";
        intro.style.display = "block";

        // Future styling hooks:
        // - CRT flicker
        // - Power-on glow
        // - Rasterbars
        // - SID boot sound
    });
}

/* --------------------------------------------------------------
   2. LOAD GENRE BUTTONS (19 folders)
-------------------------------------------------------------- */
function loadGenres() {
    const container = document.getElementById("genre-buttons");

    // The 19 official genre-name-to-folder mappings
    const genres = [
        { name: "Arcade Games", folder: "Arcade Game Thumbs" },
        { name: "Action Adventure Games", folder: "Action Adventure Games" },
        { name: "Adventure Games", folder: "Adventure Games" },
        { name: "BPJS Games", folder: "BPJS Indexed Thumbs" },
        { name: "Cartridge Games", folder: "Cartridge Games" },
        { name: "Fighting Games", folder: "Fighting Game Thumbs" },
        { name: "Horror Games", folder: "Horror Game Thumbs" },
        { name: "Licensed Games", folder: "Licensed Game Thumbs" },
        { name: "Miscellaneous", folder: "Miscellaneous" },
        { name: "Platform Games", folder: "Platform Game Thumbs" },
        { name: "Puzzle Games", folder: "Puzzle Game Thumbs" },
        { name: "Quiz Games", folder: "Quiz Games" },
        { name: "Racing Games", folder: "Racing Game Thumbs" },
        { name: "Role Playing Games", folder: "Role-Playing Game Thumbs" },
        { name: "Shooting Games", folder: "Shooting Game Thumbs" },
        { name: "Sports Games", folder: "Sports Games Thumbs" },
        { name: "Strategy Games", folder: "Strategy Game Thumbs" },
        { name: "Top Picks", folder: "Top Picks" },
        { name: "Multi-Load Games", folder: "Multi-Load" } // optional
    ];

    genres.forEach(g => {
        const btn = document.createElement("a");
        btn.className = "genre-btn";
        btn.href = `games/genres/${toSlug(g.name)}.html`;

        const img = document.createElement("img");
        img.src = `resources/images/thumbnails/${g.folder}/genre.png`; 
        img.alt = g.name;

        btn.appendChild(img);
        container.appendChild(btn);
    });
}

/* Small helper for matching your genre page slugs */
function toSlug(name) {
    return name.toLowerCase().replace(/\s+/g, '-');
}

/* --------------------------------------------------------------
   3. LOAD FEATURED GAMES
-------------------------------------------------------------- */
async function loadFeaturedGames() {
    const container = document.getElementById("featured-games");

    try {
        const response = await fetch("games/games.json");
        const games = await response.json();

        // Choose 8 Top Picks (or fallback to any 8 if fewer exist)
        const featured = games.filter(g => 
            g.genres && g.genres.includes("Top Picks")
        ).slice(0, 8);

        // If no Top Picks found, fallback to random 8 games
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
        console.error("Error loading featured games:", err);
        container.textContent = "Could not load featured games.";
    }
}
