// =============================================
// CCG – Frontend API Helper
// GitHub Pages → Google Apps Script backend
// =============================================

// YOUR live backend URL:
const API_BASE = "https://script.google.com/macros/s/AKfycbwhkSGA6HcSvCljqBA91JmQVsVVUPU5LCEO1HlifB_Cjwc0DTFCK3m6hG5ZFDSgVHw9/exec";

async function apiGet(params = {}) {
    const url = new URL(API_BASE);
    Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== null) url.searchParams.set(k, v);
    });
    const res = await fetch(url.toString());
    if (!res.ok) throw new Error("Network error " + res.status);
    return res.json();
}

async function apiPost(payload = {}) {
    const res = await fetch(API_BASE, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error("Network error " + res.status);
    return res.json();
}

// ===================
// QUIZ
// ===================
async function fetchQuizSets() {
    const data = await apiGet({ getQuizSets: "true" });
    return data.sets || [];
}

async function fetchQuizData(setId) {
    return apiGet({ set: setId });
}

async function saveScore(setId, name, score, total, durationMs, percent) {
    return apiPost({
        action: "saveScore",
        set: setId,
        name,
        score,
        total,
        duration: durationMs,
        percent
    });
}

// ===================
// LEADERBOARD
// ===================
async function fetchLeaderboard(setId = "true") {
    return apiGet({ getLeaderboard: setId });
}

async function fetchOverallTotals() {
    return apiGet({ getOverallTotals: "true" });
}

// ===================
// COUNTERS
// ===================
async function trackVisitor() {
    return apiPost({ action: "trackVisitor" }).catch(() => {});
}

async function trackGameStart() {
    return apiPost({ action: "trackGameStart" }).catch(() => {});
}

async function fetchCounters() {
    return apiGet({ getCounters: "true" });
}

// ===================
// CONTACT FORM
// ===================
async function sendContactForm({ name, email, topics, message }) {
    return apiPost({
        action: "sendEmail",
        name,
        email,
        topics,
        message
    });
}
