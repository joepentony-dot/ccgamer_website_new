// js/quiz-loader.js
// Corrected to match your Apps Script backend format EXACTLY

const QUIZ_API_BASE = "https://script.google.com/macros/s/AKfycbz1hGdwwxlMfGAU2_KB4Svi6bDKz4Uq7B7Gw7ITb7MvvboHF6-3d5i4x_2RLAf2VEIDxA/exec";

async function quizApiGet(params = {}) {
    const url = new URL(QUIZ_API_BASE);

    // Add query parameters
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));

    const res = await fetch(url.toString(), {
        method: "GET",
        mode: "cors",
        headers: { "Accept": "application/json" }
    });

    const text = await res.text();

    try {
        return JSON.parse(text);
    } catch (e) {
        console.error("Bad JSON:", text);
        throw e;
    }
}

// ---------------------------------------------
// CORRECT BACKEND-COMPATIBLE CALLS
// ---------------------------------------------

// GET QUIZ SETS (backend expects ?getQuizSets=true)
async function loadQuizSets() {
    const data = await quizApiGet({ getQuizSets: "true" });
    return data.sets || [];
}

// GET QUESTIONS FOR A SET (backend expects ?set=SET_ID)
async function loadQuizQuestions(setId) {
    const data = await quizApiGet({ set: setId });
    return data.questions || [];
}

// SAVE SCORE (backend expects NAME, SCORE, SET, TOTAL)
async function saveQuizScore(p) {
    return await quizApiGet({
        action: "saveScore",
        name: p.name,
        score: p.score,
        total: p.total || p.totalQuestions || 0,
        set: p.setId
    });
}

// Track simple events (optional)
async function trackQuizEvent(type, data = {}) {
    try {
        await quizApiGet({ action: type, ...data });
    } catch (e) {
        console.warn("Event tracking failed:", type, e);
    }
}
