// js/quiz-engine.js
// C64-style quiz frontend, wired to your Apps Script backend

let quizSets = [];
let currentSet = null;
let questions = [];
let currentIndex = 0;
let score = 0;
let answered = false;

document.addEventListener("DOMContentLoaded", () => {
    initQuizUI();
    fetchAndRenderQuizSets();
});

function $(id) {
    return document.getElementById(id);
}

function logMessage(msg) {
    const log = $("quiz-log");
    const line = document.createElement("div");
    line.textContent = msg;
    log.appendChild(line);
    log.scrollTop = log.scrollHeight;
}

// ============================
// LOAD & RENDER QUIZ SETS
// ============================
async function fetchAndRenderQuizSets() {
    const listEl = $("quiz-set-list");
    listEl.innerHTML = "<p>LOADING QUIZ SETS...</p>";

    try {
        const sets = await loadQuizSets();
        quizSets = sets;

        if (!quizSets.length) {
            listEl.innerHTML = "<p>NO QUIZ SETS AVAILABLE.</p>";
            return;
        }

        listEl.innerHTML = "";
        quizSets.forEach(set => {
            const btn = document.createElement("button");
            const icon = set.icon || "❓";
            const name = set.name || ("Set " + set.id);
            btn.textContent = `${icon}  ${name}`;
            btn.dataset.setId = set.id;

            btn.addEventListener("click", () => selectQuizSet(set, btn));
            listEl.appendChild(btn);
        });

        logMessage("QUIZ SETS LOADED.");

    } catch (e) {
        console.error(e);
        listEl.innerHTML = "<p>ERROR LOADING QUIZ SETS.</p>";
        logMessage("ERROR: COULD NOT LOAD QUIZ SETS.");
    }
}

function selectQuizSet(set, btn) {
    currentSet = set;

    // Highlight active set
    document.querySelectorAll("#quiz-set-list button").forEach(b => {
        b.classList.toggle("active", b === btn);
    });

    $("start-quiz-btn").disabled = false;
    $("quiz-meta").textContent =
        `READY: ${set.name || set.id} (${set.questionCount || "?"} QUESTIONS)`;
    logMessage("READY: " + (set.name || set.id));
}

// ============================
// UI INITIALISATION
// ============================
function initQuizUI() {
    $("start-quiz-btn").addEventListener("click", startQuiz);
    $("next-question-btn").addEventListener("click", nextQuestion);
}

// ============================
// QUIZ FLOW
// ============================
async function startQuiz() {
    if (!currentSet) return;

    try {
        $("start-quiz-btn").disabled = true;
        $("quiz-intro").style.display = "none";
        $("quiz-live").style.display = "block";
        $("quiz-status").textContent = "LOADING QUESTIONS...";

        // Optional tracking – mapped to your existing action
        try {
            await trackQuizEvent("trackGameStart", { set: currentSet.id });
        } catch (_) {}

        const data = await loadQuizQuestions(currentSet.id);

        // loader already returns data.questions || []
        questions = Array.isArray(data) ? data : (data.questions || []);
        currentIndex = 0;
        score = 0;

        if (!questions.length) {
            $("quiz-status").textContent = "NO QUESTIONS RETURNED.";
            logMessage("NO QUESTIONS FOUND FOR THIS SET.");
            $("start-quiz-btn").disabled = false;
            return;
        }

        logMessage("QUESTIONS LOADED. BEGIN!");
        showCurrentQuestion();

    } catch (e) {
        console.error(e);
        $("quiz-status").textContent = "ERROR LOADING QUESTIONS.";
        logMessage("ERROR: COULD NOT LOAD QUESTIONS.");
        $("start-quiz-btn").disabled = false;
    }
}

function showCurrentQuestion() {
    answered = false;

    const q = questions[currentIndex];
    if (!q) {
        finishQuiz();
        return;
    }

    // Backend fields: question, options[], answer (0–3), imageUrl, audioUrl, gameName
    $("quiz-question").textContent = q.question || "MISSING QUESTION TEXT";

    // Options
    const opts = Array.isArray(q.options)
        ? q.options.filter(Boolean)
        : [q.option1, q.option2, q.option3, q.option4].filter(Boolean);

    const correctIndex = (typeof q.answer === "number") ? q.answer : 0;

    const answersEl = $("quiz-answers");
    answersEl.innerHTML = "";

    opts.forEach((text, idx) => {
        const btn = document.createElement("button");
        btn.textContent = `${idx + 1}. ${text}`;
        btn.addEventListener("click", () => handleAnswer(idx, correctIndex));
        answersEl.appendChild(btn);
    });

    $("quiz-status").textContent =
        `QUESTION ${currentIndex + 1} OF ${questions.length} | SCORE: ${score}`;

    $("next-question-btn").style.display = "none";

    // (Optional) We can later add image/audio display using q.imageUrl / q.audioUrl
}

function handleAnswer(selectedIdx, correctIdx) {
    if (answered) return;
    answered = true;

    const buttons = $("quiz-answers").querySelectorAll("button");

    buttons.forEach((b, idx) => {
        if (idx === correctIdx) {
            b.classList.add("correct");
        } else if (idx === selectedIdx) {
            b.classList.add("incorrect");
        }
        b.disabled = true;
    });

    playQuizBeep();

    if (selectedIdx === correctIdx) {
        score++;
        $("quiz-status").textContent = `CORRECT! SCORE: ${score}`;
        logMessage(`Q${currentIndex + 1}: CORRECT`);
        // Optional: per-question tracking could be added later
    } else {
        $("quiz-status").textContent = `INCORRECT. SCORE: ${score}`;
        logMessage(`Q${currentIndex + 1}: INCORRECT`);
    }

    $("next-question-btn").style.display = "inline-block";
}

function nextQuestion() {
    currentIndex++;
    if (currentIndex >= questions.length) {
        finishQuiz();
    } else {
        showCurrentQuestion();
    }
}

async function finishQuiz() {
    $("quiz-status").textContent =
        `QUIZ COMPLETE. FINAL SCORE: ${score}/${questions.length}`;
    logMessage(`QUIZ COMPLETE. FINAL SCORE: ${score}/${questions.length}`);

    $("next-question-btn").style.display = "none";
    $("start-quiz-btn").disabled = false;

    const name = prompt("ENTER YOUR NAME FOR THE HIGH SCORE TABLE:", "PLAYER 1");
    if (name) {
        try {
            await saveQuizScore({
                name,
                score,
                setId: currentSet.id,
                total: questions.length
            });
            logMessage("SCORE SUBMITTED FOR " + name);
        } catch (e) {
            console.error(e);
            logMessage("FAILED TO SUBMIT SCORE.");
        }
    }
}

// ============================
// AUDIO
// ============================
function playQuizBeep() {
    const beep = $("quiz-beep");
    if (!beep) return;
    try {
        beep.currentTime = 0;
        beep.play();
    } catch (e) {
        // ignore autoplay issues
    }
}
