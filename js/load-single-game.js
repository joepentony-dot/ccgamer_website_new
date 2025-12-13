/* ============================================================
   LOAD SINGLE GAME — STABLE + URL SAFE IDS
============================================================ */

let CCG_SINGLE_ALL_GAMES = [];

document.addEventListener("DOMContentLoaded", async () => {
    const params = new URLSearchParams(window.location.search);
    const gameId = decodeURIComponent(params.get("id") || "").trim();

    if (!gameId) {
        console.error("[CCG] Missing game ID");
        return;
    }

    try {
        const res = await fetch("games.json", { cache: "no-store" });
        if (!res.ok) throw new Error("Failed to load games.json");

        const games = await res.json();
        CCG_SINGLE_ALL_GAMES = Array.isArray(games) ? games : [];

        const game = CCG_SINGLE_ALL_GAMES.find(g => String(g.id) === gameId);

        if (!game) {
            console.error(`[CCG] Game not found for id="${gameId}"`);
            return;
        }

        renderGame(game);

    } catch (err) {
        console.error("[CCG] Single game load failed:", err);
    }
});

/* --- renderer unchanged from your version --- */
/* uses resolveGameThumb(), renderRelatedGames(), etc. */
