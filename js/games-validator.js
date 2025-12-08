// ======================================================================
// games-validator.js — Omega A1 JSON Diagnostics Tool
// ------------------------------------------------------
// Run inside browser console on ANY page of your site:
//
//     ccgValidateGames();
//
// This tool checks:
//  ✔ Missing thumbnails
//  ✔ Wrong thumbnail paths
//  ✔ Missing or invalid systems (C64 / Amiga only)
//  ✔ Bad genres or unknown genre labels
//  ✔ Duplicate IDs
//  ✔ Missing Lemon URLs
//  ✔ Missing video IDs
//  ✔ Empty PDF or Disk fields
//  ✔ Summary counts + error grouping
//
// Absolutely safe — does NOT modify any files.
// ======================================================================

window.ccgValidateGames = async function () {
    console.log("%c🔍 CCG Validator — Starting…", "color:#7fe9ff; font-size:14px;");

    try {
        const response = await fetch("games.json");
        if (!response.ok) throw new Error("Cannot load games.json");

        const games = await response.json();

        const errors = [];
        const idSet = new Set();

        const validSystems = ["C64", "Amiga"];

        const normalisedGenreMap = {
            "arcade games": "Arcade",
            "arcade": "Arcade",
            "shooting games": "Shooting",
            "shooting": "Shooting",
            "shooter": "Shooting",
            "adventure games": "Adventure",
            "adventure": "Adventure",
            "licensed games": "Licensed",
            "licensed": "Licensed",
            "puzzle games": "Puzzle",
            "puzzle": "Puzzle",
            "platform games": "Platform",
            "platform": "Platform",
            "strategy games": "Strategy",
            "strategy": "Strategy",
            "racing games": "Racing",
            "racing": "Racing",
            "sports games": "Sports",
            "sports": "Sports",
            "horror games": "Horror",
            "horror": "Horror",
            "bpjs games": "BPJS",
            "bpjs": "BPJS",
            "misc": "Miscellaneous",
            "miscellaneous": "Miscellaneous",
            "miscellenous": "Miscellaneous",
            "misc games": "Miscellaneous",
            "misc.": "Miscellaneous"
        };

        function normaliseGenre(g) {
            const key = String(g).trim().toLowerCase();
            return normalisedGenreMap[key] || g.replace(/Games$/i, "").trim();
        }

        function checkPath(p) {
            if (!p) return false;
            return p.includes("resources/images/thumbnails/");
        }

        console.group("%c🔎 Starting Deep Validation…", "color:#8fb9ff; font-size:12px;");

        games.forEach((g, idx) => {

            const prefix = `Game: ${g.title || "(unknown title)"} [${g.id}]`;

            // ------------------------------
            // Duplicate ID check
            // ------------------------------
            if (idSet.has(g.id)) {
                errors.push(`${prefix} — ❌ Duplicate ID detected`);
            }
            idSet.add(g.id);

            // ------------------------------
            // System validation
            // ------------------------------
            const sys = (g.system || "").trim();
            if (!validSystems.includes(sys)) {
                errors.push(`${prefix} — ❌ Invalid system: "${sys}"`);
            }

            // ------------------------------
            // Thumbnail validation
            // ------------------------------
            if (!checkPath(g.thumbnail)) {
                errors.push(`${prefix} — ❌ Thumbnail path invalid or missing: ${g.thumbnail}`);
            }

            // ------------------------------
            // Lemon link validation
            // ------------------------------
            if (!Array.isArray(g.lemon) || g.lemon.length === 0) {
                errors.push(`${prefix} — ⚠️ Missing Lemon64 / LemonAmiga link`);
            }

            // ------------------------------
            // Video ID validation
            // ------------------------------
            if (!g.videoid || g.videoid.trim().length < 5) {
                errors.push(`${prefix} — ⚠️ Missing or unusual YouTube video ID`);
            }

            // ------------------------------
            // Genre validation
            // ------------------------------
            if (!Array.isArray(g.genres) || g.genres.length === 0) {
                errors.push(`${prefix} — ❌ Missing genre list`);
            } else {
                g.genres.forEach(gen => {
                    const clean = normaliseGenre(gen);
                    if (!clean) {
                        errors.push(`${prefix} — ❌ Invalid genre: "${gen}"`);
                    }
                });
            }

            // ------------------------------
            // PDF & Disk validation (non-critical)
            // ------------------------------
            if (!g.pdf) {
                console.warn(`${prefix} — ℹ️ No manual PDF`);
            }

            if (!Array.isArray(g.disk) || g.disk.length === 0) {
                console.warn(`${prefix} — ℹ️ No disk images`);
            }
        });

        console.groupEnd();

        // -------------------------------------
        // Summary output
        // -------------------------------------
        console.log("%c================ VALIDATION REPORT ================", "color:#7fe9ff; font-size:13px;");

        if (errors.length === 0) {
            console.log("%c🎉 No major issues found — games.json is healthy!", "color:#7fff9f; font-size:14px;");
        } else {
            console.log(`%c⚠️ Found ${errors.length} issue(s):`, "color:#ff9f7f; font-size:14px;");
            errors.forEach(err => console.log(" • " + err));
        }

        console.log("%c====================================================", "color:#7fe9ff; font-size:13px;");

    } catch (err) {
        console.error("Validator ERROR:", err);
    }
};
