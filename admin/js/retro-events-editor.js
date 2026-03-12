const RETRO_EVENTS_DATA_PATH = '/data/retro-events.json';
const RETRO_SPECIALS_DATA_PATH = '/data/retro-specials.json';
const AMIGA_DEMO_MUSIC_DATA_PATH = '/data/amiga-demo-music.json';

const state = {
  events: [],
  editingId: null
};

const el = {
  status: document.querySelector('[data-status]'),
  form: document.querySelector('[data-form]'),
  formHeading: document.querySelector('[data-form-heading]'),
  list: document.querySelector('[data-event-list]'),
  saveRetroJson: document.querySelector('[data-action="save-retro-json"]'),
  saveSpecialsJson: document.querySelector('[data-action="save-specials-json"]'),
  saveDemoJson: document.querySelector('[data-action="save-demo-json"]'),
  resetForm: document.querySelector('[data-action="reset-form"]'),
  saveEvent: document.querySelector('[data-action="save-event"]'),
  builderButtons: Array.from(document.querySelectorAll('[data-builder-select]')),
  previewTitle: document.querySelector('[data-preview-title]'),
  previewThumb: document.querySelector('[data-preview-thumb]'),
  previewMembers: document.querySelector('[data-preview-members]'),
  typeFilter: document.querySelector('[data-filter="type"]')
};

const fields = {
  type: document.querySelector('[data-field="type"]'),
  title: document.querySelector('[data-field="title"]'),
  slug: document.querySelector('[data-field="slug"]'),
  youtubeUrl: document.querySelector('[data-field="youtubeUrl"]'),
  youtubeId: document.querySelector('[data-field="youtubeId"]'),
  publishedDate: document.querySelector('[data-field="publishedDate"]'),
  sortOrder: document.querySelector('[data-field="sortOrder"]'),
  summary: document.querySelector('[data-field="summary"]'),
  description: document.querySelector('[data-field="description"]'),
  visible: document.querySelector('[data-field="visible"]'),
  membersOnly: document.querySelector('[data-field="membersOnly"]'),
  seoTitle: document.querySelector('[data-field="seoTitle"]'),
  seoDescription: document.querySelector('[data-field="seoDescription"]')
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
  el.saveRetroJson?.addEventListener('click', () => saveJsonFile('retro_event'));
  el.saveSpecialsJson?.addEventListener('click', () => saveJsonFile('retro_special'));
  el.saveDemoJson?.addEventListener('click', () => saveJsonFile('demo_music'));
  el.typeFilter?.addEventListener('change', renderEvents);

  el.builderButtons.forEach((button) => {
    button.addEventListener('click', () => {
      if (button.dataset.builderSelect === 'game') {
        window.location.href = '/admin/games-editor.html';
      }
    });
  });

  fields.youtubeUrl?.addEventListener('input', syncYoutubeIdFromUrl);

  document.addEventListener('input', (event) => {
    if (!event.target.matches('[data-field]')) return;
    renderPreview();
  });

  document.addEventListener('change', (event) => {
    if (!event.target.matches('[data-field]')) return;
    if (event.target === fields.type && !state.editingId) {
      updateFormHeading();
    }
    renderPreview();
  });
}

async function loadEvents() {
  try {
    const [retroResponse, specialsResponse, demoResponse] = await Promise.all([
      fetch(RETRO_EVENTS_DATA_PATH, { cache: 'no-store' }),
      fetch(RETRO_SPECIALS_DATA_PATH, { cache: 'no-store' }),
      fetch(AMIGA_DEMO_MUSIC_DATA_PATH, { cache: 'no-store' })
    ]);

    if (!retroResponse.ok) throw new Error(`Failed to load retro-events.json (${retroResponse.status})`);
    if (!specialsResponse.ok) throw new Error(`Failed to load retro-specials.json (${specialsResponse.status})`);
    if (!demoResponse.ok) throw new Error(`Failed to load amiga-demo-music.json (${demoResponse.status})`);

    const [retroData, specialsData, demoData] = await Promise.all([retroResponse.json(), specialsResponse.json(), demoResponse.json()]);

    state.events = sanitizeEvents([
      ...(Array.isArray(retroData) ? retroData : []),
      ...(Array.isArray(specialsData) ? specialsData : []),
      ...(Array.isArray(demoData) ? demoData : [])
    ]);

    setStatus(`Loaded ${state.events.length} entries from ${RETRO_EVENTS_DATA_PATH}, ${RETRO_SPECIALS_DATA_PATH}, and ${AMIGA_DEMO_MUSIC_DATA_PATH}.`, false);
  } catch (error) {
    state.events = [];
    setStatus(error.message, true);
  }
}

function sanitizeEvents(data) {
  if (!Array.isArray(data)) return [];

  return data
    .map((eventItem, index) => sanitizeEvent(eventItem, index))
    .filter((eventItem) => eventItem.id && eventItem.title && eventItem.youtubeId)
    .sort((a, b) => {
      if (a.sort_order !== b.sort_order) return a.sort_order - b.sort_order;
      return a.index - b.index;
    });
}

function sanitizeEvent(eventItem, index) {
  const type = normalizeType(eventItem?.type);
  const title = String(eventItem?.title || '').trim();
  const youtubeUrl = String(eventItem?.youtube_url || eventItem?.url || '').trim();
  const youtubeId = String(eventItem?.youtube_video_id || eventItem?.youtubeId || eventItem?.youtube || '').trim() || extractYoutubeId(youtubeUrl);
  const slug = String(eventItem?.slug || eventItem?.id || '').trim() || slugify(title) || slugify(youtubeId);
  const rawSort = Number(eventItem?.sort_order ?? eventItem?.order);

  return {
    id: String(eventItem?.id || '').trim() || `${getTypePrefix(type)}${slug}`,
    type,
    title,
    slug,
    youtube_url: youtubeUrl || (youtubeId ? `https://www.youtube.com/watch?v=${encodeURIComponent(youtubeId)}` : ''),
    youtube_video_id: youtubeId,
    youtubeId,
    summary: String(eventItem?.summary || '').trim(),
    description: String(eventItem?.description || '').trim(),
    published_date: String(eventItem?.published_date || eventItem?.event_date || eventItem?.date || '').trim(),
    sort_order: Number.isFinite(rawSort) ? rawSort : index + 1,
    visible: normalizeVisibility(eventItem),
    membersOnly: eventItem?.membersOnly === true,
    thumbnail: String(eventItem?.thumbnail || '').trim() || buildYouTubeThumbnail(youtubeId),
    seo: sanitizeSeo(eventItem?.seo, { title, type }),
    index,
    _legacy: {
      composer: String(eventItem?.composer || '').trim(),
      demo_group: String(eventItem?.demo_group || eventItem?.group || '').trim(),
      year: eventItem?.year ?? '',
      format: String(eventItem?.format || '').trim(),
      badge: String(eventItem?.badge || '').trim()
    }
  };
}

function normalizeVisibility(eventItem) {
  if (eventItem?.visible === false || eventItem?.published === false) return false;
  return true;
}

function sanitizeSeo(seo, context) {
  const fallbackTitle = buildSeoTitle(context.title, context.type);
  const fallbackDescription = buildSeoDescription(context.title, context.type);

  return {
    title: String(seo?.title || '').trim() || fallbackTitle,
    description: String(seo?.description || '').trim() || fallbackDescription
  };
}

function onSaveEvent(event) {
  event.preventDefault();
  syncYoutubeIdFromUrl();

  const type = getSelectedType();
  const title = fields.title.value.trim();
  const rawSlug = fields.slug.value.trim();
  const youtubeUrl = fields.youtubeUrl.value.trim();
  const youtubeId = fields.youtubeId.value.trim();
  const summary = fields.summary.value.trim();
  const description = fields.description.value.trim();
  const publishedDate = fields.publishedDate.value.trim();
  const sortOrder = Number(fields.sortOrder.value);
  const visible = fields.visible.checked;
  const membersOnly = fields.membersOnly.checked;
  const seoTitle = fields.seoTitle.value.trim();
  const seoDescription = fields.seoDescription.value.trim();

  const slug = slugify(rawSlug || title || youtubeId);
  const id = `${getTypePrefix(type)}${slug}`;
  const editingCurrent = state.events.find((item) => item.id === state.editingId);

  const next = {
    id,
    type,
    title,
    slug,
    youtube_url: youtubeUrl || (youtubeId ? `https://www.youtube.com/watch?v=${encodeURIComponent(youtubeId)}` : ''),
    youtube_video_id: youtubeId,
    youtubeId,
    summary,
    description,
    published_date: publishedDate,
    sort_order: Number.isFinite(sortOrder) ? sortOrder : getNextSortOrder(type),
    visible,
    membersOnly,
    thumbnail: buildYouTubeThumbnail(youtubeId),
    seo: {
      title: seoTitle || buildSeoTitle(title, type),
      description: seoDescription || buildSeoDescription(title, type)
    },
    _legacy: editingCurrent?._legacy || { composer: '', demo_group: '', year: '', format: '', badge: '' }
  };

  const validationErrors = validateEvent(next);
  if (validationErrors.length) {
    setStatus(validationErrors.join(' '), true);
    return;
  }

  if (state.editingId) {
    const idx = state.events.findIndex((item) => item.id === state.editingId);
    if (idx >= 0) {
      state.events[idx] = { ...state.events[idx], ...next };
      setStatus(`Updated ${getTypeLabel(next.type).toLowerCase()} "${next.title}".`, false);
    }
  } else {
    state.events.push(next);
    setStatus(`Added ${getTypeLabel(next.type).toLowerCase()} "${next.title}".`, false);
  }

  normalizeSortOrders();
  renderEvents();
  resetForm();
}

function validateEvent(next) {
  const errors = [];
  if (!['retro_event', 'retro_special', 'demo_music'].includes(next.type)) errors.push('Section is invalid.');
  if (!next.title) errors.push('Title is required.');
  if (!next.slug) errors.push('Slug is required.');
  if (next.slug && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(next.slug)) errors.push('Slug must be lowercase kebab-case.');
  if (!next.youtube_video_id) errors.push('YouTube video ID is required.');
  if (!/^[A-Za-z0-9_-]{6,20}$/.test(next.youtube_video_id)) errors.push('YouTube video ID format looks invalid.');
  if (!next.id.startsWith(getTypePrefix(next.type))) errors.push('Generated ID is invalid for the selected section.');

  const duplicateId = state.events.find((item) => item.id === next.id && item.id !== state.editingId);
  if (duplicateId) errors.push(`An entry with this ID already exists: "${next.id}".`);

  const duplicateSlugInType = state.events.find((item) => (
    item.type === next.type
    && String(item.slug || '').trim().toLowerCase() === String(next.slug || '').trim().toLowerCase()
    && item.id !== state.editingId
  ));
  if (duplicateSlugInType) errors.push(`Slug already exists in ${getTypeLabel(next.type)}: "${next.slug}".`);

  return errors;
}

function renderPreview() {
  const title = fields.title.value.trim() || 'Retro Video Title';
  const youtubeId = fields.youtubeId.value.trim() || extractYoutubeId(fields.youtubeUrl.value.trim()) || 'dQw4w9WgXcQ';

  if (!state.editingId) updateFormHeading();
  if (el.previewTitle) el.previewTitle.textContent = title;
  if (el.previewThumb) el.previewThumb.src = buildYouTubeThumbnail(youtubeId);
  if (el.previewMembers) el.previewMembers.hidden = !fields.membersOnly.checked;
}

function renderEvents() {
  if (!el.list) return;

  const filterType = el.typeFilter?.value || 'all';
  const filtered = state.events.filter((eventItem) => filterType === 'all' || eventItem.type === filterType);
  const sorted = [...filtered].sort((a, b) => {
    if (a.sort_order !== b.sort_order) return a.sort_order - b.sort_order;
    return a.title.localeCompare(b.title);
  });

  el.list.innerHTML = '';
  if (!sorted.length) {
    el.list.innerHTML = '<li class="retro-item"><span class="retro-item-title">No entries for this section yet.</span></li>';
    return;
  }

  sorted.forEach((eventItem) => {
    const item = document.createElement('li');
    item.className = 'retro-item';

    item.innerHTML = `
      <div>
        <span class="retro-item-title">${escapeHtml(eventItem.title)}</span>
        <span class="mode-pill">${escapeHtml(getTypeLabel(eventItem.type))}</span>
        ${eventItem.membersOnly ? '<span class="retro-pill members">Members Only</span>' : ''}
        ${eventItem.visible ? '' : '<span class="mode-pill">Hidden</span>'}
        <div class="retro-item-sub">${escapeHtml(eventItem.id)} · sort ${escapeHtml(String(eventItem.sort_order))} · ${escapeHtml(eventItem.youtube_video_id)}</div>
      </div>
      <div class="retro-item-buttons">
        <button type="button" class="ccg-btn ccg-btn--ghost" data-action="up" data-id="${escapeHtml(eventItem.id)}">↑</button>
        <button type="button" class="ccg-btn ccg-btn--ghost" data-action="down" data-id="${escapeHtml(eventItem.id)}">↓</button>
        <button type="button" class="ccg-btn ccg-btn--ghost" data-action="edit" data-id="${escapeHtml(eventItem.id)}">Edit</button>
        <button type="button" class="ccg-btn ccg-btn--ghost" data-action="delete" data-id="${escapeHtml(eventItem.id)}">Delete</button>
      </div>
    `;

    item.querySelector('[data-action="edit"]')?.addEventListener('click', () => startEdit(eventItem.id));
    item.querySelector('[data-action="delete"]')?.addEventListener('click', () => deleteEvent(eventItem.id));
    item.querySelector('[data-action="up"]')?.addEventListener('click', () => moveItem(eventItem.id, -1));
    item.querySelector('[data-action="down"]')?.addEventListener('click', () => moveItem(eventItem.id, 1));

    el.list.appendChild(item);
  });
}

function moveItem(id, direction) {
  const current = state.events.find((item) => item.id === id);
  if (!current) return;

  const sameType = state.events
    .filter((item) => item.type === current.type)
    .sort((a, b) => a.sort_order - b.sort_order || a.title.localeCompare(b.title));

  const currentIndex = sameType.findIndex((item) => item.id === id);
  const swapIndex = currentIndex + direction;
  if (currentIndex < 0 || swapIndex < 0 || swapIndex >= sameType.length) return;

  const target = sameType[swapIndex];
  const temp = current.sort_order;
  current.sort_order = target.sort_order;
  target.sort_order = temp;

  normalizeSortOrders(current.type);
  renderEvents();
  setStatus(`Reordered ${getTypeLabel(current.type).toLowerCase()} entries.`, false);
}

function startEdit(id) {
  const eventItem = state.events.find((entry) => entry.id === id);
  if (!eventItem) return;

  state.editingId = id;
  fields.type.value = eventItem.type;
  fields.title.value = eventItem.title;
  fields.slug.value = eventItem.slug;
  fields.youtubeUrl.value = eventItem.youtube_url;
  fields.youtubeId.value = eventItem.youtube_video_id;
  fields.publishedDate.value = eventItem.published_date;
  fields.sortOrder.value = String(eventItem.sort_order);
  fields.summary.value = eventItem.summary;
  fields.description.value = eventItem.description;
  fields.visible.checked = eventItem.visible !== false;
  fields.membersOnly.checked = eventItem.membersOnly;
  fields.seoTitle.value = String(eventItem?.seo?.title || '').trim();
  fields.seoDescription.value = String(eventItem?.seo?.description || '').trim();

  el.formHeading.textContent = `Edit ${getTypeLabel(eventItem.type)}: ${eventItem.title}`;
  el.saveEvent.textContent = 'Save / Update';
  renderPreview();
}

function deleteEvent(id) {
  const eventItem = state.events.find((entry) => entry.id === id);
  if (!eventItem) return;

  state.events = state.events.filter((entry) => entry.id !== id);
  normalizeSortOrders(eventItem.type);

  if (state.editingId === id) resetForm();
  renderEvents();
  setStatus(`Deleted ${getTypeLabel(eventItem.type).toLowerCase()} "${eventItem.title}".`, false);
}

async function saveJsonFile(type) {
  normalizeSortOrders();

  const isDemoMusic = type === 'demo_music';
  const isRetroSpecial = type === 'retro_special';
  const pathLabel = isDemoMusic
    ? AMIGA_DEMO_MUSIC_DATA_PATH
    : isRetroSpecial
      ? RETRO_SPECIALS_DATA_PATH
      : RETRO_EVENTS_DATA_PATH;
  const fileName = isDemoMusic
    ? 'amiga-demo-music.json'
    : isRetroSpecial
      ? 'retro-specials.json'
      : 'retro-events.json';

  const payloadItems = state.events
    .filter((item) => (
      isDemoMusic
        ? item.type === 'demo_music'
        : isRetroSpecial
          ? item.type === 'retro_special'
          : item.type === 'retro_event'
    ))
    .sort((a, b) => a.sort_order - b.sort_order || a.title.localeCompare(b.title))
    .map((item) => toPersistedItem(item));

  const payload = JSON.stringify(payloadItems, null, 2);

  if (typeof window.showSaveFilePicker === 'function') {
    try {
      const handle = await window.showSaveFilePicker({
        suggestedName: fileName,
        types: [{ description: 'JSON Files', accept: { 'application/json': ['.json'] } }]
      });
      const writable = await handle.createWritable();
      await writable.write(payload + '\n');
      await writable.close();
      setStatus(`Saved ${fileName} using file picker.`, false);
      return;
    } catch (error) {
      setStatus(`File picker save cancelled or failed: ${error.message}`, true);
      return;
    }
  }

  const blob = new Blob([payload + '\n'], { type: 'application/json' });
  const anchor = document.createElement('a');
  anchor.href = URL.createObjectURL(blob);
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(anchor.href);
  setStatus(`Downloaded ${fileName}. Replace ${pathLabel}, then run: node scripts/generate-retro-pages.js && node scripts/generate-sitemaps.js.`, false);
}

function toPersistedItem(item) {
  const next = {
    id: item.id,
    slug: item.slug,
    type: item.type,
    title: item.title,
    youtube_url: item.youtube_url,
    youtube_video_id: item.youtube_video_id,
    youtubeId: item.youtube_video_id,
    youtube: item.youtube_video_id,
    url: item.youtube_url,
    thumbnail: buildYouTubeThumbnail(item.youtube_video_id),
    summary: item.summary,
    description: item.description,
    published_date: item.published_date,
    sort_order: item.sort_order,
    order: item.sort_order,
    visible: item.visible,
    published: item.visible,
    membersOnly: item.membersOnly,
    seo: {
      title: item?.seo?.title || buildSeoTitle(item.title, item.type),
      description: item?.seo?.description || buildSeoDescription(item.title, item.type)
    }
  };

  if (item.type === 'demo_music') {
    next.composer = item?._legacy?.composer || '';
    next.demo_group = item?._legacy?.demo_group || '';
    next.year = item?._legacy?.year || '';
    next.format = item?._legacy?.format || '';
  }

  if (item?._legacy?.badge) {
    next.badge = item._legacy.badge;
  }

  return next;
}

function resetForm() {
  state.editingId = null;
  el.form?.reset();

  fields.type.value = 'retro_event';
  fields.visible.checked = true;
  fields.membersOnly.checked = false;
  fields.slug.value = '';
  fields.youtubeUrl.value = '';
  fields.youtubeId.value = '';
  fields.publishedDate.value = '';
  fields.sortOrder.value = '';
  fields.summary.value = '';
  fields.description.value = '';
  fields.seoTitle.value = '';
  fields.seoDescription.value = '';

  updateFormHeading();
  el.saveEvent.textContent = 'Save / Update';
  renderPreview();
}

function syncYoutubeIdFromUrl() {
  const fromUrl = extractYoutubeId(fields.youtubeUrl.value.trim());
  if (fromUrl) {
    fields.youtubeId.value = fromUrl;
  }
}

function extractYoutubeId(value) {
  const input = String(value || '').trim();
  if (!input) return '';
  if (/^[A-Za-z0-9_-]{11}$/.test(input)) return input;

  const patterns = [
    /(?:youtube\.com\/watch\?v=)([A-Za-z0-9_-]{11})/i,
    /(?:youtube\.com\/shorts\/)([A-Za-z0-9_-]{11})/i,
    /(?:youtube\.com\/embed\/)([A-Za-z0-9_-]{11})/i,
    /(?:youtu\.be\/)([A-Za-z0-9_-]{11})/i,
    /[?&]v=([A-Za-z0-9_-]{11})/i
  ];

  for (const pattern of patterns) {
    const match = input.match(pattern);
    if (match?.[1]) return match[1];
  }

  return '';
}

function normalizeSortOrders(type) {
  const types = type ? [type] : ['retro_event', 'retro_special', 'demo_music'];
  types.forEach((currentType) => {
    const sameType = state.events
      .filter((item) => item.type === currentType)
      .sort((a, b) => a.sort_order - b.sort_order || a.title.localeCompare(b.title));

    sameType.forEach((item, index) => {
      item.sort_order = (index + 1) * 10;
    });
  });
}

function getNextSortOrder(type) {
  const max = state.events
    .filter((item) => item.type === type)
    .reduce((acc, item) => Math.max(acc, Number(item.sort_order) || 0), 0);
  return max + 10 || 10;
}

function normalizeType(type) {
  if (type === 'demo_music' || type === 'amiga_demo_music') return 'demo_music';
  if (type === 'retro_special') return 'retro_special';
  return 'retro_event';
}

function getSelectedType() {
  return normalizeType(fields.type?.value);
}

function getTypePrefix(type) {
  if (type === 'demo_music') return 'amiga-demo-music-';
  if (type === 'retro_special') return 'retro-specials-';
  return 'retro-events-';
}

function getTypeLabel(type) {
  if (type === 'demo_music') return 'Amiga Demo Music';
  if (type === 'retro_special') return 'Retro Special';
  return 'Retro Event';
}

function updateFormHeading() {
  el.formHeading.textContent = `Add ${getTypeLabel(getSelectedType())}`;
}

function buildSeoTitle(title, type) {
  if (!title) return '';
  if (type === 'demo_music') return `${title} | Amiga Demo Music | Cheeky Commodore Gamer`;
  if (type === 'retro_special') return `${title} | Retro Special | Cheeky Commodore Gamer`;
  return `${title} | Retro Event | Cheeky Commodore Gamer`;
}

function buildSeoDescription(title, type) {
  if (!title) return '';
  if (type === 'demo_music') return `Watch ${title} in Cheeky Commodore Gamer's Amiga Demo Music collection.`;
  if (type === 'retro_special') return `Watch ${title} in Cheeky Commodore Gamer's Retro Specials collection.`;
  return `Watch ${title} in Cheeky Commodore Gamer's Retro Events collection.`;
}

function buildYouTubeThumbnail(youtubeId) {
  const id = String(youtubeId || '').trim();
  if (!id) return 'https://img.youtube.com/vi/dQw4w9WgXcQ/hqdefault.jpg';
  return `https://img.youtube.com/vi/${encodeURIComponent(id)}/hqdefault.jpg`;
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
