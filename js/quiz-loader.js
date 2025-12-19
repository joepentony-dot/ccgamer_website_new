/* ============================================================
   QUIZ LOADER — COSMIC WOW EDITION
   ------------------------------------------------------------
   • Loads packs + questions from quiz/quiz-data.json
   • Exposes global callbacks consumed by quiz-engine.js
   • Adds live pack/question counts and recent score recap
   • LocalStorage-backed score saver (client-side leaderboard)
   ============================================================ */

(function () {
    'use strict';

    const DATA_URL = './quiz-data.json';
    const SCORE_KEY = 'ccg_quiz_local_scores';

    let cachedData = null;
    let normalisedPacks = [];

    /* --------------------------------------------------------
       FETCH + NORMALISE
    -------------------------------------------------------- */
    async function fetchQuizData() {
        if (cachedData) return cachedData;

        try {
            const res = await fetch(DATA_URL, { cache: 'no-store' });
            cachedData = await res.json();
        } catch (err) {
            console.error('[Quiz] Unable to load quiz-data.json', err);
            cachedData = { packs: [] };
        }

        normalisedPacks = normalisePacks(cachedData);
        return cachedData;
    }

    function normalisePacks(data) {
        const rawPacks = (data && (data.packs || data.sets)) || [];

        return rawPacks
            .map(pack => {
                if (!pack) return null;
                const id = pack.id || pack.slug || pack.name;
                if (!id) return null;

                const questions = Array.isArray(pack.questions) ? pack.questions.slice() : [];

                return {
                    id: String(id),
                    name: pack.name || pack.title || 'Quiz Pack',
                    difficulty: pack.difficulty || 'Normal',
                    description: pack.description || pack.tagline || '',
                    questions
                };
            })
            .filter(Boolean)
            .filter(p => p.questions.length > 0);
    }

    /* --------------------------------------------------------
       SCORE STORAGE (LOCAL)
    -------------------------------------------------------- */
    function loadSavedScores() {
        try {
            const raw = localStorage.getItem(SCORE_KEY);
            if (!raw) return [];
            const parsed = JSON.parse(raw);
            return Array.isArray(parsed) ? parsed : [];
        } catch (err) {
            console.warn('[Quiz] Unable to read saved scores', err);
            return [];
        }
    }

    function saveScores(list) {
        try {
            localStorage.setItem(SCORE_KEY, JSON.stringify(list));
        } catch (err) {
            console.warn('[Quiz] Unable to persist scores', err);
        }
    }

    function renderRecentScores(list) {
        const container = document.querySelector('[data-quiz-recent-scores]');
        if (!container) return;

        container.innerHTML = '';
        const scores = list.slice(0, 5);

        if (!scores.length) {
            container.innerHTML = '<li class="quiz-recent-empty">No local scores yet. Finish a quiz to populate this list.</li>';
            return;
        }

        scores.forEach(entry => {
            const li = document.createElement('li');
            li.className = 'quiz-recent-item';
            li.innerHTML = `
                <span class="quiz-recent-name">${entry.name || 'Anonymous'}</span>
                <span class="quiz-recent-pack">${entry.setId || 'Pack'}</span>
                <span class="quiz-recent-score">${entry.score || 0} pts</span>
            `;
            container.appendChild(li);
        });
    }

    /* --------------------------------------------------------
       PUBLIC APIS FOR quiz-engine.js
    -------------------------------------------------------- */
    window.loadQuizSets = async function loadQuizSets(cb) {
        await fetchQuizData();

        const summary = normalisedPacks.map(pack => ({
            id: pack.id,
            name: pack.name,
            title: pack.name,
            questionCount: pack.questions.length,
            difficulty: pack.difficulty,
            description: pack.description
        }));

        renderStats(summary);

        if (typeof cb === 'function') cb(summary);
    };

    window.loadQuizQuestions = async function loadQuizQuestions(setId, cb) {
        await fetchQuizData();
        const pack = normalisedPacks.find(p => String(p.id) === String(setId));
        const questions = pack ? pack.questions.slice() : [];

        updateActivePackLabel(pack);

        if (typeof cb === 'function') cb(questions);
    };

    window.saveQuizScore = function saveQuizScore(payload, cb) {
        const scores = loadSavedScores();
        const safe = Object.assign({ time: Date.now() }, payload || {});

        scores.unshift(safe);
        saveScores(scores.slice(0, 12));
        renderRecentScores(scores);

        if (typeof cb === 'function') cb(true);
    };

    window.trackQuizEvent = function trackQuizEvent(name, data) {
        if (name === 'quiz_start') {
            document.body.dataset.quizActive = 'true';
        }
        if (name === 'quiz_finished') {
            document.body.dataset.quizActive = 'false';
        }
        console.info('[Quiz]', name, data || {});
    };

    /* --------------------------------------------------------
       UI HELPERS
    -------------------------------------------------------- */
    function renderStats(packs) {
        const packEls = document.querySelectorAll('[data-quiz-pack-count]');
        const questionEls = document.querySelectorAll('[data-quiz-question-count]');

        const totalPacks = Array.isArray(packs) ? packs.length : 0;
        const totalQuestions = (packs || []).reduce((sum, pack) => {
            const count = pack.questionCount || (pack.questions ? pack.questions.length : 0) || 0;
            return sum + count;
        }, 0);

        packEls.forEach(el => el.textContent = totalPacks);
        questionEls.forEach(el => el.textContent = totalQuestions);
    }

    function updateActivePackLabel(pack) {
        const labels = document.querySelectorAll('[data-quiz-active-pack]');
        labels.forEach(label => {
            label.textContent = pack ? `${pack.name} (${pack.questions.length} Qs)` : 'Pick a pack to begin';
        });
    }

    function initQuizBadges() {
        const savedScores = loadSavedScores();
        renderRecentScores(savedScores);

        fetchQuizData().then(() => {
            const summary = normalisedPacks.map(pack => ({
                questionCount: pack.questions.length,
                name: pack.name
            }));
            renderStats(summary);
        });
    }

    document.addEventListener('DOMContentLoaded', initQuizBadges);
})();
