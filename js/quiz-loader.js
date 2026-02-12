/* ============================================================
   QUIZ LOADER — LOCAL ONLY
   ------------------------------------------------------------
   • Loads packs + questions from local quiz/quiz-data.json
   • Exposes global callbacks consumed by quiz-engine.js
   • Silent visitor/game tracking (best-effort)
   ============================================================ */

(function () {
    'use strict';

    const DATA_URL = './quiz-data.json';
    const CSV_SETS_URL = '/data/quiz_sets.csv';
    const CSV_QUESTIONS_URL = '/data/questions.csv';
    const MIN_PACK_COUNT = 2;

    const QUIZ_PACK_DISPLAY_NAME_MAP = Object.freeze({
        '1': 'Game Questions',
        '2': 'Picture Round',
        '3': 'C64 SID Tunes 1',
        '4': 'Amiga Music 1',
        '5': 'Name That Composer',
        '6': 'Game Box Hangman',
        '7': 'C64 SID Tunes 2'
    });

    function mapPackDisplayName(id, fallbackName) {
        const key = String(id || '').trim();
        return QUIZ_PACK_DISPLAY_NAME_MAP[key] || fallbackName || 'Quiz Pack';
    }


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

    function parseCsv(text) {
        const rows = [];
        let current = '';
        let row = [];
        let inQuotes = false;

        for (let i = 0; i < text.length; i += 1) {
            const char = text[i];
            const next = text[i + 1];

            if (char === '"' && inQuotes && next === '"') {
                current += '"';
                i += 1;
                continue;
            }

            if (char === '"') {
                inQuotes = !inQuotes;
                continue;
            }

            if (char === ',' && !inQuotes) {
                row.push(current);
                current = '';
                continue;
            }

            if ((char === '\n' || char === '\r') && !inQuotes) {
                if (current.length || row.length) {
                    row.push(current);
                    rows.push(row);
                    row = [];
                    current = '';
                }
                if (char === '\r' && next === '\n') {
                    i += 1;
                }
                continue;
            }

            current += char;
        }

        if (current.length || row.length) {
            row.push(current);
            rows.push(row);
        }

        return rows;
    }

    function csvRowsToObjects(rows) {
        if (!rows.length) return [];
        const headers = rows[0].map((h) => h.trim());
        return rows.slice(1).map((row) => {
            const obj = {};
            headers.forEach((header, idx) => {
                obj[header] = row[idx] !== undefined ? row[idx].trim() : '';
            });
            return obj;
        });
    }

    async function fetchCsvFallback() {
        try {
            const [setsRes, questionsRes] = await Promise.all([
                fetch(CSV_SETS_URL, { cache: 'no-store' }),
                fetch(CSV_QUESTIONS_URL, { cache: 'no-store' })
            ]);

            if (!setsRes.ok || !questionsRes.ok) {
                throw new Error(`CSV HTTP ${setsRes.status}/${questionsRes.status}`);
            }

            const [setsText, questionsText] = await Promise.all([
                setsRes.text(),
                questionsRes.text()
            ]);

            const setRows = csvRowsToObjects(parseCsv(setsText));
            const questionRows = csvRowsToObjects(parseCsv(questionsText));

            const packsById = new Map();
            setRows.forEach((row) => {
                const id = row['Set ID'] || row['Set Id'] || row['SetID'] || row['Set'];
                if (!id) return;
                packsById.set(String(id), {
                    id: String(id),
                    name: mapPackDisplayName(id, row['Quiz Name'] || row['Name'] || `Pack ${id}`),
                    icon: row['Icon'] || '',
                    difficulty: row['Difficulty'] || row['Level'] || '',
                    description: row['Description'] || '',
                    questionCount: Number.parseInt(row['Question Count'], 10) || 0,
                    questions: []
                });
            });

            questionRows.forEach((row, index) => {
                const setId = row['Quiz Set'] || row['Set ID'] || row['Set'];
                if (!setId) return;
                const id = String(setId);
                if (!packsById.has(id)) {
                    packsById.set(id, {
                        id,
                        name: mapPackDisplayName(id, `Pack ${id}`),
                        icon: '',
                        difficulty: '',
                        description: '',
                        questionCount: 0,
                        questions: []
                    });
                }

                const options = [
                    row['Option 1'],
                    row['Option 2'],
                    row['Option 3'],
                    row['Option 4']
                ].filter(Boolean);

                const rawIndex = Number.parseInt(row['Answer Index'], 10);
                const correctIndex = Number.isFinite(rawIndex) ? clampIndex(rawIndex - 1, options.length) : 0;

                packsById.get(id).questions.push({
                    id: `${id}-${packsById.get(id).questions.length + 1}`,
                    question: row['Question'] || '',
                    options,
                    correctIndex,
                    imageUrl: row['Image URL'] || '',
                    audioUrl: row['Audio URL'] || '',
                    gameName: row['Game Name'] || ''
                });
            });

            const packs = Array.from(packsById.values()).map((pack) => ({
                ...pack,
                questionCount: pack.questionCount || pack.questions.length
            }));

            return { packs };
        } catch (err) {
            console.warn('[Quiz] CSV fallback failed', err);
            return null;
        }
    }

    function bestEffortPost() {}

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

                const normalised = normaliseLocalPacks(localData);
                if (normalised.length >= MIN_PACK_COUNT) {
                    return localData;
                }

                const csvFallback = await fetchCsvFallback();
                if (csvFallback) {
                    localData = csvFallback;
                    lastLoadContext = { source: 'csv', status: 'ready', error: null, fallback: true };
                }

                return localData;
            } catch (err) {
                console.warn('[Quiz] Unable to load quiz-data.json from', url, err);
                lastLoadContext = { source: url, status: 'error', error: err && err.message, fallback: false };
            }
        }

        const csvFallback = await fetchCsvFallback();
        if (csvFallback) {
            localData = csvFallback;
            lastLoadContext = { source: 'csv', status: 'ready', error: null, fallback: true };
            return localData;
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
                if (pack.disabled === true || pack.disabled === 'true') return null;
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
                    name: mapPackDisplayName(id, pack.name || pack.title || 'Quiz Pack'),
                    difficulty: pack.difficulty || 'Normal',
                    description: pack.description || pack.tagline || '',
                    icon: pack.icon || '',
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
        cachedSets = local.slice().sort((a, b) => String(a.name || '').localeCompare(String(b.name || ''), undefined, { sensitivity: 'base' }));

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
                    imageUrl: q.imageUrl || q.image || '',
                    audioUrl: q.audioUrl || q.audio || '',
                    videoUrl: q.videoUrl || q.video || '',
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

        window.loadQuizSets(() => {
            renderPackStatus(cachedSets);
        });
    }

    document.addEventListener('DOMContentLoaded', initQuizBadges);
})();
