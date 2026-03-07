const DATA_PATH = '/data/retro-events.json';

const state = {
  events: [],
  editingId: null
};

const el = {
  status: document.querySelector('[data-status]'),
  form: document.querySelector('[data-form]'),
  formHeading: document.querySelector('[data-form-heading]'),
  list: document.querySelector('[data-event-list]'),
  saveJson: document.querySelector('[data-action="save-json"]'),
  resetForm: document.querySelector('[data-action="reset-form"]'),
  saveEvent: document.querySelector('[data-action="save-event"]'),
  builderButtons: Array.from(document.querySelectorAll('[data-builder-select]')),
  previewTitle: document.querySelector('[data-preview-title]'),
  previewThumb: document.querySelector('[data-preview-thumb]'),
  previewMembers: document.querySelector('[data-preview-members]'),
  seoFieldsWrap: document.querySelector('[data-seo-fields]')
};

const fields = {
  type: document.querySelector('[data-field="type"]'),
  title: document.querySelector('[data-field="title"]'),
  youtubeId: document.querySelector('[data-field="youtubeId"]'),
  membersOnly: document.querySelector('[data-field="membersOnly"]'),
  seoTitle: document.querySelector('[data-field="seoTitle"]'),
  seoDescription: document.querySelector('[data-field="seoDescription"]'),
  composer: document.querySelector('[data-field="composer"]'),
  demo_group: document.querySelector('[data-field="demo_group"]'),
  year: document.querySelector('[data-field="year"]'),
  format: document.querySelector('[data-field="format"]'),
  thumbnail: document.querySelector('[data-field="thumbnail"]'),
  description: document.querySelector('[data-field="description"]')
};

init();

async function init() {
  bindEvents();
  await loadEvents();
  renderEvents();
  resetForm();
}

function bindEvents() {
  el.form?.addEventListener('submit', onSaveEvent);
  el.resetForm?.addEventListener('click', resetForm);
  el.saveJson?.addEventListener('click', saveJsonFile);

  el.builderButtons.forEach((button) => {
    button.addEventListener('click', () => {
      if (button.dataset.builderSelect === 'game') {
        window.location.href = '/admin/games-editor.html';
      }
    });
  });

  document.addEventListener('input', (event) => {
    if (!event.target.matches('[data-field]')) return;
    renderPreview();
  });

  document.addEventListener('change', (event) => {
    if (!event.target.matches('[data-field]')) return;
    if (event.target === fields.type) {
      updateSeoVisibility();
      updateFormHeading();
    }
    renderPreview();
  });
}

async function loadEvents() {
  try {
    const response = await fetch(DATA_PATH, { cache: 'no-store' });
    if (!response.ok) {
      throw new Error(`Failed to load retro-events.json (${response.status})`);
    }
    const data = await response.json();
    state.events = sanitizeEvents(data);
    setStatus(`Loaded ${state.events.length} non-game videos from ${DATA_PATH}.`, false);
  } catch (error) {
    state.events = [];
    setStatus(error.message, true);
  }
}

function sanitizeEvents(data) {
  if (!Array.isArray(data)) return [];

  return data
    .map((eventItem) => sanitizeEvent(eventItem))
    .filter((eventItem) => eventItem.id && eventItem.title && eventItem.youtubeId);
}

function sanitizeEvent(eventItem) {
  const type = normalizeType(eventItem?.type);
  const title = String(eventItem?.title || '').trim();
  const youtubeId = String(eventItem?.youtubeId || '').trim();

  return {
    id: String(eventItem?.id || '').trim(),
    type,
    title,
    youtubeId,
    membersOnly: eventItem?.membersOnly === true,
    composer: String(eventItem?.composer || '').trim(),
    demo_group: String(eventItem?.demo_group || eventItem?.group || '').trim(),
    year: String(eventItem?.year ?? '').trim(),
    format: String(eventItem?.format || '').trim(),
    youtube: String(eventItem?.youtube || '').trim(),
    thumbnail: String(eventItem?.thumbnail || '').trim(),
    description: String(eventItem?.description || '').trim(),
    seo: sanitizeSeo(eventItem?.seo, { title, type })
  };
}

function sanitizeSeo(seo, context) {
  const fallbackTitle = buildSeoTitle(context.title, context.type);
  const fallbackDescription = buildSeoDescription(context.title, context.type);

  const title = String(seo?.title || '').trim() || fallbackTitle;
  const description = String(seo?.description || '').trim() || fallbackDescription;

  return { title, description };
}

function onSaveEvent(event) {
  event.preventDefault();

  const type = getSelectedType();
  const title = fields.title.value.trim();
  const youtubeId = fields.youtubeId.value.trim();
  const membersOnly = fields.membersOnly.checked;
  const seoTitle = fields.seoTitle.value.trim();
  const seoDescription = fields.seoDescription.value.trim();
  const composer = fields.composer.value.trim();
  const demo_group = fields.demo_group.value.trim();
  const year = fields.year.value.trim();
  const format = fields.format.value.trim();
  const thumbnail = fields.thumbnail.value.trim();
  const description = fields.description.value.trim();

  const slugBase = slugify(title) || slugify(youtubeId);
  const prefix = getTypePrefix(type);
  const id = `${prefix}${slugBase}`;

  const next = {
    id,
    type,
    title,
    youtubeId,
    membersOnly,
    composer,
    demo_group,
    year: year ? Number(year) || year : '',
    format,
    youtube: youtubeId,
    thumbnail,
    description,
    seo: {
      title: seoTitle || buildSeoTitle(title, type),
      description: seoDescription || buildSeoDescription(title, type)
    }
  };

  const validationErrors = validateEvent(next);
  if (validationErrors.length) {
    setStatus(validationErrors.join(' '), true);
    return;
  }

  if (state.editingId) {
    const idx = state.events.findIndex((item) => item.id === state.editingId);
    if (idx >= 0) {
      state.events[idx] = next;
      setStatus(`Updated ${getTypeLabel(next.type).toLowerCase()} "${next.title}".`, false);
    }
  } else {
    state.events.push(next);
    setStatus(`Added ${getTypeLabel(next.type).toLowerCase()} "${next.title}".`, false);
  }

  renderEvents();
  resetForm();
}

function validateEvent(next) {
  const errors = [];

  if (next.type !== 'retro_event' && next.type !== 'demo_music') {
    errors.push('Content Type is invalid.');
  }

  if (!next.title) errors.push('Title is required.');
  if (!next.youtubeId) errors.push('YouTube Video ID is required.');
  if (!/^[A-Za-z0-9_-]{6,20}$/.test(next.youtubeId)) {
    errors.push('YouTube Video ID format looks invalid.');
  }
  if (!next.id || !next.id.startsWith(getTypePrefix(next.type))) {
    errors.push('Generated ID is invalid for the selected content type.');
  }

  const duplicate = state.events.find((item) => item.id === next.id && item.id !== state.editingId);
  if (duplicate) {
    errors.push(`An event with this title-derived id already exists: "${next.id}".`);
  }

  return errors;
}

function renderPreview() {
  const title = fields.title.value.trim() || 'Retro Event Title';
  const youtubeId = fields.youtubeId.value.trim() || 'dQw4w9WgXcQ';

  if (!state.editingId) {
    updateFormHeading();
  }

  if (el.previewTitle) el.previewTitle.textContent = title;
  if (el.previewThumb) el.previewThumb.src = `https://img.youtube.com/vi/${encodeURIComponent(youtubeId)}/hqdefault.jpg`;
  if (el.previewMembers) {
    el.previewMembers.hidden = !fields.membersOnly.checked;
  }
}

function renderEvents() {
  if (!el.list) return;
  el.list.innerHTML = '';

  if (!state.events.length) {
    el.list.innerHTML = '<li class="retro-item"><span class="retro-item-title">No events yet.</span></li>';
    return;
  }

  state.events.forEach((eventItem) => {
    const item = document.createElement('li');
    item.className = 'retro-item';
    const typeLabel = getTypeLabel(eventItem.type);

    item.innerHTML = `
      <div>
        <span class="retro-item-title">${escapeHtml(eventItem.title)}</span>
        <span class="mode-pill">${escapeHtml(typeLabel)}</span>
        ${eventItem.membersOnly ? '<span class="retro-pill members">Members Only</span>' : ''}
        <div class="retro-item-sub">${escapeHtml(eventItem.id)} · ${escapeHtml(eventItem.youtubeId)}</div>
      </div>
      <div class="retro-item-buttons">
        <button type="button" class="ccg-btn ccg-btn--ghost" data-action="edit" data-id="${escapeHtml(eventItem.id)}">Edit</button>
        <button type="button" class="ccg-btn ccg-btn--ghost" data-action="delete" data-id="${escapeHtml(eventItem.id)}">Delete</button>
      </div>
    `;

    item.querySelector('[data-action="edit"]')?.addEventListener('click', () => startEdit(eventItem.id));
    item.querySelector('[data-action="delete"]')?.addEventListener('click', () => deleteEvent(eventItem.id));

    el.list.appendChild(item);
  });
}

function startEdit(id) {
  const eventItem = state.events.find((entry) => entry.id === id);
  if (!eventItem) return;

  state.editingId = id;
  fields.type.value = eventItem.type;
  fields.title.value = eventItem.title;
  fields.youtubeId.value = eventItem.youtubeId;
  fields.membersOnly.checked = eventItem.membersOnly;
  fields.seoTitle.value = String(eventItem?.seo?.title || '').trim();
  fields.seoDescription.value = String(eventItem?.seo?.description || '').trim();
  fields.composer.value = String(eventItem?.composer || '').trim();
  fields.demo_group.value = String(eventItem?.demo_group || '').trim();
  fields.year.value = String(eventItem?.year ?? '').trim();
  fields.format.value = String(eventItem?.format || '').trim();
  fields.thumbnail.value = String(eventItem?.thumbnail || '').trim();
  fields.description.value = String(eventItem?.description || '').trim();

  updateSeoVisibility();
  el.formHeading.textContent = `Edit ${getTypeLabel(eventItem.type)}: ${eventItem.title}`;
  el.saveEvent.textContent = 'Save / Update';
  renderPreview();
}

function deleteEvent(id) {
  const eventItem = state.events.find((entry) => entry.id === id);
  if (!eventItem) return;

  state.events = state.events.filter((entry) => entry.id !== id);
  if (state.editingId === id) {
    resetForm();
  }
  renderEvents();
  setStatus(`Deleted ${getTypeLabel(eventItem.type).toLowerCase()} "${eventItem.title}".`, false);
}

async function saveJsonFile() {
  const payload = JSON.stringify(state.events, null, 2);

  if (typeof window.showSaveFilePicker === 'function') {
    try {
      const handle = await window.showSaveFilePicker({
        suggestedName: 'retro-events.json',
        types: [{ description: 'JSON Files', accept: { 'application/json': ['.json'] } }]
      });
      const writable = await handle.createWritable();
      await writable.write(payload + '\n');
      await writable.close();
      setStatus('Saved retro-events.json using file picker.', false);
      return;
    } catch (error) {
      setStatus(`File picker save cancelled or failed: ${error.message}`, true);
      return;
    }
  }

  const blob = new Blob([payload + '\n'], { type: 'application/json' });
  const anchor = document.createElement('a');
  anchor.href = URL.createObjectURL(blob);
  anchor.download = 'retro-events.json';
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(anchor.href);
  setStatus(`Downloaded retro-events.json. Replace ${DATA_PATH} with this file.`, false);
}

function resetForm() {
  state.editingId = null;
  el.form?.reset();
  fields.type.value = 'retro_event';
  fields.membersOnly.checked = false;
  fields.seoTitle.value = '';
  fields.seoDescription.value = '';
  fields.composer.value = '';
  fields.demo_group.value = '';
  fields.year.value = '';
  fields.format.value = '';
  fields.thumbnail.value = '';
  fields.description.value = '';
  updateSeoVisibility();
  updateFormHeading();
  el.saveEvent.textContent = 'Save / Update';
  renderPreview();
}

function normalizeType(type) {
  return (type === 'demo_music' || type === 'amiga_demo_music') ? 'demo_music' : 'retro_event';
}

function getSelectedType() {
  return normalizeType(fields.type?.value);
}

function getTypePrefix(type) {
  return type === 'demo_music' ? 'amiga-demo-music-' : 'retro-events-';
}

function getTypeLabel(type) {
  return type === 'demo_music' ? 'Demo Music' : 'Event';
}

function updateFormHeading() {
  const type = getSelectedType();
  el.formHeading.textContent = `Add ${getTypeLabel(type)}`;
}

function updateSeoVisibility() {
  if (!el.seoFieldsWrap) return;
  el.seoFieldsWrap.hidden = getSelectedType() !== 'demo_music';
}

function buildSeoTitle(title, type) {
  if (!title) return '';
  if (type === 'demo_music') {
    return `${title} | Amiga Demo Music | Cheeky Commodore Gamer`;
  }
  return `${title} | Retro Event | Cheeky Commodore Gamer`;
}

function buildSeoDescription(title, type) {
  if (!title) return '';
  if (type === 'demo_music') {
    return `Watch ${title} on Cheeky Commodore Gamer's Amiga Demo Music collection.`;
  }
  return `Watch ${title} on Cheeky Commodore Gamer's Retro Events collection.`;
}

function slugify(value) {
  return String(value || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function setStatus(message, isError) {
  if (!el.status) return;
  el.status.textContent = message;
  el.status.className = `retro-status ${isError ? 'error' : 'ok'}`;
}
