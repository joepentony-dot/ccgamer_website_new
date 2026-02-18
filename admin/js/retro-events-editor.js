const state = {
  events: [],
  editingId: null,
  dragId: null
};

const el = {
  status: document.querySelector('[data-status]'),
  form: document.querySelector('[data-form]'),
  formHeading: document.querySelector('[data-form-heading]'),
  list: document.querySelector('[data-event-list]'),
  saveJson: document.querySelector('[data-action="save-json"]'),
  resetForm: document.querySelector('[data-action="reset-form"]'),
  saveEvent: document.querySelector('[data-action="save-event"]')
};

const fields = {
  id: document.querySelector('[data-field="id"]'),
  title: document.querySelector('[data-field="title"]'),
  youtubeId: document.querySelector('[data-field="youtubeId"]'),
  url: document.querySelector('[data-field="url"]'),
  membersOnly: document.querySelector('[data-field="membersOnly"]'),
  badge: document.querySelector('[data-field="badge"]'),
  order: document.querySelector('[data-field="order"]')
};

init();

async function init() {
  bindEvents();
  await loadEvents();
  renderEvents();
}

function bindEvents() {
  el.form?.addEventListener('submit', onSaveEvent);
  el.resetForm?.addEventListener('click', resetForm);
  el.saveJson?.addEventListener('click', saveJsonFile);
}

async function loadEvents() {
  try {
    const response = await fetch('/data/retro-events.json', { cache: 'no-store' });
    if (!response.ok) {
      throw new Error(`Failed to load retro-events.json (${response.status})`);
    }
    const data = await response.json();
    state.events = sanitizeEvents(data);
    syncOrder();
    setStatus(`Loaded ${state.events.length} retro events.`, false);
  } catch (error) {
    state.events = [];
    setStatus(error.message, true);
  }
}

function sanitizeEvents(data) {
  if (!Array.isArray(data)) return [];
  return data
    .map((event) => ({
      id: String(event?.id || '').trim(),
      title: String(event?.title || '').trim(),
      youtubeId: String(event?.youtubeId || '').trim(),
      url: String(event?.url || '').trim(),
      membersOnly: event?.membersOnly === true,
      badge: String(event?.badge || '').trim(),
      order: Number.isFinite(Number(event?.order)) ? Number(event.order) : 0
    }))
    .filter((event) => event.id && event.title && event.youtubeId && event.url)
    .sort((a, b) => (a.order || 9999) - (b.order || 9999));
}

function onSaveEvent(event) {
  event.preventDefault();

  const next = {
    id: slugify(fields.id.value),
    title: fields.title.value.trim(),
    youtubeId: fields.youtubeId.value.trim(),
    url: fields.url.value.trim(),
    membersOnly: fields.membersOnly.checked,
    badge: fields.badge.value.trim(),
    order: Number(fields.order.value) || 0
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
      setStatus(`Updated event "${next.title}".`, false);
    }
  } else {
    state.events.push(next);
    setStatus(`Added event "${next.title}".`, false);
  }

  sortAndSyncOrder();
  resetForm();
  renderEvents();
}

function validateEvent(next) {
  const errors = [];
  if (!next.id) errors.push('ID is required.');
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(next.id)) {
    errors.push('ID must be a lowercase slug with hyphens.');
  }
  if (!next.title) errors.push('Title is required.');
  if (!next.youtubeId) errors.push('YouTube ID is required.');
  if (!next.url) errors.push('URL is required.');

  try {
    const parsed = new URL(next.url);
    if (!parsed.protocol.startsWith('http')) {
      errors.push('URL must start with http or https.');
    }
  } catch {
    errors.push('URL must be valid.');
  }

  const duplicate = state.events.find((item) => item.id === next.id && item.id !== state.editingId);
  if (duplicate) {
    errors.push(`ID "${next.id}" already exists.`);
  }

  return errors;
}

function renderEvents() {
  el.list.innerHTML = '';

  if (!state.events.length) {
    el.list.innerHTML = '<li class="retro-item"><span class="retro-item-title">No events yet.</span></li>';
    return;
  }

  state.events.forEach((eventItem) => {
    const item = document.createElement('li');
    item.className = 'retro-item';
    item.draggable = true;
    item.dataset.id = eventItem.id;

    const pills = [];
    if (eventItem.membersOnly) {
      pills.push('<span class="retro-pill members">Members only</span>');
    }
    if (eventItem.badge) {
      pills.push(`<span class="retro-pill badge">${escapeHtml(eventItem.badge)}</span>`);
    }

    item.innerHTML = `
      <span class="retro-drag" aria-hidden="true">☰</span>
      <div class="retro-item-meta">
        <span class="retro-item-title">${escapeHtml(eventItem.title)}</span>
        <span class="retro-item-sub">${escapeHtml(eventItem.id)} · ${escapeHtml(eventItem.youtubeId)} · order ${eventItem.order}</span>
        <span class="retro-item-sub">${pills.join('')}</span>
      </div>
      <div class="retro-item-buttons">
        <button type="button" class="ccg-btn ccg-btn--ghost" data-action="edit" data-id="${escapeHtml(eventItem.id)}">Edit</button>
        <button type="button" class="ccg-btn ccg-btn--ghost" data-action="delete" data-id="${escapeHtml(eventItem.id)}">Delete</button>
      </div>
    `;

    wireDragEvents(item);
    item.querySelector('[data-action="edit"]')?.addEventListener('click', () => startEdit(eventItem.id));
    item.querySelector('[data-action="delete"]')?.addEventListener('click', () => deleteEvent(eventItem.id));

    el.list.appendChild(item);
  });
}

function wireDragEvents(item) {
  item.addEventListener('dragstart', () => {
    state.dragId = item.dataset.id;
    item.classList.add('dragging');
  });

  item.addEventListener('dragend', () => {
    state.dragId = null;
    item.classList.remove('dragging');
    syncOrder();
    renderEvents();
    setStatus('Reordered events.', false);
  });

  item.addEventListener('dragover', (event) => {
    event.preventDefault();
  });

  item.addEventListener('drop', (event) => {
    event.preventDefault();
    const targetId = item.dataset.id;
    if (!state.dragId || !targetId || state.dragId === targetId) return;

    const from = state.events.findIndex((entry) => entry.id === state.dragId);
    const to = state.events.findIndex((entry) => entry.id === targetId);
    if (from < 0 || to < 0) return;

    const [moved] = state.events.splice(from, 1);
    state.events.splice(to, 0, moved);
  });
}

function startEdit(id) {
  const eventItem = state.events.find((entry) => entry.id === id);
  if (!eventItem) return;

  state.editingId = id;
  fields.id.value = eventItem.id;
  fields.title.value = eventItem.title;
  fields.youtubeId.value = eventItem.youtubeId;
  fields.url.value = eventItem.url;
  fields.membersOnly.checked = eventItem.membersOnly;
  fields.badge.value = eventItem.badge || '';
  fields.order.value = String(eventItem.order || '');

  el.formHeading.textContent = `Edit Event: ${eventItem.title}`;
  el.saveEvent.textContent = 'Update Event';
}

function deleteEvent(id) {
  const eventItem = state.events.find((entry) => entry.id === id);
  if (!eventItem) return;

  state.events = state.events.filter((entry) => entry.id !== id);
  if (state.editingId === id) {
    resetForm();
  }
  syncOrder();
  renderEvents();
  setStatus(`Deleted event "${eventItem.title}".`, false);
}

async function saveJsonFile() {
  const payload = JSON.stringify(state.events.map((entry, index) => ({
    id: entry.id,
    title: entry.title,
    youtubeId: entry.youtubeId,
    url: entry.url,
    membersOnly: entry.membersOnly,
    ...(entry.badge ? { badge: entry.badge } : {}),
    order: index + 1
  })), null, 2);

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
  setStatus('Downloaded retro-events.json. Replace /data/retro-events.json with this file.', false);
}

function sortAndSyncOrder() {
  state.events.sort((a, b) => {
    const ao = Number(a.order) || Number.MAX_SAFE_INTEGER;
    const bo = Number(b.order) || Number.MAX_SAFE_INTEGER;
    return ao - bo;
  });
  syncOrder();
}

function syncOrder() {
  state.events = state.events.map((entry, index) => ({ ...entry, order: index + 1 }));
}

function resetForm() {
  state.editingId = null;
  el.form?.reset();
  fields.membersOnly.checked = false;
  el.formHeading.textContent = 'Add Event';
  el.saveEvent.textContent = 'Add Event';
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
