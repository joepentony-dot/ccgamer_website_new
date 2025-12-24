/* ============================================================
   QUIZ LOADER — LOCAL ONLY
   ------------------------------------------------------------
   • Loads packs + questions from local quiz/quiz-data.json
   • Exposes global callbacks consumed by quiz-engine.js
   • Adds live pack/question counts and recent score recap
   • Saves scores to LocalStorage
   • Silent visitor/game tracking (best-effort)
   ============================================================ */

(function () {
    'use strict';

    const DATA_URL = './quiz-data.json';
    const SCORE_KEY = 'ccg_quiz_local_scores';

    let cachedSets = [];
    let localData = null;
    const questionCache = new Map();
    let lastLoadContext = { source: 'local', status: 'idle', error: null, fallback: false };

    /* --------------------------------------------------------
       STATUS + HELPERS
    -------------------------------------------------------- */
    function setPackStatus(state, message) {
        const statusEl = document.querySelector('[data-quiz-pack-status]');
        if (!statusEl) return;

        if (state) statusEl.dataset.state = state;
        if (message) statusEl.textContent = message;
    }

    function clampIndex(idx, length) {
        if (!Number.isFinite(idx)) return 0;
        if (length <= 0) return 0;
        return Math.min(Math.max(idx, 0), length - 1);
    }

    function safeJsonParse(input, fallback) {
        try {
            return JSON.parse(input);
        } catch {
            return fallback;
        }
    }

    function bestEffortPost() {}

    /* --------------------------------------------------------
       LOCAL SCORE STORAGE
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

    function addLocalScore(payload) {
        const scores = loadSavedScores();
        const safe = Object.assign({ time: Date.now() }, payload || {});
        scores.unshift(safe);
        saveScores(scores.slice(0, 12));
        renderRecentScores(scores);
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
                <span class="quiz-recent-pack">${entry.setId || entry.set || 'Pack'}</span>
                <span class="quiz-recent-score">${entry.score || 0} pts</span>
            `;
            container.appendChild(li);
        });
    }

    /* --------------------------------------------------------
       LOCAL FALLBACK DATA
    -------------------------------------------------------- */
    async function fetchLocalData() {
        if (localData) return localData;

        const candidateUrls = [
            DATA_URL,
            '/quiz/quiz-data.json',
            '/quiz-data.json'
        ];

        for (const url of candidateUrls) {
            try {
                const res = await fetch(url, { cache: 'no-store' });
                if (!res.ok) {
                    throw new Error(`HTTP ${res.status}`);
                }
                localData = await res.json();
                lastLoadContext = { source: url, status: 'ready', error: null, fallback: url !== DATA_URL };
                return localData;
            } catch (err) {
                console.warn('[Quiz] Unable to load quiz-data.json from', url, err);
                lastLoadContext = { source: url, status: 'error', error: err && err.message, fallback: false };
            }
        }

        localData = { packs: [] };
        lastLoadContext = { source: 'local', status: 'error', error: 'No quiz data found', fallback: true };
        return localData;
    }

    function normaliseLocalPacks(data) {
        const rawPacks = (data && (data.packs || data.sets || data.quizSets)) || [];
        const packList = Array.isArray(rawPacks)
            ? rawPacks
            : Object.values(rawPacks || {});

        return packList
            .map(pack => {
                if (!pack) return null;
                const id = pack.id || pack.slug || pack.name;
                if (!id) return null;

                const questions = Array.isArray(pack.questions) ? pack.questions.slice() : [];
                const rawCount = pack.questionCount;
                const parsedCount = typeof rawCount === 'string' ? Number.parseInt(rawCount, 10) : rawCount;
                const questionCount = Number.isFinite(parsedCount)
                    ? parsedCount
                    : questions.length;

                return {
                    id: String(id),
                    name: pack.name || pack.title || 'Quiz Pack',
                    difficulty: pack.difficulty || 'Normal',
                    description: pack.description || pack.tagline || '',
                    questionCount,
                    questions
                };
            })
            .filter(Boolean);
    }

    /* --------------------------------------------------------
       UI HELPERS
    -------------------------------------------------------- */
    function renderStats(packs) {
        const packEls = document.querySelectorAll('[data-quiz-pack-count]');
        const questionEls = document.querySelectorAll('[data-quiz-question-count]');

        const totalPacks = Array.isArray(packs) ? packs.length : 0;
        const totalQuestions = (packs || []).reduce((sum, pack) => {
            const count = typeof pack.questionCount === 'number' ? pack.questionCount : 0;
            return sum + count;
        }, 0);

        packEls.forEach(el => el.textContent = totalPacks);
        questionEls.forEach(el => el.textContent = totalQuestions || '—');
    }

    function renderPackStatus(packs) {
        const totalPacks = Array.isArray(packs) ? packs.length : (packs && packs.packs ? packs.packs.length : 0);

        if (lastLoadContext.status === 'loading') {
            setPackStatus('loading', 'Loading quiz packs…');
            return;
        }

        if (lastLoadContext.status === 'error') {
            const fallbackMsg = lastLoadContext.fallback
                ? `Using local data fallback — ${lastLoadContext.error || 'Load issue'}`
                : `Load issue: ${lastLoadContext.error || 'Unknown error'}`;
            setPackStatus('error', fallbackMsg);
            return;
        }

        const fallbackNote = lastLoadContext.fallback ? ' (fallback active)' : '';
        setPackStatus('ready', `${totalPacks} packs ready from local data${fallbackNote}`);
    }

    function updateActivePackLabel(pack) {
        const labels = document.querySelectorAll('[data-quiz-active-pack]');
        labels.forEach(label => {
            if (!pack) {
                label.textContent = 'Pick a pack to begin';
                return;
            }
            const countText = typeof pack.questionCount === 'number' && pack.questionCount > 0
                ? `${pack.questionCount} Qs`
                : 'Live pack';
            label.textContent = `${pack.name} (${countText})`;
        });
    }

    function updateSetQuestionCount(setId, count) {
        const target = cachedSets.find(p => String(p.id) === String(setId));
        if (target) target.questionCount = count;
        renderStats(cachedSets);
    }

    /* --------------------------------------------------------
       PUBLIC APIS FOR quiz-engine.js
    -------------------------------------------------------- */
    window.loadQuizSets = async function loadQuizSets(cb) {
        if (cachedSets.length) {
            renderStats(cachedSets);
            renderPackStatus(cachedSets);
            if (typeof cb === 'function') cb(cachedSets);
            return;
        }

        setPackStatus('loading', 'Loading quiz packs…');
        lastLoadContext = { source: 'local', status: 'loading', error: null, fallback: false };

        const local = normaliseLocalPacks(await fetchLocalData());
        cachedSets = local;

        // Preserve fallback context from fetchLocalData while ensuring status is ready
        lastLoadContext = Object.assign({}, lastLoadContext, { status: 'ready' });

        renderStats(cachedSets);
        renderPackStatus(cachedSets);
        if (typeof cb === 'function') cb(cachedSets);
    };

    window.loadQuizQuestions = async function loadQuizQuestions(setId, cb) {
        if (!setId) return cb && cb([]);

        const cached = questionCache.get(String(setId));
        if (cached) {
            updateActivePackLabel(cachedSets.find(p => String(p.id) === String(setId)) || null);
            if (typeof cb === 'function') cb(cached);
            return;
        }

        setPackStatus('loading', 'Loading questions…');
        lastLoadContext = { source: 'local', status: 'loading', error: null, fallback: lastLoadContext.fallback };

        let questions = [];

        const localPacks = normaliseLocalPacks(await fetchLocalData());
        const localPack = localPacks.find(p => String(p.id) === String(setId));

        questions = (localPack && Array.isArray(localPack.questions))
            ? localPack.questions.map((q, idx) => {
                const options = Array.isArray(q.options) ? q.options : [];
                let correct = 0;
                if (typeof q.correctIndex === 'number') correct = q.correctIndex;
                else if (typeof q.correctOption === 'number') correct = q.correctOption - 1;

                return {
                    id: q.id || q.questionId || q.qId || `${setId}-${idx + 1}`,
                    question: q.question || q.text || '',
                    options,
                    correctIndex: clampIndex(correct, options.length),
                    imageUrl: q.imageUrl || '',
                    audioUrl: q.audioUrl || '',
                    gameName: q.gameName || ''
                };
            })
            : [];

        lastLoadContext = Object.assign({}, lastLoadContext, { status: 'ready' });

        questionCache.set(String(setId), questions);
        updateSetQuestionCount(setId, questions.length);
        updateActivePackLabel(cachedSets.find(p => String(p.id) === String(setId)) || null);

        if (typeof cb === 'function') cb(questions);
    };

    window.saveQuizScore = async function saveQuizScore(payload, cb) {
        // payload expected from quiz-engine:
        // { setId, name, score, total, duration, percent, ... }
        const safePayload = Object.assign({}, payload || {});
        const setId = safePayload.setId || safePayload.set;
        safePayload.setId = setId;

        // Always keep a local record (recent runs) for UX/testing
        addLocalScore(safePayload);

        // Remote save removed; acknowledge immediately after local save
        if (typeof cb === 'function') cb(true);
        return true;
    };

    window.trackQuizEvent = function trackQuizEvent(name, data) {
        if (name === 'quiz_start') {
            document.body.dataset.quizActive = 'true';

            // Old behaviour: track game start (silent)
            bestEffortPost();
        }

        if (name === 'quiz_finished') {
            document.body.dataset.quizActive = 'false';
        }

        console.info('[Quiz]', name, data || {});
    };

    /* --------------------------------------------------------
       INIT
    -------------------------------------------------------- */
    function initQuizBadges() {
        const savedScores = loadSavedScores();
        renderRecentScores(savedScores);

        window.loadQuizSets(() => {
            renderPackStatus(cachedSets);
        });
    }

    document.addEventListener('DOMContentLoaded', initQuizBadges);
})();
