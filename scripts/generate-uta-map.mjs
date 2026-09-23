import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

export const UTA_INDEX_URL = "https://uta.pokefinder.org/Ultimate_Tape_Archive/";
export const DEFAULT_GAMES_PATH = "games/games.json";
export const DEFAULT_OUTPUT_PATH = "data/uta-game-matches.json";
export const DEFAULT_REVIEW_PATH = "data/uta-manual-review.json";
export const DEFAULT_OVERRIDES_PATH = "data/uta-match-overrides.json";

function decodeHtmlEntities(value) {
  return String(value || "")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">");
}

export function normalizeText(value) {
  return decodeHtmlEntities(String(value || ""))
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/&/g, " and ")
    .replace(/[_’'\u2018\u2019]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, " ")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

export function compactTitle(value) {
  return normalizeText(value).replace(/\s+/g, "");
}

export function titleVariants(...values) {
  const variants = new Set();
  values.filter(Boolean).forEach((value) => {
    const normalized = normalizeText(value);
    if (!normalized) return;
    variants.add(normalized);

    if (normalized.startsWith("the ")) {
      variants.add(normalized.slice(4) + " the");
    } else if (normalized.endsWith(" the")) {
      variants.add("the " + normalized.slice(0, -4));
    }
  });
  return variants;
}

const PUBLISHER_ALIASES = new Map([
  ["u s gold", "us gold"],
  ["us gold", "us gold"],
  ["the hit squad", "hit squad"],
  ["hit squad the", "hit squad"],
  ["hewson consultants", "hewson"],
  ["hewson rack it", "hewson"],
  ["rack it hewson", "hewson"],
  ["firebird silver", "firebird"],
  ["firebird gold", "firebird"],
  ["virgin games", "virgin"],
  ["ultimate play the game", "ultimate"],
  ["edge the", "the edge"],
  ["nexus productions", "nexus"],
  ["cbs", "cbs"],
  ["cbs electronics", "cbs"],
  ["mastertronic added dimension", "mastertronic"],
  ["mad mastertronic", "mastertronic"],
  ["mastertronic plus", "mastertronic"],
  ["players premier", "players"],
  ["players software", "players"],
  ["hi tec", "hitec"],
  ["hitec", "hitec"],
  ["sparklers", "creative sparks"],
  ["creative sparks", "creative sparks"],
  ["micro prose", "microprose"],
  ["microprose", "microprose"],
  ["system 3", "system 3"],
  ["system three", "system 3"]
]);

export function normalizePublisher(value) {
  let normalized = normalizeText(value)
    .replace(/\b(software|systems?|limited|ltd|incorporated|inc|corporation|corp|company|co)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (PUBLISHER_ALIASES.has(normalized)) {
    normalized = PUBLISHER_ALIASES.get(normalized);
  }
  return normalized;
}

function decodeDirectoryName(href) {
  try {
    const absolute = new URL(href, UTA_INDEX_URL);
    const finalSegment = absolute.pathname.split("/").filter(Boolean).pop() || "";
    return decodeURIComponent(finalSegment);
  } catch (_error) {
    return "";
  }
}

export function parseUtaReleaseDirectory(directoryName, href = "") {
  const decoded = decodeHtmlEntities(String(directoryName || "").replace(/\/$/, ""));
  const match = decoded.match(/^(.*?)_\(((?:19|20)(?:\d{2}|\d[xX]|[xX]{2})|0)_([\s\S]+)\)_\[(\d+)\]$/i);
  if (!match) return null;

  const titleRaw = match[1].replace(/_/g, " ").trim();
  const yearLabel = match[2];
  const publisherRaw = match[3].replace(/_/g, " ").trim();
  const year = /^\d{4}$/.test(yearLabel) && Number(yearLabel) > 0 ? Number(yearLabel) : null;
  const archiveId = match[4];

  return {
    archiveId,
    title: titleRaw,
    titleKey: normalizeText(titleRaw),
    publisher: publisherRaw,
    publisherKey: normalizePublisher(publisherRaw),
    year,
    yearLabel,
    url: href ? new URL(href, UTA_INDEX_URL).href : new URL(
      encodeURIComponent(decoded)
        .replace(/%2F/gi, "/")
        .replace(/%28/gi, "(")
        .replace(/%29/gi, ")") + "/",
      UTA_INDEX_URL
    ).href
  };
}

function releaseDirectory(release) {
  try {
    const absolute = new URL(String(release?.url || ""), UTA_INDEX_URL);
    return decodeURIComponent(absolute.pathname.split("/").filter(Boolean).pop() || "");
  } catch (_error) {
    return "";
  }
}

function releaseIdentity(release) {
  const directory = releaseDirectory(release);
  if (directory) return `directory:${directory}`;
  return [
    String(release?.archiveId || ""),
    String(release?.titleKey || ""),
    String(release?.publisherKey || ""),
    String(release?.yearLabel || "")
  ].join("|");
}

function releasesByArchiveId(utaReleases) {
  const map = new Map();
  for (const release of utaReleases) {
    const archiveId = String(release?.archiveId || "").trim();
    if (!archiveId) continue;
    const rows = map.get(archiveId) || [];
    rows.push(release);
    map.set(archiveId, rows);
  }
  return map;
}

function releaseByOverrideSelector(item, utaReleases, slug = "") {
  const directory = String(item?.directory || "").trim();
  const archiveId = String(item?.archiveId || "").trim();

  if (directory) {
    const matches = utaReleases.filter((release) => releaseDirectory(release) === directory);
    if (matches.length !== 1) {
      throw new Error(
        `UTA override ${slug || "(unknown)"} directory selector must resolve exactly one release: ${directory}`
      );
    }
    if (archiveId && String(matches[0].archiveId) !== archiveId) {
      throw new Error(
        `UTA override ${slug || "(unknown)"} directory/archiveId mismatch: ${directory} / ${archiveId}`
      );
    }
    return matches[0];
  }

  if (!archiveId) {
    throw new Error(`UTA override ${slug || "(unknown)"} is missing archiveId or directory`);
  }

  const matches = releasesByArchiveId(utaReleases).get(archiveId) || [];
  if (!matches.length) {
    throw new Error(`UTA override ${slug || "(unknown)"} references unknown archive ID: ${archiveId}`);
  }
  if (matches.length !== 1) {
    throw new Error(
      `UTA override ${slug || "(unknown)"} archive ID ${archiveId} is ambiguous across ${matches.length} live UTA directories; add an exact directory selector`
    );
  }
  return matches[0];
}

export function parseUtaIndex(html) {
  const releases = [];
  const seen = new Set();
  const hrefPattern = /href=(["'])(.*?)\1/gi;
  let match;

  while ((match = hrefPattern.exec(String(html || "")))) {
    const href = decodeHtmlEntities(match[2]);
    if (!href || href === "../" || href.startsWith("?") || href.startsWith("#")) continue;

    const directoryName = decodeDirectoryName(href);
    const parsed = parseUtaReleaseDirectory(directoryName, href);
    if (!parsed) continue;

    const identity = releaseIdentity(parsed);
    if (seen.has(identity)) continue;

    seen.add(identity);
    releases.push(parsed);
  }

  return releases.sort((a, b) =>
    a.titleKey.localeCompare(b.titleKey)
    || String(a.publisherKey).localeCompare(String(b.publisherKey))
    || String(a.yearLabel).localeCompare(String(b.yearLabel))
    || Number(a.archiveId) - Number(b.archiveId)
  );
}

function toArray(value) {
  if (Array.isArray(value)) return value;
  if (value === null || value === undefined || value === "") return [];
  return [value];
}

function publisherCreditKeys(value) {
  const raw = String(value || "").trim();
  const keys = new Set();
  const add = (part) => {
    const key = normalizePublisher(part);
    if (key) keys.add(key);
  };

  add(raw);
  add(raw.replace(/\([^)]*\)/g, " "));

  for (const match of raw.matchAll(/\(([^)]+)\)/g)) {
    add(match[1]);
  }

  return [...keys];
}

export function getPublisherCredits(game) {
  const original = new Map();
  const rerelease = new Map();

  toArray(game?.credits?.publisher || game?.publisher).forEach((name) => {
    publisherCreditKeys(name).forEach((key) => original.set(key, String(name)));
  });

  toArray(game?.credits?.re_releaser).forEach((name) => {
    publisherCreditKeys(name).forEach((key) => rerelease.set(key, String(name)));
  });

  return { original, rerelease };
}

function isC64(game) {
  const system = normalizeText(game?.system);
  return system === "c64" || system === "commodore 64";
}

function releaseForOutput(release, sourceRole) {
  return {
    archiveId: release.archiveId,
    publisher: release.publisher,
    year: release.year,
    yearLabel: release.yearLabel,
    loader: null,
    sourceRole,
    url: release.url
  };
}

function titleMatches(gameTitles, release) {
  if (gameTitles.has(release.titleKey)) return true;
  const releaseCompact = compactTitle(release.titleKey);
  if (releaseCompact.length < 5) return false;
  for (const title of gameTitles) {
    const candidate = compactTitle(title);
    if (candidate.length >= 5 && candidate === releaseCompact) return true;
  }
  return false;
}

function overrideForGame(overrides, slug) {
  return overrides && overrides.games && overrides.games[slug]
    ? overrides.games[slug]
    : null;
}

export function validateUtaOverrides(games, utaReleases, overrides = {}) {
  const gameMap = new Map(
    games
      .filter((game) => game && game.slug)
      .map((game) => [String(game.slug), game])
  );
  const curatedExclusions = [];

  for (const [slug, rule] of Object.entries(overrides?.games || {})) {
    const game = gameMap.get(slug);
    if (!game) throw new Error(`UTA override references unknown game slug: ${slug}`);
    if (!isC64(game)) throw new Error(`UTA override references non-C64 game: ${slug}`);

    const includeKeys = new Set();
    const excludeKeys = new Set();

    for (const item of toArray(rule?.include)) {
      const release = releaseByOverrideSelector(item, utaReleases, slug);
      if (!["publisher", "re-release"].includes(String(item?.sourceRole || ""))) {
        throw new Error(`UTA override ${slug}/${release.archiveId} has invalid sourceRole`);
      }
      const key = releaseIdentity(release);
      if (includeKeys.has(key)) {
        throw new Error(`UTA override ${slug} duplicates include release ${releaseDirectory(release) || release.archiveId}`);
      }
      includeKeys.add(key);
    }

    for (const item of toArray(rule?.exclude)) {
      const release = releaseByOverrideSelector(item, utaReleases, slug);
      const key = releaseIdentity(release);
      if (excludeKeys.has(key)) {
        throw new Error(`UTA override ${slug} duplicates exclude release ${releaseDirectory(release) || release.archiveId}`);
      }
      if (includeKeys.has(key)) {
        throw new Error(`UTA override ${slug}/${release.archiveId} cannot be both included and excluded`);
      }
      excludeKeys.add(key);

      curatedExclusions.push({
        gameSlug: slug,
        title: String(game.title || slug),
        archiveId: release.archiveId,
        directory: releaseDirectory(release),
        utaTitle: release.title,
        publisher: release.publisher,
        yearLabel: release.yearLabel,
        reason: String(item?.reason || "curated-title-collision")
      });
    }
  }

  return curatedExclusions.sort((a, b) =>
    a.gameSlug.localeCompare(b.gameSlug)
    || String(a.directory || "").localeCompare(String(b.directory || ""))
    || Number(a.archiveId) - Number(b.archiveId)
  );
}

export function matchGameToUta(game, utaReleases, override = null) {
  if (!isC64(game)) {
    return { releases: [], review: [] };
  }

  const slug = String(game?.slug || "").trim();
  const titles = titleVariants(game?.title, game?.sorttitle);
  if (!slug || !titles.size) return { releases: [], review: [] };

  const excludedKeys = new Set(
    toArray(override?.exclude).map((item) => releaseIdentity(releaseByOverrideSelector(item, utaReleases, slug)))
  );
  const includedKeys = new Set(
    toArray(override?.include).map((item) => releaseIdentity(releaseByOverrideSelector(item, utaReleases, slug)))
  );
  const titleCandidates = utaReleases.filter((release) =>
    !excludedKeys.has(releaseIdentity(release))
    && !includedKeys.has(releaseIdentity(release))
    && titleMatches(titles, release)
  );

  const credits = getPublisherCredits(game);
  const gameYear = Number(game?.year) || null;
  const accepted = [];
  const rejected = [];

  toArray(override?.include).forEach((item) => {
    const release = releaseByOverrideSelector(item, utaReleases, slug);
    accepted.push(releaseForOutput(release, String(item.sourceRole)));
  });

  titleCandidates.forEach((release) => {
    const originalMatch = credits.original.has(release.publisherKey);
    const rereleaseMatch = credits.rerelease.has(release.publisherKey);
    let sourceRole = "";

    if (rereleaseMatch && (!originalMatch || (gameYear && release.year && release.year > gameYear + 1))) {
      sourceRole = "re-release";
    } else if (originalMatch) {
      sourceRole = "publisher";
    } else if (rereleaseMatch) {
      sourceRole = "re-release";
    }

    const hasKnownYears = Boolean(gameYear && release.year);
    const yearCompatible = !hasKnownYears
      || (Boolean(sourceRole) && release.year >= gameYear - 1);

    if (sourceRole && yearCompatible) {
      accepted.push(releaseForOutput(release, sourceRole));
    } else {
      rejected.push({
        archiveId: release.archiveId,
        publisher: release.publisher,
        yearLabel: release.yearLabel,
        publisherMatched: Boolean(sourceRole),
        yearCompatible,
        url: release.url
      });
    }
  });

  const uniqueAccepted = Array.from(
    new Map(accepted.map((release) => [releaseIdentity(release), release])).values()
  ).sort((a, b) =>
    (a.year || 9999) - (b.year || 9999)
    || a.publisher.localeCompare(b.publisher)
    || Number(a.archiveId) - Number(b.archiveId)
  );

  const review = rejected.length ? [{
    gameSlug: slug,
    title: String(game?.title || slug),
    year: Number(game?.year) || null,
    knownPublishers: [...new Set(credits.original.values())],
    knownReReleasers: [...new Set(credits.rerelease.values())],
    reason: rejected.some((candidate) => candidate.publisherMatched && !candidate.yearCompatible)
      ? "title-publisher-match-year-needs-review"
      : (uniqueAccepted.length
        ? "additional-title-match-publisher-not-in-game-data"
        : "title-match-publisher-not-in-game-data"),
    excludedCandidates: rejected
  }] : [];

  return { releases: uniqueAccepted, review };
}

export function buildUtaMapping(games, utaReleases, overrides = {}) {
  const publicGames = {};
  const manualReview = [];
  const curatedExclusions = validateUtaOverrides(games, utaReleases, overrides);

  [...games]
    .sort((a, b) => String(a?.slug || "").localeCompare(String(b?.slug || "")))
    .forEach((game) => {
      const result = matchGameToUta(game, utaReleases, overrideForGame(overrides, game.slug));
      if (result.releases.length) {
        publicGames[game.slug] = {
          title: String(game.title || game.slug),
          releases: result.releases
        };
      }
      manualReview.push(...result.review);
    });

  return {
    mapping: {
      schemaVersion: 1,
      source: UTA_INDEX_URL,
      matching: "normalized or compact-title match + known publisher/re-release evidence, with curated exact archive-ID overrides for independently verified regional/re-release/alternate-title cases",
      games: publicGames
    },
    manualReview: {
      schemaVersion: 1,
      source: UTA_INDEX_URL,
      note: "Unresolved UTA title matches remain excluded from public data. Curated exclusions record known same-title/different-game collisions.",
      curatedExclusions,
      entries: manualReview.sort((a, b) => a.gameSlug.localeCompare(b.gameSlug))
    }
  };
}

function parseArgs(argv) {
  const options = {
    games: DEFAULT_GAMES_PATH,
    output: DEFAULT_OUTPUT_PATH,
    reviewOutput: DEFAULT_REVIEW_PATH,
    overrides: DEFAULT_OVERRIDES_PATH,
    indexUrl: UTA_INDEX_URL,
    indexFile: ""
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    const next = argv[i + 1];
    if (arg === "--games" && next) options.games = next, i += 1;
    else if (arg === "--output" && next) options.output = next, i += 1;
    else if (arg === "--review-output" && next) options.reviewOutput = next, i += 1;
    else if (arg === "--overrides" && next) options.overrides = next, i += 1;
    else if (arg === "--index-url" && next) options.indexUrl = next, i += 1;
    else if (arg === "--index-file" && next) options.indexFile = next, i += 1;
  }

  return options;
}

async function loadIndex(options) {
  if (options.indexFile) return fs.readFileSync(options.indexFile, "utf8");

  const response = await fetch(options.indexUrl, {
    headers: {
      "user-agent": "Cheeky Commodore Gamer UTA mapping builder/1.0"
    },
    signal: AbortSignal.timeout(30000)
  });
  if (!response.ok) {
    throw new Error(`UTA index request failed with HTTP ${response.status}`);
  }
  return response.text();
}

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2) + "\n", "utf8");
}

export async function main(argv = process.argv.slice(2)) {
  const options = parseArgs(argv);
  const games = JSON.parse(fs.readFileSync(options.games, "utf8"));
  if (!Array.isArray(games)) throw new Error("games/games.json must contain an array.");

  const html = await loadIndex(options);
  const utaReleases = parseUtaIndex(html);
  if (!utaReleases.length) throw new Error("No UTA release directories were parsed; refusing to replace cached mapping.");

  const overrides = options.overrides && fs.existsSync(options.overrides)
    ? JSON.parse(fs.readFileSync(options.overrides, "utf8"))
    : { schemaVersion: 1, games: {} };

  const result = buildUtaMapping(games, utaReleases, overrides);
  writeJson(options.output, result.mapping);
  writeJson(options.reviewOutput, result.manualReview);

  console.log(
    `UTA mapping generated: ${Object.keys(result.mapping.games).length} matched games, ` +
    `${result.manualReview.entries.length} manual-review entries, ${utaReleases.length} archive releases scanned.`
  );
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error("[UTA] " + (error && error.message ? error.message : error));
    process.exitCode = 1;
  });
}
