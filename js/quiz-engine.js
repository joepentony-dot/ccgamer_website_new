// ======================================================================
// QUIZ ENGINE — OMEGA FX EDITION
// Smooth scoring, neon effects, SID-wave ambience, SFX toggle
// ======================================================================

import {
    loadQuizSets,
    loadQuizQuestions,
    saveQuizScore,
    trackQuizEvent
} from "./quiz-loader.js";

// =============================================================
// AUDIO FX
// =============================================================
const QUIZ_SFX_ENABLED_KEY = "quiz_sfx_enabled";

let quizClickSound = new Audio("../resources/sfx/click1.mp3");
quizClickSound.volume = 0.45;

function playSfx() {
    if (localStorage.getItem(QUIZ_SFX_ENABLED_KEY) === "true") {
        quizClickSound.currentTime = 0;
        quizClickSound.play().catch(() => {});
    }
}

export function toggleSfxSetting() {
    const current = localStorage.getItem(QUIZ_SFX_ENABLED_KEY) === "true";
    localStorage.setItem(QUIZ_SFX_ENABLED_KEY, (!current).toString());
    return !current;
}

// =============================================================
// ANIMATED SCORE COUNTER
// =============================================================
function animateScore(el, value) {
    let current = 0;
    const step = Math.ceil(value / 40);

    const timer = setInterval(() => {
        current += step;
        if (current >= value) {
            current = value;
            clearInterval(timer);
        }
        el.textContent = current;
    }, 20);
}

// =============================================================
// STATE
// =============================================================
let currentSet = null;
let currentQuestions = [];
let currentIndex = 0;
let score = 0;

// =============================================================
// INITIAL LOAD — QUIZ SET LIST
// =============================================================
document.addEventListener("DOMContentLoaded", async () => {
    await buildQuizSetList();

    // Initialise SFX toggle button
    const sfxBtn = document.getElementById("quiz-sfx-toggle");
    if (sfxBtn) {
        sfxBtn.textContent =
            localStorage.getItem(QUIZ_SFX_ENABLED_KEY) === "true"
                ? "SFX: ON"
                : "SFX: OFF";
        sfxBtn.onclick = () => {
            playSfx();
            const isOn = toggleSfxSetting();
            sfxBtn.textContent = isOn ? "SFX: ON" : "SFX: OFF";
        };
    }
});

async function buildQuizSetList() {
    const container = document.getElementById("quiz-set-list");
    if (!container) return;

    const sets = await loadQuizSets();
    container.innerHTML = "";

    sets.forEach(set => {
        const btn = document.createElement("button");
        btn.className = "quiz-set-btn";
        btn.textContent = set.title;
        btn.onclick = () => {
            playSfx();
            startQuiz(set.id);
        };
        container.appendChild(btn);
    });
}

// =============================================================
// QUIZ FLOW
// =============================================================
async function startQuiz(setId) {
    playSfx();
    currentSet = setId;
    currentIndex = 0;
    score = 0;

    currentQuestions = await loadQuizQuestions(setId);

    document.getElementById("quiz-intro").hidden = true;
    document.getElementById("quiz-run").hidden = false;
    document.getElementById("quiz-results").hidden = true;

    showQuestion();
}

// Show question
function showQuestion() {
    const q = currentQuestions[currentIndex];
    if (!q) return endQuiz();

    const qText = document.getElementById("quiz-question-text");
    const qOptions = document.getElementById("quiz-options");

    qText.textContent = q.question;
    qOptions.innerHTML = "";

    q.options.forEach((opt, i) => {
        const btn = document.createElement("button");
        btn.className = "quiz-option-btn";
        btn.textContent = opt;

        btn.onclick = () => {
            playSfx();
            if (i === q.answer) score++;

            currentIndex++;
            showQuestion();
        };

        qOptions.appendChild(btn);
    });
}

// End quiz
async function endQuiz() {
    playSfx();

    document.getElementById("quiz-run").hidden = true;
    document.getElementById("quiz-results").hidden = false;

    const scoreEl = document.getElementById("quiz-final-score");
    animateScore(scoreEl, score);

    const totalEl = document.getElementById("quiz-final-total");
    totalEl.textContent = currentQuestions.length.toString();

    // Save score
    await saveQuizScore({
        name: "Anonymous",
        score,
        total: currentQuestions.length,
        setId: currentSet
    });

    buildLeaderboard();
}

// =============================================================
// LEADERBOARD
// =============================================================
async function buildLeaderboard() {
    const container = document.getElementById("quiz-leaderboard");
    if (!container) return;

    const data = await fetch("../js/leaderboard.json").then(r => r.json());
    container.innerHTML = "";

    data.scores.slice(0, 15).forEach(entry => {
        const row = document.createElement("div");
        row.className = "board-row";

        row.innerHTML = `
            <span class="board-name">${entry.name}</span>
            <span class="board-score">${entry.score}</span>
        `;

        container.appendChild(row);
    });
}
