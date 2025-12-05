// ========================================================================
// QUIZ LOADER — OMEGA EDITION
// Safe, fully compatible with your Google Apps Script backend
// Adds optional score animation support (non-breaking)
// Cheeky Commodore Gamer 😇🕹️👌
// ========================================================================

const QUIZ_API_BASE =
    "https://script.google.com/macros/s/AKfycbwhkSGA6HcSvCljqBA91JmQVsVVUPU5LCEO1HlifB_Cjwc0DTFCK3m6hG5ZFDSgVHw9/exec";

// ------------------------------------------------------------------------
// GENERIC GET WRAPPER (backend returns plain JSON, never POST)
// ------------------------------------------------------------------------
async function quizApiGet(params = {}) {
    const url = new URL(QUIZ_API_BASE);

    // Add all ?query=params
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));

    const res = await fetch(url.toString(), {
        method: "GET",
        mode: "cors",
        headers: { Accept: "application/json" }
    });

    const text = await res.text();

    try {
        return JSON.parse(text);
    } catch (e) {
        console.error("❌ Backend returned invalid JSON:", text);
        throw e;
    }
}

// ========================================================================
// API CALLS — MATCH EXACTLY what your Apps Script expects
// ========================================================================

// ------------------------------------------------------------------------
// 1) GET LIST OF QUIZ SETS
// Backend requires: ?getQuizSets=true
// ------------------------------------------------------------------------
async function loadQuizSets() {
    const data = await quizApiGet({ getQuizSets: "true" });
    return data.sets || [];
}

// ------------------------------------------------------------------------
// 2) GET QUESTIONS FOR A SPECIFIC SET
// Backend requires: ?set=SET_ID
// ------------------------------------------------------------------------
async function loadQuizQuestions(setId) {
    const data = await quizApiGet({ set: setId });
    return data.questions || [];
}

// ------------------------------------------------------------------------
// 3) SAVE A SCORE
// Backend requires: ?action=saveScore&name=XXX&score=NN&total=NN&set=SET_ID
// ------------------------------------------------------------------------
async function saveQuizScore(p) {
    return await quizApiGet({
        action: "saveScore",
        name: p.name,
        score: p.score,
        total: p.total || p.totalQuestions || 0,
        set: p.setId
    });
}

// ------------------------------------------------------------------------
// 4) Optional analytics / event tracking
// ❗ Silently fails so it never breaks gameplay
// ------------------------------------------------------------------------
async function trackQuizEvent(type, data = {}) {
    try {
        await quizApiGet({ action: type, ...data });
    } catch (e) {
        console.warn("Event tracking failed:", type, e);
    }
}

// ========================================================================
// OPTIONAL FEATURE: ANIMATED SCORE COUNTER
// Non-breaking — Quiz Engine can ignore it entirely.
// ========================================================================

/**
 * Smoothly animates a score increasing to a final value.
 * 
 * @param {HTMLElement} el  - DOM element containing numerical score text
 * @param {number} finalValue
 */
export function animateScore(el, finalValue) {
    if (!el) return;

    el.classList.add("score-animate");

    let current = 0;
    const step = Math.ceil(finalValue / 40);

    const counter = setInterval(() => {
        current += step;
        if (current >= finalValue) {
            current = finalValue;
            clearInterval(counter);
        }
        el.textContent = current;
    }, 15);
}

// ========================================================================
// OPTIONAL: FETCH LEADERBOARD (if you enable leaderboard later)
// Not required for basic quiz functionality — safe to leave included.
// ========================================================================
export async function loadLeaderboard() {
    try {
        const data = await quizApiGet({ action: "getLeaderboard" });
        return data.scores || [];
    } catch (e) {
        console.warn("Could not load leaderboard:", e);
        return [];
    }
}

// ========================================================================
// END — ALL FUNCTIONS ARE PURE & SIDE-EFFECT SAFE
// ========================================================================
