// ======================================================================
// LEADERBOARD LOADER — OMEGA ENHANCED EDITION
// Cheeky Commodore Gamer 😇🕹️👌
//
// - Reads top leaderboard scores from your Google Apps Script backend
// - Adds:
//     * Set selector (filter by quiz pack)
//     * Time-range filters (All / 7 / 30 days)
//     * "Your Best Score" highlight (based on localStorage)
//     * Neon crown & glow for Rank #1
//
// NOTE: No backend changes required. All filtering is client-side.
// ======================================================================

const LEADERBOARD_API =
    "https://script.google.com/macros/s/AKfycbwhkSGA6HcSvCljqBA91JmQVsVVUPU5LCEO1HlifB_Cjwc0DTFCK3m6hG5ZFDSgVHw9/exec";

const BEST_SCORE_STORAGE_KEY = "ccg_quiz_best_scores";

// DOM refs (assigned in renderLeaderboard)
let tableBodyEl = null;
let emptyMessageEl = null;
let setSelectEl = null;
let rangeButtonsEls = [];
let filtersWired = false;

// Data caches
let allScores = [];
let bestScoresMap = {};

// Active filters
let currentSetFilter = "all"; // "all" or specific set id
let currentRangeFilter = "all"; // "all" | "7" | "30"

// ----------------------------------------------------------------------
// STORAGE: Load best scores from localStorage
// ----------------------------------------------------------------------
function loadBestScoresFromStorage() {
    try {
        const raw = localStorage.getItem(BEST_SCORE_STORAGE_KEY);
        if (!raw) return {};
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === "object") {
            return parsed;
        }
    } catch (e) {
        console.warn("Failed to parse best scores from storage:", e);
    }
    return {};
}

// ----------------------------------------------------------------------
// BACKEND: GET SCORES (backend expects: ?action=getScores)
// ----------------------------------------------------------------------
async function loadLeaderboardScores() {
    const url = new URL(LEADERBOARD_API);
    url.searchParams.set("action", "getScores");

    const res = await fetch(url.toString(), {
        method: "GET",
        mode: "cors",
        headers: { Accept: "application/json" }
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

// ----------------------------------------------------------------------
// HELPERS
// ----------------------------------------------------------------------
function escapeHtml(str) {
    return String(str || "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}

function normaliseSetId(value) {
    // Backend may store as "set" or similar; keep it simple
    return String(value || "default");
}

function getEntrySetId(entry) {
    return normaliseSetId(entry.set || entry.setId || entry.pack);
}

function getEntryDate(entry) {
    // Try a few common properties without requiring backend changes
    const raw =
        entry.timestamp ||
        entry.date ||
        entry.createdAt ||
        entry.time;

    if (!raw) return null;

    // If looks like numeric epoch
    const asNumber = Number(raw);
    if (!Number.isNaN(asNumber) && asNumber > 1000000000) {
        const d = new Date(asNumber);
        return Number.isNaN(d.getTime()) ? null : d;
    }

    const d = new Date(raw);
    return Number.isNaN(d.getTime()) ? null : d;
}

function isWithinDays(dateObj, days) {
    if (!dateObj || !days || days <= 0) return false;
    const now = Date.now();
    const diffMs = now - dateObj.getTime();
    const maxMs = days * 24 * 60 * 60 * 1000;
    return diffMs >= 0 && diffMs <= maxMs;
}

// ----------------------------------------------------------------------
// FILTER APPLICATION
// ----------------------------------------------------------------------
function applyFiltersToScores() {
    let filtered = Array.isArray(allScores) ? [...allScores] : [];

    // Set filter
    if (currentSetFilter !== "all") {
        filtered = filtered.filter((entry) => {
            const setId = getEntrySetId(entry);
            return setId === currentSetFilter;
        });
    }

    // Time range filter
    if (currentRangeFilter === "7" || currentRangeFilter === "30") {
        const days = Number(currentRangeFilter);
        filtered = filtered.filter((entry) => {
            const d = getEntryDate(entry);
            return isWithinDays(d, days);
        });
    }

    // Sort by score desc, highest first (preserve original behaviour)
    filtered.sort((a, b) => Number(b.score) - Number(a.score));

    return filtered;
}

// ----------------------------------------------------------------------
// UI: Build set selector options
// ----------------------------------------------------------------------
function buildSetFilterOptions() {
    if (!setSelectEl) return;

    // Preserve "All packs" as the first option
    setSelectEl.innerHTML = `
        <option value="all">All packs</option>
    `;

    const uniqueSets = new Set();

    for (const entry of allScores) {
        const setId = getEntrySetId(entry);
        uniqueSets.add(setId);
    }

    const sorted = Array.from(uniqueSets).sort((a, b) =>
        a.localeCompare(b)
    );

    for (const setId of sorted) {
        const opt = document.createElement("option");
        opt.value = setId;
        opt.textContent = setId;
        setSelectEl.appendChild(opt);
    }

    // Ensure current selection is respected
    setSelectEl.value = currentSetFilter || "all";
}

// ----------------------------------------------------------------------
// UI: Wire filter controls (once)
// ----------------------------------------------------------------------
function wireFilterControlsOnce() {
    if (filtersWired) return;
    filtersWired = true;

    if (setSelectEl) {
        setSelectEl.addEventListener("change", () => {
            currentSetFilter = setSelectEl.value || "all";
            renderLeaderboardTable();
        });
    }

    if (Array.isArray(rangeButtonsEls)) {
        rangeButtonsEls.forEach((btn) => {
            btn.addEventListener("click", () => {
                const range = btn.getAttribute("data-range") || "all";
                currentRangeFilter = range;

                // Update active state
                rangeButtonsEls.forEach((b) =>
                    b.classList.toggle(
                        "lb-range-btn--active",
                        b === btn
                    )
                );

                renderLeaderboardTable();
            });
        });
    }
}

// ----------------------------------------------------------------------
// RENDER TABLE BODY
// ----------------------------------------------------------------------
function renderLeaderboardTable() {
    if (!tableBodyEl || !emptyMessageEl) return;

    tableBodyEl.innerHTML = "";
    emptyMessageEl.hidden = true;

    const scores = applyFiltersToScores();

    if (!scores.length) {
        emptyMessageEl.hidden = false;
        return;
    }

    let rank = 1;

    for (const entry of scores) {
        const setId = getEntrySetId(entry);
        const numericScore = Number(entry.score) || 0;
        const total = entry.total || "—";

        // Check if this row matches "your best" from localStorage
        let isBestForYou = false;
        const best = bestScoresMap[setId];
        if (best) {
            const bestScore = Number(best.score) || 0;
            const bestTotal = Number(best.total) || 0;
            if (
                numericScore === bestScore &&
                Number(total) === bestTotal
            ) {
                isBestForYou = true;
            }
        }

        const row = document.createElement("div");
        row.className = [
            "quiz-leaderboard-row",
            "lb-row",
            rank === 1 ? "lb-row--top" : "",
            isBestForYou ? "lb-row--best" : ""
        ]
            .filter(Boolean)
            .join(" ");

        row.innerHTML = `
            <span class="quiz-leaderboard-cell quiz-leaderboard-cell--rank lb-rank">
                ${rank}
            </span>
            <span class="quiz-leaderboard-cell quiz-leaderboard-cell--name lb-name">
                ${escapeHtml(entry.name || "Anonymous")}
            </span>
            <span class="quiz-leaderboard-cell quiz-leaderboard-cell--score lb-score">
                ${numericScore}
            </span>
            <span class="quiz-leaderboard-cell quiz-leaderboard-cell--total lb-total">
                ${total}
            </span>
            <span class="quiz-leaderboard-cell quiz-leaderboard-cell--set lb-set">
                ${escapeHtml(setId)}
            </span>
        `;

        tableBodyEl.appendChild(row);
        rank++;
    }
}

// ----------------------------------------------------------------------
// PUBLIC ENTRY POINT
// ----------------------------------------------------------------------
export async function renderLeaderboard() {
    tableBodyEl = document.getElementById("leaderboard-table-body");
    emptyMessageEl = document.getElementById("leaderboard-empty");
    setSelectEl = document.getElementById("leaderboard-set-filter");
    rangeButtonsEls = Array.from(
        document.querySelectorAll(".lb-range-btn")
    );

    if (!tableBodyEl || !emptyMessageEl) {
        console.warn("Leaderboard container or empty message not found.");
        return;
    }

    tableBodyEl.innerHTML = "";
    emptyMessageEl.hidden = true;

    try {
        allScores = await loadLeaderboardScores();
    } catch (e) {
        console.error("Failed to load scores:", e);
        emptyMessageEl.hidden = false;
        return;
    }

    if (!Array.isArray(allScores) || !allScores.length) {
        emptyMessageEl.hidden = false;
        return;
    }

    // Load local best scores map
    bestScoresMap = loadBestScoresFromStorage();

    // Build filters, wire once, then render
    buildSetFilterOptions();
    wireFilterControlsOnce();
    renderLeaderboardTable();
}
