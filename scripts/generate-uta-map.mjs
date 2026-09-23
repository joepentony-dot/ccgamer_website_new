import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

export const UTA_INDEX_URL = "https://uta.pokefinder.org/Ultimate_Tape_Archive/";
export const DEFAULT_GAMES_PATH = "games/games.json";
export const DEFAULT_OUTPUT_PATH = "data/uta-game-matches.json";
export const DEFAULT_REVIEW_PATH = "data/uta-manual-review.json";
export const DEFAULT_AUDIT_PATH = "data/uta-audit.json";

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

function normalizeTextWithPunctuationSpacing(value) {
  return decodeHtmlEntities(String(value || ""))
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/&/g, " and ")
    .replace(/[_’'\u2018\u2019]+/g, " ")
    .replace(/[^a-zA-Z0-9]+/g, " ")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

const ROMAN_NUMBER_TOKENS = new Map([
  ["ii", "2"], ["iii", "3"], ["iv", "4"], ["v", "5"],
  ["vi", "6"], ["vii", "7"], ["viii", "8"], ["ix", "9"], ["x", "10"]
]);

function normalizeNumberTokens(value) {
  return String(value || "").split(" ").map((token) => ROMAN_NUMBER_TOKENS.get(token) || token).join(" ");
}

function compactInitialisms(value) {
  const tokens = String(value || "").split(" ").filter(Boolean);
  const output = [];
  for (let i = 0; i < tokens.length;) {
    if (/^[a-z]$/.test(tokens[i])) {
      let j = i;
      let joined = "";
      while (j < tokens.length && /^[a-z]$/.test(tokens[j])) {
        joined += tokens[j];
        j += 1;
      }
      if (j - i >= 2) output.push(joined);
      else output.push(tokens[i]);
      i = j;
      continue;
    }
    output.push(tokens[i]);
    i += 1;
  }
  return output.join(" ");
}

function addArticleVariants(variants, normalized) {
  if (!normalized) return;
  variants.add(normalized);
  if (normalized.startsWith("the ")) {
    variants.add(normalized.slice(4) + " the");
  } else if (normalized.endsWith(" the")) {
    variants.add("the " + normalized.slice(0, -4));
  }
}

export function titleVariants(...values) {
  const variants = new Set();
  values.filter(Boolean).forEach((value) => {
    const bases = new Set([
      normalizeText(value),
      normalizeTextWithPunctuationSpacing(value)
    ]);

    [...bases].forEach((base) => {
      if (!base) return;
      const forms = new Set([
        base,
        normalizeNumberTokens(base),
        compactInitialisms(base),
        compactInitialisms(normalizeNumberTokens(base))
      ]);
      forms.forEach((form) => addArticleVariants(variants, form));
    });
  });
  return variants;
}

function numberSignature(value) {
  const normalized = normalizeNumberTokens(String(value || ""));
  return [...normalized.matchAll(/(?:^|\s)(\d+)(?=\s|$)/g)].map((match) => match[1]).join(",");
}

function prefixTitleMatch(gameTitles, releaseTitles) {
  for (const gameTitle of gameTitles) {
    for (const releaseTitle of releaseTitles) {
      if (!gameTitle || !releaseTitle || gameTitle === releaseTitle) continue;
      const shorter = gameTitle.length < releaseTitle.length ? gameTitle : releaseTitle;
      const longer = shorter === gameTitle ? releaseTitle : gameTitle;
      const shortNumericTitle = /^\d{3,}$/.test(shorter);
      if ((shorter.length < 4 && !shortNumericTitle) || !longer.startsWith(shorter + " ")) continue;
      if (numberSignature(gameTitle) !== numberSignature(releaseTitle)) continue;
      return true;
    }
  }
  return false;
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
  ["atlantis gold", "atlantis"],
  ["atlantis", "atlantis"],
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
  const match = decoded.match(/^(.*?)_\(((?:19|20)\d{2}|19xx|198x|0)_([\s\S]+)\)_\[(\d+)\]$/i);
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
    if (!parsed || seen.has(parsed.archiveId)) continue;

    seen.add(parsed.archiveId);
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

export function matchGameToUta(game, utaReleases) {
  if (!isC64(game)) {
    return { releases: [], review: [] };
  }

  const slug = String(game?.slug || "").trim();
  const titles = titleVariants(game?.title, game?.sorttitle);
  if (!slug || !titles.size) return { releases: [], review: [] };

  const credits = getPublisherCredits(game);
  const gameYear = Number(game?.year) || null;
  const titleCandidates = utaReleases
    .map((release) => {
      const releaseTitles = titleVariants(release.title);
      const exact = [...releaseTitles].some((value) => titles.has(value));
      const prefix = !exact && prefixTitleMatch(titles, releaseTitles);
      return exact || prefix ? { release, matchKind: exact ? "exact" : "publisher-qualified-prefix" } : null;
    })
    .filter(Boolean);

  if (!titleCandidates.length) return { releases: [], review: [] };
  const accepted = [];
  const rejected = [];

  titleCandidates.forEach(({ release, matchKind }) => {
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

    const titleCompatible = matchKind === "exact" || Boolean(sourceRole);

    if (sourceRole && yearCompatible && titleCompatible) {
      accepted.push({ ...releaseForOutput(release, sourceRole), titleMatch: matchKind });
    } else {
      rejected.push({
        archiveId: release.archiveId,
        title: release.title,
        publisher: release.publisher,
        yearLabel: release.yearLabel,
        titleMatch: matchKind,
        publisherMatched: Boolean(sourceRole),
        yearCompatible: yearCompatible,
        url: release.url
      });
    }
  });

  const uniqueAccepted = Array.from(
    new Map(accepted.map((release) => [release.archiveId, release])).values()
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

export function buildUtaMapping(games, utaReleases) {
  const publicGames = {};
  const manualReview = [];
  const c64Games = [...games].filter(isC64);

  [...games]
    .sort((a, b) => String(a?.slug || "").localeCompare(String(b?.slug || "")))
    .forEach((game) => {
      const result = matchGameToUta(game, utaReleases);
      if (result.releases.length) {
        publicGames[game.slug] = {
          title: String(game.title || game.slug),
          releases: result.releases
        };
      }
      manualReview.push(...result.review);
    });

  const manualSlugs = new Set(manualReview.map((entry) => entry.gameSlug));
  const matchedSlugs = new Set(Object.keys(publicGames));
  const unmatched = c64Games
    .filter((game) => !matchedSlugs.has(game.slug))
    .map((game) => ({
      slug: String(game.slug || ""),
      title: String(game.title || game.slug || ""),
      year: Number(game.year) || null,
      publishers: toArray(game?.credits?.publisher || game?.publisher).map(String),
      reReleasers: toArray(game?.credits?.re_releaser).map(String),
      status: manualSlugs.has(game.slug) ? "manual-review" : "no-title-candidate"
    }))
    .sort((a, b) => a.slug.localeCompare(b.slug));

  return {
    mapping: {
      schemaVersion: 1,
      source: UTA_INDEX_URL,
      matching: "normalized-title variants (punctuation, article order, roman numerals, initialisms) plus known publisher/re-release evidence; conservative publisher-qualified subtitle/prefix matching; release must not predate the catalogued game by more than one year when both years are known",
      games: publicGames
    },
    manualReview: {
      schemaVersion: 1,
      source: UTA_INDEX_URL,
      note: "Excluded UTA title matches that need source-data verification before they can be exposed.",
      entries: manualReview.sort((a, b) => a.gameSlug.localeCompare(b.gameSlug))
    },
    audit: {
      schemaVersion: 1,
      source: UTA_INDEX_URL,
      summary: {
        c64Games: c64Games.length,
        archiveReleasesScanned: utaReleases.length,
        matchedGames: matchedSlugs.size,
        manualReviewGames: unmatched.filter((row) => row.status === "manual-review").length,
        noTitleCandidateGames: unmatched.filter((row) => row.status === "no-title-candidate").length,
        unmatchedGames: unmatched.length
      },
      unmatched
    }
  };
}

function parseArgs(argv) {
  const options = {
    games: DEFAULT_GAMES_PATH,
    output: DEFAULT_OUTPUT_PATH,
    reviewOutput: DEFAULT_REVIEW_PATH,
    auditOutput: DEFAULT_AUDIT_PATH,
    indexUrl: UTA_INDEX_URL,
    indexFile: ""
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    const next = argv[i + 1];
    if (arg === "--games" && next) options.games = next, i += 1;
    else if (arg === "--output" && next) options.output = next, i += 1;
    else if (arg === "--review-output" && next) options.reviewOutput = next, i += 1;
    else if (arg === "--audit-output" && next) options.auditOutput = next, i += 1;
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

  const result = buildUtaMapping(games, utaReleases);
  writeJson(options.output, result.mapping);
  writeJson(options.reviewOutput, result.manualReview);
  writeJson(options.auditOutput, result.audit);

  console.log(
    `UTA mapping generated: ${Object.keys(result.mapping.games).length} matched games, ` +
    `${result.manualReview.entries.length} manual-review entries, ${utaReleases.length} archive releases scanned. ` +
    `Full C64 audit: ${result.audit.summary.matchedGames}/${result.audit.summary.c64Games} matched, ` +
    `${result.audit.summary.manualReviewGames} manual-review games, ` +
    `${result.audit.summary.noTitleCandidateGames} with no title candidate.`
  );
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error("[UTA] " + (error && error.message ? error.message : error));
    process.exitCode = 1;
  });
}
