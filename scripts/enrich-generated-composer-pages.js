#!/usr/bin/env node

"use strict";

const fs = require("fs");
const path = require("path");

const repoRoot = process.env.CCG_REPO_ROOT
  ? path.resolve(process.env.CCG_REPO_ROOT)
  : path.resolve(__dirname, "..");
const SITE_ORIGIN = "https://www.cheekycommodoregamer.co.uk";
const metadataPath = path.join(repoRoot, "music", "composers", "composers.json");
const researchPath = path.join(repoRoot, "music", "composers", "research.json");
const reportPath = path.join(repoRoot, "docs", "seo-baseline", "phase-3c-composer-archives.md");
const staticPagesPath = path.join(repoRoot, "tools", "seo", "static-pages.json");

function fail(message) {
  console.error(`[composer-research] ${message}`);
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

function decodeHtml(value) {
  return String(value || "")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function platformLabel(route) {
  if (route.c64Count && route.amigaCount) return "C64 & Amiga";
  if (route.c64Count) return "Commodore 64";
  if (route.amigaCount) return "Amiga";
  return "C64 & Amiga";
}

function validStructuredDate(value) {
  return typeof value === "string" && /^\d{4}(?:-\d{2}(?:-\d{2})?)?$/.test(value);
}

function exactSource(source) {
  if (!source || typeof source.url !== "string") return false;
  try {
    const parsed = new URL(source.url);
    return parsed.protocol.startsWith("http") && parsed.pathname && parsed.pathname !== "/";
  } catch {
    return false;
  }
}

function extractGameTitles(html) {
  return Array.from(html.matchAll(/<span\s+class="ccg-composer-game-title">([\s\S]*?)<\/span>/gi))
    .map((match) => decodeHtml(match[1].replace(/<[^>]+>/g, "").trim()))
    .filter(Boolean);
}

function naturalList(items) {
  const values = items.filter(Boolean);
  if (values.length <= 1) return values[0] || "";
  if (values.length === 2) return `${values[0]} and ${values[1]}`;
  return `${values.slice(0, -1).join(", ")} and ${values[values.length - 1]}`;
}

function archiveBiography(route, gameTitles) {
  const label = platformLabel(route);
  const years = route.firstYear && route.lastYear
    ? (route.firstYear === route.lastYear ? String(route.firstYear) : `${route.firstYear}–${route.lastYear}`)
    : "the archive period";
  const examples = naturalList(gameTitles.slice(0, 4));
  const creditWord = route.count === 1 ? "credit" : "credits";
  const platformParts = [];
  if (route.c64Count) platformParts.push(`${route.c64Count} C64`);
  if (route.amigaCount) platformParts.push(`${route.amigaCount} Amiga`);

  if (route.count === 1) {
    return `${route.name} is represented in the Cheeky Commodore Gamer archive by one recorded ${label} music credit${examples ? `, ${examples}` : ""}${route.firstYear ? ` (${route.firstYear})` : ""}.`;
  }

  const breakdown = platformParts.length ? ` (${platformParts.join(" and ")})` : "";
  return `In the Cheeky Commodore Gamer archive, ${route.name} is linked to ${route.count} recorded game-music ${creditWord}${breakdown} spanning ${years}${examples ? `. Linked releases include ${examples}` : ""}.`;
}

function buildDescription(route, profile, titles) {
  const label = platformLabel(route);
  const firstTitle = titles[0];
  const personal = profile && profile.bio
    ? `${route.name} biography and verified background, plus ${route.count} linked ${label} game-music ${route.count === 1 ? "credit" : "credits"}`
    : `${route.name} ${label} game-music archive with ${route.count} linked ${route.count === 1 ? "credit" : "credits"}`;
  const suffix = firstTitle ? `, including ${firstTitle}.` : ".";
  const text = `${personal}${suffix}`;
  return text.length <= 158 ? text : `${text.slice(0, 155).replace(/[\s,;:.!-]+$/g, "")}…`;
}

function buildProfileMarkup(route, profile, archiveBio) {
  const label = platformLabel(route);
  const sources = profile && Array.isArray(profile.sources) ? profile.sources.filter(exactSource).slice(0, 4) : [];
  const aliases = profile && Array.isArray(profile.aliases) ? profile.aliases.filter(Boolean) : [];
  const researchLevel = profile ? "verified" : "archive";
  const gameWord = route.count === 1 ? "credit" : "credits";

  const sourceMarkup = sources.length
    ? `<p class="ccg-composer-profile__factline"><strong>Research sources:</strong> ${sources.map((source) => `<a href="${htmlEscape(source.url)}" target="_blank" rel="noopener noreferrer">${htmlEscape(source.title || "Source")}</a>`).join(" · ")}</p>`
    : "";

  return `<article class="ccg-composer-profile ccg-composer-profile--text-only" data-ccg-research-profile="true" data-research-level="${researchLevel}">
        <div>
          <h2 class="ccg-composer-profile__title">${htmlEscape(route.name)}</h2>
          <p class="ccg-composer-profile__platform">${htmlEscape(label)}</p>
          <p class="ccg-composer-profile__facts">${route.count} linked game ${gameWord}</p>
          ${profile?.birthDate ? `<p class="ccg-composer-profile__factline"><strong>Born:</strong> ${htmlEscape(profile.birthDate)}</p>` : ""}
          ${profile?.birthPlace ? `<p class="ccg-composer-profile__factline"><strong>Birthplace:</strong> ${htmlEscape(profile.birthPlace)}</p>` : ""}
          ${profile?.deathDate ? `<p class="ccg-composer-profile__factline"><strong>Died:</strong> ${htmlEscape(profile.deathDate)}</p>` : ""}
          ${profile?.nationality ? `<p class="ccg-composer-profile__factline"><strong>Nationality:</strong> ${htmlEscape(profile.nationality)}</p>` : ""}
          ${aliases.length ? `<p class="ccg-composer-profile__factline"><strong>Also known as:</strong> ${htmlEscape(aliases.join(", "))}</p>` : ""}
          ${profile?.bio ? `<p class="ccg-composer-profile__bio">${htmlEscape(profile.bio)}</p>` : ""}
          <p class="ccg-composer-profile__bio">${htmlEscape(archiveBio)}</p>
          ${sourceMarkup}
        </div>
      </article>`;
}

function buildEntitySchema(route, profile, archiveBio) {
  const url = `${SITE_ORIGIN}/music/${route.slug}/`;
  const entityType = profile?.entityType === "MusicGroup" ? "MusicGroup" : "Person";
  const entity = {
    "@type": entityType,
    "@id": `${url}#${entityType === "MusicGroup" ? "group" : "person"}`,
    name: profile?.name || route.name,
    description: profile?.bio ? `${profile.bio} ${archiveBio}` : archiveBio,
    url
  };

  if (entityType === "Person") {
    if (profile?.birthDate && validStructuredDate(profile.birthDate)) entity.birthDate = profile.birthDate;
    if (profile?.birthPlace) entity.birthPlace = { "@type": "Place", name: profile.birthPlace };
    if (profile?.deathDate && validStructuredDate(profile.deathDate)) entity.deathDate = profile.deathDate;
    if (profile?.nationality) entity.nationality = profile.nationality;
  }
  if (Array.isArray(profile?.aliases) && profile.aliases.length) entity.alternateName = profile.aliases;
  if (Array.isArray(profile?.sameAs) && profile.sameAs.length) entity.sameAs = profile.sameAs;
  return entity;
}

function replaceJsonLd(html, route, profile, archiveBio) {
  const scriptPattern = /<script\s+type="application\/ld\+json">\s*([\s\S]*?)\s*<\/script>/i;
  const match = html.match(scriptPattern);
  if (!match) return html;

  try {
    const schema = JSON.parse(match[1]);
    if (!schema || !Array.isArray(schema["@graph"])) return html;
    const entity = buildEntitySchema(route, profile, archiveBio);
    const graph = schema["@graph"].filter((node) => !(node && typeof node === "object" && typeof node["@id"] === "string" && /#(?:person|group)$/.test(node["@id"])));
    const page = graph.find((node) => node && node["@type"] === "CollectionPage");
    if (page) page.about = { "@id": entity["@id"] };
    graph.push(entity);
    schema["@graph"] = graph;
    const replacement = `<script type="application/ld+json">\n${JSON.stringify(schema, null, 2).replace(/</g, "\\u003c")}\n  </script>`;
    return html.replace(scriptPattern, replacement);
  } catch (error) {
    console.warn(`[composer-research] Could not enrich schema for ${route.slug}: ${error.message}`);
    return html;
  }
}

function replaceMetaDescription(html, description) {
  return html.replace(/<meta\s+name="description"\s+content="[^"]*">/i, `<meta name="description" content="${htmlEscape(description)}">`)
    .replace(/<meta\s+property="og:description"\s+content="[^"]*">/i, `<meta property="og:description" content="${htmlEscape(description)}">`)
    .replace(/<meta\s+name="twitter:description"\s+content="[^"]*">/i, `<meta name="twitter:description" content="${htmlEscape(description)}">`);
}

function replaceProfile(html, markup) {
  const hostPattern = /(<div\s+id="composer-content">\s*)([\s\S]*?)(\s*<\/div>\s*\n\s*<div\s+class="ccg-composer-support">)/i;
  if (!hostPattern.test(html)) return null;
  return html.replace(hostPattern, `$1\n      ${markup}\n    $3`);
}

function main() {
  if (!fs.existsSync(metadataPath)) fail("music/composers/composers.json is missing");
  if (!fs.existsSync(researchPath)) fail("music/composers/research.json is missing");

  const metadata = readJson(metadataPath);
  const researchDoc = readJson(researchPath);
  const profiles = researchDoc && typeof researchDoc.profiles === "object" ? researchDoc.profiles : {};
  if (!Array.isArray(metadata)) fail("Composer metadata must be an array");

  let generated = 0;
  let researched = 0;
  let archiveOnly = 0;
  let changed = 0;
  let seoIndexOverrides = 0;
  let metadataChanged = false;
  const overrideStaticEntries = new Set();

  for (const route of metadata) {
    if (!route || !route.generated || !route.slug) continue;
    generated += 1;
    const filePath = path.join(repoRoot, "music", route.slug, "index.html");
    if (!fs.existsSync(filePath)) fail(`Missing generated composer page: ${route.slug}`);
    let html = fs.readFileSync(filePath, "utf8");
    if (!html.includes('data-generated-composer="true"')) fail(`Refusing to enrich non-generated page: ${route.slug}`);

    const profile = profiles[route.slug] || null;
    if (profile) researched += 1;
    else archiveOnly += 1;
    const titles = extractGameTitles(html);
    const archiveBio = archiveBiography(route, titles);
    const markup = buildProfileMarkup(route, profile, archiveBio);
    let next = replaceProfile(html, markup);
    if (!next) fail(`Could not locate composer-content on ${route.slug}`);
    next = replaceMetaDescription(next, buildDescription(route, profile, titles));
    next = replaceJsonLd(next, route, profile, archiveBio);

    if (profile?.seoIndex === true && !route.indexable) {
      next = next.replace(/<meta\s+name="robots"\s+content="noindex,follow">/i, '<meta name="robots" content="index,follow">');
      route.indexable = true;
      metadataChanged = true;
      seoIndexOverrides += 1;
      overrideStaticEntries.add(`music/${route.slug}/index.html`);
    }

    if (next !== html) {
      fs.writeFileSync(filePath, next, "utf8");
      changed += 1;
    }
  }

  if (metadataChanged) {
    fs.writeFileSync(metadataPath, `${JSON.stringify(metadata, null, 2)}\n`, "utf8");
  }

  if (overrideStaticEntries.size) {
    if (!fs.existsSync(staticPagesPath)) fail("tools/seo/static-pages.json is missing");
    const staticPages = readJson(staticPagesPath);
    if (!Array.isArray(staticPages)) fail("tools/seo/static-pages.json must contain an array");
    const seen = new Set(staticPages);
    overrideStaticEntries.forEach((entry) => { if (!seen.has(entry)) { staticPages.push(entry); seen.add(entry); } });
    fs.writeFileSync(staticPagesPath, `${JSON.stringify(staticPages, null, 2)}\n`, "utf8");
  }

  if (fs.existsSync(reportPath)) {
    let report = fs.readFileSync(reportPath, "utf8");
    report = report.replace(
      "- No composer biographies, birth details or personal facts were invented.",
      "- Composer biographies and personal facts are included only where backed by the research registry; unsupported facts are not invented."
    );
    const feature = "- Static research-backed composer profiles, archive summaries and Person/MusicGroup entity data on generated routes.";
    if (!report.includes(feature)) {
      report = report.replace(
        "## Explicit exclusions",
        `${feature}\n\n## Research enrichment\n\n- Externally researched generated profiles: **${researched}**\n- Archive-only generated profiles: **${archiveOnly}**\n- Research registry: \`music/composers/research.json\`\n- Research-backed single-credit SEO overrides: **${seoIndexOverrides}**\n\n## Explicit exclusions`
      );
    } else {
      report = report
        .replace(/- Externally researched generated profiles: \*\*\d+\*\*/, `- Externally researched generated profiles: **${researched}**`)
        .replace(/- Archive-only generated profiles: \*\*\d+\*\*/, `- Archive-only generated profiles: **${archiveOnly}**`)
        .replace(/- Research-backed single-credit SEO overrides: \*\*\d+\*\*/, `- Research-backed single-credit SEO overrides: **${seoIndexOverrides}**`);
    }
    fs.writeFileSync(reportPath, report, "utf8");
  }

  console.log(JSON.stringify({ generatedRoutes: generated, externallyResearched: researched, archiveOnly, seoIndexOverrides, changed }, null, 2));
}

if (require.main === module) main();

module.exports = {
  archiveBiography,
  buildDescription,
  buildEntitySchema,
  buildProfileMarkup,
  exactSource,
  replaceJsonLd,
  replaceProfile,
  validStructuredDate
};
