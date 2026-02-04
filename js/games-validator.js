// ======================================================================
// CCG GAMES VALIDATOR — FINAL VERSION
// Checks for system mismatches, missing thumbnails, bad paths, broken genres
// Run manually in browser console: ccgValidateGames();
// ======================================================================

window.ccgValidateGames = async function ccgValidateGames() {
    console.log("%cCCG VALIDATOR STARTED", "color:#0ff; font-size:16px;");

    try {
        // Load games.json
        const root = window.ccgGetSiteRoot ? window.ccgGetSiteRoot() : "/";
        const url = `${root}games/games.json`;
        const response = await fetch(url);
        if (!response.ok) {
            console.error("❌ Unable to load games.json:", response.status);
            return;
        }

        const games = await response.json();
        console.log(`Loaded ${games.length} games`);

        const errors = [];

        // Allowed systems
        const SYSTEMS = ["C64", "AMIGA"];

        // Allowed genres
        const GENRES = [
            "Action-Adventure Games",
            "Adventure Games",
            "Arcade Games",
            "BPJS Games",
            "Horror Games",
            "Licensed Games",
            "Platform Games",
            "Puzzle Games",
            "Racing Games",
            "Role-Playing Games",
            "Shooting Games",
            "Sports Games",
            "Strategy Games"
        ];

        // Validate every game
        games.forEach(game => {
            const { id, title, system, genres, thumbnail } = game;

            // ----------------------------
            // SYSTEM CHECK
            // ----------------------------
            if (!SYSTEMS.includes(system)) {
                errors.push(`❌ [${id}] "${title}" has INVALID system: ${system}`);
            }

            // ----------------------------
            // GENRE CHECK
            // ----------------------------
            genres.forEach(g => {
                if (!GENRES.includes(g)) {
                    errors.push(`❌ [${id}] "${title}" has INVALID GENRE: ${g}`);
                }
            });

            // ----------------------------
            // THUMBNAIL CHECK
            // ----------------------------
            if (!thumbnail || typeof thumbnail !== "string") {
                errors.push(`❌ [${id}] "${title}" missing thumbnail`);
            } else if (!thumbnail.includes("/resources/images/thumbnails/all/")) {
                errors.push(`❌ [${id}] "${title}" thumbnail path looks wrong: ${thumbnail}`);
            }
        });

        if (errors.length === 0) {
            console.log("%c✔ ALL GOOD — No issues detected!", "color:#0f0; font-size:16px;");
        } else {
            console.log("%cVALIDATION ERRORS:", "color:#f00; font-size:18px;");
            errors.forEach(e => console.log(e));
        }

    } catch (err) {
        console.error("Validator crashed:", err);
    }
};
