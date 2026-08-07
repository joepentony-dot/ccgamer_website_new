#!/usr/bin/env node

"use strict";

const fs = require("fs");
const path = require("path");

const SITE_ORIGIN = "https://www.cheekycommodoregamer.co.uk";
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function readArg(argv, name, fallback) {
  const index = argv.indexOf(name);
  if (index === -1 || !argv[index + 1]) return fallback;
  return argv[index + 1];
}

function stripHtml(value) {
  return String(value || "")
    .replace(/<[^>]*>/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function truncateSeoText(value, maxLength) {
  const text = stripHtml(value);
  if (!text || text.length <= maxLength) return text;

  const bodyLimit = Math.max(1, maxLength - 1);
  let body = text.slice(0, bodyLimit);
  const lastSpace = body.lastIndexOf(" ");
  if (lastSpace > 0) body = body.slice(0, lastSpace);
  body = body.replace(/[\s,;:–—-]+$/g, "").trim();
  return `${body}…`;
}

function canonicalGameTitle(game) {
  const title = String(game?.title || "").trim();
  const slug = String(game?.slug || "").trim();
  const id = String(game?.id || "").trim();
  if (
    title.toLowerCase() === "smash t.v." ||
    slug === "smash-t-5" ||
    slug === "smash-t-v" ||
    id === "smash_t_5" ||
    id === "smash_tv"
  ) {
    return "Smash TV";
  }
  return title || "Game";
}

function detectPlatform(game) {
  const raw = String(game?.system || game?.platform || "").trim();
  return raw || "Commodore 64";
}

function schemaPlatform(game) {
  const raw = detectPlatform(game).toLowerCase();
  return raw.includes("amiga") ? "Amiga" : "Commodore 64";
}

function firstText(values) {
  for (const value of values) {
    if (Array.isArray(value)) {
      for (const item of value) {
        const text = String(item || "").trim();
        if (text) return text;
      }
      continue;
    }
    const text = String(value || "").trim();
    if (text) return text;
  }
  return "";
}

function resolvePublisher(game) {
  return firstText([game?.credits?.publisher, game?.publisher]);
}

function resolveDeveloper(game) {
  return firstText([game?.credits?.developer, game?.developer, game?.credits?.publisher, game?.publisher]);
}

function buildRuntimeDescription(game, title) {
  const year = String(game?.year || "").trim();
  const publisher = resolvePublisher(game);
  const introParts = [];
  if (year) introParts.push(`${title} (${year})`);
  else introParts.push(title);
  if (publisher) introParts.push(`from ${publisher}`);

  const strippedDescription = stripHtml(game?.description || "");
  const hook = strippedDescription || "retro gameplay, screenshots, reviews and Commodore history.";

  return truncateSeoText(`${introParts.join(" ")} — ${hook}`, 160);
}

function buildSchemaDescription(game, title, platformLong) {
  const raw = stripHtml(game?.description || game?.desc || "");
  if (raw) return truncateSeoText(raw, 300);
  return `${title} is a retro ${platformLong} title featured on Cheeky Commodore Gamer with screenshots, game information, manual links and video coverage.`;
}

function toTokenList(value) {
  if (Array.isArray(value)) {
    return value.map((item) => String(item || "").trim()).filter(Boolean);
  }
  return String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function thumbnailFilename(game, slug) {
  const raw = String(game?.thumbnail || game?.thumb || game?.cover || "").trim();
  if (!raw) return `${slug.replace(/-/g, "_")}_europe.jpg`;
  return raw.includes("/") ? path.basename(raw) : raw;
}

function buildSchemaGraph(game, title, canonicalUrl, imageUrl) {
  const platformLong = schemaPlatform(game);
  const description = buildSchemaDescription(game, title, platformLong);
  const videoGame = {
    "@type": "VideoGame",
    "@id": `${canonicalUrl}#game`,
    name: title,
    description,
    url: canonicalUrl,
  };

  const year = String(game?.year || "").trim();
  if (year) videoGame.datePublished = year;
  if (platformLong) videoGame.gamePlatform = platformLong;

  const genres = toTokenList(game?.genres);
  if (genres.length === 1) videoGame.genre = genres[0];
  if (genres.length > 1) videoGame.genre = genres;

  const publisher = resolvePublisher(game);
  if (publisher) {
    videoGame.publisher = {
      "@type": "Organization",
      name: publisher,
    };
  }
  if (imageUrl) videoGame.image = imageUrl;

  return {
    "@context": "https://schema.org",
    "@graph": [
      videoGame,
      {
        "@type": "BreadcrumbList",
        "@id": `${canonicalUrl}#breadcrumb`,
        itemListElement: [
          {
            "@type": "ListItem",
            position: 1,
            name: "Home",
            item: SITE_ORIGIN,
          },
          {
            "@type": "ListItem",
            position: 2,
            name: "Games",
            item: `${SITE_ORIGIN}/games/`,
          },
          {
            "@type": "ListItem",
            position: 3,
            name: title,
            item: canonicalUrl,
          },
        ],
      },
    ],
  };
}

function serializeSchema(schema) {
  return JSON.stringify(schema)
    .replace(/</g, "\\u003c")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}

function replaceMetaContent(html, selectorPattern, content) {
  const safe = escapeHtml(content);
  return html.replace(selectorPattern, (tag) => {
    if (/\bcontent=(['"])/i.test(tag)) {
      return tag.replace(/\bcontent=(['"])[\s\S]*?\1/i, `content="${safe}"`);
    }
    return tag.replace(/\s*\/>$|>$/, (ending) => ` content="${safe}"${ending}`);
  });
}

function ensureTwitterUrl(html, canonicalUrl) {
  const safe = escapeHtml(canonicalUrl);
  const existing = /<meta\s+name="twitter:url"[^>]*>/i;
  if (existing.test(html)) {
    return replaceMetaContent(html, existing, canonicalUrl);
  }
  return html.replace(
    /(<meta\s+name="twitter:image"[^>]*>)/i,
    `$1\n    <meta name="twitter:url" content="${safe}">`
  );
}

function normalizeGeneratedWhitespace(html) {
  return String(html).replace(/[ \t]+$/gm, "");
}

function rootAbsoluteAssetAttributes(html) {
  return html
    .replace(/\b(href|src)=(['"])\.\.\//gi, "$1=$2/")
    .replace(/\bsrcset=(['"])\.\.\//gi, "srcset=$1/");
}

function markCanonicalPageReady(html) {
  let output = String(html);

  output = output.replace(/<body\b[^>]*>/i, (tag) => {
    const classMatch = tag.match(/\bclass=(['"])([^'"]*)\1/i);
    if (!classMatch) return tag.replace(/>$/, ' class="ccg-single-ready">');

    const classes = classMatch[2].split(/\s+/).filter(Boolean);
    if (!classes.includes("ccg-single-ready")) classes.push("ccg-single-ready");
    return tag.replace(classMatch[0], `class="${classes.join(" ")}"`);
  });

  output = output.replace(
    /<div\b([^>]*\bclass=(['"])[^'"]*\bccg-page--single-game\b[^'"]*\2[^>]*)>/i,
    (tag, attributes) => {
      if (/\bdata-ccg-prefilled=(['"])true\1/i.test(tag)) return tag;
      return `<div${attributes} data-ccg-prefilled="true">`;
    }
  );

  return output;
}

function removeStaticNotFoundCopy(html) {
  return html.replace(
    /<section id="gameNotFound" class="game-section game-not-found" hidden>[\s\S]*?<\/section>/i,
    '<section id="gameNotFound" class="game-section game-not-found" hidden><span id="notFoundId" hidden></span></section>'
  );
}

function prefillStaticContent(html, game, title, imagePath) {
  const year = String(game?.year || "").trim();
  const system = detectPlatform(game);
  const developer = resolveDeveloper(game);
  const description = stripHtml(game?.description || "");

  html = html.replace(
    /<img id="gameHeroThumb"[\s\S]*?>/i,
    `<img id="gameHeroThumb" class="game-hero__thumb" src="${escapeHtml(imagePath)}" alt="${escapeHtml(title)} cover art" loading="eager" decoding="async" fetchpriority="high" width="320" height="180">`
  );
  html = html.replace(
    /<h1 id="gameHeroTitle" class="game-hero__title">[\s\S]*?<\/h1>/i,
    `<h1 id="gameHeroTitle" class="game-hero__title">${escapeHtml(title)}</h1>`
  );
  html = html.replace(
    /<span id="gameMetaYear" class="game-meta__item">[\s\S]*?<\/span>/i,
    `<span id="gameMetaYear" class="game-meta__item">${escapeHtml(year)}</span>`
  );
  html = html.replace(
    /<span id="gameMetaSystem" class="game-meta__item">[\s\S]*?<\/span>/i,
    `<span id="gameMetaSystem" class="game-meta__item">${escapeHtml(system)}</span>`
  );
  html = html.replace(
    /<span id="gameMetaDeveloper" class="game-meta__item">[\s\S]*?<\/span>/i,
    `<span id="gameMetaDeveloper" class="game-meta__item">${escapeHtml(developer)}</span>`
  );

  if (description) {
    html = html.replace(
      /<section id="game-description-section" class="game-section" hidden>/i,
      '<section id="game-description-section" class="game-section">'
    );
    html = html.replace(
      /<div id="gameDescription" class="game-description">[\s\S]*?<\/div>/i,
      `<div id="gameDescription" class="game-description">${escapeHtml(description)}</div>`
    );
  }

  return html;
}

function buildCanonicalPage(shell, game) {
  const slug = String(game?.slug || "").trim();
  const title = canonicalGameTitle(game);
  const platform = detectPlatform(game);
  const seoTitle = `${title} – ${platform} | Review, Screens & History`;
  const description = buildRuntimeDescription(game, title);
  const canonicalUrl = `${SITE_ORIGIN}/games/${slug}/`;
  const imagePath = `/resources/images/thumbnails/all/${thumbnailFilename(game, slug)}`;
  const imageUrl = `${SITE_ORIGIN}${imagePath}`;
  const schemaJson = serializeSchema(buildSchemaGraph(game, title, canonicalUrl, imageUrl));
  const schemaScript = `    <script type="application/ld+json" data-ccg-schema="game-graph">${schemaJson}</script>`;

  let html = markCanonicalPageReady(rootAbsoluteAssetAttributes(shell));
  html = html.replace(
    /<title id="game-meta-title">[\s\S]*?<\/title>/i,
    `<title id="game-meta-title">${escapeHtml(seoTitle)}</title>`
  );
  html = replaceMetaContent(
    html,
    /<meta\s+name="description"\s+id="game-meta-description"[\s\S]*?>/i,
    description
  );
  html = html.replace(
    /<meta\s+name="robots"\s+content="[^"]*"\s*>/i,
    '<meta name="robots" content="index,follow">'
  );
  html = html.replace(
    /<link rel="canonical" id="game-canonical" href="[^"]*">/i,
    `<link rel="canonical" id="game-canonical" href="${canonicalUrl}">`
  );
  html = replaceMetaContent(html, /<meta property="og:title" id="game-og-title"[\s\S]*?>/i, seoTitle);
  html = replaceMetaContent(html, /<meta property="og:description" id="game-og-description"[\s\S]*?>/i, description);
  html = replaceMetaContent(html, /<meta property="og:image" id="game-og-image"[\s\S]*?>/i, imageUrl);
  html = replaceMetaContent(html, /<meta property="og:url" id="game-og-url"[\s\S]*?>/i, canonicalUrl);
  html = replaceMetaContent(html, /<meta name="twitter:title" id="game-twitter-title"[\s\S]*?>/i, seoTitle);
  html = replaceMetaContent(html, /<meta name="twitter:description" id="game-twitter-description"[\s\S]*?>/i, description);
  html = replaceMetaContent(html, /<meta name="twitter:image" id="game-twitter-image"[\s\S]*?>/i, imageUrl);
  html = ensureTwitterUrl(html, canonicalUrl);
  html = html.replace(
    /<script id="ccg-schema-fallback" data-schema-placeholder="true"><\/script>/i,
    schemaScript
  );
  html = removeStaticNotFoundCopy(html);
  html = prefillStaticContent(html, game, title, imagePath);
  return normalizeGeneratedWhitespace(html);
}

function buildFlatRedirectStub(game) {
  const slug = String(game?.slug || "").trim();
  const title = canonicalGameTitle(game);
  const platform = schemaPlatform(game);
  const canonicalUrl = `${SITE_ORIGIN}/games/${slug}/`;
  const description = `${title} on ${platform} — screenshots, manual, downloads and video.`;
  const target = `/games/${slug}/`;

  return `<!DOCTYPE html>\n<html lang="en">\n<head>\n<meta charset="UTF-8">\n<meta name="viewport" content="width=device-width, initial-scale=1.0">\n<meta name="robots" content="noindex,follow">\n<meta http-equiv="refresh" content="0; url=${escapeHtml(target)}">\n<script>\n(function(){\nwindow.location.replace(${JSON.stringify(target)} + window.location.search + window.location.hash);\n})();\n</script>\n<title>${escapeHtml(title)} | Cheeky Commodore Gamer</title>\n<meta name="description" content="${escapeHtml(description)}">\n<link rel="canonical" href="${escapeHtml(canonicalUrl)}">\n</head>\n<body></body>\n</html>\n`;
}

function writeIfChanged(filePath, content) {
  const previous = fs.existsSync(filePath) ? fs.readFileSync(filePath, "utf8") : null;
  if (previous === content) return false;
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content, "utf8");
  return true;
}

function validateGames(games) {
  if (!Array.isArray(games)) throw new Error("games/games.json must contain a top-level array.");
  const seen = new Set();
  const errors = [];

  games.forEach((game, index) => {
    const slug = String(game?.slug || "").trim();
    const title = String(game?.title || "").trim();
    if (!slug || !SLUG_PATTERN.test(slug)) {
      errors.push(`Entry ${index + 1} (${title || "untitled"}) has invalid slug "${slug}".`);
    }
    if (!title) errors.push(`Entry ${index + 1} (${slug || "missing slug"}) has no title.`);
    if (slug && seen.has(slug)) errors.push(`Duplicate slug: ${slug}.`);
    if (slug) seen.add(slug);
  });

  if (errors.length) {
    throw new Error(`Game route generation failed:\n- ${errors.join("\n- ")}`);
  }
}

function run(options = {}) {
  const sourceRoot = path.resolve(options.sourceRoot || path.resolve(__dirname, ".."));
  const outputRoot = path.resolve(options.outputRoot || sourceRoot);
  const gamesPath = path.join(sourceRoot, "games", "games.json");
  const shellPath = path.join(sourceRoot, "games", "game.html");
  const games = JSON.parse(fs.readFileSync(gamesPath, "utf8"));
  const shell = fs.readFileSync(shellPath, "utf8");
  validateGames(games);

  let canonicalWrites = 0;
  let stubWrites = 0;

  for (const game of games) {
    const slug = String(game.slug).trim();
    const canonicalPath = path.join(outputRoot, "games", slug, "index.html");
    const stubPath = path.join(outputRoot, "games", `${slug}.html`);
    if (writeIfChanged(canonicalPath, buildCanonicalPage(shell, game))) canonicalWrites += 1;
    if (writeIfChanged(stubPath, buildFlatRedirectStub(game))) stubWrites += 1;
  }

  return {
    games: games.length,
    canonicalWrites,
    stubWrites,
    outputRoot,
  };
}

function main(argv = process.argv.slice(2)) {
  const sourceRoot = readArg(argv, "--source-root", path.resolve(__dirname, ".."));
  const outputRoot = readArg(argv, "--output-root", sourceRoot);
  const result = run({ sourceRoot, outputRoot });
  console.log(`[prepare-seo-game-routes] Games checked: ${result.games}`);
  console.log(`[prepare-seo-game-routes] Canonical pages written: ${result.canonicalWrites}`);
  console.log(`[prepare-seo-game-routes] Redirect stubs written: ${result.stubWrites}`);
  console.log(`[prepare-seo-game-routes] Output root: ${result.outputRoot}`);
}

if (require.main === module) {
  try {
    main();
  } catch (error) {
    console.error(`[prepare-seo-game-routes] ${error.message}`);
    process.exit(1);
  }
}

module.exports = {
  buildCanonicalPage,
  buildFlatRedirectStub,
  buildRuntimeDescription,
  buildSchemaGraph,
  canonicalGameTitle,
  run,
  truncateSeoText,
  validateGames,
};
