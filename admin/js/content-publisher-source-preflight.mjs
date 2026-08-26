const SOURCE_MIN_WORDS = 40;
const THUMBNAIL_PREFIX = 'resources/images/thumbnails/all/';
const LEMON_HOST_BY_SYSTEM = {
  C64: 'lemon64.com',
  AMIGA: 'lemonamiga.com'
};

export function wordCount(value) {
  return String(value || '').trim().split(/\s+/).filter(Boolean).length;
}

export function detectReleaseYear(description) {
  const text = String(description || '');
  const patterns = [
    /\b(?:released|published|launched)(?:\s+[A-Za-z’'&.-]+){0,6}\s+(?:in\s+)?((?:19|20)\d{2})\b/i,
    /\b((?:19|20)\d{2})\s+(?:Commodore\s+64|C64|Commodore\s+Amiga|Amiga)\b/i,
    /\b(?:Commodore\s+64|C64|Commodore\s+Amiga|Amiga)(?:\s+[A-Za-z’'&.-]+){0,4}\s+(?:from|released\s+in)\s+((?:19|20)\d{2})\b/i
  ];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) return Number(match[1]);
  }
  return null;
}

function normalizeUrl(value) {
  try {
    const url = new URL(String(value || '').trim());
    url.hash = '';
    return url;
  } catch {
    return null;
  }
}

export function validateLemonSource(system, value) {
  const text = String(value || '').trim();
  if (!text) return { ok: false, reason: 'missing' };
  const url = normalizeUrl(text);
  if (!url || !['http:', 'https:'].includes(url.protocol)) return { ok: false, reason: 'invalid-url' };

  const host = url.hostname.replace(/^www\./i, '').toLowerCase();
  const expectedHost = LEMON_HOST_BY_SYSTEM[String(system || '').toUpperCase()] || '';
  if (!expectedHost || host !== expectedHost) {
    return { ok: false, reason: 'wrong-host', expectedHost };
  }
  if (!/^\/game\/[^/]+\/?$/i.test(url.pathname)) {
    return { ok: false, reason: 'not-game-page', expectedHost };
  }
  return { ok: true, url: `https://www.${expectedHost}${url.pathname.replace(/\/$/, '')}` };
}

export function validateGamePublisherSource(source, options = {}) {
  const errors = [];
  const system = String(source?.system || '').toUpperCase();
  const year = Number(source?.year);
  const description = String(source?.description || '').trim();
  const lemonUrl = String(source?.lemonUrl || '').trim();
  const pdfUrl = String(source?.pdf || '').trim();
  const thumbnail = String(source?.thumbnail || '').trim();
  const noLemonListing = Boolean(options.noLemonListing);

  if (!['C64', 'AMIGA'].includes(system)) errors.push('Choose C64 or AMIGA before publishing.');
  if (!Number.isInteger(year) || year < 1970 || year > 2100) errors.push('Enter a valid release year.');

  const words = wordCount(description);
  if (words < SOURCE_MIN_WORDS) {
    errors.push(`Description must contain at least ${SOURCE_MIN_WORDS} words so publishing can recover if YouTube metadata is unavailable. Current count: ${words}.`);
  }
  if (words > 165) errors.push('Description must be 165 words or fewer for the archive fallback.');
  if (description && !/[.!?][”"']?$/.test(description)) errors.push('Description must end at a sentence boundary.');

  const statedYear = detectReleaseYear(description);
  if (statedYear && Number.isInteger(year) && statedYear !== year) {
    errors.push(`Release year conflict: the Year field says ${year}, but the description identifies the release as ${statedYear}. Resolve this before publishing.`);
  }

  if (!lemonUrl && !noLemonListing) {
    errors.push('Add the direct Lemon64/Lemon Amiga game page so magazine reviews can be imported automatically, or confirm that no Lemon listing exists.');
  }
  if (lemonUrl) {
    const lemon = validateLemonSource(system, lemonUrl);
    if (!lemon.ok) {
      const expected = LEMON_HOST_BY_SYSTEM[system] || 'the matching Lemon site';
      errors.push(`Magazine source must be a direct ${expected} /game/... page, not a manual, Google Drive or unrelated URL.`);
    }
    const lemonComparable = normalizeUrl(lemonUrl)?.href || '';
    const pdfComparable = normalizeUrl(pdfUrl)?.href || '';
    if (lemonComparable && pdfComparable && lemonComparable === pdfComparable) {
      errors.push('Lemon magazine source and PDF/manual URL cannot be the same address.');
    }
  }

  if (!thumbnail.startsWith(THUMBNAIL_PREFIX) || !/\.(?:png|jpe?g|webp)$/i.test(thumbnail)) {
    errors.push(`Thumbnail path must point to an image inside ${THUMBNAIL_PREFIX}`);
  }

  return errors;
}

function field(name) {
  return document.querySelector(`[data-game-field="${name}"]`);
}

function renderErrors(errors) {
  const box = document.querySelector('[data-game-validation]');
  if (!box) return;
  if (!errors.length) {
    box.hidden = true;
    box.innerHTML = '';
    return;
  }
  box.hidden = false;
  box.innerHTML = `<strong>Game source preflight stopped publishing:</strong><ul>${errors.map((error) => `<li>${escapeHtml(error)}</li>`).join('')}</ul>`;
  box.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
}

function escapeHtml(value) {
  return String(value || '').replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[character]));
}

function installLemonGuidance() {
  const lemonInput = field('lemonUrl');
  if (!lemonInput || document.querySelector('[data-no-lemon-listing]')) return;

  lemonInput.placeholder = 'https://www.lemonamiga.com/game/... or https://www.lemon64.com/game/...';
  const label = lemonInput.closest('label');
  const hint = document.createElement('small');
  hint.dataset.lemonSourceHint = 'true';
  hint.textContent = 'Use the direct game page. This source drives automatic magazine-review discovery; do not paste the PDF/manual URL here.';
  lemonInput.insertAdjacentElement('afterend', hint);

  const override = document.createElement('label');
  override.className = 'publisher-inline-check';
  override.dataset.lemonOverride = 'true';
  override.innerHTML = '<input type="checkbox" data-no-lemon-listing /> <span>No Lemon64/Lemon Amiga listing exists for this game</span>';
  label?.insertAdjacentElement('afterend', override);

  const update = () => {
    const system = String(field('system')?.value || '').toUpperCase();
    const site = system === 'AMIGA' ? 'Lemon Amiga' : (system === 'C64' ? 'Lemon64' : 'Lemon64 / Lemon Amiga');
    hint.textContent = `Use the direct ${site} /game/... page. It is used to cache and import magazine-review metadata automatically; do not paste the PDF/manual URL here.`;
  };
  field('system')?.addEventListener('change', update);
  update();
}

function installPreflight() {
  const form = document.querySelector('[data-game-form]');
  if (!form) return;
  installLemonGuidance();

  form.addEventListener('submit', (event) => {
    const errors = validateGamePublisherSource({
      system: field('system')?.value,
      year: field('year')?.value,
      description: field('description')?.value,
      lemonUrl: field('lemonUrl')?.value,
      pdf: field('pdf')?.value,
      thumbnail: field('thumbnail')?.value
    }, {
      noLemonListing: Boolean(document.querySelector('[data-no-lemon-listing]')?.checked)
    });

    renderErrors(errors);
    if (errors.length) {
      event.preventDefault();
      event.stopImmediatePropagation();
    }
  }, { capture: true });
}

if (typeof document !== 'undefined') installPreflight();
