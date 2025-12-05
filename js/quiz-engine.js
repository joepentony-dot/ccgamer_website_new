// ====================================================================
// QUIZ ENGINE — OMEGA FX EDITION
// Handles: Questions, Flow, Score Logic, Animations, SFX, SID Bars
// ====================================================================

let quizState = {
    setId: null,
    questions: [],
    index: 0,
    score: 0,
    sfxEnabled: true
};

// -------------------------------------------------------------
// SOUND FX
// -------------------------------------------------------------
const quizSFX = {
    click: new Audio("../resources/sfx/click.wav"),
    correct: new Audio("../resources/sfx/correct.wav"),
    wrong: new Audio("../resources/sfx/wrong.wav")
};

function playSFX(type) {
    if (!quizState.sfxEnabled) return;
    let sound = quizSFX[type];
    if (sound) {
        sound.currentTime = 0;
        sound.play().catch(() => {});
    }
}

// -------------------------------------------------------------
// SFX TOGGLE BUTTON
// -------------------------------------------------------------
function initSfxToggle() {
    const btn = document.getElementById("quiz-sfx-toggle");
    if (!btn) return;

    // Load saved preference
    quizState.sfxEnabled = localStorage.getItem("quizSfx") !== "off";
    if (!quizState.sfxEnabled) btn.classList.add("muted");

    btn.addEventListener("click", () => {
        quizState.sfxEnabled = !quizState.sfxEnabled;
        localStorage.setItem("quizSfx", quizState.sfxEnabled ? "on" : "off");

        btn.classList.toggle("muted", !quizState.sfxEnabled);
        playSFX("click");
    });
}

// -------------------------------------------------------------
// INITIALISE SID BARS
// -------------------------------------------------------------
function activateSidBars() {
    const bars = document.getElementById("quiz-sid-bars");
    if (bars) bars.style.opacity = "0.25";
}

function reduceSidBars() {
    const bars = document.getElementById("quiz-sid-bars");
    if (bars) bars.style.opacity = "0.10";
}

// -------------------------------------------------------------
// RENDER QUESTION
// -------------------------------------------------------------
function renderQuestion() {
    const c = document.getElementById("quiz-container");
    const q = quizState.questions[quizState.index];
    if (!q) return;

    activateSidBars();
    playSFX("click");

    c.innerHTML = `
        <h2 class="quiz-question-title">${q.question}</h2>

        <div class="quiz-options">
            ${q.options.map((opt, i) => `
                <button class="quiz-option-btn quiz-sfx" data-idx="${i}">
                    ${opt}
                </button>
            `).join("")}
        </div>
    `;

    document.querySelectorAll(".quiz-option-btn").forEach(btn => {
        btn.addEventListener("click", () => handleAnswer(btn));
    });
}

// -------------------------------------------------------------
// ANSWER HANDLER
// -------------------------------------------------------------
function handleAnswer(btn) {
    const idx = Number(btn.dataset.idx);
    const q = quizState.questions[quizState.index];

    const correct = idx === q.answer;

    if (correct) {
        btn.classList.add("correct");
        quizState.score++;
        playSFX("correct");
    } else {
        btn.classList.add("wrong");
        playSFX("wrong");
    }

    reduceSidBars();

    // Disable other buttons
    document.querySelectorAll(".quiz-option-btn").forEach(b => b.disabled = true);

    setTimeout(nextQuestion, 900);
}

// -------------------------------------------------------------
// PROCEED TO NEXT QUESTION
// -------------------------------------------------------------
function nextQuestion() {
    quizState.index++;

    if (quizState.index >= quizState.questions.length) {
        finishQuiz();
    } else {
        renderQuestion();
    }
}

// -------------------------------------------------------------
// FINAL SCORE — ANIMATED COUNTER + CABINET DISPLAY
// -------------------------------------------------------------
function finishQuiz() {
    const container = document.getElementById("quiz-container");
    const cabinet = document.getElementById("quiz-score-cabinet");
    const animScore = document.getElementById("quiz-score-animated");

    container.innerHTML = "";
    cabinet.hidden = false;

    let current = 0;
    let target = quizState.score;

    const interval = setInterval(() => {
        current++;
        animScore.textContent = current;
        animScore.classList.add("pulse");
        setTimeout(() => animScore.classList.remove("pulse"), 120);

        if (current >= target) clearInterval(interval);
    }, 45);

    playSFX("click");

    document.getElementById("quiz-save-btn").onclick = async () => {
        const username = prompt("Enter your name for the leaderboard:");
        if (!username) return;

        await saveQuizScore({
            name: username,
            score: quizState.score,
            total: quizState.questions.length,
            setId: quizState.setId
        });

        playSFX("click");
        window.location.href = "quiz-leaderboard.html";
    };

    document.getElementById("quiz-restart-btn").onclick = () => {
        playSFX("click");
        startQuiz(quizState.setId);
    };
}

// -------------------------------------------------------------
// LOAD A QUIZ SET & START
// -------------------------------------------------------------
async function startQuiz(setId = "default") {
    quizState = {
        setId,
        index: 0,
        score: 0,
        sfxEnabled: quizState.sfxEnabled
    };

    const set = await loadQuizQuestions(setId);
    quizState.questions = set;

    document.getElementById("quiz-score-cabinet").hidden = true;
    renderQuestion();
}

// -------------------------------------------------------------
// INITIALISE PAGE
// -------------------------------------------------------------
document.addEventListener("DOMContentLoaded", async () => {
    initSfxToggle();
    activateSidBars();

    const startBtn = document.getElementById("quiz-start-btn");
    if (startBtn) {
        startBtn.addEventListener("click", () => {
            playSFX("click");
            startQuiz("default");
        });
    }
});
