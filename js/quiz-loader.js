// =============================================================
// quiz-loader.js — OMEGA EDITION
// Backend-accurate loader for Quiz Sets, Questions & Scores
// Fully compatible with Apps Script endpoint & quiz-engine.js
// =============================================================

const QUIZ_API_BASE =
    "https://script.google.com/macros/s/AKfycbwhkSGA6HcSvCljqBA91JmQVsVVUPU5LCEO1HlifB_Cjwc0DTFCK3m6hG5ZFDSgVHw9/exec";

// -------------------------------------------------------------
// UNIVERSAL FETCH WRAPPER
// -------------------------------------------------------------
async function quizApiGet(params = {}) {
    const url = new URL(QUIZ_API_BASE);

    // Add query parameters required by your backend
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));

    const res = await fetch(url.toString(), {
        method: "GET",
        mode: "cors",
        headers: { "Accept": "application/json" }
    });

    const raw = await res.text();

    try {
        return JSON.parse(raw);
    } catch (e) {
        console.error("❌ Bad JSON from backend:", raw);
        throw e;
    }
}

// -------------------------------------------------------------
// 1) LOAD QUIZ SETS
// Backend expects: ?getQuizSets=true
// -------------------------------------------------------------
async function loadQuizSets() {
    const data = await quizApiGet({ getQuizSets: "true" });
    return data.sets || [];
}

// -------------------------------------------------------------
// 2) LOAD QUESTIONS FOR A SET
// Backend expects: ?set=SET_ID
// -------------------------------------------------------------
async function loadQuizQuestions(setId) {
    const data = await quizApiGet({ set: setId });
    return data.questions || [];
}

// -------------------------------------------------------------
// 3) SAVE SCORE TO LEADERBOARD
// Backend expects: action=saveScore & NAME & SCORE & SET & TOTAL
// -------------------------------------------------------------
async function saveQuizScore({ name, score, total, setId }) {
    return await quizApiGet({
        action: "saveScore",
        name,
        score,
        total,
        set: setId
    });
}

// -------------------------------------------------------------
// 4) OPTIONAL EVENT TRACKING (non-breaking)
// -------------------------------------------------------------
async function trackQuizEvent(type, data = {}) {
    try {
        await quizApiGet({ action: type, ...data });
    } catch (e) {
        console.warn("⚠ Event tracking failed:", type, e);
    }
}
