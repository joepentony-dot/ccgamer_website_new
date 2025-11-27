// js/quiz-engine.js
// Handles front-end quiz logic in C64 style

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

async function fetchAndRenderQuizSets() {
    const listEl = $("quiz-set-list");
    listEl.innerHTML = "<p>LOADING QUIZ SETS...</p>";

    try {
        const data = await loadQuizSets();
        quizSets = Array.isArray(data) ? data : (data.sets || []);

        if (!quizSets.length) {
            listEl.innerHTML = "<p>NO QUIZ SETS AVAILABLE.</p>";
            return;
        }

        listEl.innerHTML = "";
        quizSets.forEach(set => {
            const btn = document.createElement("button");
            btn.textContent = set.name || ("Set " + set.id);
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

    // Mark button active
    document.querySelectorAll("#quiz-set-list button").forEach(b => {
        b.classList.toggle("active", b === btn);
    });

    $("start-quiz-btn").disabled = false;
    $("quiz-meta").textContent = `READY: ${set.name || set.id} (${set.questionCount || "?"} QUESTIONS)`;
    logMessage("READY: " + (set.name || set.id));
}

function initQuizUI() {
    $("start-quiz-btn").addEventListener("click", startQuiz);
    $("next-question-btn").addEventListener("click", nextQuestion);
}

async function startQuiz() {
    if (!currentSet) return;

    try {
        $("start-quiz-btn").disabled = true;
        $("quiz-intro").style.display = "none";
        $("quiz-live").style.display = "block";
        $("quiz-status").textContent = "LOADING QUESTIONS...";

        await trackQuizEvent("trackQuizStart", { setId: currentSet.id });

        const data = await loadQuizQuestions(currentSet.id);
        questions = Array.isArray(data) ? data : (data.questions || []);
        currentIndex = 0;
        score = 0;

        if (!questions.length) {
            $("quiz-status").textContent = "NO QUESTIONS RETURNED.";
            logMessage("NO QUESTIONS FOUND FOR THIS SET.");
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

    $("quiz-question").textContent = q.question || "MISSING QUESTION TEXT";
    $("quiz-status").textContent = `QUESTION ${currentIndex + 1} OF ${questions.length} | SCORE: ${score}`;

    const answersEl = $("quiz-answers");
    answersEl.innerHTML = "";

    // Expecting q.options in an array; fallback if different field
    const opts = q.options || [q.option1, q.option2, q.option3, q.option4].filter(Boolean);
    const correctIndex = typeof q.correctIndex === "number" ? q.correctIndex : (q.correct || 0);

    opts.forEach((text, idx) => {
        const btn = document.createElement("button");
        btn.textContent = `${idx + 1}. ${text}`;
        btn.addEventListener("click", () => handleAnswer(idx, correctIndex, btn));
        answersEl.appendChild(btn);
    });

    $("next-question-btn").style.display = "none";
}

function handleAnswer(selectedIdx, correctIdx, btn) {
    if (answered) return;
    answered = true;

    const answersButtons = $("quiz-answers").querySelectorAll("button");

    answersButtons.forEach((b, idx) => {
        if (idx === correctIdx) {
            b.classList.add("correct");
        } else if (idx === selectedIdx) {
            b.classList.add("incorrect");
        }
        b.disabled = true;
    });

    playQuizBeep();

    const q = questions[currentIndex];

    if (selectedIdx === correctIdx) {
        score++;
        $("quiz-status").textContent = `CORRECT! SCORE: ${score}`;
        logMessage(`Q${currentIndex + 1}: CORRECT`);
        trackQuizEvent("trackQuestionAnswered", {
            setId: currentSet.id,
            qIndex: currentIndex,
            correct: true
        });
    } else {
        $("quiz-status").textContent = `INCORRECT. SCORE: ${score}`;
        logMessage(`Q${currentIndex + 1}: INCORRECT`);
        trackQuizEvent("trackQuestionAnswered", {
            setId: currentSet.id,
            qIndex: currentIndex,
            correct: false
        });
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
    $("quiz-status").textContent = `QUIZ COMPLETE. FINAL SCORE: ${score}/${questions.length}`;
    logMessage(`QUIZ COMPLETE. FINAL SCORE: ${score}/${questions.length}`);

    $("next-question-btn").style.display = "none";
    $("start-quiz-btn").disabled = false;

    // If you want to prompt for name:
    const name = prompt("ENTER YOUR NAME FOR THE HIGH SCORE TABLE:", "PLAYER 1");
    if (name) {
        try {
            await saveQuizScore({
                name,
                score,
                setId: currentSet.id
            });
            logMessage("SCORE SUBMITTED FOR " + name);
        } catch (e) {
            console.error(e);
            logMessage("FAILED TO SUBMIT SCORE.");
        }
    }
}

function playQuizBeep() {
    const beep = $("quiz-beep");
    if (!beep) return;
    try {
        beep.currentTime = 0;
        beep.play();
    } catch (e) {
        // ignore
    }
}
