// ======================================================================
// QUIZ ENGINE — OMEGA FX EDITION (HYBRID FAIL STYLE)
// Cheeky Commodore Gamer 😇🕹️👌
// ----------------------------------------------------------------------
// Drives the quiz flow on quiz/quiz.html
// Talks to quiz-loader.js (global helpers):
//   - loadQuizSets(cb)
//   - loadQuizQuestions(setId, cb)
//   - saveQuizScore(payload, cb)
//   - trackQuizEvent(eventName, data)
//
// Adds:
//   * Animated score counter
//   * SID-bar ambient visualiser control
//   * Web Audio SFX (no external audio files)
//   * SFX toggle with localStorage persistence
//   * Best-score-per-set storage for leaderboard highlight
//   * Omega FX classes for correct / wrong answers
//
// FIXES:
//   ✔ Sends FULL score payload (score / total / duration / percent)
//   ✔ Tracks quiz start time (old Google Sites parity)
// ======================================================================

(function () {
    "use strict";

    // --------------------------------------------------
    // STATE
    // --------------------------------------------------
    const SFX_STORAGE_KEY = "ccg_quiz_sfx_enabled";
    const BEST_SCORE_STORAGE_KEY = "ccg_quiz_best_scores";

    const quizState = {
        sets: [],
        currentSetId: null,
        questions: [],
        currentIndex: 0,
        score: 0,
        history: [],
        sfxEnabled: true,
        acceptingAnswers: false,
        currentQuestion: null,
        _startTime: 0
    };

    let audioCtx = null;
    let activeAudio = null;

    const ANSWER_REVEAL_DELAY_MS = 1600;
    const WRONG_REVEAL_FLASH_MS = 350;
    const SPEECH_RATE = 1.05;

    // --------------------------------------------------
    // UTILITIES
    // --------------------------------------------------
    function qs(sel) {
        return document.querySelector(sel);
    }

    function qsa(sel) {
        return Array.prototype.slice.call(document.querySelectorAll(sel));
    }

    function track(eventName, payload) {
        try {
            if (typeof window.trackQuizEvent === "function") {
                window.trackQuizEvent(eventName, payload || {});
            }
        } catch (_) {}
    }

    function clamp(val, min, max) {
        return Math.min(max, Math.max(min, val));
    }

    function escapeHtml(str) {
        return String(str || "").replace(/[&<>"']/g, (m) => ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            "\"": "&quot;",
            "'": "&#39;"
        }[m]));
    }

    function speakFeedback(text) {
        if (!quizState.sfxEnabled) return;
        if (!("speechSynthesis" in window)) return;
        if (!text) return;

        const utter = new SpeechSynthesisUtterance(text);
        utter.rate = SPEECH_RATE;
        utter.pitch = 1;
        utter.volume = 0.9;
        window.speechSynthesis.cancel();
        window.speechSynthesis.speak(utter);
    }

    // --------------------------------------------------
    // LOCAL STORAGE HELPERS
    // --------------------------------------------------
    function loadSfxEnabled() {
        try {
            const raw = localStorage.getItem(SFX_STORAGE_KEY);
            if (raw === null) return true;
            return raw === "true";
        } catch {
            return true;
        }
    }

    function saveSfxEnabled(flag) {
        try {
            localStorage.setItem(SFX_STORAGE_KEY, flag ? "true" : "false");
        } catch {}
    }

    function loadBestScoresMap() {
        try {
            const raw = localStorage.getItem(BEST_SCORE_STORAGE_KEY);
            if (!raw) return {};
            const parsed = JSON.parse(raw);
            return parsed && typeof parsed === "object" ? parsed : {};
        } catch {
            return {};
        }
    }

    function saveBestScore(setId, score) {
        const map = loadBestScoresMap();
        const id = String(setId);
        const existing = typeof map[id] === "number" ? map[id] : 0;

        if (score > existing) {
            map[id] = score;
            try {
                localStorage.setItem(BEST_SCORE_STORAGE_KEY, JSON.stringify(map));
            } catch {}
        }
    }

    // --------------------------------------------------
    // SID BAR VISUAL FX
    // --------------------------------------------------
    function setSidBarsIntensity(intensity) {
        const container = qs("#quiz-sid-bars");
        if (!container) return;

        const bars = container.querySelectorAll(".quiz-sid-bar");
        const safe = clamp(intensity, 0, 1);

        bars.forEach((bar, idx) => {
            const scaleY = 0.2 + safe * (1.2 + (idx % 3) * 0.15);
            bar.style.transform = `scaleY(${scaleY.toFixed(2)})`;
            bar.style.opacity = String(0.4 + safe * 0.6);
        });
    }

    function sidBarsPulseCorrect() {
        setSidBarsIntensity(1);
        setTimeout(() => setSidBarsIntensity(0.45), 220);
    }

    function sidBarsPulseWrong() {
        setSidBarsIntensity(0.9);
        setTimeout(() => setSidBarsIntensity(0.2), 260);
    }

    // --------------------------------------------------
    // WEB AUDIO SFX
    // --------------------------------------------------
    function ensureAudioContext() {
        if (audioCtx) return audioCtx;
        const Ctx = window.AudioContext || window.webkitAudioContext;
        if (!Ctx) return null;
        audioCtx = new Ctx();
        return audioCtx;
    }

    function playTone(freq, duration, type) {
        if (!quizState.sfxEnabled) return;
        const ctx = ensureAudioContext();
        if (!ctx) return;

        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = type || "square";
        osc.frequency.value = freq;

        gain.gain.setValueAtTime(0.0001, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.2, ctx.currentTime + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start();
        osc.stop(ctx.currentTime + duration + 0.02);
    }

    const playClickSfx = () => playTone(450, 0.05, "square");
    const playCorrectSfx = () => {
        playTone(620, 0.08, "square");
        setTimeout(() => playTone(840, 0.09, "triangle"), 60);
    };
    const playWrongSfx = () => {
        playTone(260, 0.08, "sawtooth");
        setTimeout(() => playTone(120, 0.12, "square"), 70);
    };
    const playScoreRevealSfx = () => {
        playTone(520, 0.08, "triangle");
        setTimeout(() => playTone(740, 0.08, "triangle"), 80);
        setTimeout(() => playTone(980, 0.1, "square"), 160);
    };

    // --------------------------------------------------
    // SFX TOGGLE
    // --------------------------------------------------
    function initSfxToggle() {
        quizState.sfxEnabled = loadSfxEnabled();
        const btn = qs("#quiz-sfx-toggle");
        if (!btn) return;

        btn.textContent = quizState.sfxEnabled ? "SFX: On" : "SFX: Off";
        btn.setAttribute("aria-pressed", quizState.sfxEnabled ? "true" : "false");

        btn.addEventListener("click", () => {
            quizState.sfxEnabled = !quizState.sfxEnabled;
            saveSfxEnabled(quizState.sfxEnabled);
            btn.textContent = quizState.sfxEnabled ? "SFX: On" : "SFX: Off";
            btn.setAttribute("aria-pressed", quizState.sfxEnabled ? "true" : "false");
            playClickSfx();
            track("sfx_toggle", { enabled: quizState.sfxEnabled });
        });
    }

    // --------------------------------------------------
    // QUIZ SETS + QUESTIONS
    // --------------------------------------------------
    function handleSetsLoaded(sets) {
        quizState.sets = Array.isArray(sets) ? sets : [];
        renderPackSelect(quizState.sets);
        updateSelectedPackLabel();
    }

    function requestQuizSets() {
        if (typeof window.loadQuizSets === "function") {
            window.loadQuizSets(handleSetsLoaded);
        }
    }

    function handleQuestionsLoaded(questions) {
        quizState.questions = Array.isArray(questions) ? questions : [];
        quizState.currentIndex = 0;
        quizState.score = 0;
        quizState.history = [];
        showQuizPanel();
        showQuestion();
    }

    function requestQuestionsForCurrentSet() {
        if (!quizState.currentSetId) return;
        window.loadQuizQuestions(quizState.currentSetId, handleQuestionsLoaded);
    }

    // --------------------------------------------------
    // PANELS
    // --------------------------------------------------
    function showIntroPanel() {
        qs("#quiz-intro-panel").hidden = false;
        qs("#quiz-panel").hidden = true;
        qs("#quiz-score-panel").hidden = true;
        setFocusMode(false);
    }

    function showQuizPanel() {
        qs("#quiz-intro-panel").hidden = true;
        qs("#quiz-panel").hidden = false;
        qs("#quiz-score-panel").hidden = true;
        setFocusMode(true);
        const panel = qs("#quiz-panel");
        if (panel && typeof panel.scrollIntoView === "function") {
            panel.scrollIntoView({ behavior: "smooth", block: "center" });
        }
    }

    function showScorePanel() {
        qs("#quiz-intro-panel").hidden = true;
        qs("#quiz-panel").hidden = true;
        qs("#quiz-score-panel").hidden = false;
        setFocusMode(false);
    }

    // --------------------------------------------------
    // QUESTIONS
    // --------------------------------------------------
    function showQuestion() {
        const q = quizState.questions[quizState.currentIndex];
        quizState.currentQuestion = q;
        quizState.acceptingAnswers = true;

        qs("#quiz-question-text").textContent = q.question || q.text || "";
        const optionsEl = qs("#quiz-options");
        const mediaEl = qs("#quiz-media");
        const statusEl = qs("#quiz-status");
        const feedbackEl = qs("#quiz-feedback");

        optionsEl.innerHTML = "";
        mediaEl.innerHTML = "";
        if (feedbackEl) {
            feedbackEl.textContent = "";
            feedbackEl.className = "quiz-feedback";
        }

        if (statusEl) {
            const total = quizState.questions.length;
            statusEl.textContent = total
                ? `Question ${quizState.currentIndex + 1} / ${total}`
                : `Question ${quizState.currentIndex + 1}`;
        }

        if (activeAudio) {
            activeAudio.pause();
            activeAudio.currentTime = 0;
            activeAudio = null;
        }

        const imageSrc = q.imageUrl || q.image || "";
        if (imageSrc) {
            const img = document.createElement("img");
            img.src = imageSrc;
            img.alt = q.gameName ? `Screenshot for ${q.gameName}` : "Quiz image";
            mediaEl.appendChild(img);
        }

        const audioSrc = q.audioUrl || q.audio || "";
        if (audioSrc) {
            const audio = document.createElement("audio");
            audio.src = audioSrc;
            audio.controls = true;
            audio.preload = "auto";
            audio.autoplay = true;
            audio.playsInline = true;
            audio.addEventListener("canplay", () => {
                audio.play().catch(() => {});
            }, { once: true });
            audio.play().catch(() => {});
            mediaEl.appendChild(audio);
            activeAudio = audio;
        }

        q.options.forEach((opt, idx) => {
            const btn = document.createElement("button");
            btn.className = "quiz-answer-btn";
            btn.textContent = opt;
            btn.dataset.index = idx;
            btn.onclick = onAnswerClick;
            optionsEl.appendChild(btn);
        });

        setSidBarsIntensity(0.4);
    }

    function onAnswerClick(e) {
        if (!quizState.acceptingAnswers) return;
        quizState.acceptingAnswers = false;

        const chosen = Number(e.currentTarget.dataset.index);
        const correct = quizState.currentQuestion.correctIndex;
        const isCorrect = chosen === correct;
        const nextScore = quizState.score + (isCorrect ? 1 : 0);
        const feedbackEl = qs("#quiz-feedback");

        const buttons = qsa(".quiz-answer-btn");
        buttons.forEach((btn) => {
            btn.disabled = true;
        });

        if (isCorrect) {
            quizState.score = nextScore;
            e.currentTarget.classList.add("quiz-answer--correct");
            e.currentTarget.classList.add("quiz-answer--highlight-correct");
            if (feedbackEl) {
                feedbackEl.textContent = "Correct!";
                feedbackEl.classList.add("quiz-feedback--correct", "is-visible");
            }
            speakFeedback("Correct");
            sidBarsPulseCorrect();
            playCorrectSfx();
        } else {
            e.currentTarget.classList.add("quiz-answer--wrong", "quiz-answer--wrong-flash");
            setTimeout(() => {
                const correctBtn = buttons[correct];
                if (correctBtn) {
                    correctBtn.classList.add("quiz-answer--correct", "quiz-answer--highlight-correct");
                }
            }, WRONG_REVEAL_FLASH_MS);
            if (feedbackEl) {
                feedbackEl.textContent = "Incorrect";
                feedbackEl.classList.add("quiz-feedback--wrong", "is-visible");
            }
            speakFeedback("Incorrect");
            sidBarsPulseWrong();
            playWrongSfx();
        }

        renderStatus();

        quizState.history.push({
            questionNumber: quizState.currentIndex + 1,
            question: quizState.currentQuestion.question || quizState.currentQuestion.text || "",
            chosenIndex: chosen,
            chosenOption: quizState.currentQuestion.options?.[chosen] || "",
            correctIndex: correct,
            correctOption: quizState.currentQuestion.options?.[correct] || "",
            isCorrect,
            scoreAfter: nextScore
        });

        setTimeout(nextQuestionOrFinish, ANSWER_REVEAL_DELAY_MS);
    }

    function nextQuestionOrFinish() {
        quizState.currentIndex++;
        quizState.currentIndex >= quizState.questions.length
            ? showFinalScore()
            : showQuestion();
    }

    function renderStatus() {
        const statusEl = qs("#quiz-status");
        if (!statusEl) return;

        const total = quizState.questions.length;
        const current = quizState.currentIndex + 1;
        const score = quizState.score;
        const totalText = total ? `${current} / ${total}` : `${current}`;
        statusEl.textContent = `Question ${totalText} • Score ${score}`;
    }

    // --------------------------------------------------
    // FINAL SCORE + SAVE
    // --------------------------------------------------
    function showFinalScore() {
        showScorePanel();

        animateScoreTo(quizState.score);
        playScoreRevealSfx();
        setSidBarsIntensity(0.6);
        renderScoreSummary();

        saveBestScore(quizState.currentSetId, quizState.score);

        track("quiz_finished", {
            setId: quizState.currentSetId,
            score: quizState.score,
            total: quizState.questions.length
        });
    }

    function renderScoreSummary() {
        const pack = quizState.sets.find((p) => String(p.id) === String(quizState.currentSetId));
        const packName = pack ? pack.name : (quizState.currentSetId ? `Pack ${quizState.currentSetId}` : "—");

        const packSummaryEl = qs("#quiz-pack-summary");
        if (packSummaryEl) packSummaryEl.textContent = packName;

        const total = quizState.questions.length;
        const correct = quizState.history.filter((h) => h.isCorrect).length;
        const accuracy = total ? Math.round((correct / total) * 100) : 0;
        const durationSec = Math.max(0, Math.round((performance.now() - quizState._startTime) / 1000));

        const summaryBindings = [
            ["[data-quiz-summary-total]", total],
            ["[data-quiz-summary-correct]", correct],
            ["[data-quiz-summary-accuracy]", `${accuracy}%`],
            ["[data-quiz-summary-duration]", `${durationSec}s`]
        ];
        summaryBindings.forEach(([sel, value]) => {
            const el = qs(sel);
            if (el) el.textContent = value;
        });

        const list = qs("#quiz-history-list");
        if (!list) return;

        list.innerHTML = "";
        if (!quizState.history.length) {
            const empty = document.createElement("li");
            empty.className = "quiz-history-empty";
            empty.textContent = "Play a round to see question-by-question progress.";
            list.appendChild(empty);
            return;
        }

        quizState.history.forEach((entry) => {
            const li = document.createElement("li");
            li.className = "quiz-history-item";
            if (entry.isCorrect) li.classList.add("quiz-history-item--correct");
            else li.classList.add("quiz-history-item--wrong");

            li.innerHTML = `
                <div class="quiz-history-top">
                    <span class="quiz-history-question">Q${entry.questionNumber}: ${escapeHtml(entry.question)}</span>
                    <span class="quiz-history-running">${entry.scoreAfter} pts</span>
                </div>
                <div class="quiz-history-answers">
                    <span class="quiz-history-choice">Your answer: ${escapeHtml(entry.chosenOption || '—')}</span>
                    <span class="quiz-history-correct">Correct: ${escapeHtml(entry.correctOption || '—')}</span>
                </div>
            `;

            list.appendChild(li);
        });
    }

    function animateScoreTo(target) {
        const el = qs("#quiz-score-animated");
        if (!el) return;

        const start = performance.now();
        const duration = 600;

        function tick(now) {
            const p = clamp((now - start) / duration, 0, 1);
            el.textContent = Math.round(target * p);
            if (p < 1) requestAnimationFrame(tick);
        }
        requestAnimationFrame(tick);
    }

    function handleSaveScore() {
        const nameInput = qs("#quiz-name-input");
        const name = (nameInput?.value || "").trim() || "Anonymous";

        const total = quizState.questions.length;
        const duration = Math.round((performance.now() - quizState._startTime) / 1000);
        const percent = total ? Math.round((quizState.score / total) * 100) : 0;

        window.saveQuizScore(
            {
                name,
                setId: quizState.currentSetId,
                score: quizState.score,
                total,
                duration,
                percent
            },
            (success) => track("score_saved", { success })
        );
    }

    // --------------------------------------------------
    // FLOW INIT
    // --------------------------------------------------
    function startQuiz() {
        if (!quizState.currentSetId) return playWrongSfx();

        quizState._startTime = performance.now();

        track("quiz_start", { setId: quizState.currentSetId });
        playClickSfx();
        requestQuestionsForCurrentSet();
    }

    function restartQuiz() {
        playClickSfx();
        quizState._startTime = performance.now();
        requestQuestionsForCurrentSet();
    }

    function quitQuiz() {
        playClickSfx();
        quizState.acceptingAnswers = false;
        quizState.currentIndex = 0;
        quizState.score = 0;
        quizState.history = [];
        quizState.questions = [];
        quizState.currentQuestion = null;
        quizState._startTime = performance.now();
        track("quiz_quit", { setId: quizState.currentSetId });
        showIntroPanel();
    }

    function initQuiz() {
        qs("#quiz-start-btn")?.addEventListener("click", startQuiz);
        qs("#quiz-quit-btn")?.addEventListener("click", quitQuiz);
        qs("#quiz-save-btn")?.addEventListener("click", () => {
            playClickSfx();
            handleSaveScore();
        });
        qs("#quiz-restart-btn")?.addEventListener("click", restartQuiz);

        requestQuizSets();
        showIntroPanel();
        setSidBarsIntensity(0.25);
    }

    function maybeRevealStartButton() {
        const startBtn = qs("#quiz-start-btn");
        if (!startBtn) return;
        const isMobile = typeof window.isMobileViewport === "function"
            ? window.isMobileViewport()
            : window.matchMedia?.("(max-width: 768px)")?.matches;
        if (!isMobile) return;
        const rect = startBtn.getBoundingClientRect();
        const inView = rect.top >= 0 && rect.bottom <= window.innerHeight;
        if (inView) return;
        const prefersReducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
        startBtn.scrollIntoView({
            behavior: prefersReducedMotion ? "auto" : "smooth",
            block: "center"
        });
    }

    // --------------------------------------------------
    // PACK SELECT UI
    // --------------------------------------------------
    function renderPackSelect(sets) {
        const container = qs("[data-quiz-pack-list]");
        if (!container) return;

        container.innerHTML = "";

        if (!sets.length) {
            const emptyBtn = document.createElement("button");
            emptyBtn.type = "button";
            emptyBtn.className = "quiz-pack-btn";
            emptyBtn.textContent = "No packs available";
            emptyBtn.disabled = true;
            container.appendChild(emptyBtn);
            return;
        }

        let defaultId = null;
        sets.forEach((set) => {
            const btn = document.createElement("button");
            btn.type = "button";
            btn.className = "quiz-pack-btn";
            btn.dataset.packId = set.id;
            const count = typeof set.questionCount === "number"
                ? set.questionCount
                : (Array.isArray(set.questions) ? set.questions.length : 0);
            btn.textContent = count ? `${set.name} (${count} Qs)` : set.name;
            btn.addEventListener("click", () => {
                quizState.currentSetId = set.id;
                setActivePackButton(set.id);
                updateSelectedPackLabel();
                playClickSfx();
                maybeRevealStartButton();
            });
            container.appendChild(btn);

            if (defaultId === null) {
                defaultId = set.id;
            }
        });

        if (defaultId !== null) {
            quizState.currentSetId = defaultId;
            setActivePackButton(defaultId);
        }
    }

    function updateSelectedPackLabel() {
        const activeId = quizState.currentSetId;
        const pack = quizState.sets.find((p) => String(p.id) === String(activeId));
        const label = (() => {
            if (!pack) return "Pick a pack to begin";
            const count = typeof pack.questionCount === "number"
                ? pack.questionCount
                : (Array.isArray(pack.questions) ? pack.questions.length : 0);
            return count ? `${pack.name} (${count} Qs)` : `${pack.name} (Live pack)`;
        })();

        qsa("[data-quiz-active-pack]").forEach((el) => {
            el.textContent = label;
        });
    }

    function setActivePackButton(setId) {
        qsa("[data-quiz-pack-list] .quiz-pack-btn").forEach((btn) => {
            btn.classList.toggle("is-active", String(btn.dataset.packId) === String(setId));
        });
    }

    function setFocusMode(active) {
        document.body.classList.toggle("quiz-focus", active);
        const overlay = qs("[data-quiz-focus-overlay]");
        if (overlay) {
            overlay.setAttribute("aria-hidden", active ? "false" : "true");
        }
    }

    // --------------------------------------------------
    // DOM READY
    // --------------------------------------------------
    document.addEventListener("DOMContentLoaded", () => {
        initSfxToggle();
        initQuiz();
    });
})();
