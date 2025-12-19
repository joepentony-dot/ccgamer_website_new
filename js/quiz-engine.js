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
        sfxEnabled: true,
        acceptingAnswers: false,
        currentQuestion: null
    };

    let audioCtx = null;

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
        } catch (e) {
            // silent
        }
    }

    function clamp(val, min, max) {
        return Math.min(max, Math.max(min, val));
    }

    // --------------------------------------------------
    // LOCAL STORAGE HELPERS
    // --------------------------------------------------
    function loadSfxEnabled() {
        try {
            const raw = localStorage.getItem(SFX_STORAGE_KEY);
            if (raw === null) return true; // default ON
            return raw === "true";
        } catch (e) {
            return true;
        }
    }

    function saveSfxEnabled(flag) {
        try {
            localStorage.setItem(SFX_STORAGE_KEY, flag ? "true" : "false");
        } catch (e) {
            // ignore
        }
    }

    function loadBestScoresMap() {
        try {
            const raw = localStorage.getItem(BEST_SCORE_STORAGE_KEY);
            if (!raw) return {};
            const parsed = JSON.parse(raw);
            if (parsed && typeof parsed === "object") {
                return parsed;
            }
            return {};
        } catch (e) {
            return {};
        }
    }

    function saveBestScore(setId, score) {
        const safeSetId = String(setId);
        let map = loadBestScoresMap();
        const existing = typeof map[safeSetId] === "number" ? map[safeSetId] : 0;

        if (score > existing) {
            map[safeSetId] = score;
            try {
                localStorage.setItem(BEST_SCORE_STORAGE_KEY, JSON.stringify(map));
            } catch (e) {
                // ignore
            }
        }
    }

    function getBestScore(setId) {
        const map = loadBestScoresMap();
        return typeof map[String(setId)] === "number" ? map[String(setId)] : 0;
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
            bar.style.transform = "scaleY(" + scaleY.toFixed(2) + ")";
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

    function playTone(frequency, duration, type) {
        if (!quizState.sfxEnabled) return;
        const ctx = ensureAudioContext();
        if (!ctx) return;

        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = type || "square";
        osc.frequency.value = frequency;

        gain.gain.setValueAtTime(0.0001, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.2, ctx.currentTime + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start();
        osc.stop(ctx.currentTime + duration + 0.02);
    }

    function playClickSfx() {
        playTone(450, 0.05, "square");
    }

    function playCorrectSfx() {
        // gentle ascending chirp
        playTone(620, 0.08, "square");
        setTimeout(() => playTone(840, 0.09, "triangle"), 60);
    }

    function playWrongSfx() {
        // descending buzz
        playTone(260, 0.08, "sawtooth");
        setTimeout(() => playTone(120, 0.12, "square"), 70);
    }

    function playScoreRevealSfx() {
        playTone(520, 0.08, "triangle");
        setTimeout(() => playTone(740, 0.08, "triangle"), 80);
        setTimeout(() => playTone(980, 0.1, "square"), 160);
    }

    // --------------------------------------------------
    // SFX TOGGLE UI
    // --------------------------------------------------
    function updateSfxToggleButton() {
        const btn = qs("#quiz-sfx-toggle");
        if (!btn) return;
        btn.setAttribute("aria-pressed", quizState.sfxEnabled ? "true" : "false");
        btn.textContent = quizState.sfxEnabled ? "SFX: On" : "SFX: Off";
    }

    function initSfxToggle() {
        quizState.sfxEnabled = loadSfxEnabled();
        updateSfxToggleButton();

        const btn = qs("#quiz-sfx-toggle");
        if (!btn) return;
        btn.addEventListener("click", () => {
            quizState.sfxEnabled = !quizState.sfxEnabled;
            saveSfxEnabled(quizState.sfxEnabled);
            updateSfxToggleButton();
            playClickSfx();
            track("sfx_toggle", { enabled: quizState.sfxEnabled });
        });
    }

    // --------------------------------------------------
    // QUIZ SET + QUESTIONS
    // --------------------------------------------------
    function populatePackSelect(sets) {
        const select = qs("#quiz-pack-select");
        if (!select) return;

        select.innerHTML = "";
        bindPackSelectChange();

        if (!Array.isArray(sets) || sets.length === 0) {
            const opt = document.createElement("option");
            opt.value = "";
            opt.textContent = "No quiz packs available";
            select.appendChild(opt);
            select.disabled = true;
            return;
        }

        const defaultOpt = document.createElement("option");
        defaultOpt.value = "";
        defaultOpt.textContent = "Select a quiz pack…";
        select.appendChild(defaultOpt);

        sets.forEach((set) => {
            const opt = document.createElement("option");
            opt.value = set.id || set.ID || set.slug || "";
            opt.textContent = set.name || set.title || "Untitled Pack";
            if (quizState.currentSetId && String(quizState.currentSetId) === String(opt.value)) {
                opt.selected = true;
            }
            select.appendChild(opt);
        });

        renderActivePackLabelFromId(select.value || null);
    }

    function renderActivePackLabelFromId(setId) {
        const labels = qsa('[data-quiz-active-pack]');
        const pack = quizState.sets.find((s) => String(s.id || s.ID || s.slug) === String(setId));

        const labelText = pack
            ? `${pack.name || pack.title || "Quiz Pack"} (${pack.questionCount || (pack.questions ? pack.questions.length : 0)} Qs)`
            : "Pick a pack to begin";

        labels.forEach((label) => {
            label.textContent = labelText;
        });
    }

    function bindPackSelectChange() {
        const select = qs("#quiz-pack-select");
        if (!select || select.dataset.boundChange === "true") return;

        select.addEventListener("change", () => {
            quizState.currentSetId = select.value || null;
            renderActivePackLabelFromId(quizState.currentSetId);
        });

        select.dataset.boundChange = "true";
    }

    function handleSetsLoaded(sets) {
        quizState.sets = Array.isArray(sets) ? sets : [];
        populatePackSelect(quizState.sets);
    }

    function requestQuizSets() {
        if (typeof window.loadQuizSets === "function") {
            window.loadQuizSets(handleSetsLoaded);
        }
    }

    // --------------------------------------------------
    // QUESTION NORMALISATION
    // --------------------------------------------------
    function normaliseQuestion(raw) {
        if (!raw) return null;

        const questionText =
            raw.question ||
            raw.Question ||
            raw.QuestionText ||
            raw.q ||
            "";

        let options = [];
        if (Array.isArray(raw.options)) {
            options = raw.options.slice();
        } else {
            const maybe = [];
            if (raw.Option1 !== undefined) maybe.push(raw.Option1);
            if (raw.Option2 !== undefined) maybe.push(raw.Option2);
            if (raw.Option3 !== undefined) maybe.push(raw.Option3);
            if (raw.Option4 !== undefined) maybe.push(raw.Option4);
            if (maybe.length) options = maybe;
        }

        // derive correct index
        let correctIndex = 0;
        if (typeof raw.correctIndex === "number") {
            correctIndex = raw.correctIndex;
        } else if (typeof raw.correctOption === "number") {
            correctIndex = raw.correctOption;
        } else if (raw.CorrectOption !== undefined && raw.CorrectOption !== null) {
            const idx = parseInt(raw.CorrectOption, 10);
            if (!isNaN(idx)) correctIndex = idx;
        }

        correctIndex = clamp(correctIndex, 0, options.length ? options.length - 1 : 0);

        return {
            id: raw.id || raw.ID || raw.rowId || null,
            raw,
            text: questionText,
            options,
            correctIndex
        };
    }

    function shuffle(arr) {
        return arr
            .map((item) => ({ sort: Math.random(), value: item }))
            .sort((a, b) => a.sort - b.sort)
            .map((entry) => entry.value);
    }

    function handleQuestionsLoaded(rawQuestions) {
        const normalised = (Array.isArray(rawQuestions) ? rawQuestions : [])
            .map(normaliseQuestion)
            .filter(Boolean);

        quizState.questions = shuffle(normalised);
        quizState.currentIndex = 0;
        quizState.score = 0;
        quizState.currentQuestion = null;

        if (!quizState.questions.length) {
            const qText = qs("#quiz-question-text");
            if (qText) qText.textContent = "No questions available for this pack.";
            return;
        }

        showQuizPanel();
        showQuestion();
    }

    function requestQuestionsForCurrentSet() {
        if (!quizState.currentSetId) return;
        if (typeof window.loadQuizQuestions === "function") {
            window.loadQuizQuestions(quizState.currentSetId, handleQuestionsLoaded);
        }
    }

    // --------------------------------------------------
    // UI PANEL HELPERS
    // --------------------------------------------------
    function showIntroPanel() {
        const intro = qs("#quiz-intro-panel");
        const active = qs("#quiz-panel");
        const score = qs("#quiz-score-panel");
        if (intro) intro.hidden = false;
        if (active) active.hidden = true;
        if (score) score.hidden = true;
    }

    function showQuizPanel() {
        const intro = qs("#quiz-intro-panel");
        const active = qs("#quiz-panel");
        const score = qs("#quiz-score-panel");
        if (intro) intro.hidden = true;
        if (active) active.hidden = false;
        if (score) score.hidden = true;
    }

    function showScorePanel() {
        const intro = qs("#quiz-intro-panel");
        const active = qs("#quiz-panel");
        const score = qs("#quiz-score-panel");
        if (intro) intro.hidden = true;
        if (active) active.hidden = true;
        if (score) score.hidden = false;
    }

    // --------------------------------------------------
    // QUESTION DISPLAY + ANSWERS
    // --------------------------------------------------
    function updateStatusLine() {
        const status = qs("#quiz-status");
        if (!status) return;

        const total = quizState.questions.length;
        const current = quizState.currentIndex + 1;
        status.textContent = "Question " + current + " of " + total;
    }

    function clearAnswersFx() {
        const btns = qsa(".quiz-answer-btn");
        btns.forEach((btn) => {
            btn.classList.remove(
                "quiz-answer--correct",
                "quiz-answer--wrong",
                "quiz-answer--highlight-correct",
                "quiz-answer--shake"
            );
            btn.disabled = false;
        });
    }

    function showQuestion() {
        const qEl = qs("#quiz-question-text");
        const optionsContainer = qs("#quiz-options");

        if (!qEl || !optionsContainer) return;

        const q = quizState.questions[quizState.currentIndex];
        quizState.currentQuestion = q;

        // Fade out → in FX
        optionsContainer.classList.remove("quiz-options--fade-in");
        void optionsContainer.offsetWidth; // force reflow
        clearAnswersFx();

        qEl.textContent = q.text || "Untitled question";

        optionsContainer.innerHTML = "";

        q.options.forEach((optText, index) => {
            const btn = document.createElement("button");
            btn.type = "button";
            btn.className = "quiz-answer-btn";
            btn.textContent = optText;
            btn.dataset.index = String(index);
            btn.addEventListener("click", onAnswerClick);
            optionsContainer.appendChild(btn);
        });

        updateStatusLine();
        quizState.acceptingAnswers = true;

        // trigger fade-in animation class
        requestAnimationFrame(() => {
            optionsContainer.classList.add("quiz-options--fade-in");
        });

        setSidBarsIntensity(0.4);
    }

    function onAnswerClick(evt) {
        if (!quizState.acceptingAnswers) return;
        quizState.acceptingAnswers = false;

        const target = evt.currentTarget;
        const chosenIndex = parseInt(target.dataset.index, 10);
        const q = quizState.currentQuestion;

        if (!q) return;

        const correctIndex = q.correctIndex;
        const buttons = qsa(".quiz-answer-btn");

        // Determine correctness
        const isCorrect = chosenIndex === correctIndex;

        buttons.forEach((btn, idx) => {
            btn.disabled = true;

            if (idx === correctIndex) {
                btn.classList.add("quiz-answer--highlight-correct");
            }
        });

        if (isCorrect) {
            quizState.score += 1;
            target.classList.add("quiz-answer--correct");
            sidBarsPulseCorrect();
            playCorrectSfx();
            track("answer_correct", { setId: quizState.currentSetId, qId: q.id });

        } else {
            target.classList.add("quiz-answer--wrong", "quiz-answer--shake");
            sidBarsPulseWrong();
            playWrongSfx();
            track("answer_wrong", { setId: quizState.currentSetId, qId: q.id });
        }

        // After short delay, move to next
        setTimeout(nextQuestionOrFinish, 900);
    }

    function nextQuestionOrFinish() {
        quizState.currentIndex += 1;

        if (quizState.currentIndex >= quizState.questions.length) {
            showFinalScore();
        } else {
            showQuestion();
        }
    }

    // --------------------------------------------------
    // SCORE + LEADERBOARD
    // --------------------------------------------------
    function animateScoreTo(target) {
        const el = qs("#quiz-score-animated");
        if (!el) return;

        const duration = 600;
        const start = performance.now();
        const initial = 0;

        function step(now) {
            const progress = clamp((now - start) / duration, 0, 1);
            const current = Math.round(initial + (target - initial) * progress);
            el.textContent = String(current);

            if (progress < 1) {
                requestAnimationFrame(step);
            }
        }

        requestAnimationFrame(step);
    }

    function showFinalScore() {
        showScorePanel();

        const totalScore = quizState.score;
        const setId = quizState.currentSetId;

        const packNameEl = qs("#quiz-pack-summary");
        const set = quizState.sets.find((s) => String(s.id || s.ID || s.slug) === String(setId));
        if (packNameEl) {
            packNameEl.textContent = set
                ? (set.name || set.title || "Unknown Pack")
                : "Unknown Pack";
        }

        animateScoreTo(totalScore);
        playScoreRevealSfx();
        setSidBarsIntensity(0.6);

        if (setId != null) {
            saveBestScore(setId, totalScore);
        }

        track("quiz_finished", {
            setId: setId,
            score: totalScore,
            totalQuestions: quizState.questions.length
        });
    }

    function handleSaveScore() {
        const nameInput = qs("#quiz-name-input");
        if (!nameInput) return;

        const playerName = (nameInput.value || "").trim() || "Anonymous";
        const setId = quizState.currentSetId;
        const score = quizState.score;

        if (typeof window.saveQuizScore === "function") {
            window.saveQuizScore(
                {
                    name: playerName,
                    setId: setId,
                    score: score
                },
                function onSaved(success) {
                    // Optional: we could show a toast or visual confirm
                    track("score_saved", { success, setId, score });
                }
            );
        } else {
            track("score_saved_local_only", { setId, score });
        }
    }

    // --------------------------------------------------
    // QUIZ FLOW INIT
    // --------------------------------------------------
    function startQuiz() {
        const packSelect = qs("#quiz-pack-select");
        if (!packSelect) return;

        const chosen = packSelect.value;
        if (!chosen) {
            // require pack selection
            playWrongSfx();
            const label = qs(".quiz-pack-label");
            if (label) {
                label.classList.add("quiz-pack-label--error");
                setTimeout(() => label.classList.remove("quiz-pack-label--error"), 800);
            }
            return;
        }

        quizState.currentSetId = chosen;
        quizState.currentIndex = 0;
        quizState.score = 0;

        track("quiz_start", { setId: chosen });
        playClickSfx();
        setSidBarsIntensity(0.5);
        requestQuestionsForCurrentSet();
    }

    function restartQuiz() {
        quizState.currentIndex = 0;
        quizState.score = 0;
        track("quiz_restart", { setId: quizState.currentSetId });
        playClickSfx();
        requestQuestionsForCurrentSet();
    }

    function initQuiz() {
        const startBtn = qs("#quiz-start-btn");
        const saveBtn = qs("#quiz-save-btn");
        const restartBtn = qs("#quiz-restart-btn");

        if (startBtn) {
            startBtn.addEventListener("click", (e) => {
                e.preventDefault();
                startQuiz();
            });
        }

        if (saveBtn) {
            saveBtn.addEventListener("click", (e) => {
                e.preventDefault();
                playClickSfx();
                handleSaveScore();
            });
        }

        if (restartBtn) {
            restartBtn.addEventListener("click", (e) => {
                e.preventDefault();
                restartQuiz();
            });
        }

        requestQuizSets();
        showIntroPanel();
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
