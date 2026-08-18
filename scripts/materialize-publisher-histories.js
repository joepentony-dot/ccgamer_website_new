#!/usr/bin/env node

"use strict";

const fs = require("fs");
const path = require("path");

const repoRoot = process.env.CCG_REPO_ROOT
  ? path.resolve(process.env.CCG_REPO_ROOT)
  : path.resolve(__dirname, "..");

const dataDir = path.join(repoRoot, "data");
const publishersDir = path.join(repoRoot, "games", "publishers");
const metadataPath = path.join(publishersDir, "publishers.json");
const staticPagesPath = path.join(repoRoot, "tools", "seo", "static-pages.json");
const PROFILE_FILE_PATTERN = /^publisher-histories(?:-[a-z0-9-]+)?\.json$/i;
const HISTORY_START = "<!-- CCG:PUBLISHER-HISTORY:START -->";
const HISTORY_END = "<!-- CCG:PUBLISHER-HISTORY:END -->";
const HISTORY_CSS = '<link rel="stylesheet" href="/resources/css/publisher-history.css">';
const INTERNAL_FACT_PATTERN = /\b(?:CCG|Cheeky Commodore Gamer)\s+(?:publisher\s+)?(?:index|archive)\b/i;
const INDEXABLE_MIN_GAMES = 2;

const GENRE_ROUTES = Object.freeze([
  { key: "action-adventure", label: "Action Adventure", href: "/games/genres/action-adventure-games.html", pattern: /\baction[- ]adventures?\b/i },
  { key: "adventure", label: "Adventure", href: "/games/genres/adventure-games.html", pattern: /\badventure games?\b/i },
  { key: "arcade", label: "Arcade", href: "/games/genres/arcade-games.html", pattern: /\barcade\b/i },
  { key: "casino", label: "Casino Games", href: "/games/genres/casino-games.html", pattern: /\bcasino games?\b/i },
  { key: "fighting", label: "Fighting Games", href: "/games/genres/fighting-games.html", pattern: /\bfighting games?\b/i },
  { key: "horror", label: "Horror", href: "/games/genres/horror-games.html", pattern: /\bhorror games?\b/i },
  { key: "platform", label: "Platform", href: "/games/genres/platform-games.html", pattern: /\bplatform(?: games?|ers?)\b/i },
  { key: "puzzle", label: "Puzzle", href: "/games/genres/puzzle-games.html", pattern: /\bpuzzle games?\b/i },
  { key: "racing", label: "Racing", href: "/games/genres/racing-games.html", pattern: /\b(?:racing|driving|motorsport)(?: games?| titles?| releases?| reissues?)?\b/i },
  { key: "role-playing", label: "RPG", href: "/games/genres/role-playing-games.html", pattern: /\b(?:rpgs?|role[- ]playing)(?: games?)?\b/i },
  { key: "quiz", label: "Quiz Games", href: "/games/genres/quiz-games.html", pattern: /\bquiz games?\b/i },
  { key: "shooting", label: "Shooting", href: "/games/genres/shooting-games.html", pattern: /\b(?:shooting|shooters?|shoot[- ]?'?em[- ]?ups?|shmups?)(?: games?)?\b/i },
  { key: "sports", label: "Sports", href: "/games/genres/sports-games.html", pattern: /\bsports(?: games?| titles?| releases?| reissues?)?\b/i },
  { key: "strategy", label: "Strategy", href: "/games/genres/strategy-games.html", pattern: /\bstrategy(?: games?| titles?| releases?)?\b/i }
]);
const GENRE_ROUTE_SET = new Set(GENRE_ROUTES.map((entry) => entry.href));

function fail(message) {
  console.error(`[publisher-history-static] ${message}`);
  process.exit(1);
}

function readJson(filePath, fallback) {
  if (!fs.existsSync(filePath)) return fallback;
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch (error) {
    fail(`Could not parse ${path.relative(repoRoot, filePath)}: ${error.message}`);
  }
}

function writeFileIfChanged(filePath, content) {
  const previous = fs.existsSync(filePath) ? fs.readFileSync(filePath, "utf8") : null;
  if (previous === content) return false;
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content, "utf8");
  return true;
}

function text(value) {
  return String(value ?? "").trim();
}

function normaliseSlug(value) {
  return text(value).toLowerCase().replace(/^\/+|\/+$/g, "");
}

function htmlEscape(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function safeExternalUrl(value) {
  try {
    const url = new URL(value);
    if (!/^https?:$/.test(url.protocol)) return "";
    return url.href;
  } catch (error) {
    return "";
  }
}

function isFirstPartyEvidenceUrl(value) {
  const safe = safeExternalUrl(value);
  if (!safe) return false;
  const hostname = new URL(safe).hostname.toLowerCase().replace(/^www\./, "");
  return hostname === "cheekycommodoregamer.co.uk";
}

function isInternalArchiveFact(value) {
  return INTERNAL_FACT_PATTERN.test(text(value));
}

function loadProfiles() {
  const files = fs.readdirSync(dataDir)
    .filter((name) => PROFILE_FILE_PATTERN.test(name))
    .sort((a, b) => a.localeCompare(b));

  const profiles = [];
  const seen = new Set();

  for (const name of files) {
    const entries = readJson(path.join(dataDir, name), []);
    if (!Array.isArray(entries)) fail(`data/${name} must contain an array.`);

    for (const entry of entries) {
      const slug = normaliseSlug(entry?.slug);
      if (!slug || seen.has(slug)) continue;
      seen.add(slug);
      profiles.push({ ...entry, slug });
    }
  }

  return profiles;
}

function sanitizeProfile(profile) {
  const independentSources = (Array.isArray(profile?.sources) ? profile.sources : [])
    .map((source) => ({
      label: text(source?.label),
      url: safeExternalUrl(source?.url),
      type: text(source?.type)
    }))
    .filter((source) => source.label && source.url && !isFirstPartyEvidenceUrl(source.url));

  const independentFacts = (Array.isArray(profile?.facts) ? profile.facts : [])
    .map((fact) => text(fact))
    .filter((fact) => fact && !isInternalArchiveFact(fact));

  const sourceBacked = independentSources.length > 0;

  return {
    ...profile,
    facts: sourceBacked ? independentFacts : [],
    sources: sourceBacked ? independentSources : [],
    sourceBacked
  };
}

function isPublisherIndexable(record, safeProfile) {
  const count = Number(record?.count || 0);
  return count >= INDEXABLE_MIN_GAMES || Boolean(safeProfile?.sourceBacked);
}

function buildArchiveMap(metadata) {
  const map = new Map();
  for (const record of Array.isArray(metadata) ? metadata : []) {
    const slug = normaliseSlug(record?.slug);
    const count = Number(record?.count || 0);
    const url = text(record?.url);
    const expectedUrl = slug ? `/games/publishers/${slug}/` : "";
    if (!slug || !Number.isFinite(count) || count < 1 || url !== expectedUrl) continue;
    map.set(slug, {
      slug,
      label: text(record?.name || slug),
      count,
      url,
      indexable: Boolean(record?.indexable)
    });
  }
  return map;
}

function partitionRelationships(values, archiveMap) {
  const archives = [];
  const associated = [];
  const seen = new Set();

  for (const entry of Array.isArray(values) ? values : []) {
    const slug = normaliseSlug(entry?.slug);
    const label = text(entry?.label || slug);
    const key = slug || label.toLowerCase();
    if (!label || !key || seen.has(key)) continue;
    seen.add(key);

    const archive = slug ? archiveMap.get(slug) : null;
    if (archive) {
      archives.push({ slug, label, count: archive.count, url: archive.url });
    } else {
      associated.push({ slug, label });
    }
  }

  return { archives, associated };
}

function formatReviewDate(value) {
  const raw = text(value);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return "";
  const date = new Date(`${raw}T12:00:00Z`);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC"
  }).format(date);
}

function resolveGenreLinkForStrength(value) {
  const label = text(value);
  if (!label) return null;

  const matches = GENRE_ROUTES.filter((entry) => {
    if (entry.key === "adventure" && /\baction[- ]adventures?\b/i.test(label)) return false;
    return entry.pattern.test(label);
  });
  const unique = new Map(matches.map((entry) => [entry.href, entry]));
  return unique.size === 1 ? Array.from(unique.values())[0] : null;
}

function renderTagList(values) {
  return `<ul class="ccg-publisher-history__tags">${(Array.isArray(values) ? values : [])
    .map((value) => {
      const label = text(value);
      const genre = resolveGenreLinkForStrength(label);
      if (!genre) return `<li class="ccg-publisher-history__tag">${htmlEscape(label)}</li>`;
      return `<li class="ccg-publisher-history__tag ccg-publisher-history__tag--linked"><a href="${htmlEscape(genre.href)}" data-ccg-genre-strength="${htmlEscape(genre.key)}" aria-label="${htmlEscape(`${label}: browse CCG ${genre.label} games`)}">${htmlEscape(label)}</a></li>`;
    })
    .join("")}</ul>`;
}

function renderFactList(values) {
  return `<ul class="ccg-publisher-history__facts">${values
    .map((value) => `<li>${htmlEscape(value)}</li>`)
    .join("")}</ul>`;
}

function renderArchiveLinks(entries) {
  return `<ul class="ccg-publisher-history__links">${entries.map((entry) => (
    `<li><a href="${htmlEscape(entry.url)}" data-publisher-archive="${htmlEscape(entry.slug)}" aria-label="${htmlEscape(`${entry.label}: open CCG publisher archive containing ${entry.count} ${entry.count === 1 ? "game" : "games"}`)}">${htmlEscape(entry.label)}</a></li>`
  )).join("")}</ul>`;
}

function renderAssociatedLabels(entries) {
  return `<ul class="ccg-publisher-history__associated">${entries.map((entry) => (
    `<li><span title="Historical association; no populated CCG publisher archive is currently available.">${htmlEscape(entry.label)}</span></li>`
  )).join("")}</ul>`;
}

function renderSources(sources) {
  return `<ul class="ccg-publisher-history__sources">${sources.map((source) => {
    const type = source.type
      ? `<span class="ccg-publisher-history__source-type">${htmlEscape(source.type)}</span>`
      : "";
    return `<li><a href="${htmlEscape(source.url)}" target="_blank" rel="noopener noreferrer external">${htmlEscape(source.label)}</a>${type}</li>`;
  }).join("")}</ul>`;
}

function renderPanel(title, content, modifier = "") {
  return `<div class="ccg-publisher-history__panel${modifier ? ` ${modifier}` : ""}"><h3>${htmlEscape(title)}</h3>${content}</div>`;
}

function renderHistorySection(profile, archiveMap) {
  const safeProfile = sanitizeProfile(profile);
  const relationships = partitionRelationships(safeProfile.related, archiveMap);
  const reviewed = formatReviewDate(safeProfile.verified_on);
  const panels = [];

  if (safeProfile.sourceBacked && safeProfile.facts.length) {
    panels.push(renderPanel("Documented company facts", renderFactList(safeProfile.facts)));
  }

  panels.push(renderPanel("Archive strengths", renderTagList(safeProfile.strengths)));

  if (relationships.archives.length) {
    panels.push(renderPanel("Related CCG archives", renderArchiveLinks(relationships.archives)));
  }
  if (relationships.associated.length) {
    panels.push(renderPanel("Associated labels", renderAssociatedLabels(relationships.associated)));
  }
  if (safeProfile.sourceBacked) {
    panels.push(renderPanel(
      "Evidence sources",
      renderSources(safeProfile.sources),
      "ccg-publisher-history__panel--sources"
    ));
  }

  const note = text(
    safeProfile.note || "This contextual summary complements the publisher credits stored in the main game database."
  );
  const status = safeProfile.sourceBacked
    ? `<span class="ccg-publisher-history__status">${htmlEscape(reviewed ? `Evidence reviewed ${reviewed}` : "Evidence links included")}</span>`
    : "";
  const statusLine = status ? `\n    ${status}` : "";

  return `${HISTORY_START}
<section class="ccg-publisher-history${safeProfile.sourceBacked ? " is-source-backed" : ""}" data-ccg-publisher-history="true">
  <div class="ccg-publisher-history__topline">
    <p class="ccg-publisher-history__kicker">${safeProfile.sourceBacked ? "Source-backed publisher profile" : "Curated CCG context"}</p>${statusLine}
  </div>
  <h2 class="ccg-publisher-history__title">About this publisher</h2>
  <p class="ccg-publisher-history__summary">${htmlEscape(text(safeProfile.summary))}</p>
  <div class="ccg-publisher-history__grid">
    ${panels.join("\n    ")}
  </div>
  <p class="ccg-publisher-history__note">${htmlEscape(note)}</p>
</section>
${HISTORY_END}`;
}

function ensureHistoryCss(html) {
  if (html.includes(HISTORY_CSS)) return html;
  const anchor = '<link rel="stylesheet" href="/resources/css/publishers.css">';
  if (html.includes(anchor)) return html.replace(anchor, `${anchor}\n    ${HISTORY_CSS}`);
  return html.replace("</head>", `    ${HISTORY_CSS}\n</head>`);
}

function replaceExistingHistory(html, section) {
  const start = html.indexOf(HISTORY_START);
  const end = html.indexOf(HISTORY_END);
  if (start === -1 || end === -1 || end < start) return "";
  const endIndex = end + HISTORY_END.length;
  return `${html.slice(0, start)}${section}${html.slice(endIndex)}`;
}

function removeExistingHistory(html) {
  const start = html.indexOf(HISTORY_START);
  const end = html.indexOf(HISTORY_END);
  if (start === -1 || end === -1 || end < start) return html;
  return `${html.slice(0, start)}${html.slice(end + HISTORY_END.length)}`;
}

function insertHistory(html, section) {
  const replaced = replaceExistingHistory(html, section);
  if (replaced) return replaced;

  const anchors = [
    '<section class="ccg-publisher-playlist"',
    '<section class="ccg-publishers-tools"'
  ];

  for (const anchor of anchors) {
    const index = html.indexOf(anchor);
    if (index !== -1) return `${html.slice(0, index)}${section}\n\n            ${html.slice(index)}`;
  }

  fail("Could not find a publisher-page insertion anchor.");
}

function setRobots(html, indexable) {
  const robots = indexable ? "index,follow" : "noindex,follow";
  if (!/<meta\s+name="robots"\s+content="[^"]*">/i.test(html)) {
    fail("Generated publisher page is missing its robots meta tag.");
  }
  return html.replace(/<meta\s+name="robots"\s+content="[^"]*">/i, `<meta name="robots" content="${robots}">`);
}

function pagePathForSlug(slug) {
  return path.join(publishersDir, slug, "index.html");
}

function updateStaticPages(metadata) {
  const current = readJson(staticPagesPath, []);
  const currentList = Array.isArray(current) ? current : [];
  const preserved = currentList.filter((entry) => (
    typeof entry === "string" &&
    !entry.replace(/^\/+/, "").startsWith("games/publishers/")
  ));
  const generated = [
    "games/publishers/index.html",
    ...metadata
      .filter((record) => Boolean(record?.indexable))
      .map((record) => `games/publishers/${normaliseSlug(record.slug)}/index.html`)
  ];
  const seen = new Set();
  const next = [...preserved, ...generated].filter((entry) => {
    if (typeof entry !== "string") return false;
    const normalized = entry.trim();
    if (!normalized || seen.has(normalized)) return false;
    seen.add(normalized);
    return true;
  });
  return writeFileIfChanged(staticPagesPath, `${JSON.stringify(next, null, 2)}\n`);
}

function main() {
  const profiles = loadProfiles();
  const profileBySlug = new Map(profiles.map((profile) => [profile.slug, profile]));
  const metadata = readJson(metadataPath, []);
  if (!Array.isArray(metadata)) fail("games/publishers/publishers.json must contain an array.");
  const archiveMap = buildArchiveMap(metadata);

  let changed = 0;
  let sourceBackedCount = 0;
  let noIndependentSourceCount = 0;
  let missingProfileCount = 0;
  let indexableCount = 0;
  let noindexCount = 0;

  for (const record of metadata) {
    const slug = normaliseSlug(record?.slug);
    if (!slug) continue;
    const profile = profileBySlug.get(slug) || null;
    const safeProfile = profile ? sanitizeProfile(profile) : null;
    const indexable = isPublisherIndexable(record, safeProfile);
    record.indexable = indexable;

    if (profile) {
      if (safeProfile.sourceBacked) sourceBackedCount += 1;
      else noIndependentSourceCount += 1;
    } else {
      missingProfileCount += 1;
    }
    if (indexable) indexableCount += 1;
    else noindexCount += 1;

    const filePath = pagePathForSlug(slug);
    if (!fs.existsSync(filePath)) fail(`Missing generated publisher page: games/publishers/${slug}/index.html`);

    const original = fs.readFileSync(filePath, "utf8");
    let next = original;
    if (profile) {
      const section = renderHistorySection(profile, archiveMap);
      next = ensureHistoryCss(insertHistory(next, section));
    } else {
      next = removeExistingHistory(next);
    }
    next = setRobots(next, indexable);

    if (next !== original) {
      fs.writeFileSync(filePath, next, "utf8");
      changed += 1;
    }
  }

  const metadataChanged = writeFileIfChanged(metadataPath, `${JSON.stringify(metadata, null, 2)}\n`);
  const staticPagesChanged = updateStaticPages(metadata);

  console.log(`[publisher-history-static] Publisher pages checked: ${metadata.length}`);
  console.log(`[publisher-history-static] Independent evidence profiles: ${sourceBackedCount}`);
  console.log(`[publisher-history-static] Profiles without reliable independent evidence: ${noIndependentSourceCount}`);
  console.log(`[publisher-history-static] Publisher routes without researched profiles: ${missingProfileCount}`);
  console.log(`[publisher-history-static] Indexable publisher pages: ${indexableCount}`);
  console.log(`[publisher-history-static] Limited publisher pages (noindex,follow): ${noindexCount}`);
  console.log(`[publisher-history-static] Publisher pages updated: ${changed}`);
  console.log(`[publisher-history-static] Metadata updated: ${metadataChanged ? "yes" : "no"}; static pages updated: ${staticPagesChanged ? "yes" : "no"}`);
  console.log("[publisher-history-static] Unresearched publishers keep factual catalogue pages only; no history text is invented.");
  console.log("[publisher-history-static] Self-referential CCG archive evidence is excluded from rendered history panels.");
}

if (require.main === module) main();

module.exports = {
  GENRE_ROUTES,
  GENRE_ROUTE_SET,
  HISTORY_END,
  HISTORY_START,
  INDEXABLE_MIN_GAMES,
  INTERNAL_FACT_PATTERN,
  PROFILE_FILE_PATTERN,
  buildArchiveMap,
  isFirstPartyEvidenceUrl,
  isInternalArchiveFact,
  isPublisherIndexable,
  loadProfiles,
  normaliseSlug,
  renderHistorySection,
  resolveGenreLinkForStrength,
  sanitizeProfile
};