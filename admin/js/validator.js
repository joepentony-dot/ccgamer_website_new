const CURRENT_YEAR = new Date().getFullYear();

function isValidUrl(value) {
  if (!value) return true;
  try {
    const parsed = new URL(value, window.location.origin);
    return ['http:', 'https:'].includes(parsed.protocol) || value.startsWith('/');
  } catch {
    return false;
  }
}

function isValidFilename(value) {
  if (!value) return false;
  if (/^https?:/i.test(value)) return false;
  if (/[\\/]/.test(value)) return false;
  return /\.[a-z0-9]{2,}$/i.test(value);
}

function isValidPath(value) {
  if (!value) return false;
  if (value.startsWith('resources/')) return true;
  return isValidUrl(value);
}

function filePathExists(path, fileIndex) {
  if (!path) return true;
  if (!fileIndex || fileIndex.size === 0) return true;
  const normalized = String(path).replace(/^\/+/, '');
  return fileIndex.has(normalized);
}

function listFromText(value) {
  return String(value || '')
    .split(/\n|,/)
    .map((entry) => entry.trim())
    .filter(Boolean);
}

export function validateGameRecord(record, context = {}) {
  const errors = [];
  const warnings = [];
  const {
    slugSet = new Set(),
    idSet = new Set(),
    originalSlug = '',
    originalId = '',
    fileIndex
  } = context;

  if (!record.title?.trim()) errors.push('Title is required.');
  if (!record.slug?.trim()) errors.push('Slug is required.');
  if (!record.id?.trim()) errors.push('ID is required.');
  if (!record.year) errors.push('Year is required.');
  if (!record.ccg_rating && record.ccg_rating !== 0) errors.push('CCG rating is required.');

  const year = Number(record.year);
  if (!Number.isInteger(year) || year < 1977 || year > CURRENT_YEAR) {
    errors.push(`Year must be between 1977 and ${CURRENT_YEAR}.`);
  }

  const rating = Number(record.ccg_rating);
  if (Number.isNaN(rating) || rating < 1 || rating > 10) {
    errors.push('Rating must be between 1 and 10.');
  }

  const slug = String(record.slug || '').trim();
  if (slug && slug !== originalSlug && slugSet.has(slug)) {
    errors.push('Slug must be unique.');
  }

  const id = String(record.id || '').trim();
  if (id && id !== originalId && idSet.has(id)) {
    errors.push('ID must be unique.');
  }

  const urlsToCheck = [
    { label: 'lemon entry', values: Array.isArray(record.lemon) ? record.lemon : [] },
    { label: 'disk entry', values: Array.isArray(record.disk) ? record.disk : [] },
    { label: 'pdf', values: [record.pdf] },
    { label: 'thumbnail', values: [record.thumbnail] }
  ];

  for (const item of urlsToCheck) {
    for (const value of item.values) {
      if (!isValidUrl(value)) errors.push(`Invalid URL/path in ${item.label}: ${value}`);
    }
  }

  if (!filePathExists(record.thumbnail, fileIndex)) {
    warnings.push(`Thumbnail path not found locally: ${record.thumbnail}`);
  }
  if (!filePathExists(record.pdf, fileIndex)) {
    warnings.push(`PDF path not found locally: ${record.pdf}`);
  }

  if (!Array.isArray(record.genres) || record.genres.length === 0) {
    errors.push('At least one genre is required.');
  }

  if (!record.credits || typeof record.credits !== 'object') {
    errors.push('Credits object is required for schema integrity.');
  }

  return { valid: errors.length === 0, errors, warnings };
}

export function validateWizardDraft(draft, context = {}) {
  const errors = [];
  const warnings = [];
  const missing = [];
  const fieldErrors = {};
  const {
    slugSet = new Set(),
    idSet = new Set(),
    allowedSystems = new Set(),
    originalSlug = '',
    originalId = ''
  } = context;

  const slug = String(draft.slug || '').trim();
  const id = String(draft.id || '').trim();

  if (!draft.title) {
    missing.push('Title');
    fieldErrors.title = 'Title is required.';
  }

  if (!slug) {
    missing.push('Slug');
    fieldErrors.slug = 'Slug is required.';
  } else if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    errors.push('Slug must use lowercase letters, numbers, and hyphens only.');
    fieldErrors.slug = 'Use lowercase letters, numbers, and hyphens only.';
  }

  if (!id) {
    missing.push('Game ID');
    fieldErrors.id = 'Game ID is required.';
  }

  if (!draft.system) {
    missing.push('System');
    fieldErrors.system = 'System is required.';
  } else if (allowedSystems.size && !allowedSystems.has(draft.system)) {
    errors.push('System must match an existing system in games.json.');
    fieldErrors.system = 'Choose a system from the existing list.';
  }

  if (!draft.year) {
    missing.push('Year');
    fieldErrors.year = 'Year is required.';
  } else if (!/^\d{4}$/.test(draft.year)) {
    errors.push('Year must be 4 digits.');
    fieldErrors.year = 'Enter a 4-digit year.';
  } else {
    const yearValue = Number(draft.year);
    if (Number.isFinite(yearValue) && (yearValue < 1977 || yearValue > CURRENT_YEAR)) {
      warnings.push('Year looks unusual. Confirm the release year.');
    }
  }

  if ((draft.genres || []).length === 0) {
    missing.push('Genres');
    fieldErrors.genres = 'Select at least one genre.';
  }

  const ratingValue = Number(draft.ccgRating);
  if (!ratingValue) {
    missing.push('CCG Rating');
    fieldErrors.ccgRating = 'CCG rating is required.';
  } else if (ratingValue < 1 || ratingValue > 10) {
    errors.push('CCG rating must be between 1 and 10.');
    fieldErrors.ccgRating = 'Rating must be between 1 and 10.';
  }

  if (!draft.thumbnailFile && !draft.thumbnailOverride) {
    missing.push('Thumbnail');
    fieldErrors.thumbnailFile = 'Thumbnail filename is required.';
  }

  if (draft.thumbnailFile && !isValidFilename(draft.thumbnailFile)) {
    errors.push('Thumbnail filename must include a file extension and no slashes.');
    fieldErrors.thumbnailFile = 'Use a filename with extension (no slashes).';
  }

  if (draft.thumbnailOverride && !isValidPath(draft.thumbnailOverride)) {
    errors.push('Thumbnail override must be a resources/ path or full URL.');
    fieldErrors.thumbnailOverride = 'Use a resources/ path or full URL.';
  }

  if (draft.box3dFile && !isValidFilename(draft.box3dFile)) {
    errors.push('3D box filename must include a file extension and no slashes.');
    fieldErrors.box3dFile = 'Use a filename with extension (no slashes).';
  }

  if (draft.box3dOverride && !isValidPath(draft.box3dOverride)) {
    errors.push('3D box override must be a resources/ path or full URL.');
    fieldErrors.box3dOverride = 'Use a resources/ path or full URL.';
  }

  if (slug && slug !== originalSlug && slugSet.has(slug)) {
    errors.push(`Duplicate slug detected: ${slug}`);
    fieldErrors.slug = 'Slug already exists. Edit to make it unique.';
  }

  if (id && id !== originalId && idSet.has(id)) {
    errors.push(`Duplicate ID detected: ${id}`);
    fieldErrors.id = 'ID already exists. Edit to make it unique.';
  }

  if (draft.pdf && !isValidUrl(draft.pdf)) {
    warnings.push('Manual/PDF URL looks invalid.');
    fieldErrors.pdf = 'Check the URL format.';
  }

  const diskRefs = listFromText(draft.diskRefs);
  const invalidDisks = diskRefs.filter((ref) => !isValidUrl(ref));
  if (invalidDisks.length) {
    warnings.push(`Disk URLs contain invalid entries: ${invalidDisks.join(', ')}`);
    fieldErrors.diskRefs = 'One or more disk URLs look invalid.';
  }

  const externalRefs = listFromText(draft.externalRefs);
  const invalidRefs = externalRefs.filter((ref) => !isValidUrl(ref));
  if (invalidRefs.length) {
    warnings.push(`Reference links contain invalid URLs: ${invalidRefs.join(', ')}`);
    fieldErrors.externalRefs = 'One or more reference URLs look invalid.';
  }

  if (draft.videoId && !/^[a-zA-Z0-9_-]{6,}$/.test(draft.videoId)) {
    warnings.push('Video ID looks unusual.');
    fieldErrors.videoId = 'Check the YouTube ID.';
  }

  if (missing.length) {
    errors.push(`Missing required fields: ${missing.join(', ')}`);
  }

  return { valid: errors.length === 0, errors, warnings, missing, fieldErrors };
}

export function validateGamesSchema(games) {
  const errors = [];
  if (!Array.isArray(games)) {
    return { valid: false, errors: ['Root JSON must be an array.'] };
  }

  const requiredKeys = [
    'system', 'id', 'slug', 'title', 'sorttitle', 'year', 'genres', 'collections',
    'videoid', 'thumbnail', 'pdf', 'disk', 'lemon', 'description', 'ccg_rating',
    'ccg_rating_reason', 'credits', 'developer', '_ccg_enforced', '_ccg_migrated'
  ];

  games.forEach((game, index) => {
    requiredKeys.forEach((key) => {
      if (!(key in game)) {
        errors.push(`Record ${index + 1} missing key: ${key}`);
      }
    });
  });

  return { valid: errors.length === 0, errors };
}
