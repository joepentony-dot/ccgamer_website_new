#!/usr/bin/env node

"use strict";

const fs = require("fs");
const path = require("path");
const enrich = require("./enrich-generated-composer-pages");
const presentation = require("./normalize-composer-presentation");
const metaCleanup = require("./cleanup-composer-meta-descriptions");

const repoRoot = process.env.CCG_REPO_ROOT
  ? path.resolve(process.env.CCG_REPO_ROOT)
  : path.resolve(__dirname, "..");
const metadataPath = path.join(repoRoot, "music", "composers", "composers.json");
const researchPath = path.join(repoRoot, "music", "composers", "research.json");
const gamesPath = path.join(repoRoot, "games", "games.json");
const clientPath = path.join(repoRoot, "js", "music-composer-pages.js");

function fail(message) {
  console.error(`[composer-research-curated] ${message}`);
  process.exit(1);
}

function readJson(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch (error) {
    fail(`Could not parse ${path.relative(repoRoot, filePath)}: ${error.message}`);
  }
}

function htmlEscape(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function replaceMetaDescription(html, description) {
  return html
    .replace(/<meta\s+name="description"\s+content="[^"]*">/i, `<meta name="description" content="${htmlEscape(description)}">`)
    .replace(/<meta\s+property="og:description"\s+content="[^"]*">/i, `<meta property="og:description" content="${htmlEscape(description)}">`)
    .replace(/<meta\s+name="twitter:description"\s+content="[^"]*">/i, `<meta name="twitter:description" content="${htmlEscape(description)}">`);
}

function replaceProfileHost(html, markup) {
  const host = /<div\s+id="composer-content">[\s\S]*?<\/div>(?=\s*<div\s+class="ccg-composer-support">)/i;
  if (!host.test(html)) return null;
  return html.replace(host, `<div id="composer-content">\n      ${markup}\n    </div>`);
}

function injectEntitySchema(html, route, profile) {
  const entity = enrich.buildEntitySchema(route, profile);
  const schema = JSON.stringify({ "@context": "https://schema.org", ...entity }, null, 2).replace(/</g, "\\u003c");
  const block = `<script type="application/ld+json" data-ccg-composer-research-schema="true">\n${schema}\n</script>`;
  const existing = /<script\s+type="application\/ld\+json"\s+data-ccg-composer-research-schema="true">[\s\S]*?<\/script>/i;
  if (existing.test(html)) return html.replace(existing, block);
  return html.replace(/(<link\s+rel="canonical"[^>]*>)/i, `$1\n${block}`);
}

function preserveStaticResearchProfile() {
  if (!fs.existsSync(clientPath)) fail("js/music-composer-pages.js is missing");
  const html = fs.readFileSync(clientPath, "utf8");
  if (html.includes('const researchedProfile = content.querySelector(\'[data-ccg-research-profile="true"]\');')) {
    return false;
  }

  const needle = `    const systemLabel = getPlatformLabel(bucket.systems);\n    const gameCount = bucket.games.length;\n    const imagePath = await getComposerImagePath(composer.slug);`;
  const replacement = `    const systemLabel = getPlatformLabel(bucket.systems);\n    const gameCount = bucket.games.length;\n    const researchedProfile = content.querySelector('[data-ccg-research-profile="true"]');\n    if (researchedProfile) {\n      const imagePath = await getComposerImagePath(composer.slug);\n      if (imagePath && !researchedProfile.querySelector(".ccg-composer-profile__image")) {\n        const image = document.createElement("img");\n        image.src = imagePath;\n        image.alt = composer.name;\n        image.className = "ccg-composer-profile__image";\n        image.loading = "lazy";\n        researchedProfile.classList.remove("ccg-composer-profile--text-only");\n        researchedProfile.insertAdjacentElement("afterbegin", image);\n      }\n\n      const subtitle = document.querySelector(".ccg-composer-subtitle");\n      if (subtitle) {\n        subtitle.textContent = systemLabel\n          ? \`${'${gameCount}'} linked game credits across ${'${systemLabel}'}\`\n          : \`${'${gameCount}'} linked game credits\`;\n      }\n      return;\n    }\n\n    const imagePath = await getComposerImagePath(composer.slug);`;

  if (!html.includes(needle)) fail("Could not locate composer profile render hook in js/music-composer-pages.js");
  fs.writeFileSync(clientPath, html.replace(needle, replacement), "utf8");
  return true;
}

function main() {
  const metadata = readJson(metadataPath);
  const researchDoc = enrich.loadResearchDocument(researchPath);
  const games = readJson(gamesPath);
  if (!Array.isArray(metadata) || !Array.isArray(games)) fail("Invalid metadata or games JSON");

  const profiles = researchDoc?.profiles || {};
  const gameBySlug = new Map(games.filter(Boolean).map((game) => [game.slug, game]));
  const clientChanged = preserveStaticResearchProfile();

  let curated = 0;
  let changed = 0;
  const missingResearch = [];

  for (const route of metadata.filter((entry) => entry && entry.existing && entry.slug)) {
    curated += 1;
    const profile = profiles[route.slug] || null;
    if (!profile) missingResearch.push(route.slug);

    const titles = (route.games || []).map((slug) => {
      const game = gameBySlug.get(slug);
      return game?.title || game?.name || String(slug).replace(/-/g, " ");
    }).filter(Boolean);

    const markup = enrich.buildProfileMarkup(route, profile).replace(/^[ \t]+$/gm, "");
    const filePath = path.join(repoRoot, "music", route.slug, "index.html");
    if (!fs.existsSync(filePath)) fail(`Missing curated page: ${route.slug}`);

    let html = fs.readFileSync(filePath, "utf8");
    if (html.includes('data-generated-composer="true"')) fail(`Curated route unexpectedly marked generated: ${route.slug}`);

    let next = replaceProfileHost(html, markup);
    if (!next) fail(`Could not locate composer-content on curated page: ${route.slug}`);
    next = replaceMetaDescription(next, enrich.buildDescription(route, profile, titles));
    next = injectEntitySchema(next, route, profile);

    if (next !== html) {
      fs.writeFileSync(filePath, next, "utf8");
      changed += 1;
    }
  }

  const presentationResult = presentation.normalizeAllComposerPages();
  const metaResult = metaCleanup.cleanupAllComposerMetaDescriptions();

  console.log(JSON.stringify({
    curatedRoutes: curated,
    changed,
    clientChanged,
    presentationNormalized: presentationResult.changed,
    metaDescriptionsCleaned: metaResult.changed,
    missingResearch
  }, null, 2));
  if (missingResearch.length) process.exitCode = 2;
}

if (require.main === module) main();
