// ======================================================================
// QUIZ ENGINE — OMEGA FX EDITION (HYBRID FAIL STYLE)
// Cheeky Commodore Gamer 😇🕹️👌
// ----------------------------------------------------------------------
// Drives the quiz flow on quiz/quiz.html
// Talks to quiz-loader.js (global helpers):
//   - loadQuizSets(cb)
//   - loadQuizQuestions(setId, cb)
//   - trackQuizEvent(eventName, data)
//
// Adds:
//   * Animated score counter
//   * SID-bar ambient visualiser control
//   * Web Audio SFX (no external audio files)
//   * SFX toggle with localStorage persistence
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

    const quizState = {
        sets: [],
        currentSetId: null,
        currentSetUrl: null,
        currentSetLabel: null,
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
    const QUIZ_MOBILE_QUERY = window.matchMedia?.("(max-width: 820px)");
    const QUIZ_COARSE_QUERY = window.matchMedia?.("(pointer: coarse)");

    function isMobileLikeViewport() {
        if (typeof window.ccgIsMobileLike === "function") {
            return window.ccgIsMobileLike();
        }
        if (QUIZ_MOBILE_QUERY?.matches) return true;
        return Boolean(QUIZ_COARSE_QUERY?.matches || window.innerWidth <= 820);
    }

    function CCG_isTypingTarget(e) {
        const el = e.target;
        if (!el) return false;
        if (el.isContentEditable) return true;
        const tag = el.tagName?.toLowerCase();
        return tag === "input" || tag === "textarea" || tag === "select";
    }

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

    function getHeaderOffset() {
        const rootStyles = window.getComputedStyle(document.documentElement);
        const raw = rootStyles.getPropertyValue("--ccg-header-height");
        const parsed = Number.parseFloat(raw);
        if (Number.isFinite(parsed)) return parsed;
        const header = document.querySelector("[data-ccg-header]") || document.querySelector(".ccg-header");
        return header ? header.getBoundingClientRect().height : 0;
    }

    function scrollQuizPanelIntoView(panel) {
        if (!panel) return;
        const prefersReducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
        const headerOffset = getHeaderOffset();
        const viewportHeight = window.innerHeight || 0;
        const extraOffset = 56; // Mobile-only: nudge down so the first question clears the header.
        const questionCard = panel.querySelector(".quiz-question-card") || panel.querySelector("#quiz-question-text");
        const headerEl = panel.querySelector(".quiz-panel-header");
        let target;

        if (questionCard) {
            const rect = questionCard.getBoundingClientRect();
            target = window.scrollY + rect.top - headerOffset - extraOffset;
        } else if (headerEl) {
            const rect = headerEl.getBoundingClientRect();
            target = window.scrollY + rect.bottom - headerOffset - extraOffset;
        } else {
            const rect = panel.getBoundingClientRect();
            const availableHeight = Math.max(0, viewportHeight - headerOffset);
            const offset = (availableHeight - rect.height) / 2;
            target = window.scrollY + rect.top - headerOffset - offset;
        }

        const maxScroll = document.documentElement.scrollHeight - viewportHeight;
        const clamped = clamp(target, 0, Math.max(0, maxScroll));
        window.scrollTo({
            top: clamped,
            behavior: prefersReducedMotion ? "auto" : "smooth"
        });
    }

    let quizFocusPulseTimer = null;
    let quizFocusPulseCleanup = null;
    const QUIZ_FOCUS_PULSE_CLASS = "quiz-focus-pulse";

    function clearQuizFocusPulse() {
        document.body.classList.remove(QUIZ_FOCUS_PULSE_CLASS);
        if (quizFocusPulseCleanup) {
            quizFocusPulseCleanup();
            quizFocusPulseCleanup = null;
        }
        if (quizFocusPulseTimer) {
            clearTimeout(quizFocusPulseTimer);
            quizFocusPulseTimer = null;
        }
    }

    function triggerMobileFocusPulse() {
        if (!isMobileLikeViewport()) return;
        clearQuizFocusPulse();

        // Mobile-only cue: temporary vignette + glow to show quiz focus.
        document.body.classList.add(QUIZ_FOCUS_PULSE_CLASS);

        const onInteract = (event) => {
            // ADMIN INPUT SAFETY LOCK — DO NOT REMOVE
            // Prevents quiz/hotkey logic from blocking form typing
            const tag = event.target?.tagName?.toLowerCase();
            const isEditable = tag === "input" || tag === "textarea" || event.target?.isContentEditable === true;
            if (isEditable) return;

            if (CCG_isTypingTarget(event)) return;
            clearQuizFocusPulse();
        };
        window.addEventListener("scroll", onInteract, { passive: true, once: true });
        window.addEventListener("touchstart", onInteract, { passive: true, once: true });
        window.addEventListener("pointerdown", onInteract, { passive: true, once: true });
        window.addEventListener("keydown", onInteract, { once: true });

        quizFocusPulseCleanup = () => {
            window.removeEventListener("scroll", onInteract);
            window.removeEventListener("touchstart", onInteract);
            window.removeEventListener("pointerdown", onInteract);
            window.removeEventListener("keydown", onInteract);
        };

        quizFocusPulseTimer = window.setTimeout(() => {
            clearQuizFocusPulse();
        }, 1800);
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
        updateStartButtonState();
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
        if (!panel) return;
        if (!isMobileLikeViewport()) {
            if (typeof panel.scrollIntoView === "function") {
                panel.scrollIntoView({ behavior: "smooth", block: "center" });
            }
            return;
        }
        // Mobile-only: wait for layout, then center the quiz panel with header-safe offset.
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                scrollQuizPanelIntoView(panel);
                window.setTimeout(() => triggerMobileFocusPulse(), 220);
            });
        });
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
        const feedbackEl = qs("#quiz-feedback");

        optionsEl.innerHTML = "";
        mediaEl.innerHTML = "";
        if (feedbackEl) {
            feedbackEl.textContent = "";
            feedbackEl.className = "quiz-feedback";
        }

        updateStatusDisplay();

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

        const videoSrc = q.videoUrl || q.video || "";
        if (videoSrc) {
            const video = document.createElement("video");
            video.src = videoSrc;
            video.controls = true;
            video.preload = "metadata";
            video.playsInline = true;
            mediaEl.appendChild(video);
        }

        q.options.forEach((opt, idx) => {
            const btn = document.createElement("button");
            btn.className = "ccg-btn ccg-btn--secondary quiz-answer-btn";
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
        updateStatusDisplay();
    }

    function updateStatusDisplay() {
        const statusEl = qs("#quiz-status");
        if (!statusEl) return;

        const total = quizState.questions.length;
        const current = quizState.currentIndex + 1;
        const score = quizState.score;
        const pack = quizState.sets.find((p) => String(p.id) === String(quizState.currentSetId));
        const packName = pack ? pack.name : (quizState.currentSetId ? `Pack ${quizState.currentSetId}` : "—");

        const currentEl = statusEl.querySelector("[data-quiz-status-current]");
        const totalEl = statusEl.querySelector("[data-quiz-status-total]");
        const scoreEl = statusEl.querySelector("[data-quiz-status-score]");
        const packEl = statusEl.querySelector("[data-quiz-status-pack]");

        if (currentEl || totalEl || scoreEl || packEl) {
            if (currentEl) currentEl.textContent = current;
            if (totalEl) totalEl.textContent = total || "—";
            if (scoreEl) scoreEl.textContent = score;
            if (packEl) packEl.textContent = packName;
            return;
        }

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


    // --------------------------------------------------
    // FLOW INIT
    // --------------------------------------------------
    function startQuiz() {
        if (!quizState.currentSetId) return playWrongSfx();

        quizState._startTime = performance.now();

        track("quiz_start", { setId: quizState.currentSetId });
        playClickSfx();

        if (quizState.currentSetUrl) {
            window.location.href = quizState.currentSetUrl;
            return;
        }

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

        const externalPacks = Array.from(
            container.querySelectorAll("[data-pack-external]")
        ).map((node) => node.cloneNode(true));

        container.innerHTML = "";

        if (!sets.length) {
            const emptyBtn = document.createElement("button");
            emptyBtn.type = "button";
            emptyBtn.className = "ccg-btn ccg-btn--secondary quiz-pack-btn";
            emptyBtn.textContent = "No packs available";
            emptyBtn.disabled = true;
            container.appendChild(emptyBtn);
        }

        sets.forEach((set) => {
            const btn = document.createElement("button");
            btn.type = "button";
            btn.className = "ccg-btn ccg-btn--secondary quiz-pack-btn";
            btn.dataset.packId = set.id;
            if (set.type === "hangman" || set.externalHref) {
                btn.dataset.packExternal = set.slug || set.id;
                btn.dataset.packLabel = set.name;
                btn.dataset.packHref = set.externalHref || "pack-6.html";
            }
            const count = typeof set.questionCount === "number"
                ? set.questionCount
                : (Array.isArray(set.questions) ? set.questions.length : 0);
            const isExternal = set.type === "hangman" || Boolean(set.externalHref);
            btn.textContent = (!isExternal && count) ? `${set.name} (${count} Qs)` : set.name;

            if (isExternal) {
                btn.addEventListener("click", () => {
                    const packHref = set.externalHref || "pack-6.html";
                    quizState.currentSetId = set.id;
                    quizState.currentSetUrl = packHref;
                    quizState.currentSetLabel = set.name;
                    setActivePackButton(set.id);
                    updateSelectedPackLabel();
                    updateStartButtonState();
                    playClickSfx();
                    maybeRevealStartButton();
                });
            } else {
                btn.addEventListener("click", () => {
                    quizState.currentSetId = set.id;
                    quizState.currentSetUrl = null;
                    quizState.currentSetLabel = null;
                    setActivePackButton(set.id);
                    updateSelectedPackLabel();
                    updateStartButtonState();
                    playClickSfx();
                    maybeRevealStartButton();
                });
            }
            container.appendChild(btn);
        });

        if (externalPacks.length) {
            externalPacks.forEach((node) => {
                container.appendChild(node);
            });
            bindExternalPackButtons(container);
        }

        if (quizState.currentSetId) {
            setActivePackButton(quizState.currentSetId);
        }

        updateStartButtonState();
    }

    function bindExternalPackButtons(container) {
        const externalButtons = Array.from(
            container.querySelectorAll("[data-pack-external]")
        );
        externalButtons.forEach((btn) => {
            if (btn.tagName === "A") {
                btn.addEventListener("click", (event) => event.preventDefault());
            }
            if (btn instanceof HTMLButtonElement) {
                btn.type = "button";
            }
            btn.addEventListener("click", () => {
                const packId = btn.dataset.packId || btn.dataset.packExternal;
                const packHref = btn.dataset.packHref || btn.getAttribute("href");
                quizState.currentSetId = packId;
                quizState.currentSetUrl = packHref;
                quizState.currentSetLabel = btn.dataset.packLabel || btn.textContent.trim();
                setActivePackButton(packId);
                updateSelectedPackLabel();
                updateStartButtonState();
                playClickSfx();
                maybeRevealStartButton();
            });
        });
    }


    function updateSelectedPackLabel() {
        const activeId = quizState.currentSetId;
        const pack = quizState.sets.find((p) => String(p.id) === String(activeId));
        const label = (() => {
            if (!activeId) return "Pick a pack to begin";
            if (quizState.currentSetUrl && quizState.currentSetLabel) return quizState.currentSetLabel;
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

    function updateStartButtonState() {
        const startBtn = qs("#quiz-start-btn");
        if (!startBtn) return;
        const hasSelection = Boolean(quizState.currentSetId);
        startBtn.disabled = !hasSelection;
        startBtn.classList.toggle("is-armed", hasSelection);
        startBtn.setAttribute("aria-disabled", hasSelection ? "false" : "true");
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
