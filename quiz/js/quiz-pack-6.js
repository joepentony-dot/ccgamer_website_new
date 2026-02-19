/* ============================================================
   QUIZ PACK 6 — GAME BOX HANGMAN
   ------------------------------------------------------------
   • Randomly selects one game from Pack 6
   • Base filenames define answers (hyphens -> spaces)
   • Numbers auto-reveal (spaces & punctuation always visible)
============================================================ */

(() => {
    "use strict";

    function isAdminContext() {
        const meta = document.querySelector('meta[name="ccg-context"]');
        return meta && meta.getAttribute("content") === "admin";
    }

    function isQuizContext() {
        const meta = document.querySelector('meta[name="ccg-context"]');
        return meta && meta.getAttribute("content") === "quiz";
    }

    function CCG_isTypingTarget(e) {
        const el = e.target;
        if (!el) return false;
        if (el.isContentEditable) return true;
        const tag = el.tagName?.toLowerCase();
        return tag === "input" || tag === "textarea" || tag === "select";
    }

    const editableSelector = 'input, textarea, select, [contenteditable]:not([contenteditable="false"])';

    function isPack6Page() {
        if (document.documentElement?.dataset?.ccgPage === "quiz-pack-6") return true;
        const path = window.location?.pathname || "";
        return path.endsWith("/quiz/pack-6.html") || path.endsWith("/pack-6.html");
    }

    function isEditableElement(target) {
        if (!(target instanceof Element)) return false;
        if (target.matches(editableSelector)) return true;
        if (target.isContentEditable && !target.matches('[contenteditable="false"]')) return true;
        return Boolean(target.closest('[contenteditable]:not([contenteditable="false"])'));
    }

    function isEditableEvent(event) {
        if (!event) return false;
        if (CCG_isTypingTarget(event)) return true;
        if (isEditableElement(event.target)) return true;
        if (typeof event.composedPath === "function") {
            return event.composedPath().some(isEditableElement);
        }
        return false;
    }

    if (isAdminContext()) {
        console.log("[CCG] Admin context detected — keyboard suppression disabled in this module.");
        return;
    }

    if (!isQuizContext()) {
        return;
    }

    console.log("[CCG-QUIZ] Context=quiz");

    const MAX_WRONG_GUESSES = 5;
    const PACK_6_PATH = "images/pack-6/";
    const IMAGE_EXTENSION = ".webp";
    const ANSWER_SUFFIX = "-answer";
    const AUTO_ADVANCE_DELAY = 3000;

    const elements = {
        imageFrame: document.querySelector("[data-hangman-image-frame]"),
        questionImage: document.querySelector("[data-hangman-question]"),
        answerImage: null,
        wordDisplay: document.querySelector("[data-hangman-word]"),
        feedback: document.querySelector("[data-hangman-feedback]"),
        replay: document.querySelector("[data-hangman-replay]"),
        attempts: document.querySelector("[data-hangman-attempts]"),
        keyboard: document.querySelector("[data-hangman-keyboard]"),
        gameGrid: document.querySelector(".hangman-game-grid"),
        newGameButton: document.querySelector("[data-hangman-new]"),
        overlay: document.querySelector("[data-quiz-focus-overlay]"),
        counter: document.querySelector("[data-hangman-counter]"),
        quitButton: document.querySelector("[data-hangman-quit]")
    };

    const state = {
        base: "",
        answerUrl: "",
        displayTitle: "",
        charMeta: [],
        guessedLetters: new Set(),
        lettersToGuess: new Set(),
        wrongGuesses: 0,
        isOver: false,
        packBases: [],
        remainingBases: [],
        totalCount: 0,
        advanceTimer: null,
        isLoading: false,
        scrollPending: false
    };

    const SFX_STORAGE_KEY = "ccg_quiz_sfx_enabled";
    const SFX_SOURCES = {
        correct: "../resources/css/audio/c64_tape_rewind.mp3",
        wrong: "../resources/css/audio/static_burst.mp3"
    };
    const sfx = {
        correct: new Audio(SFX_SOURCES.correct),
        wrong: new Audio(SFX_SOURCES.wrong)
    };

    function isSfxEnabled() {
        try {
            const stored = localStorage.getItem(SFX_STORAGE_KEY);
            if (stored === null) return true;
            return stored === "true";
        } catch {
            return true;
        }
    }

    function playSfx(type) {
        if (!isSfxEnabled()) return;
        const audio = sfx[type];
        if (!audio) return;
        audio.currentTime = 0;
        audio.play().catch(() => {});
    }

    function setFocusMode(active) {
        document.body.classList.toggle("quiz-focus", active);
        if (elements.overlay) {
            elements.overlay.setAttribute("aria-hidden", active ? "false" : "true");
        }
    }

    const SCROLL_LOCK_CLASS = "ccg-scroll-locked";

    function setScrollLock(locked) {
        document.body.classList.toggle(SCROLL_LOCK_CLASS, locked);
        document.body.style.overflow = locked ? "hidden" : "";
    }

    function setHangmanActive(active) {
        document.body.classList.toggle("hangman-active", active);
    }

    function shuffleArray(items) {
        const array = [...items];
        for (let i = array.length - 1; i > 0; i -= 1) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }

    function buildKeyboard() {
        if (!elements.keyboard) return;
        elements.keyboard.innerHTML = "";
        const fragment = document.createDocumentFragment();
        for (let i = 65; i <= 90; i += 1) {
            const letter = String.fromCharCode(i);
            const button = document.createElement("button");
            button.type = "button";
            button.className = "ccg-btn ccg-btn--ghost hangman-key";
            button.textContent = letter;
            button.dataset.letter = letter;
            button.addEventListener("click", () => handleGuess(letter));
            fragment.appendChild(button);
        }
        elements.keyboard.appendChild(fragment);
    }

    function setFeedback(text, status) {
        if (!elements.feedback) return;
        elements.feedback.textContent = text;
        elements.feedback.classList.remove("is-correct", "is-wrong");
        if (status === "correct") {
            elements.feedback.classList.add("is-correct");
        }
        if (status === "wrong") {
            elements.feedback.classList.add("is-wrong");
        }
    }

    function updateAttempts() {
        if (!elements.attempts) return;
        elements.attempts.textContent = `Wrong attempts: ${state.wrongGuesses} / ${MAX_WRONG_GUESSES}`;
    }

    function updateCounter() {
        if (!elements.counter) return;
        const total = state.totalCount;
        const remaining = state.remainingBases.length;
        elements.counter.textContent = `Pack 6: ${total} total | ${remaining} remaining`;
    }

    function setImageWithFallback(imgEl, urls, onLoad) {
        if (!imgEl) return;
        let index = 0;

        const tryNext = () => {
            if (index >= urls.length) return;
            imgEl.src = urls[index];
            index += 1;
        };

        imgEl.onload = () => {
            imgEl.onerror = null;
            if (typeof onLoad === "function") {
                onLoad();
            }
        };

        imgEl.onerror = () => {
            tryNext();
        };

        tryNext();
    }

    function buildCharMeta(title) {
        const tokens = title.split(" ");
        const meta = [];

        tokens.forEach((token, tokenIndex) => {
            for (const char of token) {
                const isLetter = /[a-z]/i.test(char);
                const isDigit = /\d/.test(char);
                const isPunctuation = !isLetter && !isDigit;
                const autoReveal = isDigit || isPunctuation;
                meta.push({
                    char,
                    isLetter,
                    isSpace: false,
                    autoReveal,
                    wordIndex: tokenIndex
                });
            }
            if (tokenIndex < tokens.length - 1) {
                meta.push({
                    char: " ",
                    isLetter: false,
                    isSpace: true,
                    autoReveal: true,
                    wordIndex: tokenIndex
                });
            }
        });

        return meta;
    }

    function renderWord() {
        if (!elements.wordDisplay) return;
        elements.wordDisplay.innerHTML = "";

        let group = null;
        state.charMeta.forEach((meta) => {
            if (meta.isSpace) {
                group = null;
                return;
            }

            if (!group) {
                group = document.createElement("span");
                group.className = "hangman-word-group";
                elements.wordDisplay.appendChild(group);
            }

            const span = document.createElement("span");
            span.className = "hangman-letter";

            if (meta.autoReveal || state.guessedLetters.has(meta.char.toUpperCase())) {
                span.textContent = meta.char.toUpperCase();
                span.classList.add("is-revealed");
            } else {
                span.textContent = "_";
            }

            group.appendChild(span);
        });
    }

    function updateHangmanStages() {
        const stages = document.querySelectorAll(".hangman-stage");
        stages.forEach((stage) => {
            const step = Number(stage.dataset.stage || "0");
            stage.classList.toggle("is-visible", step <= state.wrongGuesses && step > 0);
        });
    }

    function revealAnswerImage() {
        if (!elements.imageFrame || !state.answerUrl) return;
        if (!elements.answerImage) {
            const answerImage = document.createElement("img");
            answerImage.className = "hangman-image hangman-image--answer";
            answerImage.alt = `Answer reveal: ${state.displayTitle}`;
            answerImage.loading = "lazy";
            answerImage.decoding = "async";
            answerImage.dataset.hangmanAnswer = "";
            elements.answerImage = answerImage;
            elements.imageFrame.appendChild(answerImage);
        }
        elements.answerImage.src = state.answerUrl;
        elements.imageFrame.classList.add("is-revealed");
    }

    function revealAllLetters() {
        state.lettersToGuess.forEach((letter) => {
            state.guessedLetters.add(letter);
        });
        renderWord();
    }

    function checkForWin() {
        for (const letter of state.lettersToGuess) {
            if (!state.guessedLetters.has(letter)) {
                return false;
            }
        }
        return true;
    }

    function endGame(message, status, revealAnswer) {
        state.isOver = true;
        setScrollLock(false);
        if (revealAnswer) {
            revealAllLetters();
            revealAnswerImage();
        }
        setFeedback(message, status);
        document.querySelectorAll(".hangman-key").forEach((btn) => {
            btn.disabled = true;
        });
        scheduleNextRound();
    }

    function handleGuess(rawLetter) {
        if (state.isOver) return;
        const letter = String(rawLetter || "").toUpperCase();
        if (!/^[A-Z]$/.test(letter)) return;

        if (state.guessedLetters.has(letter)) {
            setFeedback("Already guessed", "wrong");
            return;
        }

        state.guessedLetters.add(letter);

        const keyButton = elements.keyboard?.querySelector(`[data-letter="${letter}"]`);
        const isCorrect = state.lettersToGuess.has(letter);

        if (keyButton) {
            keyButton.classList.add("is-guessed");
            keyButton.classList.add(isCorrect ? "is-right" : "is-wrong");
        }

        if (isCorrect) {
            playSfx("correct");
            setFeedback("Correct", "correct");
            renderWord();
            if (checkForWin()) {
                endGame("You cracked it!", "correct", true);
            }
            return;
        }

        state.wrongGuesses += 1;
        playSfx("wrong");
        setFeedback("Incorrect", "wrong");
        updateAttempts();
        updateHangmanStages();

        if (state.wrongGuesses >= MAX_WRONG_GUESSES) {
            endGame("Out of tries!", "wrong", true);
        }
    }

    function setupKeyboardInput() {
        const quizRoot = document.querySelector("[data-quiz-root]");
        if (!quizRoot || !isPack6Page()) return;

        const keyHandler = (event) => {
            // ADMIN INPUT SAFETY LOCK — DO NOT REMOVE
            // Prevents quiz/hotkey logic from blocking form typing
            const tag = event.target?.tagName?.toLowerCase();
            const isEditable = tag === "input" || tag === "textarea" || event.target?.isContentEditable === true;
            if (isEditable) return;

            if (isEditableEvent(event)) {
                return;
            }
            if (!document.body.classList.contains("ccg-quiz-pack-6") &&
                !(event.target && event.target.closest && event.target.closest(".quiz-container"))) {
                return;
            }
            if (location.pathname.startsWith("/admin/")) return;
            if (!elements.gameGrid && !document.querySelector(".hangman-game-grid")) return;
            if (event.ctrlKey || event.metaKey || event.altKey) return;
            if (state.isOver) return;
            const key = event.key;
            if (!key || key.length !== 1) return;
            if (!/[a-z]/i.test(key)) return;
            handleGuess(key);
        };

        quizRoot.addEventListener("keydown", keyHandler);
        window.addEventListener("beforeunload", () => {
            quizRoot.removeEventListener("keydown", keyHandler);
        }, { once: true });
    }

    function resetAnswerImage() {
        if (elements.answerImage) {
            elements.answerImage.remove();
            elements.answerImage = null;
        }
        if (elements.imageFrame) {
            elements.imageFrame.classList.remove("is-revealed");
        }
    }

    function loadImages(base) {
        if (!elements.questionImage) return;
        resetAnswerImage();
        const questionUrl = `${PACK_6_PATH}${base}${IMAGE_EXTENSION}`;
        state.answerUrl = `${PACK_6_PATH}${base}${ANSWER_SUFFIX}${IMAGE_EXTENSION}`;
        elements.questionImage.alt = `Guess the game: ${state.displayTitle}`;
        elements.questionImage.decoding = "async";
        setImageWithFallback(elements.questionImage, [questionUrl], scheduleGameplayScroll);
    }

    function getNextBase() {
        if (state.remainingBases.length === 0) {
            state.remainingBases = shuffleArray(state.packBases);
        }
        return state.remainingBases.shift();
    }

    function selectNextGame() {
        const choice = getNextBase();
        if (!choice) {
            setFeedback("No Pack 6 images found.", "wrong");
            return;
        }

        state.base = choice;
        state.displayTitle = choice.replace(/-/g, " ");
        state.charMeta = buildCharMeta(state.displayTitle);
        state.guessedLetters = new Set();
        state.lettersToGuess = new Set(
            state.charMeta
                .filter((meta) => meta.isLetter && !meta.autoReveal)
                .map((meta) => meta.char.toUpperCase())
        );
        state.wrongGuesses = 0;
        state.isOver = false;
        setHangmanActive(true);
        setScrollLock(true);

        document.querySelectorAll(".hangman-key").forEach((btn) => {
            btn.classList.remove("is-guessed", "is-right", "is-wrong");
            btn.disabled = false;
        });

        setFeedback("", "");
        if (elements.replay) {
            elements.replay.classList.add("is-hidden");
        }
        updateAttempts();
        updateHangmanStages();
        renderWord();
        loadImages(choice);
        updateCounter();
        scheduleGameplayScroll();
    }

    function scheduleNextRound() {
        if (state.advanceTimer) {
            clearTimeout(state.advanceTimer);
        }
        state.advanceTimer = window.setTimeout(() => {
            state.advanceTimer = null;
            selectNextGame();
        }, AUTO_ADVANCE_DELAY);
    }

    function clearAdvanceTimer() {
        if (state.advanceTimer) {
            clearTimeout(state.advanceTimer);
            state.advanceTimer = null;
        }
    }

    function stopQuizSession() {
        state.isOver = true;
        clearAdvanceTimer();
        setHangmanActive(false);
        setFocusMode(false);
        setScrollLock(false);
        setFeedback("", "");
        if (elements.questionImage) {
            elements.questionImage.removeAttribute("src");
            elements.questionImage.alt = "";
        }
        resetAnswerImage();
        if (elements.wordDisplay) {
            elements.wordDisplay.innerHTML = "";
        }
        updateAttempts();
        document.querySelectorAll(".hangman-key").forEach((btn) => {
            btn.disabled = true;
            btn.classList.remove("is-guessed", "is-right", "is-wrong");
        });
    }

    function scheduleGameplayScroll() {
        if (!elements.gameGrid || state.scrollPending) return;
        state.scrollPending = true;
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                state.scrollPending = false;
                elements.gameGrid.scrollIntoView({
                    behavior: "smooth",
                    block: "start"
                });
            });
        });
    }

    async function loadPackManifest() {
        state.isLoading = true;
        try {
            const response = await fetch(`${PACK_6_PATH}manifest.json`, { cache: "no-store" });
            if (!response.ok) {
                throw new Error("Unable to load Pack 6 manifest.");
            }
            const manifest = await response.json();
            const fileNames = Array.isArray(manifest)
                ? manifest.map((entry) => String(entry)).filter(Boolean)
                : [];

            const uniqueBases = Array.from(new Set(fileNames));
            if (uniqueBases.length === 0) {
                throw new Error("Pack 6 has no .webp images.");
            }

            state.packBases = uniqueBases;
            state.totalCount = uniqueBases.length;
            state.remainingBases = shuffleArray(uniqueBases);
            updateCounter();
        } catch (error) {
            setFeedback("Unable to load Pack 6 images.", "wrong");
        } finally {
            state.isLoading = false;
        }
    }

    function init() {
        if (!elements.wordDisplay || !elements.keyboard) return;
        setFocusMode(true);
        buildKeyboard();
        setupKeyboardInput();
        scheduleGameplayScroll();
        elements.newGameButton?.addEventListener("click", () => {
            if (state.isLoading) return;
            clearAdvanceTimer();
            selectNextGame();
        });
        elements.quitButton?.addEventListener("click", () => {
            stopQuizSession();
            window.location.assign("quiz.html");
        });
        if (elements.replay) {
            elements.replay.classList.add("is-hidden");
        }
        loadPackManifest().then(() => {
            if (state.packBases.length) {
                selectNextGame();
            }
        });
    }

    document.addEventListener("DOMContentLoaded", init);
})();
