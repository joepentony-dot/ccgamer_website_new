/* ============================================================
   QUIZ PACKS LOADER — UNIFIED JSON + LEGACY SAFE
   ------------------------------------------------------------
   • Loads packs + questions from quiz-data.json
   • Supports legacy pack.questions and unified questions map
   • Preserves global callbacks consumed by quiz-engine.js
   ============================================================ */

(function () {
    'use strict';

    const DATA_URL = './quiz-data.json';

    let cachedSets = [];
    let localData = null;
    const questionCache = new Map();
    let lastLoadContext = { source: 'local', status: 'idle', error: null, fallback: false };

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
                if (!res.ok) throw new Error(`HTTP ${res.status}`);

                localData = await res.json();
                lastLoadContext = { source: url, status: 'ready', error: null, fallback: url !== DATA_URL };
                return localData;
            } catch (err) {
                console.warn('[Quiz] Unable to load quiz-data.json from', url, err);
                lastLoadContext = { source: url, status: 'error', error: err && err.message, fallback: false };
            }
        }

        localData = { packs: [], questions: {} };
        lastLoadContext = { source: 'local', status: 'error', error: 'No quiz data found', fallback: true };
        return localData;
    }

    function resolveQuestionAudio(q, pack) {
        const explicit = q.audioUrl || q.audio || '';
        if (!explicit) return '';

        if (/^(https?:)?\/\//.test(explicit) || explicit.startsWith('/')) {
            return explicit;
        }

        const basePath = pack?.config?.audioBasePath || '';
        if (!basePath) return explicit;

        return `${String(basePath).replace(/\/?$/, '/')}${String(explicit).replace(/^\//, '')}`;
    }

    function getQuestionsForPack(data, pack) {
        const keyed = data?.questions && (data.questions[String(pack.id)] || data.questions[pack.id]);
        if (Array.isArray(keyed) && keyed.length) return keyed;
        if (Array.isArray(pack.questions)) return pack.questions;
        return [];
    }

    function normaliseLocalPacks(data) {
        const rawPacks = (data && (data.packs || data.sets || data.quizSets)) || [];
        const packList = Array.isArray(rawPacks)
            ? rawPacks
            : Object.values(rawPacks || {});

        return packList
            .map((pack) => {
                if (!pack) return null;
                if (pack.disabled === true || pack.disabled === 'true') return null;
                if (pack.enabled === false || pack.enabled === 'false') return null;

                const id = pack.id || pack.slug || pack.name;
                if (!id) return null;

                const questions = getQuestionsForPack(data, pack);
                const rawCount = pack.questionCount;
                const parsedCount = typeof rawCount === 'string' ? Number.parseInt(rawCount, 10) : rawCount;
                const questionCount = Number.isFinite(parsedCount)
                    ? parsedCount
                    : questions.length;

                return {
                    id: String(id),
                    slug: pack.slug || String(id),
                    name: pack.name || pack.title || 'Quiz Pack',
                    type: pack.type || 'multiple-choice',
                    difficulty: pack.difficulty || 'Normal',
                    description: pack.description || pack.tagline || '',
                    icon: pack.icon || '',
                    questionCount,
                    config: pack.config || {},
                    externalHref: pack.externalHref || pack.href || '',
                    questions
                };
            })
            .filter(Boolean);
    }

    function renderStats(packs) {
        const packEls = document.querySelectorAll('[data-quiz-pack-count]');
        const questionEls = document.querySelectorAll('[data-quiz-question-count]');

        const totalPacks = Array.isArray(packs) ? packs.length : 0;
        const totalQuestions = (packs || []).reduce((sum, pack) => {
            const include = pack.type !== 'hangman';
            const count = include && typeof pack.questionCount === 'number' ? pack.questionCount : 0;
            return sum + count;
        }, 0);

        packEls.forEach((el) => { el.textContent = totalPacks; });
        questionEls.forEach((el) => { el.textContent = totalQuestions || '—'; });
    }

    function renderPackStatus(packs) {
        const totalPacks = Array.isArray(packs) ? packs.length : 0;

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
        labels.forEach((label) => {
            if (!pack) {
                label.textContent = 'Pick a pack to begin';
                return;
            }
            if (pack.type === 'hangman') {
                label.textContent = pack.name;
                return;
            }
            const countText = typeof pack.questionCount === 'number' && pack.questionCount > 0
                ? `${pack.questionCount} Qs`
                : 'Live pack';
            label.textContent = `${pack.name} (${countText})`;
        });
    }

    function updateSetQuestionCount(setId, count) {
        const target = cachedSets.find((p) => String(p.id) === String(setId));
        if (target) target.questionCount = count;
        renderStats(cachedSets);
    }

    window.loadQuizSets = async function loadQuizSets(cb) {
        if (cachedSets.length) {
            renderStats(cachedSets);
            renderPackStatus(cachedSets);
            if (typeof cb === 'function') cb(cachedSets);
            return;
        }

        setPackStatus('loading', 'Loading quiz packs…');
        lastLoadContext = { source: 'local', status: 'loading', error: null, fallback: false };

        cachedSets = normaliseLocalPacks(await fetchLocalData());
        lastLoadContext = Object.assign({}, lastLoadContext, { status: 'ready' });

        renderStats(cachedSets);
        renderPackStatus(cachedSets);
        if (typeof cb === 'function') cb(cachedSets);
    };

    window.loadQuizQuestions = async function loadQuizQuestions(setId, cb) {
        if (!setId) {
            if (typeof cb === 'function') cb([]);
            return;
        }

        const cached = questionCache.get(String(setId));
        if (cached) {
            updateActivePackLabel(cachedSets.find((p) => String(p.id) === String(setId)) || null);
            if (typeof cb === 'function') cb(cached);
            return;
        }

        setPackStatus('loading', 'Loading questions…');
        lastLoadContext = { source: 'local', status: 'loading', error: null, fallback: lastLoadContext.fallback };

        const localDataState = await fetchLocalData();
        const localPacks = normaliseLocalPacks(localDataState);
        const localPack = localPacks.find((p) => String(p.id) === String(setId));

        const questions = (localPack && Array.isArray(localPack.questions))
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
                    imageUrl: q.imageUrl || q.image || '',
                    audioUrl: resolveQuestionAudio(q, localPack),
                    videoUrl: q.videoUrl || q.video || '',
                    gameName: q.gameName || ''
                };
            })
            : [];

        lastLoadContext = Object.assign({}, lastLoadContext, { status: 'ready' });
        questionCache.set(String(setId), questions);
        updateSetQuestionCount(setId, questions.length);
        updateActivePackLabel(cachedSets.find((p) => String(p.id) === String(setId)) || null);

        if (typeof cb === 'function') cb(questions);
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

    function initQuizBadges() {
        window.loadQuizSets(() => {
            renderPackStatus(cachedSets);
        });
    }

    document.addEventListener('DOMContentLoaded', initQuizBadges);
})();
