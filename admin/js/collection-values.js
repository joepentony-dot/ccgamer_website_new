const COLLECTION_DEFINITIONS = Object.freeze([
  {
    canonical: 'cartridge',
    label: 'Cartridge Games',
    aliases: ['cartridge', 'cartridge game', 'cartridge games', 'cartridge-games']
  },
  {
    canonical: 'licensed',
    label: 'Licensed Games',
    aliases: ['licensed', 'licensed game', 'licensed games', 'licensed-games']
  },
  {
    canonical: 'bpjs',
    label: 'BPJS / BPJM Indexed',
    aliases: ['bpjs', 'bpjm', 'banned', 'bpjs indexed', 'bpjs-indexed', 'bpjm indexed', 'bpjm-indexed', 'bpjs / bpjm indexed']
  },
  {
    canonical: 'top-picks',
    label: 'Top Picks',
    aliases: ['top-picks', 'top picks', 'top_picks', 'toppicks']
  }
]);

function aliasKey(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, ' ')
    .replace(/\s*\/\s*/g, ' / ')
    .replace(/\s+/g, ' ');
}

const COLLECTION_ALIAS_MAP = new Map();
COLLECTION_DEFINITIONS.forEach((definition) => {
  [definition.canonical, ...definition.aliases].forEach((alias) => {
    COLLECTION_ALIAS_MAP.set(aliasKey(alias), definition);
  });
});

export function canonicalCollectionValue(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  return COLLECTION_ALIAS_MAP.get(aliasKey(raw))?.canonical || raw;
}

export function collectionDisplayLabel(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  return COLLECTION_ALIAS_MAP.get(aliasKey(raw))?.label || raw;
}

export function collectionMatchesCanonical(value, canonical) {
  return canonicalCollectionValue(value) === canonicalCollectionValue(canonical);
}

function setInputLabel(input, labelText) {
  const label = input.closest('label');
  if (!label) return;

  let text = label.querySelector('span');
  if (!text) {
    Array.from(label.childNodes).forEach((node) => {
      if (node.nodeType === Node.TEXT_NODE) node.remove();
    });
    text = document.createElement('span');
    label.appendChild(text);
  }
  text.textContent = labelText;
}

export function normaliseCollectionContainer(container) {
  if (!container) return;

  const seen = new Map();
  const inputs = Array.from(container.querySelectorAll('input[type="checkbox"]'));

  inputs.forEach((input) => {
    const canonical = canonicalCollectionValue(input.value);
    if (!canonical) return;

    const existing = seen.get(canonical);
    if (existing) {
      existing.checked = existing.checked || input.checked;
      const duplicateLabel = input.closest('label');
      if (duplicateLabel) duplicateLabel.remove();
      else input.remove();
      return;
    }

    input.value = canonical;
    setInputLabel(input, collectionDisplayLabel(canonical));
    seen.set(canonical, input);
  });
}

function attachNormaliser(container) {
  if (!container || container.dataset.collectionNormaliserAttached === 'true') return;
  container.dataset.collectionNormaliserAttached = 'true';
  normaliseCollectionContainer(container);

  const observer = new MutationObserver(() => {
    normaliseCollectionContainer(container);
  });
  observer.observe(container, { childList: true });
}

export function installAdminCollectionNormaliser(root = document) {
  if (typeof document === 'undefined') return;
  root.querySelectorAll('[data-game-collections], [data-collection-options]').forEach(attachNormaliser);
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => installAdminCollectionNormaliser(), { once: true });
  } else {
    installAdminCollectionNormaliser();
  }
}
