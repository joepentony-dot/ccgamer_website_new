#!/usr/bin/env node

"use strict";

const fs = require("fs");
const childProcess = require("child_process");

function replaceOnce(path, before, after, label) {
  const original = fs.readFileSync(path, "utf8");
  const count = original.split(before).length - 1;
  if (count !== 1) {
    throw new Error(`${label}: expected one match in ${path}, found ${count}`);
  }
  fs.writeFileSync(path, original.replace(before, after));
}

function gameBySlug(games, slug) {
  const game = games.find((entry) => entry.slug === slug);
  if (!game) throw new Error(`Missing game record: ${slug}`);
  return game;
}

function applyCodeCorrections() {
  const archivePath = "admin/js/archive-quality.js";
  replaceOnce(
    archivePath,
    `const VALID_GENRES = new Set([\n  'action adventure',\n  'adventure',\n  'arcade',\n  'casino games',\n  'fighting games',\n  'horror',\n  'miscellaneous',\n  'platform',\n  'puzzle',\n  'racing',\n  'role playing',\n  'quiz',\n  'shooting',\n  'sports',\n  'strategy'\n]);`,
    `const VALID_GENRES = new Set([\n  'action-adventure',\n  'action adventure',\n  'adventure',\n  'arcade',\n  'casino',\n  'casino games',\n  'fighting',\n  'fighting games',\n  'horror',\n  'miscellaneous',\n  'platform',\n  'puzzle',\n  'racing',\n  'role-playing',\n  'role playing',\n  'quiz',\n  'shooting',\n  'sports',\n  'strategy'\n]);`,
    "genre compatibility correction"
  );

  replaceOnce(
    archivePath,
    `  const rating = Number(game?.ccg_rating);`,
    `  const ratingRaw = game?.ccg_rating;\n  const hasRating = ratingRaw !== undefined && ratingRaw !== null && ratingRaw !== '';\n  const rating = hasRating ? Number(ratingRaw) : null;`,
    "optional legacy rating state"
  );

  replaceOnce(
    archivePath,
    `    ['thumbnail', thumbnail, 'Thumbnail path'],\n    ['rating', Number.isFinite(rating) ? String(rating) : '', 'CCG rating']`,
    `    ['thumbnail', thumbnail, 'Thumbnail path']`,
    "remove rating from legacy required fields"
  );

  replaceOnce(
    archivePath,
    `  if (Number.isFinite(rating) && (rating < 1 || rating > 10)) {`,
    `  if (hasRating && (!Number.isFinite(rating) || rating < 1 || rating > 10)) {`,
    "rated value range check"
  );

  replaceOnce(
    archivePath,
    `    const platform = normalizePlatform(game?.system || game?.platform);\n    const titleKey = \`${"${platform}"}:${"${normalizeTitle(game?.title)}"}\`;`,
    `    const platform = normalizePlatform(game?.system || game?.platform);\n    const year = Number.isInteger(Number(game?.year)) ? Number(game.year) : 'unknown';\n    const titleKey = \`${"${platform}"}:${"${year}"}:${"${normalizeTitle(game?.title)}"}\`;`,
    "title variant duplicate key"
  );

  replaceOnce(
    archivePath,
    `    const unverifiable = result.status === 0 || result.status === 405;`,
    `    const unverifiable = result.status === 0 || result.status === 405 || result.status === 429 || result.status >= 500;\n    if (unverifiable) return;`,
    "temporary resource response handling"
  );

  const editorPath = "admin/js/games-editor.js";
  replaceOnce(
    editorPath,
    `const REQUIRED_GENRE_VALUES = [\n  'action adventure',\n  'adventure',\n  'arcade',\n  'casino games',\n  'fighting games',\n  'horror',\n  'miscellaneous',\n  'platform',\n  'puzzle',\n  'racing',\n  'role playing',\n  'quiz',\n  'shooting',\n  'sports',\n  'strategy'\n];`,
    `const REQUIRED_GENRE_VALUES = [\n  'action-adventure',\n  'adventure',\n  'arcade',\n  'casino',\n  'fighting',\n  'horror',\n  'miscellaneous',\n  'platform',\n  'puzzle',\n  'racing',\n  'role-playing',\n  'quiz',\n  'shooting',\n  'sports',\n  'strategy'\n];`,
    "Game Builder canonical genre values"
  );

  replaceOnce(
    editorPath,
    `  if (!Number.isInteger(rating) || rating < 0 || rating > 10) {\n    errors.push('CCG Rating must be an integer between 0 and 10.');\n  }`,
    `  if (!Number.isInteger(rating) || rating < 1 || rating > 10) {\n    errors.push('CCG Rating must be an integer between 1 and 10.');\n  }`,
    "Game Builder rating range"
  );

  const auditScriptPath = "scripts/audit-admin-archive-quality.js";
  replaceOnce(
    auditScriptPath,
    `requireText(code, "RESOURCE_CONCURRENCY = 8", "Bounded local resource checks");`,
    `requireText(code, "RESOURCE_CONCURRENCY = 8", "Bounded local resource checks");\nrequireText(code, "'action-adventure'", "Canonical action-adventure genre");\nrequireText(code, "'role-playing'", "Canonical role-playing genre");\nrequireText(code, "result.status >= 500", "Temporary server response handling");\nrequireText(code, "const hasRating", "Optional legacy rating handling");`,
    "Phase 20A audit guarantees"
  );

  const docsPath = "docs/phase-20-admin-archive-quality-centre.md";
  fs.appendFileSync(
    docsPath,
    `\n## Phase 20A accuracy correction\n\nThe live archive uses canonical genre values such as \`action-adventure\`, \`fighting\`, \`casino\` and \`role-playing\`. The audit accepts those values and their older editor aliases, while the Game Builder now writes the canonical forms. Legacy records without a CCG score are allowed to remain unrated; new Game Builder records still require a score from 1 to 10. Temporary HTTP 429 and 5xx responses are ignored rather than reported as missing files. Same-title checks include release year so intentional versions from different years are not treated as duplicates.\n`
  );
}

function applyCatalogueCorrections() {
  const gamesPath = "games/games.json";
  const games = JSON.parse(fs.readFileSync(gamesPath, "utf8"));
  if (!Array.isArray(games) || games.length !== 651) {
    throw new Error(`Expected 651 games, found ${Array.isArray(games) ? games.length : "invalid JSON"}`);
  }

  const genreAliases = new Map([
    ["action adventure", "action-adventure"],
    ["casino games", "casino"],
    ["fighting games", "fighting"],
    ["role playing", "role-playing"]
  ]);

  for (const game of games) {
    if (!Array.isArray(game.genres)) continue;
    game.genres = [...new Set(game.genres.map((genre) => {
      const raw = String(genre || "").trim().toLowerCase();
      return genreAliases.get(raw) || raw;
    }).filter(Boolean))];
  }

  const publisherCorrections = new Map([
    ["bismark", "Argus Press Software"],
    ["hunchback-2-quasimodos-revenge", "Ocean Software"],
    ["kawasaki-rhythm-rocker", "Sight & Sound Music Software"],
    ["manic-miner", "Software Projects"],
    ["nemesis", "Konami"],
    ["space-harrier", "Elite"],
    ["the-wombles", "Alternative Software"],
    ["vendetta", "System 3"],
    ["wizard", "Ariolasoft"]
  ]);

  for (const [slug, publisher] of publisherCorrections) {
    const game = gameBySlug(games, slug);
    game.credits ||= {};
    const current = Array.isArray(game.credits.publisher)
      ? game.credits.publisher.map((value) => String(value).trim()).filter(Boolean)
      : game.credits.publisher
        ? [String(game.credits.publisher).trim()].filter(Boolean)
        : [];
    if (current.length && !current.includes(publisher)) {
      throw new Error(`${slug} already has a different publisher: ${current.join(", ")}`);
    }
    game.credits.publisher = [publisher];
  }

  for (const slug of [
    "barbarian-2-the-dungeon-of-drax",
    "dan-dare-2-mekons-revenge"
  ]) {
    const game = gameBySlug(games, slug);
    if (Number(game.ccg_rating) !== 0) {
      throw new Error(`${slug} was expected to use legacy rating 0`);
    }
    delete game.ccg_rating;
  }

  const staleAudio = new Map([
    ["20-tons", "20-tons.mp3"],
    ["elidon", "elidon.mp3"],
    ["x-out", "x-out.mp3"],
    ["zeewolf", "zeewolf.mp3"]
  ]);

  for (const [slug, filename] of staleAudio) {
    const game = gameBySlug(games, slug);
    const music = Array.isArray(game.music) ? game.music : game.music ? [game.music] : [];
    if (!music.includes(filename)) {
      throw new Error(`${slug} does not contain expected stale audio reference ${filename}`);
    }
    const retained = music.filter((value) => value !== filename);
    if (retained.length) game.music = retained;
    else delete game.music;
  }

  fs.writeFileSync(gamesPath, `${JSON.stringify(games, null, 2)}\n`);
}

function verifyCatalogue() {
  const games = JSON.parse(fs.readFileSync("games/games.json", "utf8"));
  const acceptedGenres = new Set([
    "action-adventure", "adventure", "arcade", "casino", "fighting",
    "horror", "miscellaneous", "platform", "puzzle", "racing",
    "role-playing", "quiz", "shooting", "sports", "strategy"
  ]);
  const errors = [];
  const ids = new Set();
  const slugs = new Set();

  for (const game of games) {
    const label = game.slug || game.id || game.title || "unknown";
    const publishers = Array.isArray(game?.credits?.publisher)
      ? game.credits.publisher.filter((value) => String(value).trim())
      : game?.credits?.publisher
        ? [game.credits.publisher]
        : [];
    if (!publishers.length) errors.push(`${label}: missing publisher`);

    if (game.ccg_rating !== undefined && game.ccg_rating !== null && game.ccg_rating !== "") {
      const rating = Number(game.ccg_rating);
      if (!Number.isInteger(rating) || rating < 1 || rating > 10) {
        errors.push(`${label}: invalid CCG rating ${game.ccg_rating}`);
      }
    }

    for (const genre of Array.isArray(game.genres) ? game.genres : []) {
      if (!acceptedGenres.has(String(genre).trim().toLowerCase())) {
        errors.push(`${label}: unsupported genre ${genre}`);
      }
    }

    if (ids.has(game.id)) errors.push(`${label}: duplicate id ${game.id}`);
    if (slugs.has(game.slug)) errors.push(`${label}: duplicate slug ${game.slug}`);
    ids.add(game.id);
    slugs.add(game.slug);
  }

  for (const slug of ["20-tons", "elidon", "x-out", "zeewolf"]) {
    const game = gameBySlug(games, slug);
    if (Array.isArray(game.music) && game.music.length) {
      errors.push(`${slug}: stale audio reference remains`);
    }
  }

  for (const slug of ["barbarian-2-the-dungeon-of-drax", "dan-dare-2-mekons-revenge"]) {
    if (gameBySlug(games, slug).ccg_rating !== undefined) {
      errors.push(`${slug}: legacy zero rating remains`);
    }
  }

  if (!fs.existsSync("games/night-driver/index.html")) {
    errors.push("night-driver: canonical page is absent from repository");
  }

  if (errors.length) {
    throw new Error(`Phase 20A verification failed:\n- ${errors.join("\n- ")}`);
  }

  console.log(`Verified ${games.length} corrected game records.`);
}

function run(command, args) {
  childProcess.execFileSync(command, args, { stdio: "inherit" });
}

applyCodeCorrections();
applyCatalogueCorrections();
run(process.execPath, ["scripts/rebuild-games.js"]);
if (fs.existsSync("seo-audit-report.md")) fs.unlinkSync("seo-audit-report.md");
verifyCatalogue();
run(process.execPath, ["--check", "admin/js/archive-quality.js"]);
run(process.execPath, ["--check", "admin/js/games-editor.js"]);
run(process.execPath, ["scripts/audit-admin-archive-quality.js"]);
