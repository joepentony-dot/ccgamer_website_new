(function () {
  'use strict';

  const state = {
    data: { packs: [], questions: {} },
    selectedPackId: null
  };

  const els = {
    messages: document.getElementById('admin-messages'),
    loadDefault: document.getElementById('admin-load-default'),
    importJson: document.getElementById('admin-import-json'),
    backupJson: document.getElementById('admin-backup-json'),
    downloadJson: document.getElementById('admin-download-json'),
    validateJson: document.getElementById('admin-validate-json'),
    addPack: document.getElementById('admin-add-pack'),
    packList: document.getElementById('admin-pack-list'),
    addQuestion: document.getElementById('admin-add-question'),
    questionList: document.getElementById('admin-question-list'),
    packTitleHeading: document.getElementById('admin-pack-title'),
    savePack: document.getElementById('admin-save-pack'),
    deletePack: document.getElementById('admin-delete-pack'),
    packId: document.getElementById('pack-id'),
    packSlug: document.getElementById('pack-slug'),
    packTitle: document.getElementById('pack-title'),
    packName: document.getElementById('pack-name'),
    packType: document.getElementById('pack-type'),
    packCount: document.getElementById('pack-count'),
    packEnabled: document.getElementById('pack-enabled'),
    packHref: document.getElementById('pack-href'),
    packAudioBase: document.getElementById('pack-audio-base'),
    audioList: document.getElementById('admin-audio-files')
  };

  function msg(text, level = 'info') {
    els.messages.textContent = text;
    els.messages.dataset.level = level;
  }

  function deepClone(v) {
    return JSON.parse(JSON.stringify(v));
  }

  function selectedPack() {
    return state.data.packs.find((p) => String(p.id) === String(state.selectedPackId)) || null;
  }

  function ensureQuestionsBucket(packId) {
    const key = String(packId);
    if (!Array.isArray(state.data.questions[key])) {
      state.data.questions[key] = [];
    }
    return state.data.questions[key];
  }

  function getPackQuestions(pack) {
    const key = String(pack.id);
    const keyed = state.data.questions?.[key];
    if (Array.isArray(keyed)) return keyed;
    if (Array.isArray(pack.questions)) return pack.questions;
    return [];
  }

  function syncPackQuestionCount(pack) {
    const list = getPackQuestions(pack);
    pack.questionCount = list.length;
  }

  async function loadDefaultData() {
    try {
      const res = await fetch('./quiz-data.json', { cache: 'no-store' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      state.data = await res.json();
      if (!state.data.questions) state.data.questions = {};
      state.selectedPackId = state.data.packs?.[0]?.id ?? null;
      renderAll();
      msg('Loaded quiz-data.json from disk.', 'ok');
    } catch (err) {
      msg(`Could not load quiz-data.json: ${err.message}`, 'warn');
    }
  }

  function importJson(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result || '{}'));
        if (!Array.isArray(parsed.packs)) throw new Error('JSON must contain packs array');
        if (!parsed.questions || typeof parsed.questions !== 'object') parsed.questions = {};
        state.data = parsed;
        state.selectedPackId = parsed.packs?.[0]?.id ?? null;
        renderAll();
        msg(`Imported ${file.name}.`, 'ok');
      } catch (err) {
        msg(`Import failed: ${err.message}`, 'warn');
      }
    };
    reader.readAsText(file);
  }

  function download(filename, content) {
    const blob = new Blob([content], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  function exportJson(isBackup = false) {
    const ts = new Date().toISOString().replace(/[:.]/g, '-');
    const name = isBackup ? `quiz-data-backup-${ts}.json` : 'quiz-data.json';
    download(name, JSON.stringify(state.data, null, 2));
    msg(`${isBackup ? 'Backup' : 'Export'} downloaded: ${name}`, 'ok');
  }

  function validateData() {
    const warnings = [];
    const audioIndex = new Set();

    state.data.packs.forEach((pack) => {
      const qList = getPackQuestions(pack);
      if (!Array.isArray(qList)) {
        warnings.push(`Pack ${pack.id} has no valid questions array.`);
        return;
      }

      qList.forEach((q, idx) => {
        const qNum = idx + 1;
        if (!Array.isArray(q.options) || q.options.length !== 4) {
          warnings.push(`Pack ${pack.id} Q${qNum}: options must be exactly 4.`);
        }
        if (!Number.isInteger(q.correctIndex) || q.correctIndex < 0 || q.correctIndex > 3) {
          warnings.push(`Pack ${pack.id} Q${qNum}: correctIndex must be 0-3.`);
        }

        if (q.audio || q.audioUrl) {
          const base = pack.config?.audioBasePath || '';
          const audio = q.audio || q.audioUrl;
          audioIndex.add(`${base}${audio}`.replace(/\/\//g, '/'));
        }
      });
    });

    if (!warnings.length) {
      msg(`Validation passed. Checked ${audioIndex.size} referenced audio assets.`, 'ok');
    } else {
      msg(`Validation warnings (${warnings.length}): ${warnings[0]}`, 'warn');
    }
    return warnings;
  }


  function renderAudioDatalist() {
    if (!els.audioList) return;
    const files = new Set();
    state.data.packs.forEach((pack) => {
      const questions = getPackQuestions(pack);
      questions.forEach((q) => {
        const audio = (q.audio || q.audioUrl || '').trim();
        if (audio) files.add(audio);
      });
    });
    els.audioList.innerHTML = '';
    Array.from(files).sort().forEach((file) => {
      const opt = document.createElement('option');
      opt.value = file;
      els.audioList.appendChild(opt);
    });
  }

  function renderPackList() {
    els.packList.innerHTML = '';
    state.data.packs.forEach((pack) => {
      const li = document.createElement('li');
      li.className = String(pack.id) === String(state.selectedPackId) ? 'active' : '';
      li.textContent = `#${pack.id} ${pack.title || pack.name || 'Untitled'} (${pack.type || 'multiple-choice'})`;
      li.addEventListener('click', () => {
        state.selectedPackId = pack.id;
        renderAll();
      });
      els.packList.appendChild(li);
    });
  }

  function renderPackEditor() {
    const pack = selectedPack();
    const hasPack = Boolean(pack);
    els.addQuestion.disabled = !hasPack;

    if (!hasPack) {
      els.packTitleHeading.textContent = 'Select a pack';
      return;
    }

    syncPackQuestionCount(pack);
    els.packTitleHeading.textContent = `Editing Pack ${pack.id}: ${pack.title || pack.name || 'Untitled'}`;

    els.packId.value = pack.id ?? '';
    els.packSlug.value = pack.slug ?? '';
    els.packTitle.value = pack.title ?? '';
    els.packName.value = pack.name ?? '';
    els.packType.value = pack.type ?? 'multiple-choice';
    els.packCount.value = pack.questionCount ?? 0;
    els.packEnabled.checked = pack.enabled !== false;
    els.packHref.value = pack.externalHref || '';
    els.packAudioBase.value = pack.config?.audioBasePath || '';
  }

  function audioPreviewSrc(pack, q) {
    const base = pack?.config?.audioBasePath || '';
    const file = q.audio || q.audioUrl || '';
    if (!file) return '';
    if (/^(https?:)?\/\//.test(file) || file.startsWith('/')) return file;
    return `${base.replace(/\/?$/, '/')}${file.replace(/^\//, '')}`;
  }

  function renderQuestionList() {
    els.questionList.innerHTML = '';
    const pack = selectedPack();
    if (!pack) return;

    const questions = ensureQuestionsBucket(pack.id);
    if (!questions.length) {
      const li = document.createElement('li');
      li.textContent = 'No questions in this pack yet.';
      els.questionList.appendChild(li);
      return;
    }

    questions.forEach((q, idx) => {
      const li = document.createElement('li');
      const editor = document.createElement('div');
      editor.className = 'question-editor';

      const options = Array.isArray(q.options) ? q.options : ['', '', '', ''];
      while (options.length < 4) options.push('');

      const audioSrc = audioPreviewSrc(pack, q);
      const audioHtml = audioSrc
        ? `<audio class="audio-preview" controls src="${audioSrc}"></audio><small class="ok">Audio ref: ${audioSrc}</small>`
        : '<small class="warn">No audio assigned.</small>';

      editor.innerHTML = `
        <label>Question
          <textarea rows="2" data-field="question">${q.question || ''}</textarea>
        </label>
        <label>Audio file (optional)
          <input type="text" data-field="audio" list="admin-audio-files" value="${q.audio || q.audioUrl || ''}" />
        </label>
        ${audioHtml}
        <div class="question-options">
          <label>Option 1 <input type="text" data-field="option0" value="${options[0] || ''}" /></label>
          <label>Option 2 <input type="text" data-field="option1" value="${options[1] || ''}" /></label>
          <label>Option 3 <input type="text" data-field="option2" value="${options[2] || ''}" /></label>
          <label>Option 4 <input type="text" data-field="option3" value="${options[3] || ''}" /></label>
        </div>
        <label>Correct Index (0-3)
          <input type="number" min="0" max="3" data-field="correctIndex" value="${Number.isInteger(q.correctIndex) ? q.correctIndex : 0}" />
        </label>
        <div class="question-actions">
          <button type="button" data-action="save">Save Question</button>
          <button type="button" class="danger" data-action="delete">Delete Question</button>
          <span>Question ${idx + 1}</span>
        </div>
      `;

      editor.addEventListener('click', (event) => {
        const target = event.target;
        if (!(target instanceof HTMLElement)) return;

        if (target.dataset.action === 'save') {
          const question = editor.querySelector('[data-field="question"]').value.trim();
          const audio = editor.querySelector('[data-field="audio"]').value.trim();
          const newOptions = [0, 1, 2, 3].map((i) => editor.querySelector(`[data-field="option${i}"]`).value.trim());
          const correctIndex = Number(editor.querySelector('[data-field="correctIndex"]').value);

          questions[idx] = {
            question,
            audio,
            options: newOptions,
            correctIndex: Number.isFinite(correctIndex) ? Math.max(0, Math.min(3, correctIndex)) : 0
          };
          syncPackQuestionCount(pack);
          renderAll();
          msg(`Saved question ${idx + 1} in pack ${pack.id}.`, 'ok');
        }

        if (target.dataset.action === 'delete') {
          questions.splice(idx, 1);
          syncPackQuestionCount(pack);
          renderAll();
          msg(`Deleted question ${idx + 1} from pack ${pack.id}.`, 'ok');
        }
      });

      li.appendChild(editor);
      els.questionList.appendChild(li);
    });
  }

  function savePackForm() {
    const pack = selectedPack();
    if (!pack) return;

    pack.id = Number(els.packId.value) || pack.id;
    pack.slug = els.packSlug.value.trim();
    pack.title = els.packTitle.value.trim();
    pack.name = els.packName.value.trim() || pack.title;
    pack.type = els.packType.value;
    pack.questionCount = Number(els.packCount.value) || 0;
    pack.enabled = Boolean(els.packEnabled.checked);
    pack.externalHref = els.packHref.value.trim();

    if (!pack.config || typeof pack.config !== 'object') pack.config = {};
    pack.config.audioBasePath = els.packAudioBase.value.trim();

    const oldKey = String(state.selectedPackId);
    const newKey = String(pack.id);
    if (oldKey !== newKey && state.data.questions[oldKey]) {
      state.data.questions[newKey] = deepClone(state.data.questions[oldKey]);
      delete state.data.questions[oldKey];
      state.selectedPackId = pack.id;
    }

    syncPackQuestionCount(pack);
    renderAll();
    msg(`Saved pack ${pack.id}.`, 'ok');
  }

  function addPack() {
    const nextId = state.data.packs.reduce((max, p) => Math.max(max, Number(p.id) || 0), 0) + 1;
    const pack = {
      id: nextId,
      slug: `pack-${nextId}`,
      title: `New Pack ${nextId}`,
      name: `New Pack ${nextId}`,
      type: 'multiple-choice',
      questionCount: 0,
      enabled: true,
      config: {}
    };
    state.data.packs.push(pack);
    ensureQuestionsBucket(nextId);
    state.selectedPackId = nextId;
    renderAll();
    msg(`Added pack ${nextId}.`, 'ok');
  }

  function deletePack() {
    const pack = selectedPack();
    if (!pack) return;

    state.data.packs = state.data.packs.filter((p) => String(p.id) !== String(pack.id));
    delete state.data.questions[String(pack.id)];
    state.selectedPackId = state.data.packs[0]?.id ?? null;
    renderAll();
    msg(`Deleted pack ${pack.id}.`, 'ok');
  }

  function addQuestion() {
    const pack = selectedPack();
    if (!pack) return;

    const questions = ensureQuestionsBucket(pack.id);
    questions.push({
      question: 'New question?',
      audio: '',
      options: ['Option 1', 'Option 2', 'Option 3', 'Option 4'],
      correctIndex: 0
    });
    syncPackQuestionCount(pack);
    renderAll();
    msg(`Added question to pack ${pack.id}.`, 'ok');
  }

  function renderAll() {
    renderAudioDatalist();
    renderPackList();
    renderPackEditor();
    renderQuestionList();
  }

  function wireEvents() {
    els.loadDefault.addEventListener('click', loadDefaultData);
    els.importJson.addEventListener('change', (e) => importJson(e.target.files[0]));
    els.backupJson.addEventListener('click', () => exportJson(true));
    els.downloadJson.addEventListener('click', () => exportJson(false));
    els.validateJson.addEventListener('click', validateData);
    els.addPack.addEventListener('click', addPack);
    els.addQuestion.addEventListener('click', addQuestion);
    els.savePack.addEventListener('click', savePackForm);
    els.deletePack.addEventListener('click', deletePack);
  }

  wireEvents();
  loadDefaultData();
})();
