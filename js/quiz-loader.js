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
    const GOOGLE_SHEET_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTEMPLATE/pub?output=csv';
    const SCORE_KEY = 'ccg_quiz_local_scores';

    let cachedData = null;
    let normalisedPacks = [];
    let lastLoadContext = { source: 'local', status: 'idle', error: null, fallback: false };

    /* --------------------------------------------------------
       FETCH + NORMALISE
    -------------------------------------------------------- */
    function setPackStatus(state, message) {
        const statusEl = document.querySelector('[data-quiz-pack-status]');
        if (!statusEl) return;

        if (state) statusEl.dataset.state = state;
        if (message) statusEl.textContent = message;
    }

    function parseCsvLine(line) {
        const cells = [];
        let current = '';
        let inQuotes = false;

        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            if (char === '"') {
                if (inQuotes && line[i + 1] === '"') {
                    current += '"';
                    i++;
                } else {
                    inQuotes = !inQuotes;
                }
            } else if (char === ',' && !inQuotes) {
                cells.push(current.trim());
                current = '';
            } else {
                current += char;
            }
        }
        cells.push(current.trim());
        return cells;
    }

    function parseCsv(text) {
        const lines = (text || '')
            .split(/\r?\n/)
            .map(l => l.trim())
            .filter(Boolean);

        if (!lines.length) return [];

        const headers = parseCsvLine(lines.shift());
        return lines.map(line => {
            const cells = parseCsvLine(line);
            const obj = {};
            headers.forEach((key, idx) => {
                obj[key] = cells[idx] || '';
            });
            return obj;
        });
    }

    function rowsToPacks(rows) {
        const packsById = {};

        rows.forEach((row, rowIndex) => {
            if (!row) return;
            const packId = row.packId || row.pack_id || row.id || row.pack || row.setId;
            if (!packId) return;

            const key = String(packId).trim();
            const pack = packsById[key] || {
                id: key,
                name: (row.packName || row.pack_name || row.name || row.title || `Pack ${key}`).trim(),
                description: (row.description || row.tagline || '').trim(),
                difficulty: (row.difficulty || 'Normal').trim(),
                questions: []
            };

            const qText = row.question || row.Question || row.q || row.prompt || '';
            if (!qText) {
                packsById[key] = pack;
                return;
            }

            const optionFields = ['option1', 'option2', 'option3', 'option4', 'Option1', 'Option2', 'Option3', 'Option4'];
            const options = optionFields
                .map(key => row[key])
                .map(opt => (typeof opt === 'string' ? opt.trim() : ''))
                .filter(Boolean);

            let correctIndex = parseInt(row.correctIndex || row.correctOption || row.correct || row.CorrectOption || row.answer, 10);
            if (isNaN(correctIndex)) correctIndex = 0;

            pack.questions.push({
                id: row.qId || row.questionId || `${key}-${rowIndex + 1}`,
                question: qText,
                options,
                correctIndex
            });

            packsById[key] = pack;
        });

        return { packs: Object.values(packsById).filter(p => p.questions.length) };
    }

    function tryParseJsonMaybe(text) {
        try {
            return JSON.parse(text);
        } catch (err) {
            return null;
        }
    }

    async function tryFetchRemoteData() {
        if (!GOOGLE_SHEET_URL) return null;

        try {
            const res = await fetch(GOOGLE_SHEET_URL, { cache: 'no-store' });
            if (!res.ok) throw new Error(`Remote status ${res.status}`);

            const contentType = res.headers.get('content-type') || '';
            if (contentType.includes('application/json')) {
                return await res.json();
            }

            const text = await res.text();
            const maybeJson = tryParseJsonMaybe(text);
            if (maybeJson) return maybeJson;

            const rows = parseCsv(text);
            if (rows.length) {
                return rowsToPacks(rows);
            }

            return null;
        } catch (err) {
            console.warn('[Quiz] Remote sheet fetch failed', err);
            return { error: err };
        }
    }

    async function fetchQuizData() {
        if (cachedData) return cachedData;

        setPackStatus('loading', 'Loading quiz packs…');
        let data = null;
        let remoteError = null;

        const remoteResult = await tryFetchRemoteData();
        if (remoteResult && remoteResult.packs && remoteResult.packs.length) {
            data = remoteResult;
            lastLoadContext = { source: 'remote', status: 'ready', error: null, fallback: false };
        } else if (remoteResult && remoteResult.error) {
            remoteError = remoteResult.error;
            lastLoadContext = {
                source: 'remote',
                status: 'error',
                error: remoteError.message || 'Remote fetch failed',
                fallback: true
            };
        }

        if (!data) {
            try {
                const res = await fetch(DATA_URL, { cache: 'no-store' });
                data = await res.json();
                lastLoadContext = {
                    source: 'local',
                    status: 'ready',
                    error: remoteError ? (remoteError.message || 'Remote fetch failed') : null,
                    fallback: !!remoteError
                };
            } catch (err) {
                console.error('[Quiz] Unable to load quiz-data.json', err);
                data = { packs: [] };
                lastLoadContext = {
                    source: 'local',
                    status: 'error',
                    error: err.message || 'Local load failed',
                    fallback: true
                };
            }
        }

        cachedData = data;

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
        setPackStatus('loading', 'Loading quiz packs…');
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
        renderPackStatus(summary);

        if (typeof cb === 'function') cb(summary);
    };

    window.loadQuizQuestions = async function loadQuizQuestions(setId, cb) {
        await fetchQuizData();
        const pack = normalisedPacks.find(p => String(p.id) === String(setId));
        const questions = pack ? pack.questions.slice() : [];

        updateActivePackLabel(pack);
        if (!pack) {
            setPackStatus('error', 'Selected pack is unavailable. Please try another.');
        }

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

    function renderPackStatus(packs) {
        const totalPacks = Array.isArray(packs) ? packs.length : (packs && packs.packs ? packs.packs.length : 0);

        if (lastLoadContext.status === 'loading') {
            setPackStatus('loading', 'Loading quiz packs…');
            return;
        }

        if (lastLoadContext.status === 'error') {
            const isRemoteError = lastLoadContext.source === 'remote';
            const fallbackMsg = isRemoteError
                ? 'Using local backup — live sheet unreachable.'
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
            renderPackStatus(summary);
        });
    }

    document.addEventListener('DOMContentLoaded', initQuizBadges);
})();
