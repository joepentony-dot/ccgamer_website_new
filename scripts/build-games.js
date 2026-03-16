const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const games = require("../games/games.json");

function normaliseMusicNames(value) {
  const list = Array.isArray(value) ? value : (value ? [value] : []);
  const seen = new Set();

  return list
    .map((name) => String(name ?? "").trim())
    .filter(Boolean)
    .filter((name) => {
      if (seen.has(name)) return false;
      seen.add(name);
      return true;
    });
}

function composerSlug(name) {
  return String(name ?? "")
    .toLowerCase()
    .replace(/[^\w\s]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function htmlEscape(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function writeFileIfChanged(filePath, content) {
  const previousContent = fs.existsSync(filePath)
    ? fs.readFileSync(filePath, "utf8")
    : null;

  if (previousContent === content) {
    return false;
  }

  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content);
  return true;
}

function buildComposerEntries(gamesList) {
  const composers = {};

  gamesList.forEach((game) => {
    const musicNames = normaliseMusicNames(game.music);
    if (musicNames.length === 0) return;

    musicNames.forEach((name) => {
      if (!composers[name]) {
        composers[name] = [];
      }

      composers[name].push({
        slug: game.slug,
        title: game.title,
        thumbnail: game.thumbnail,
      });
    });
  });

  return Object.keys(composers)
    .sort((a, b) => a.localeCompare(b))
    .map((name) => ({
      name,
      slug: composerSlug(name),
      games: composers[name]
        .slice()
        .sort((a, b) => String(a.title ?? "").localeCompare(String(b.title ?? ""))),
    }))
    .filter((entry) => entry.slug);
}

function renderComposerPage(entry) {
  const composerName = htmlEscape(entry.name);
  const gameCards = entry.games.map((game) => {
    const gameTitle = htmlEscape(game.title);
    const gameSlug = htmlEscape(game.slug);
    const gameThumb = htmlEscape(game.thumbnail || "default.jpg");

    return `<article class="ccg-card">
  <a href="/games/${gameSlug}/" class="ccg-card__media-link" aria-label="Open ${gameTitle}">
    <img src="/resources/images/thumbnails/all/${gameThumb}" alt="${gameTitle} thumbnail" loading="lazy">
  </a>
  <div class="ccg-card__body">
    <h2 class="ccg-card__title"><a href="/games/${gameSlug}/">${gameTitle}</a></h2>
  </div>
</article>`;
  }).join("\n");

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${composerName} Music | Cheeky Commodore Gamer</title>
<link rel="stylesheet" href="/resources/css/ccg-master.css">
<link rel="stylesheet" href="/resources/css/ccg-cards.css">
<link rel="stylesheet" href="/resources/css/ccg-mode.css">
</head>
<body class="ccg-body" data-ccg-mode="c64" data-mode="c64">
<main class="ccg-main" style="padding:2rem;max-width:1200px;margin:0 auto;">
  <h1>${composerName}</h1>
  <p>Games with music by ${composerName}</p>
  <p><a href="/music/index.html">Browse all composers</a></p>
  <section class="ccg-card-grid" style="display:grid;gap:1rem;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));">
${gameCards}
  </section>
</main>
</body>
</html>`;
}

function renderMusicIndexPage(composerEntries) {
  const composerLinks = composerEntries
    .map((entry) => `<li><a href="/music/${htmlEscape(entry.slug)}/">${htmlEscape(entry.name)}</a></li>`)
    .join("\n");

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Music Composers | Cheeky Commodore Gamer</title>
<link rel="stylesheet" href="/resources/css/ccg-master.css">
<link rel="stylesheet" href="/resources/css/ccg-cards.css">
<link rel="stylesheet" href="/resources/css/ccg-mode.css">
</head>
<body class="ccg-body" data-ccg-mode="c64" data-mode="c64">
<main class="ccg-main" style="padding:2rem;max-width:900px;margin:0 auto;">
  <h1>Music Composers</h1>
  <ul>
${composerLinks}
  </ul>
</main>
</body>
</html>`;
}

function cleanStaleComposerPages(composerEntries) {
  const musicDir = "music";
  if (!fs.existsSync(musicDir)) return;

  const activeSlugs = new Set(composerEntries.map((entry) => entry.slug));

  fs.readdirSync(musicDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .forEach((entry) => {
      if (activeSlugs.has(entry.name)) return;
      fs.rmSync(path.join(musicDir, entry.name), { recursive: true, force: true });
    });
}

const indexData = games.map((game) => ({
  slug: game.slug,
  title: game.title,
  year: game.year,
  thumbnail: game.thumbnail,
}));

fs.writeFileSync("games/games-index.json", JSON.stringify(indexData, null, 2));

const searchData = games.map((game) => ({
  title: game.title,
  slug: game.slug,
  music: normaliseMusicNames(game.music),
}));

fs.writeFileSync("games/games-search.json", JSON.stringify(searchData, null, 2));

let sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n`;
sitemap += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;

games.forEach((game) => {
  sitemap += `\n <url>\n   <loc>https://www.cheekycommodoregamer.co.uk/games/${game.slug}/</loc>\n   <changefreq>monthly</changefreq>\n   <priority>0.8</priority>\n </url>`;
});

sitemap += `\n</urlset>`;

fs.writeFileSync("sitemap-games.xml", sitemap);

const isLocalRun = !process.env.CI && !process.env.GITHUB_ACTIONS;
const forcePageBuild = process.env.CCG_BUILD_GAME_PAGES === "1";
const shouldBuildPages = isLocalRun || forcePageBuild;

if (shouldBuildPages) {
  const template = fs.readFileSync("templates/game-template.html", "utf8");

  const redirectTemplate = fs.readFileSync(
    "templates/game-redirect-template.html",
    "utf8"
  );

  const fillTemplate = (source, game) =>
    source
      .replaceAll("[title]", String(game.title ?? ""))
      .replaceAll("[slug]", String(game.slug ?? ""))
      .replaceAll("[year]", String(game.year ?? ""))
      .replaceAll("[publisher]", String(game.publisher ?? ""))
      .replaceAll("[thumbnail]", String(game.thumbnail ?? ""));

  games.forEach((game) => {
    const gameDir = path.join("games", game.slug);
    const gamePagePath = path.join(gameDir, "index.html");
    const gameRedirectPath = path.join("games", `${game.slug}.html`);

    fs.mkdirSync(gameDir, { recursive: true });
    fs.writeFileSync(gamePagePath, fillTemplate(template, game));
    fs.writeFileSync(gameRedirectPath, fillTemplate(redirectTemplate, game));
  });

  const composerEntries = buildComposerEntries(games);
  const musicHash = crypto
    .createHash("sha256")
    .update(JSON.stringify(composerEntries))
    .digest("hex");
  const musicHashPath = path.join("music", ".music-data.hash");
  const previousMusicHash = fs.existsSync(musicHashPath)
    ? fs.readFileSync(musicHashPath, "utf8").trim()
    : "";

  if (musicHash !== previousMusicHash) {
    composerEntries.forEach((entry) => {
      const composerFile = path.join("music", entry.slug, "index.html");
      writeFileIfChanged(composerFile, renderComposerPage(entry));
    });

    cleanStaleComposerPages(composerEntries);
    writeFileIfChanged(path.join("music", "index.html"), renderMusicIndexPage(composerEntries));
    writeFileIfChanged(musicHashPath, `${musicHash}\n`);
  }
}
