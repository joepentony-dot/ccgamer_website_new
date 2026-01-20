/* ============================================================
   QUIZ PACK 6 — GAME BOX HANGMAN
   ------------------------------------------------------------
   • Randomly selects one game from Pack 6
   • Base filenames define answers (hyphens -> spaces)
   • Numbers + Roman numerals auto-reveal
============================================================ */

(() => {
    "use strict";

    const MAX_WRONG_GUESSES = 5;

    const PACK_6_MANIFEST = [
        "bcs-quest-for-tires",
        "black-hawk",
        "chaos-engine",
        "eye-of-the-beholder-ii",
        "finders-keepers",
        "forbidden-forest",
        "hero",
        "hover-bovver",
        "it-came-from-the-desert",
        "jumpman",
        "koronis-rift",
        "little-computer-people",
        "lotus-turbo-challenge-2",
        "manic-miner",
        "monty-on-the-run",
        "pitfall",
        "realm-of-impossibility",
        "spy-hunter",
        "sword-of-fargoal",
        "tapper",
        "the-sentinel",
        "thing-on-a-spring",
        "uridium",
        "way-of-the-exploding-fist"
    ];

    // Extend Pack 6 by adding new base filenames to PACK_6_MANIFEST.

    const IMAGE_OVERRIDES = {
        "hover-bovver": {
            answer: "hover-bover-answer.png"
        }
    };

    const elements = {
        imageFrame: document.querySelector("[data-hangman-image-frame]"),
        questionImage: document.querySelector("[data-hangman-question]"),
        answerImage: document.querySelector("[data-hangman-answer]"),
        wordDisplay: document.querySelector("[data-hangman-word]"),
        feedback: document.querySelector("[data-hangman-feedback]"),
        attempts: document.querySelector("[data-hangman-attempts]"),
        keyboard: document.querySelector("[data-hangman-keyboard]"),
        newGameButton: document.querySelector("[data-hangman-new]"),
        overlay: document.querySelector("[data-quiz-focus-overlay]")
    };

    const state = {
        base: "",
        displayTitle: "",
        charMeta: [],
        guessedLetters: new Set(),
        lettersToGuess: new Set(),
        wrongGuesses: 0,
        isOver: false
    };

    const romanTokenRegex = /^[ivxlcdm]+$/i;

    function setFocusMode(active) {
        document.body.classList.toggle("quiz-focus", active);
        if (elements.overlay) {
            elements.overlay.setAttribute("aria-hidden", active ? "false" : "true");
        }
    }

    function buildKeyboard() {
        if (!elements.keyboard) return;
        elements.keyboard.innerHTML = "";
        const fragment = document.createDocumentFragment();
        for (let i = 65; i <= 90; i += 1) {
            const letter = String.fromCharCode(i);
            const button = document.createElement("button");
            button.type = "button";
            button.className = "hangman-key";
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

    function setImageWithFallback(imgEl, urls) {
        if (!imgEl) return;
        let index = 0;

        const tryNext = () => {
            if (index >= urls.length) return;
            imgEl.src = urls[index];
            index += 1;
        };

        imgEl.onload = () => {
            imgEl.onerror = null;
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
            const isRomanToken = romanTokenRegex.test(token);
            for (const char of token) {
                const isLetter = /[a-z]/i.test(char);
                const isDigit = /\d/.test(char);
                const isPunctuation = !isLetter && !isDigit;
                const autoReveal = isDigit || isPunctuation || (isRomanToken && isLetter);
                meta.push({
                    char,
                    isLetter,
                    isSpace: false,
                    autoReveal
                });
            }
            if (tokenIndex < tokens.length - 1) {
                meta.push({
                    char: " ",
                    isLetter: false,
                    isSpace: true,
                    autoReveal: true
                });
            }
        });

        return meta;
    }

    function renderWord() {
        if (!elements.wordDisplay) return;
        elements.wordDisplay.innerHTML = "";

        state.charMeta.forEach((meta) => {
            const span = document.createElement("span");
            span.className = "hangman-letter";

            if (meta.isSpace) {
                span.classList.add("hangman-letter--space");
                span.textContent = "\u00A0";
            } else if (meta.autoReveal || state.guessedLetters.has(meta.char.toUpperCase())) {
                span.textContent = meta.char.toUpperCase();
                span.classList.add("is-revealed");
            } else {
                span.textContent = "_";
            }

            elements.wordDisplay.appendChild(span);
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
        if (elements.imageFrame) {
            elements.imageFrame.classList.add("is-revealed");
        }
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

    function endGame(message, status) {
        state.isOver = true;
        revealAllLetters();
        revealAnswerImage();
        setFeedback(message, status);
        document.querySelectorAll(".hangman-key").forEach((btn) => {
            btn.disabled = true;
        });
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
            setFeedback("Correct", "correct");
            renderWord();
            if (checkForWin()) {
                endGame("You cracked it!", "correct");
            }
            return;
        }

        state.wrongGuesses += 1;
        setFeedback("Incorrect", "wrong");
        updateAttempts();
        updateHangmanStages();

        if (state.wrongGuesses >= MAX_WRONG_GUESSES) {
            endGame("Out of tries!", "wrong");
        }
    }

    function setupKeyboardInput() {
        document.addEventListener("keydown", (event) => {
            if (event.ctrlKey || event.metaKey || event.altKey) return;
            if (state.isOver) return;
            const key = event.key;
            if (!key || key.length !== 1) return;
            if (!/[a-z]/i.test(key)) return;
            handleGuess(key);
        });
    }

    function loadImages(base) {
        if (!elements.questionImage || !elements.answerImage) return;
        if (elements.imageFrame) {
            elements.imageFrame.classList.remove("is-revealed");
        }

        const questionUrls = [
            `images/pack-6/${base}.png`,
            `images/pack-6/${base}.jpg`
        ];

        const answerOverride = IMAGE_OVERRIDES[base]?.answer;
        const answerUrls = [
            `images/pack-6/${base}-answer.png`,
            ...(answerOverride ? [`images/pack-6/${answerOverride}`] : []),
            `images/pack-6/${base}-answer.jpg`
        ];

        elements.questionImage.alt = `Guess the game: ${state.displayTitle}`;
        elements.answerImage.alt = `Answer reveal: ${state.displayTitle}`;

        setImageWithFallback(elements.questionImage, questionUrls);
        setImageWithFallback(elements.answerImage, answerUrls);
    }

    function selectRandomGame() {
        const choice = PACK_6_MANIFEST[Math.floor(Math.random() * PACK_6_MANIFEST.length)];
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

        document.querySelectorAll(".hangman-key").forEach((btn) => {
            btn.classList.remove("is-guessed", "is-right", "is-wrong");
            btn.disabled = false;
        });

        setFeedback("", "");
        updateAttempts();
        updateHangmanStages();
        renderWord();
        loadImages(choice);
    }

    function init() {
        if (!elements.wordDisplay || !elements.keyboard) return;
        setFocusMode(true);
        buildKeyboard();
        setupKeyboardInput();
        elements.newGameButton?.addEventListener("click", selectRandomGame);
        selectRandomGame();
    }

    document.addEventListener("DOMContentLoaded", init);
})();
