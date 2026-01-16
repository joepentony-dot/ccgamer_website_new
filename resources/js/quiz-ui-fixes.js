(function () {
    "use strict";

    const statusEl = document.querySelector("[data-quiz-pack-status]");
    if (!statusEl) return;

    let readyState = statusEl.dataset.state || "ready";
    let readyText = statusEl.textContent || "Packs ready.";

    function updateReadySnapshot() {
        readyState = statusEl.dataset.state || "ready";
        readyText = statusEl.textContent || "Packs ready.";
    }

    function restoreReadyStatus() {
        statusEl.dataset.state = readyState || "ready";
        statusEl.textContent = readyText || "Packs ready.";
    }

    const originalLoadQuizSets = window.loadQuizSets;
    if (typeof originalLoadQuizSets === "function") {
        window.loadQuizSets = function (cb) {
            return originalLoadQuizSets((sets) => {
                updateReadySnapshot();
                if (typeof cb === "function") cb(sets);
            });
        };
    }

    const originalLoadQuizQuestions = window.loadQuizQuestions;
    if (typeof originalLoadQuizQuestions === "function") {
        window.loadQuizQuestions = function (setId, cb) {
            return originalLoadQuizQuestions(setId, (questions) => {
                if (typeof cb === "function") cb(questions);
                updateReadySnapshot();
                restoreReadyStatus();
            });
        };
    }

    const originalTrackQuizEvent = window.trackQuizEvent;
    if (typeof originalTrackQuizEvent === "function") {
        window.trackQuizEvent = function (name, data) {
            const result = originalTrackQuizEvent(name, data);
            if (name === "quiz_finished" || name === "quiz_quit") {
                restoreReadyStatus();
            }
            return result;
        };
    }

    document.addEventListener("click", (event) => {
        const target = event.target;
        if (!target) return;
        if (target.closest("#quiz-quit-btn") || target.closest("#quiz-restart-btn")) {
            window.setTimeout(() => restoreReadyStatus(), 0);
        }
    });
})();
