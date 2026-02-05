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

function filePathExists(path, fileIndex) {
  if (!path) return true;
  if (!fileIndex || fileIndex.size === 0) return true;
  const normalized = String(path).replace(/^\/+/, '');
  return fileIndex.has(normalized);
}

export function validateGameRecord(record, context = {}) {
  const errors = [];
  const warnings = [];
  const { slugSet = new Set(), originalSlug = '', fileIndex } = context;

  if (!record.title?.trim()) errors.push('Title is required.');
  if (!record.slug?.trim()) errors.push('Slug is required.');
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
