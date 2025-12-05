// ======================================================================
// LEADERBOARD LOADER — OMEGA EDITION
// Cheeky Commodore Gamer 😇🕹️👌
// Reads top leaderboard scores from your Google Apps Script backend
// WITHOUT modifying anything server-side.
// ======================================================================

const LEADERBOARD_API = "https://script.google.com/macros/s/AKfycbwhkSGA6HcSvCljqBA91JmQVsVVUPU5LCEO1HlifB_Cjwc0DTFCK3m6hG5ZFDSgVHw9/exec";

// GET SCORES (backend expects: ?action=getScores)
async function loadLeaderboardScores() {
    const url = new URL(LEADERBOARD_API);
    url.searchParams.set("action", "getScores");

    const res = await fetch(url.toString(), {
        method: "GET",
        mode: "cors",
        headers: { "Accept": "application/json" }
    });

    const text = await res.text();
    let data;

    try {
        data = JSON.parse(text);
    } catch (e) {
        console.error("Leaderboard JSON error:", text);
        return [];
    }

    return data.scores || [];
}

// Render to table
export async function renderLeaderboard() {
    const container = document.getElementById("leaderboard-table-body");
    const emptyMsg = document.getElementById("leaderboard-empty");

    if (!container) {
        console.warn("Leaderboard container not found.");
        return;
    }

    container.innerHTML = "";
    emptyMsg.hidden = true;

    let scores = [];

    try {
        scores = await loadLeaderboardScores();
    } catch (e) {
        console.error("Failed to load scores:", e);
        emptyMsg.hidden = false;
        return;
    }

    if (!scores.length) {
        emptyMsg.hidden = false;
        return;
    }

    // Sort by score desc, highest first
    scores.sort((a, b) => Number(b.score) - Number(a.score));

    let rank = 1;

    for (const entry of scores) {
        const tr = document.createElement("tr");
        tr.className = "lb-row";

        tr.innerHTML = `
            <td class="lb-rank neon-rank-${rank <= 3 ? rank : "std"}">${rank}</td>
            <td class="lb-name">${escapeHtml(entry.name || "Anonymous")}</td>
            <td class="lb-score">${entry.score}</td>
            <td class="lb-total">${entry.total || "—"}</td>
            <td class="lb-set">${escapeHtml(entry.set || "default")}</td>
        `;

        container.appendChild(tr);
        rank++;
    }
}

// HTML escaping for safety
function escapeHtml(str) {
    return String(str || "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}
