// ======================================================================
// QUIZ ENGINE — OMEGA FX EDITION
// Cheeky Commodore Gamer 😇🕹️👌
// ----------------------------------------------------------------------
// - Drives the quiz flow on quiz/quiz.html
// - Talks to quiz-loader.js (loadQuizSets, loadQuizQuestions, saveQuizScore, trackQuizEvent)
// - Adds:
//     * Animated score counter
//     * SID-wave ambient bar intensity control
//     * Button SFX with toggle (no external audio files required)
// ======================================================================

(function () {
    "use strict";

    // --------------------------------------------------
    // STATE
    // --------------------------------------------------
    const SFX_STORAGE_KEY = "ccg_quiz_sfx_enabled";

    const quizState = {
        sets: [],
        currentSetId: null,
        questions: [],
        currentIndex: 0,
        score: 0,
        sfxEnabled: true
    };

    let audioCtx = null;

    // --------------------------------------------------
    // UTILITIES
    // --------------------------------------------------
    const $ = (id) => document.getElementById(id);

    function escapeHtml(str) {
        if (typeof str !== "string") return "";
        return str
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#39;");
    }

    function safeTrack(eventType, data) {
        try {
            if (typeof trackQuizEvent === "function") {
                trackQuizEvent(eventType, data || {});
            }
        } catch (e) {
            // tracking must never break the quiz
            console.warn("quiz track error:", e);
        }
    }

    // --------------------------------------------------
    // SID BAR INTENSITY (FX only)
    // --------------------------------------------------
    function setSidBarsIntensity(opacity) {
        const bars = $("quiz-sid-bars");
        if (!bars) return;
        bars.style.opacity = String(opacity);
    }

    // --------------------------------------------------
    // SOUND FX (Web Audio — no external files required)
    // --------------------------------------------------
    function ensureAudioContext() {
        if (audioCtx) return audioCtx;
        const Ctx = window.AudioContext || window.webkitAudioContext;
        if (!Ctx) return null;
        audioCtx = new Ctx();
        return audioCtx;
    }

    function playBeep(kind) {
        if (!quizState.sfxEnabled) return;

        const ctx = ensureAudioContext();
        if (!ctx) return;

        try {
            const now = ctx.currentTime;
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();

            let freq = 660; // default click
            if (kind === "correct") freq = 1200;
            else if (kind === "wrong") freq = 240;

            osc.type = "square";
            osc.frequency.setValueAtTime(freq, now);

            gain.gain.setValueAtTime(0.001, now);
            gain.gain.exponentialRampToValueAtTime(0.3, now + 0.02);
            gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.18);

            osc.connect(gain);
            gain.connect(ctx.destination);

            osc.start(now);
            osc.stop(now + 0.22);
        } catch (e) {
            // ignore audio issues
        }
    }

    // --------------------------------------------------
    // SFX TOGGLE
    // --------------------------------------------------
    function initSfxToggle() {
        const btn = $("quiz-sfx-toggle");
        if (!btn) return;

        // Load saved preference
        const stored = localStorage.getItem(SFX_STORAGE_KEY);
        quizState.sfxEnabled = stored !== "off";

        if (!quizState.sfxEnabled) {
            btn.classList.add("muted");
        }

        btn.addEventListener("click", () => {
            quizState.sfxEnabled = !quizState.sfxEnabled;
            localStorage.setItem(
                SFX_STORAGE_KEY,
                quizState.sfxEnabled ? "on" : "off"
            );
            btn.classList.toggle("muted", !quizState.sfxEnabled);
            playBeep("click");
        });
    }

    // --------------------------------------------------
    // QUIZ INITIALISATION
    // --------------------------------------------------
    async function initQuiz() {
        // Pre-load quiz sets if backend supports them
        try {
            if (typeof loadQuizSets === "function") {
                const sets = await loadQuizSets();
                if (Array.isArray(sets)) {
                    quizState.sets = sets;
                }
            }
        } catch (e) {
            console.warn("Failed to load quiz sets:", e);
        }

        // Start button
        const startBtn = $("quiz-start-btn");
        if (startBtn) {
            startBtn.addEventListener("click", () => {
                playBeep("click");
                startQuiz();
            });
        }
    }

    function getDefaultSetId() {
        if (quizState.currentSetId) return quizState.currentSetId;

        if (Array.isArray(quizState.sets) && quizState.sets.length > 0) {
            const first = quizState.sets[0];
            return first.id || first.set || "default";
        }

        return "default";
    }

    // --------------------------------------------------
    // QUIZ FLOW
    // --------------------------------------------------
    async function startQuiz() {
        quizState.currentIndex = 0;
        quizState.score = 0;
        quizState.currentSetId = getDefaultSetId();
        setSidBarsIntensity(0.25);

        const container = $("quiz-container");
        const cabinet = $("quiz-score-cabinet");

        if (cabinet) {
            cabinet.hidden = true;
        }
        if (container) {
            container.innerHTML =
                '<p class="quiz-status">Loading questions…</p>';
        }

        safeTrack("quizStart", { set: quizState.currentSetId });

        try {
            let qs = [];
            if (typeof loadQuizQuestions === "function") {
                qs = await loadQuizQuestions(quizState.currentSetId);
            }
            quizState.questions = Array.isArray(qs) ? qs : [];
        } catch (e) {
            console.error("Failed to load questions:", e);
            quizState.questions = [];
        }

        if (!quizState.questions.length) {
            if (container) {
                container.innerHTML =
                    '<p class="quiz-status">No questions available for this quiz set yet.</p>';
            }
            return;
        }

        renderQuestion();
    }

    function renderQuestion() {
        const container = $("quiz-container");
        if (!container) return;

        if (
            !Array.isArray(quizState.questions) ||
            quizState.currentIndex >= quizState.questions.length
        ) {
            finishQuiz();
            return;
        }

        const q = quizState.questions[quizState.currentIndex];
        const qText = escapeHtml(q.question || "");
        const options = Array.isArray(q.options) ? q.options : [];

        setSidBarsIntensity(0.35);

        container.innerHTML = `
            <div class="quiz-question-block">
                <h2 class="quiz-question-title">
                    Q${quizState.currentIndex + 1}. ${qText}
                </h2>
                <div class="quiz-options">
                    ${options
                        .map(
                            (opt, idx) => `
                        <button class="quiz-option-btn"
                                data-index="${idx}">
                            ${escapeHtml(String(opt))}
                        </button>`
                        )
                        .join("")}
                </div>
            </div>
        `;

        const buttons = container.querySelectorAll(".quiz-option-btn");
        buttons.forEach((btn) => {
            btn.addEventListener("click", () =>
                handleAnswerClick(btn, q)
            );
        });
    }

    function handleAnswerClick(btn, question) {
        const container = $("quiz-container");
        if (!container) return;

        const indexAttr = btn.getAttribute("data-index");
        const chosenIndex = Number(indexAttr);
        const correctIndex = Number(question.answer);

        const allButtons = container.querySelectorAll(".quiz-option-btn");
        allButtons.forEach((b) => (b.disabled = true));

        if (chosenIndex === correctIndex) {
            quizState.score++;
            btn.classList.add("correct");
            playBeep("correct");
        } else {
            btn.classList.add("wrong");
            playBeep("wrong");

            // Highlight correct answer if available
            allButtons.forEach((b) => {
                const idx = Number(b.getAttribute("data-index"));
                if (idx === correctIndex) {
                    b.classList.add("correct");
                }
            });
        }

        setSidBarsIntensity(0.2);

        setTimeout(() => {
            quizState.currentIndex += 1;
            renderQuestion();
        }, 900);
    }

    // --------------------------------------------------
    // FINISH + SCORE CABINET
    // --------------------------------------------------
    function finishQuiz() {
        const container = $("quiz-container");
        const cabinet = $("quiz-score-cabinet");
        const animScore = $("quiz-score-animated");

        setSidBarsIntensity(0.1);
        safeTrack("quizComplete", {
            set: quizState.currentSetId,
            score: quizState.score,
            total: quizState.questions.length
        });

        if (container) {
            container.innerHTML = "";
        }
        if (!cabinet || !animScore) return;

        cabinet.hidden = false;

        // Animated score counter
        let current = 0;
        const finalScore = quizState.score;
        animScore.textContent = "0";

        const step = Math.max(1, Math.ceil(finalScore / 40));
        const timer = setInterval(() => {
            current += step;
            if (current >= finalScore) {
                current = finalScore;
                clearInterval(timer);
            }
            animScore.textContent = String(current);
            animScore.classList.add("pulse");
            setTimeout(() => animScore.classList.remove("pulse"), 120);
        }, 45);

        // Wire buttons
        const saveBtn = $("quiz-save-btn");
        const restartBtn = $("quiz-restart-btn");

        if (saveBtn) {
            saveBtn.onclick = async () => {
                playBeep("click");
                const name = window.prompt(
                    "Enter your name for the leaderboard:"
                );
                if (!name) return;

                try {
                    if (typeof saveQuizScore === "function") {
                        await saveQuizScore({
                            name,
                            score: quizState.score,
                            total: quizState.questions.length,
                            setId: quizState.currentSetId
                        });
                    }
                    safeTrack("quizScoreSaved", {
                        set: quizState.currentSetId,
                        score: quizState.score
                    });
                    window.location.href = "quiz-leaderboard.html";
                } catch (e) {
                    console.error("Failed to save score:", e);
                    window.alert(
                        "Score could not be saved just now. Please try again later."
                    );
                }
            };
        }

        if (restartBtn) {
            restartBtn.onclick = () => {
                playBeep("click");
                startQuiz();
            };
        }
    }

    // --------------------------------------------------
    // DOM READY
    // --------------------------------------------------
    document.addEventListener("DOMContentLoaded", () => {
        initSfxToggle();
        initQuiz();
        setSidBarsIntensity(0.25);
    });
})();
