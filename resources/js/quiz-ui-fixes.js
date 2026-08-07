(function () {
    "use strict";

    const EXPERIENCE_STYLESHEET = "/resources/css/quiz-experience.css";
    const packById = new Map();
    let readyState = "ready";
    let readyText = "Quiz packs ready.";
    let mutationObserver = null;
    let initialized = false;

    function isAdminContext() {
        const meta = document.querySelector('meta[name="ccg-context"]');
        return meta && meta.getAttribute("content") === "admin";
    }

    function ensureExperienceStyles() {
        if (document.querySelector('[data-quiz-experience-styles]')) return;
        const link = document.createElement("link");
        link.rel = "stylesheet";
        link.href = EXPERIENCE_STYLESHEET;
        link.dataset.quizExperienceStyles = "true";
        document.head.appendChild(link);
    }

    function ensureFlowIndicator() {
        if (document.querySelector(".quiz-ux-flow")) return;
        const controls = document.querySelector(".quiz-hero-controls");
        if (!controls) return;

        const flow = document.createElement("div");
        flow.className = "quiz-ux-flow";
        flow.setAttribute("role", "list");
        flow.setAttribute("aria-label", "Quiz steps");
        flow.innerHTML = `
            <span class="quiz-ux-flow__step is-active" data-quiz-flow-step="choose" role="listitem">
                <span class="quiz-ux-flow__number" aria-hidden="true">1</span>
                <span>Choose a pack</span>
            </span>
            <span class="quiz-ux-flow__step" data-quiz-flow-step="start" role="listitem">
                <span class="quiz-ux-flow__number" aria-hidden="true">2</span>
                <span>Start</span>
            </span>
            <span class="quiz-ux-flow__step" data-quiz-flow-step="play" role="listitem">
                <span class="quiz-ux-flow__number" aria-hidden="true">3</span>
                <span>Play</span>
            </span>
        `;
        controls.prepend(flow);
    }

    function normalisePackId(value) {
        return String(value ?? "").trim();
    }

    function registerPacks(packs) {
        packById.clear();
        (Array.isArray(packs) ? packs : []).forEach((pack) => {
            const id = normalisePackId(pack?.id);
            if (id) packById.set(id, pack);
        });
    }

    function packQuestionCount(pack) {
        if (!pack) return 0;
        if (Number.isFinite(Number(pack.questionCount))) return Number(pack.questionCount);
        if (Array.isArray(pack.questions)) return pack.questions.length;
        return 0;
    }

    function buildPackMeta(pack) {
        if (!pack) return "Quiz pack";
        const parts = [];
        const count = packQuestionCount(pack);
        if (count > 0 && pack.type !== "hangman") parts.push(`${count} questions`);
        if (pack.difficulty) parts.push(String(pack.difficulty));
        if (pack.type === "hangman") parts.push("Hangman challenge");
        return parts.join(" · ") || "Quiz pack";
    }

    function decoratePackButtons() {
        const container = document.querySelector("[data-quiz-pack-list]");
        if (!container) return;

        container.querySelectorAll(".quiz-pack-btn").forEach((button) => {
            if (button.disabled && !button.dataset.packId) return;

            const id = normalisePackId(button.dataset.packId || button.dataset.packExternal);
            const pack = packById.get(id);
            const fallbackName = button.dataset.packLabel || button.textContent.trim() || "Quiz Pack";
            const name = String(pack?.name || fallbackName).trim();
            const meta = buildPackMeta(pack);
            const description = String(pack?.description || "Choose this challenge and see how much retro knowledge you remember.").trim();
            const signature = [id, name, meta, description].join("|");

            if (button.dataset.quizUxDecorated === signature) return;
            button.dataset.quizUxDecorated = signature;
            button.dataset.quizPackName = name;
            button.innerHTML = `
                <span class="quiz-pack-btn__name"></span>
                <span class="quiz-pack-btn__meta"></span>
                <span class="quiz-pack-btn__desc"></span>
            `;
            button.querySelector(".quiz-pack-btn__name").textContent = name;
            button.querySelector(".quiz-pack-btn__meta").textContent = meta;
            button.querySelector(".quiz-pack-btn__desc").textContent = description;
        });
    }

    function selectedPackButton() {
        return document.querySelector("[data-quiz-pack-list] .quiz-pack-btn.is-active");
    }

    function setFlowState(stepName) {
        const order = ["choose", "start", "play"];
        const activeIndex = order.indexOf(stepName);
        order.forEach((name, index) => {
            const step = document.querySelector(`[data-quiz-flow-step="${name}"]`);
            if (!step) return;
            step.classList.toggle("is-active", index === activeIndex);
            step.classList.toggle("is-complete", activeIndex > index);
        });
    }

    function updateGuidedState() {
        const startButton = document.getElementById("quiz-start-btn");
        const selected = selectedPackButton();
        const isPlaying = document.body.classList.contains("quiz-focus") || document.body.dataset.quizActive === "true";
        const scorePanel = document.getElementById("quiz-score-panel");
        const finished = Boolean(scorePanel && !scorePanel.hidden);

        if (isPlaying && !finished) {
            setFlowState("play");
        } else if (selected) {
            setFlowState("start");
        } else {
            setFlowState("choose");
        }

        if (startButton) {
            if (!selected) {
                startButton.textContent = "Choose a Pack First";
            } else {
                const name = selected.dataset.quizPackName || "Selected Quiz";
                startButton.textContent = `Start ${name}`;
            }
        }
    }

    function updateQuestionProgress() {
        const status = document.getElementById("quiz-status");
        if (!status) return;
        const current = Number(status.querySelector("[data-quiz-status-current]")?.textContent);
        const total = Number(status.querySelector("[data-quiz-status-total]")?.textContent);
        const percent = Number.isFinite(current) && Number.isFinite(total) && total > 0
            ? Math.max(0, Math.min(100, (current / total) * 100))
            : 0;
        status.style.setProperty("--quiz-progress", `${percent.toFixed(2)}%`);
    }

    function updateReadySnapshot() {
        const statusEl = document.querySelector("[data-quiz-pack-status]");
        if (!statusEl) return;
        readyState = statusEl.dataset.state || "ready";
        readyText = statusEl.textContent || "Quiz packs ready.";
    }

    function improveReadyMessage() {
        const statusEl = document.querySelector("[data-quiz-pack-status]");
        if (!statusEl || statusEl.dataset.state !== "ready") return;
        statusEl.textContent = "Choose one quiz pack below. Your selection will be highlighted.";
        readyState = "ready";
        readyText = statusEl.textContent;
    }

    function restoreReadyStatus() {
        const statusEl = document.querySelector("[data-quiz-pack-status]");
        if (!statusEl) return;
        statusEl.dataset.state = readyState || "ready";
        statusEl.textContent = readyText || "Quiz packs ready.";
    }

    function refreshExperience() {
        decoratePackButtons();
        updateGuidedState();
        updateQuestionProgress();
    }

    function wrapQuizDataLoaders() {
        const originalLoadQuizSets = window.loadQuizSets;
        if (typeof originalLoadQuizSets === "function" && !originalLoadQuizSets.__ccgQuizUxWrapped) {
            const wrappedSets = function (cb) {
                return originalLoadQuizSets((sets) => {
                    registerPacks(sets);
                    updateReadySnapshot();
                    if (typeof cb === "function") cb(sets);
                    window.setTimeout(() => {
                        decoratePackButtons();
                        improveReadyMessage();
                        updateGuidedState();
                    }, 0);
                });
            };
            wrappedSets.__ccgQuizUxWrapped = true;
            window.loadQuizSets = wrappedSets;
        }

        const originalLoadQuizQuestions = window.loadQuizQuestions;
        if (typeof originalLoadQuizQuestions === "function" && !originalLoadQuizQuestions.__ccgQuizUxWrapped) {
            const wrappedQuestions = function (setId, cb) {
                return originalLoadQuizQuestions(setId, (questions) => {
                    if (typeof cb === "function") cb(questions);
                    updateReadySnapshot();
                    restoreReadyStatus();
                    window.setTimeout(refreshExperience, 0);
                });
            };
            wrappedQuestions.__ccgQuizUxWrapped = true;
            window.loadQuizQuestions = wrappedQuestions;
        }
    }

    function wrapQuizTracking() {
        const originalTrackQuizEvent = window.trackQuizEvent;
        if (typeof originalTrackQuizEvent !== "function" || originalTrackQuizEvent.__ccgQuizUxWrapped) return;

        const wrappedTrack = function (name, data) {
            const result = originalTrackQuizEvent(name, data);
            if (name === "quiz_finished" || name === "quiz_quit") {
                restoreReadyStatus();
            }
            window.setTimeout(() => {
                updateGuidedState();
                updateQuestionProgress();
            }, 0);
            return result;
        };
        wrappedTrack.__ccgQuizUxWrapped = true;
        window.trackQuizEvent = wrappedTrack;
    }

    function observeQuizUi() {
        if (mutationObserver) return;
        const packList = document.querySelector("[data-quiz-pack-list]");
        const status = document.getElementById("quiz-status");
        if (!packList && !status) return;

        let refreshQueued = false;
        const queueRefresh = () => {
            if (refreshQueued) return;
            refreshQueued = true;
            window.setTimeout(() => {
                refreshQueued = false;
                refreshExperience();
            }, 0);
        };

        mutationObserver = new MutationObserver(queueRefresh);
        if (packList) {
            mutationObserver.observe(packList, {
                childList: true,
                subtree: true,
                attributes: true,
                attributeFilter: ["class"]
            });
        }
        if (status) {
            mutationObserver.observe(status, { childList: true, subtree: true, characterData: true });
        }
    }

    function bindQuizExperienceEvents() {
        document.addEventListener("click", (event) => {
            const target = event.target;
            if (!(target instanceof Element)) return;

            if (target.closest("[data-quiz-pack-list] .quiz-pack-btn")) {
                window.setTimeout(refreshExperience, 0);
            }

            if (target.closest("#quiz-quit-btn") || target.closest("#quiz-restart-btn")) {
                window.setTimeout(() => {
                    restoreReadyStatus();
                    refreshExperience();
                }, 0);
            }
        });
    }

    function init() {
        if (initialized) return;
        if (isAdminContext()) {
            console.log("[CCG] Admin context detected — quiz experience layer skipped.");
            return;
        }
        if (!document.querySelector('[data-ccg-page="quiz"], .ccg-page--quiz')) return;
        initialized = true;

        ensureExperienceStyles();
        ensureFlowIndicator();
        wrapQuizDataLoaders();
        wrapQuizTracking();
        bindQuizExperienceEvents();
        observeQuizUi();
        updateReadySnapshot();
        refreshExperience();
    }

    /*
       Deferred quiz scripts execute after the document has been parsed but
       before DOMContentLoaded. Initialise immediately so the loader wrappers
       are installed before quiz-engine.js's DOMContentLoaded callback asks
       for the first pack list.
    */
    init();
})();
