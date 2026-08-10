#!/usr/bin/env node

"use strict";

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");

function patchFile(relativePath, patches) {
  const target = path.join(ROOT, relativePath);
  let source = fs.readFileSync(target, "utf8");
  for (const { before, after, label } of patches) {
    if (!source.includes(before)) {
      if (source.includes(after)) continue;
      throw new Error(`${relativePath}: could not find ${label}`);
    }
    source = source.replace(before, after);
  }
  fs.writeFileSync(target, source, "utf8");
  console.log(`Patched ${relativePath}`);
}

patchFile("admin/content-publisher.html", [
  {
    label: "publisher intro",
    before: "Add a game or video once. The existing GitHub publishing chain then regenerates pages, verified YouTube metadata, VideoObject markup, chapters, the video library, sitemaps and validation.",
    after: "Add a game, video or Zzap!64 award year once. The existing GitHub publishing chain then regenerates pages, verified YouTube metadata, VideoObject markup, chapters, the video library, original Zzap review links, sitemaps and validation."
  },
  {
    label: "Zzap tab",
    before: `      <button class="publisher-tab" type="button" data-tab="video" aria-selected="false">Add Video / Feature</button>
      <button class="publisher-tab" type="button" data-tab="status" aria-selected="false">Publishing Status</button>`,
    after: `      <button class="publisher-tab" type="button" data-tab="video" aria-selected="false">Add Video / Feature</button>
      <button class="publisher-tab" type="button" data-tab="zzap" aria-selected="false">Zzap!64 Awards Year</button>
      <button class="publisher-tab" type="button" data-tab="status" aria-selected="false">Publishing Status</button>`
  },
  {
    label: "Zzap panel",
    before: `    <section class="publisher-panel" data-panel="status" hidden>`,
    after: `    <section class="publisher-panel" data-panel="zzap" hidden>
      <div class="publisher-section-heading">
        <div>
          <h2>Add a Zzap!64 awards year</h2>
          <p>Use this when the next year-by-year Zzap!64 retrospective is ready. The award data is saved once; the archive then discovers the year automatically and the secure GitHub workflow resolves each entry to its direct original Zzap!64 scan page.</p>
        </div>
        <button class="ccg-btn ccg-btn--ghost" type="button" data-action="reset-zzap">Reset Zzap Form</button>
      </div>

      <form class="publisher-form" data-zzap-form novalidate>
        <div class="publisher-grid publisher-grid--2">
          <label>Magazine year *
            <input type="number" min="1985" max="2100" data-zzap-field="year" placeholder="1990" required />
            <small>Matching video page convention: <span data-zzap-video-slug>/retro-specials/zzap64-gold-medals-sizzlers-1990/</span></small>
          </label>
          <div class="publisher-card publisher-card--subtle">
            <strong>Automatic after publish</strong>
            <p>Official Zzap Bible lookup → exact issue/page → zzap64.co.uk scan link → archive year/filter refresh → validation.</p>
          </div>
        </div>

        <label>Award records *
          <textarea rows="14" data-zzap-field="records" placeholder="January | Game Title | Sizzler | 93 | C64&#10;February | Another Game | Gold Medal | 97 | C64"></textarea>
          <small>Paste JSON, CSV, tab-separated rows or pipe-separated rows. Columns are Month, Title, Award, Score, System. Score may be blank for awards without a printed overall percentage.</small>
        </label>

        <div class="publisher-card publisher-card--subtle" data-zzap-preview>
          <strong>Paste the year's award list to preview it.</strong>
          <p>No magazine page numbers are required here; those are verified automatically against the official Zzap Bible.</p>
        </div>

        <div class="publisher-validation" data-zzap-validation hidden></div>

        <div class="publisher-submit-row">
          <div>
            <strong>After publish:</strong>
            <span>award year → official Zzap Bible → direct original scans → /zzap64/ year card &amp; filter → validation</span>
          </div>
          <button class="ccg-btn ccg-btn--primary publisher-primary-action" type="submit" data-publish-zzap>Publish Zzap Awards Year</button>
        </div>
      </form>
    </section>

    <section class="publisher-panel" data-panel="status" hidden>`
  }
]);

patchFile("admin/js/content-publisher.js", [
  {
    label: "Zzap months constant",
    before: "const ALLOWED_THUMBNAIL_PREFIX = 'resources/images/thumbnails/all/';",
    after: `const ALLOWED_THUMBNAIL_PREFIX = 'resources/images/thumbnails/all/';
const ZZAP_MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];`
  },
  {
    label: "Zzap elements",
    before: `  featureForm: document.querySelector('[data-feature-form]'),
  gameGenres: document.querySelector('[data-game-genres]'),`,
    after: `  featureForm: document.querySelector('[data-feature-form]'),
  zzapForm: document.querySelector('[data-zzap-form]'),
  zzapValidation: document.querySelector('[data-zzap-validation]'),
  zzapPreview: document.querySelector('[data-zzap-preview]'),
  zzapVideoSlug: document.querySelector('[data-zzap-video-slug]'),
  gameGenres: document.querySelector('[data-game-genres]'),`
  },
  {
    label: "Zzap reset element",
    before: `  resetVideo: document.querySelector('[data-action="reset-video"]'),
  githubOwner:`,
    after: `  resetVideo: document.querySelector('[data-action="reset-video"]'),
  resetZzap: document.querySelector('[data-action="reset-zzap"]'),
  githubOwner:`
  },
  {
    label: "reset Zzap on init",
    before: `    resetGameForm();
    resetFeatureForm();
    document.body.dataset.publisherReady = 'true';`,
    after: `    resetGameForm();
    resetFeatureForm();
    resetZzapForm();
    document.body.dataset.publisherReady = 'true';`
  },
  {
    label: "bind Zzap events",
    before: `  el.resetVideo?.addEventListener('click', resetFeatureForm);
  el.gameForm?.addEventListener('submit', publishGame);
  el.featureForm?.addEventListener('submit', publishFeature);`,
    after: `  el.resetVideo?.addEventListener('click', resetFeatureForm);
  el.resetZzap?.addEventListener('click', resetZzapForm);
  el.gameForm?.addEventListener('submit', publishGame);
  el.featureForm?.addEventListener('submit', publishFeature);
  el.zzapForm?.addEventListener('submit', publishZzapAwards);
  document.querySelector('[data-zzap-field="year"]')?.addEventListener('input', updateZzapPreview);
  document.querySelector('[data-zzap-field="records"]')?.addEventListener('input', updateZzapPreview);`
  },
  {
    label: "Zzap hash tab",
    before: "  if (value === 'video' || value === 'status' || value === 'game') return value;",
    after: "  if (value === 'video' || value === 'zzap' || value === 'status' || value === 'game') return value;"
  },
  {
    label: "Zzap active tab",
    before: "  const tab = ['game', 'video', 'status'].includes(tabName) ? tabName : 'game';",
    after: "  const tab = ['game', 'video', 'zzap', 'status'].includes(tabName) ? tabName : 'game';"
  },
  {
    label: "Zzap publisher functions",
    before: `async function publishGame(event) {`,
    after: `function resetZzapForm() {
  el.zzapForm?.reset();
  clearValidation(el.zzapValidation);
  updateZzapPreview();
}

function zzapValue(name) {
  return String(document.querySelector(\`[data-zzap-field="\${name}"]\`)?.value || '').trim();
}

function canonicalMonth(value) {
  const raw = String(value || '').trim().toLowerCase();
  return ZZAP_MONTHS.find((month) => month.toLowerCase() === raw) || '';
}

function normalizeZzapAward(value) {
  const raw = String(value || '').trim().toLowerCase();
  if (raw.includes('gold')) return 'Gold Medal';
  if (raw.includes('silver')) return 'Silver Medal';
  if (raw.includes('sizzler')) return 'Sizzler';
  return '';
}

function normalizeZzapSystem(value) {
  const raw = String(value || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (raw === 'C64' || raw === 'COMMODORE64') return 'C64';
  if (raw === 'AMIGA' || raw === 'COMMODOREAMIGA') return 'AMIGA';
  return '';
}

function parseCsvLine(line) {
  const values = [];
  let current = '';
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    if (char === '"') {
      if (quoted && line[index + 1] === '"') {
        current += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
    } else if (char === ',' && !quoted) {
      values.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  values.push(current.trim());
  return values;
}

function splitZzapRow(line) {
  if (line.includes('\\t')) return line.split('\\t').map((part) => part.trim());
  if (line.includes('|')) return line.split('|').map((part) => part.trim());
  if (line.includes(';')) return line.split(';').map((part) => part.trim());
  return parseCsvLine(line);
}

function normaliseZzapRecord(raw, year, rowNumber) {
  const source = Array.isArray(raw)
    ? { month: raw[0], title: raw[1], award: raw[2], score: raw[3], system: raw[4] }
    : {
        month: raw?.month,
        title: raw?.title || raw?.game,
        award: raw?.award,
        score: raw?.score,
        system: raw?.system || raw?.platform
      };

  const month = canonicalMonth(source.month);
  const title = String(source.title || '').trim();
  const award = normalizeZzapAward(source.award);
  const system = normalizeZzapSystem(source.system);
  const rawScore = source.score;
  const score = rawScore === null || rawScore === undefined || String(rawScore).trim() === ''
    ? null
    : Number(String(rawScore).replace('%', '').trim());

  const errors = [];
  if (!month) errors.push(\`row \${rowNumber}: invalid month “\${source.month || ''}”\`);
  if (!title) errors.push(\`row \${rowNumber}: title is missing\`);
  if (!award) errors.push(\`row \${rowNumber}: award must be Sizzler, Gold Medal or Silver Medal\`);
  if (!system) errors.push(\`row \${rowNumber}: system must be C64 or Amiga\`);
  if (score !== null && (!Number.isInteger(score) || score < 0 || score > 100)) errors.push(\`row \${rowNumber}: score must be 0–100 or blank\`);

  return {
    record: { year, month, title, award, score, system },
    errors
  };
}

function parseZzapAwardsInput(text, year) {
  const input = String(text || '').trim();
  const errors = [];
  if (!Number.isInteger(year) || year < 1985 || year > 2100) return { records: [], errors: ['Enter a valid magazine year from 1985 onwards.'] };
  if (!input) return { records: [], errors: ['Paste the Zzap!64 award records for this year.'] };

  let rows;
  if (input.startsWith('[') || input.startsWith('{')) {
    try {
      const parsed = JSON.parse(input);
      rows = Array.isArray(parsed) ? parsed : (Array.isArray(parsed?.entries) ? parsed.entries : parsed?.awards);
      if (!Array.isArray(rows)) throw new Error('JSON must be an array or contain an entries/awards array.');
    } catch (error) {
      return { records: [], errors: [\`JSON could not be parsed: \${error.message}\`] };
    }
  } else {
    rows = input
      .split(/\\r?\\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith('#'))
      .map(splitZzapRow)
      .filter((fields, index) => !(index === 0 && String(fields[0] || '').toLowerCase() === 'month'));
  }

  const records = [];
  rows.forEach((row, index) => {
    const result = normaliseZzapRecord(row, year, index + 1);
    errors.push(...result.errors);
    if (!result.errors.length) records.push(result.record);
  });

  const seen = new Set();
  records.forEach((record) => {
    const key = [record.month.toLowerCase(), record.system, record.title.toLowerCase()].join('|');
    if (seen.has(key)) errors.push(\`duplicate entry: \${record.month} · \${record.system} · \${record.title}\`);
    seen.add(key);
  });

  records.sort((a, b) => ZZAP_MONTHS.indexOf(a.month) - ZZAP_MONTHS.indexOf(b.month)
    || a.title.localeCompare(b.title, 'en-GB', { numeric: true })
    || a.system.localeCompare(b.system));

  return { records, errors: [...new Set(errors)] };
}

function updateZzapPreview() {
  const year = Number(zzapValue('year'));
  const result = parseZzapAwardsInput(zzapValue('records'), year);
  const displayYear = Number.isInteger(year) && year >= 1985 ? year : 1990;
  if (el.zzapVideoSlug) el.zzapVideoSlug.textContent = \`/retro-specials/zzap64-gold-medals-sizzlers-\${displayYear}/\`;
  if (!el.zzapPreview) return;

  if (!zzapValue('records')) {
    el.zzapPreview.innerHTML = '<strong>Paste the year\\'s award list to preview it.</strong><p>No magazine page numbers are required here; those are verified automatically against the official Zzap Bible.</p>';
    return;
  }

  if (result.errors.length) {
    el.zzapPreview.innerHTML = \`<strong>Preview needs attention.</strong><p>\${escapeHtml(result.errors.slice(0, 3).join(' · '))}\${result.errors.length > 3 ? ' …' : ''}</p>\`;
    return;
  }

  const months = new Set(result.records.map((record) => record.month));
  const c64 = result.records.filter((record) => record.system === 'C64').length;
  const amiga = result.records.filter((record) => record.system === 'AMIGA').length;
  el.zzapPreview.innerHTML = \`<strong>\${result.records.length} award records ready for \${displayYear}.</strong><p>\${months.size} months represented · C64 \${c64} · Amiga \${amiga}. Direct Zzap scan pages will be resolved after publish.</p>\`;
}

async function publishZzapAwards(event) {
  event.preventDefault();
  const year = Number(zzapValue('year'));
  const parsed = parseZzapAwardsInput(zzapValue('records'), year);
  renderValidation(el.zzapValidation, parsed.errors);
  if (parsed.errors.length) return;

  let config;
  try {
    config = getGithubConfig();
  } catch (error) {
    renderValidation(el.zzapValidation, [error.message]);
    return;
  }

  const sourcePath = \`data/zzap64-awards/\${year}.json\`;
  const publishButton = document.querySelector('[data-publish-zzap]');
  setButtonBusy(publishButton, true, 'Publishing…');
  resetPipeline();
  setPipelineStep('source', 'running', 'Checking');
  activateTab('status');
  writeLog(\`Preparing Zzap!64 award year \${year}: \${parsed.records.length} records.\`);

  try {
    if (await githubFileExists(config, sourcePath)) {
      throw new Error(\`${sourcePath} already exists. This publisher refuses to overwrite an existing historical award year automatically.\`);
    }

    const result = await commitFiles(config, [{
      path: sourcePath,
      text: \`\${JSON.stringify(parsed.records, null, 2)}\\n\`
    }], \`Add Zzap64 \${year} award archive via CCG Content Publisher\`, \`zzap64-\${year}\`);

    state.lastPublish = { type: 'zzap', year, records: parsed.records, result };
    setPipelineStep('source', 'ok', result.mode === 'direct' ? 'Committed' : 'PR opened');
    setPipelineStep('metadata', 'ok', 'Not applicable');
    setPipelineStep('library', 'ok', 'Not applicable');
    setPipelineStep('sitemaps', 'ok', 'Existing sitemap');

    writeLog(result.mode === 'direct'
      ? \`Zzap \${year} source committed: \${result.commitSha}\`
      : \`Direct main update was unavailable. Pull request created: \${result.prUrl}\`);

    if (result.mode === 'pr') {
      markPipelineWaitingForMerge();
      return;
    }

    setPipelineStep('pages', 'running', 'Refreshing archive');
    setPipelineStep('validation', 'running', 'Resolving scans');
    setPipelineStep('live', 'running', 'Deploy pending');
    void monitorZzapAwardsLive(year, parsed.records.length);
  } catch (error) {
    setPipelineStep('source', 'error', 'Failed');
    writeLog(\`Zzap award publish failed: \${error.message}\`, true);
  } finally {
    setButtonBusy(publishButton, false, 'Publish Zzap Awards Year');
  }
}

async function monitorZzapAwardsLive(year, expectedCount) {
  const sourceUrl = \`\${SITE_ORIGIN}/data/zzap64-awards/\${year}.json\`;
  const reviewUrl = \`\${SITE_ORIGIN}/data/zzap64-review-links.json\`;
  const prefix = \`\${year}|\`;

  for (let attempt = 0; attempt < 24; attempt += 1) {
    try {
      const [sourceResponse, reviewResponse] = await Promise.all([
        fetch(\`\${sourceUrl}?publisher_check=\${Date.now()}\`, { cache: 'no-store' }),
        fetch(\`\${reviewUrl}?publisher_check=\${Date.now()}\`, { cache: 'no-store' })
      ]);
      if (sourceResponse.ok && reviewResponse.ok) {
        const sourceData = await sourceResponse.json();
        const reviewData = await reviewResponse.json();
        const yearLinks = Object.entries(reviewData?.entries || {}).filter(([key]) => key.startsWith(prefix));
        const directLinks = yearLinks.filter(([, row]) => row?.precision === 'page');
        if (Array.isArray(sourceData) && sourceData.length === expectedCount && yearLinks.length === expectedCount && directLinks.length === expectedCount) {
          setPipelineStep('pages', 'ok', 'Archive updated');
          setPipelineStep('validation', 'ok', 'Direct scans verified');
          setPipelineStep('live', 'ok', 'Live');
          writeLog(\`Zzap \${year} is live with \${directLinks.length}/\${expectedCount} direct original review scan links.\`);
          return;
        }
      }
    } catch (_error) {
      // The deployment or automated review-link refresh may still be in progress.
    }
    await sleep(5000);
  }

  writeLog(\`Zzap \${year} source was published, but the direct-scan refresh is still processing. Check Publishing Status or GitHub Actions shortly.\`);
}

async function publishGame(event) {`
  }
]);

patchFile("tests/content-publisher.test.mjs", [
  {
    label: "Zzap publisher test",
    before: `test('YouTube URLs are normalised without exposing credentials', () => {`,
    after: `test('publisher supports a new Zzap awards year without hand-editing archive code', () => {
  assert.match(html, /Zzap!64 Awards Year/);
  assert.match(html, /official Zzap Bible/i);
  assert.match(js, /data\\/zzap64-awards\\/\\$\\{year\\}\\.json/);
  assert.match(js, /parseZzapAwardsInput/);
  assert.match(js, /monitorZzapAwardsLive/);
  assert.match(js, /refuses to overwrite an existing historical award year/i);
});

test('YouTube URLs are normalised without exposing credentials', () => {`
  }
]);

console.log("Prepared Content Publisher support for future Zzap!64 award years.");
