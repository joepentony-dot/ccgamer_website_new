#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..');
const configPath = path.join(repoRoot, 'tools', 'seo', 'static-pages.json');

const REQUIRED_FEATURE_PAGES = Object.freeze([
  'games/compare/index.html',
  'games/discover/index.html',
  'zzap64/index.html',
]);

function insertAfter(list, anchor, value) {
  if (list.includes(value)) return false;
  const anchorIndex = list.indexOf(anchor);
  if (anchorIndex >= 0) list.splice(anchorIndex + 1, 0, value);
  else list.push(value);
  return true;
}

function ensureFeaturePages() {
  if (!fs.existsSync(configPath)) {
    throw new Error(`Static page configuration not found: ${configPath}`);
  }

  const parsed = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  if (!Array.isArray(parsed)) {
    throw new Error('tools/seo/static-pages.json must contain an array.');
  }

  let changed = false;
  changed = insertAfter(parsed, 'games/collections/top-picks.html', 'games/compare/index.html') || changed;
  changed = insertAfter(parsed, 'games/compare/index.html', 'games/discover/index.html') || changed;
  changed = insertAfter(parsed, 'quiz/pack-6.html', 'zzap64/index.html') || changed;

  const missing = REQUIRED_FEATURE_PAGES.filter((entry) => !parsed.includes(entry));
  if (missing.length) {
    throw new Error(`Could not register feature sitemap pages: ${missing.join(', ')}`);
  }

  if (changed) {
    fs.writeFileSync(configPath, `${JSON.stringify(parsed, null, 2)}\n`, 'utf8');
    console.log(`Registered ${REQUIRED_FEATURE_PAGES.length} feature pages for sitemap generation.`);
  } else {
    console.log('Feature sitemap pages are already registered.');
  }

  return { changed, pages: [...REQUIRED_FEATURE_PAGES] };
}

if (require.main === module) {
  ensureFeaturePages();
}

module.exports = {
  REQUIRED_FEATURE_PAGES,
  ensureFeaturePages,
};
