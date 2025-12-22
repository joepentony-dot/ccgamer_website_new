/* ============================================================
   QUIZ LOADER — OMEGA REMOTE + FALLBACK (IMPORTS OLD RULES)
   ------------------------------------------------------------
   • Loads packs + questions from Google Apps Script endpoint
   • Falls back to local quiz/quiz-data.json if remote fails
   • Exposes global callbacks consumed by quiz-engine.js
   • Adds live pack/question counts and recent score recap
   • Saves scores REMOTELY (Apps Script) like old Google Sites quiz
   • If remote save fails → falls back to LocalStorage
   • Silent visitor/game tracking (best-effort)
   ============================================================ */

(function () {
    'use strict';

    const API_URL = 'https://script.google.com/macros/s/AKfycbzLNCrU7aitYqr3eQ9S_vRKTea8Cpm2xfAcXRa-egi7pJX0ozMdqsJHfW77D2Tauojj/exec';
    const DATA_URL = './quiz-data.json';
    const SCORE_KEY = 'ccg_quiz_local_scores';

    let cachedSets = [];
    let localData = null;
    const questionCache = new Map();
    let lastLoadContext = { source: 'remote', status: 'idle', error: null, fallback: false };

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

    function bestEffortPost(url) {
        // Old quiz did this with fetch(..., {method:'POST'}).catch(()=>{})
        // Keep it silent & non-blocking.
        try {
            fetch(url, { method: 'POST', cache: 'no-store' }).catch(() => {});
        } catch (_) {}
    }

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
        try {
            const res = await fetch(DATA_URL, { cache: 'no-store' });
            localData = await res.json();
        } catch (err) {
            console.warn('[Quiz] Unable to load quiz-data.json', err);
            localData = { packs: [] };
        }
        return localData;
    }

    function normaliseLocalPacks(data) {
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
                    questionCount: questions.length,
                    questions
                };
            })
            .filter(Boolean)
            .filter(p => p.questions.length > 0);
    }

    /* --------------------------------------------------------
       REMOTE DATA HELPERS
    -------------------------------------------------------- */
    function normaliseRemoteSet(raw) {
        if (!raw) return null;
        const id = raw.id || raw.setId || raw.slug;
        if (!id) return null;

        return {
            id: String(id),
            name: raw.name || raw.title || 'Quiz Pack',
            difficulty: raw.difficulty || 'Normal',
            description: raw.description || raw.tagline || '',
            questionCount: raw.questionCount || raw.totalQuestions || null
        };
    }

    function normaliseRemoteQuestions(list, setId) {
        return (Array.isArray(list) ? list : [])
            .map((q, index) => {
                if (!q) return null;

                const options = Array.isArray(q.options) ? q.options.filter(Boolean) : [];
                let correctIndex = 0;

                // Old quiz uses q.answer 1-based
                if (typeof q.answer === 'number') correctIndex = q.answer - 1;
                else if (typeof q.correctIndex === 'number') correctIndex = q.correctIndex;
                else if (typeof q.correct === 'number') correctIndex = q.correct - 1;

                return {
                    id: q.id || q.qId || q.questionId || `${setId}-${index + 1}`,
                    question: q.question || q.text || q.prompt || '',
                    options,
                    correctIndex: clampIndex(correctIndex, options.length),
                    imageUrl: q.imageUrl || q.image || q.imageURL || '',
                    audioUrl: q.audioUrl || q.audio || q.soundUrl || '',
                    gameName: q.gameName || q.game || ''
                };
            })
            .filter(q => q && q.question && q.options.length);
    }

    async function fetchRemoteSets() {
        const res = await fetch(`${API_URL}?getQuizSets=true`, { cache: 'no-store' });
        if (!res.ok) throw new Error(`Remote status ${res.status}`);
        const data = await res.json();
        const sets = (data.sets || []).map(normaliseRemoteSet).filter(Boolean);
        if (!sets.length) throw new Error('No quiz sets available');

        cachedSets = sets;
        lastLoadContext = { source: 'remote', status: 'ready', error: null, fallback: false };
        return sets;
    }

    async function fetchRemoteQuestions(setId) {
        const res = await fetch(`${API_URL}?set=${encodeURIComponent(setId)}`, { cache: 'no-store' });
        if (!res.ok) throw new Error(`Question load failed (${res.status})`);
        const data = await res.json();
        const questions = normaliseRemoteQuestions(data.questions || [], setId);
        if (!questions.length) throw new Error('No questions found for this pack');

        questionCache.set(String(setId), questions);
        updateSetQuestionCount(setId, questions.length);
        lastLoadContext = { source: 'remote', status: 'ready', error: null, fallback: false };
        return questions;
    }

    /* --------------------------------------------------------
       REMOTE SCORE SAVE (OLD GOOGLE SITES RULE)
    -------------------------------------------------------- */
    async function saveScoreRemote(payload) {
        // Old quiz POSTs JSON as text/plain
        const body = JSON.stringify({
            action: 'saveScore',
            set: payload.set || payload.setId || payload.packId || payload.pack || '',
            name: payload.name || 'Anonymous',
            score: Number(payload.score || 0),
            total: Number(payload.total || payload.questionCount || 0),
            duration: Number(payload.duration || payload.timeTaken || 0),
            percent: Number(payload.percent || 0)
        });

        const res = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body
        });

        // Apps Script sometimes returns text; handle both.
        const text = await res.text();
        const json = safeJsonParse(text, null);

        if (!res.ok) {
            throw new Error(`Remote save failed (${res.status})`);
        }

        if (json && json.success === false) {
            throw new Error(json.error || 'Remote save rejected');
        }

        return json || { success: true };
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
            const sourceLabel = lastLoadContext.source === 'remote' ? 'remote sheet' : 'local backup';
            const fallbackMsg = lastLoadContext.fallback
                ? `Using ${sourceLabel} fallback — ${lastLoadContext.error || 'Load issue'}`
                : `Load issue: ${lastLoadContext.error || 'Unknown error'}`;
            setPackStatus('error', fallbackMsg);
            return;
        }

        const sourceLabel = lastLoadContext.source === 'remote' ? 'Google Sheet' : 'local backup';
        const fallbackNote = lastLoadContext.fallback ? ' (fallback active)' : '';
        setPackStatus('ready', `${totalPacks} packs ready from ${sourceLabel}${fallbackNote}`);
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

        // Old behaviour: track visitor (silent)
        bestEffortPost(`${API_URL}?action=trackVisitor`);

        setPackStatus('loading', 'Loading quiz packs…');
        lastLoadContext = { source: 'remote', status: 'loading', error: null, fallback: false };

        try {
            await fetchRemoteSets();
        } catch (err) {
            console.warn('[Quiz] Remote set fetch failed', err);
            lastLoadContext = { source: 'local', status: 'ready', error: err.message || 'Remote fetch failed', fallback: true };
            const local = normaliseLocalPacks(await fetchLocalData());
            cachedSets = local;
        }

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
        lastLoadContext = { source: 'remote', status: 'loading', error: null, fallback: false };

        let questions = [];

        try {
            questions = await fetchRemoteQuestions(setId);
        } catch (err) {
            console.warn('[Quiz] Remote question fetch failed', err);
            lastLoadContext = { source: 'local', status: 'ready', error: err.message || 'Remote fetch failed', fallback: true };

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
        }

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

        // Try remote save (old Google Sites behaviour)
        let remoteOk = false;
        try {
            await saveScoreRemote({
                set: safePayload.setId,
                name: safePayload.name,
                score: safePayload.score,
                total: safePayload.total,
                duration: safePayload.duration,
                percent: safePayload.percent
            });
            remoteOk = true;
        } catch (err) {
            console.warn('[Quiz] Remote save failed, local fallback used', err);
            remoteOk = false;
        }

        if (typeof cb === 'function') cb(remoteOk);
        return remoteOk;
    };

    window.trackQuizEvent = function trackQuizEvent(name, data) {
        if (name === 'quiz_start') {
            document.body.dataset.quizActive = 'true';

            // Old behaviour: track game start (silent)
            bestEffortPost(`${API_URL}?action=trackGameStart`);
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
