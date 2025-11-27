// js/quiz-loader.js
// Handles talking to your Google Apps Script quiz backend

// TODO: if you change the script URL, update here:
const QUIZ_API_BASE = "https://script.google.com/macros/s/AKfycbz1hGdwwxlMfGAU2_KB4Svi6bDKz4Uq7B7Gw7ITb7MvvboHF6-3d5i4x_2RLAf2VEIDxA/exec";

async function quizApiGet(params = {}) {
    const url = new URL(QUIZ_API_BASE);
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));

    const res = await fetch(url.toString(), {
        method: "GET",
        mode: "cors",
        headers: {
            "Accept": "application/json"
        }
    });

    if (!res.ok) {
        throw new Error("Quiz API HTTP error " + res.status);
    }

    const text = await res.text();
    try {
        return JSON.parse(text);
    } catch (e) {
        console.error("Quiz API JSON parse error:", text);
        throw e;
    }
}

async function loadQuizSets() {
    // Expected Apps Script action you already use
    return await quizApiGet({ action: "getQuizSets" });
}

async function loadQuizQuestions(setId) {
    return await quizApiGet({ action: "getQuestions", setId });
}

async function saveQuizScore(payload) {
    // You can adjust this to POST if your script expects it,
    // but many Apps Script endpoints are GET-based.
    return await quizApiGet({
        action: "saveScore",
        name: payload.name,
        score: payload.score,
        setId: payload.setId
    });
}

async function trackQuizEvent(type, data = {}) {
    const params = { action: type, ...data };
    try {
        await quizApiGet(params);
    } catch (e) {
        console.warn("Failed to track quiz event", type, e);
    }
}
