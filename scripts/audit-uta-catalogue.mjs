#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import {
  UTA_INDEX_URL,
  parseUtaIndex,
  buildUtaMapping,
  matchGameToUta,
  normalizeText,
  getPublisherCredits,
  titleVariants
} from "./generate-uta-map.mjs";

const ROOT = path.resolve(import.meta.dirname, "..");
const GAMES_PATH = path.join(ROOT, "games", "games.json");
const COMMITTED_MAPPING_PATH = path.join(ROOT, "data", "uta-game-matches.json");
const REPORT_DIR = path.join(ROOT, "reports");
const REPORT_JSON = path.join(REPORT_DIR, "uta-full-catalogue-audit.json");
const REPORT_MD = path.join(REPORT_DIR, "uta-full-catalogue-audit.md");
const LIVE_MAPPING_JSON = path.join(REPORT_DIR, "uta-live-generated-mapping.json");
const LIVE_REVIEW_JSON = path.join(REPORT_DIR, "uta-live-manual-review.json");

function isC64(game) {
  const key = normalizeText(game?.system);
  return key === "c64" || key === "commodore 64";
}

function compactTitle(value) {
  return normalizeText(value).replace(/\s+/g, "");
}

function candidateRole(game, release) {
  const credits = getPublisherCredits(game);
  const original = credits.original.has(release.publisherKey);
  const rerelease = credits.rerelease.has(release.publisherKey);
  const gameYear = Number(game?.year) || null;
  let role = "";

  if (rerelease && (!original || (gameYear && release.year && release.year > gameYear + 1))) {
    role = "re-release";
  } else if (original) {
    role = "publisher";
  } else if (rerelease) {
    role = "re-release";
  }

  const yearCompatible = !(gameYear && release.year) || (Boolean(role) && release.year >= gameYear - 1);
  return { role, publisherMatched: Boolean(role), yearCompatible };
}

function ids(record) {
  return new Set((record?.releases || []).map((row) => String(row.archiveId)));
}

function diffSet(a, b) {
  return [...a].filter((value) => !b.has(value));
}

function gameTitleSet(game) {
  return titleVariants(game?.title, game?.sorttitle);
}

function releaseSummary(release, relation = {}) {
  return {
    archiveId: String(release.archiveId),
    title: release.title,
    publisher: release.publisher,
    year: release.year,
    yearLabel: release.yearLabel,
    url: release.url,
    ...relation
  };
}

async function fetchText(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 45000);
  try {
    const response = await fetch(url, {
      headers: {
        "user-agent": "Cheeky-Commodore-Gamer-UTA-audit/1.0 (+https://www.cheekycommodoregamer.co.uk/)"
      },
      cache: "no-store",
      signal: controller.signal
    });
    if (!response.ok) throw new Error(`UTA index HTTP ${response.status}`);
    return await response.text();
  } finally {
    clearTimeout(timeout);
  }
}

function markdownTable(headers, rows) {
  const escape = (value) => String(value ?? "")
    .replaceAll("|", "\\|")
    .replace(/\r?\n/g, " ");
  if (!rows.length) return "_None._\n";
  return [
    `| ${headers.map(escape).join(" | ")} |`,
    `| ${headers.map(() => "---").join(" | ")} |`,
    ...rows.map((row) => `| ${row.map(escape).join(" | ")} |`)
  ].join("\n") + "\n";
}

async function main() {
  const games = JSON.parse(fs.readFileSync(GAMES_PATH, "utf8"));
  const c64Games = games.filter(isC64);
  const committed = JSON.parse(fs.readFileSync(COMMITTED_MAPPING_PATH, "utf8"));

  const html = await fetchText(UTA_INDEX_URL);
  const releases = parseUtaIndex(html);
  if (releases.length < 1000) {
    throw new Error(`UTA audit parsed only ${releases.length} releases; refusing incomplete audit.`);
  }

  const built = buildUtaMapping(games, releases);
  const live = built.mapping;
  const manual = built.manualReview;

  const missingConfidentInCommitted = [];
  const staleCommitted = [];
  const changedConfident = [];

  const allSlugs = new Set([
    ...Object.keys(committed.games || {}),
    ...Object.keys(live.games || {})
  ]);

  for (const slug of [...allSlugs].sort()) {
    const oldRecord = committed.games?.[slug];
    const liveRecord = live.games?.[slug];
    const oldIds = ids(oldRecord);
    const liveIds = ids(liveRecord);
    const missing = diffSet(liveIds, oldIds);
    const stale = diffSet(oldIds, liveIds);
    if (missing.length) {
      missingConfidentInCommitted.push({
        slug,
        title: liveRecord?.title || oldRecord?.title || slug,
        archiveIds: missing,
        releases: (liveRecord?.releases || []).filter((row) => missing.includes(String(row.archiveId)))
      });
    }
    if (stale.length) {
      staleCommitted.push({
        slug,
        title: oldRecord?.title || liveRecord?.title || slug,
        archiveIds: stale,
        releases: (oldRecord?.releases || []).filter((row) => stale.includes(String(row.archiveId)))
      });
    }
    if (missing.length || stale.length) {
      changedConfident.push({ slug, missing, stale });
    }
  }

  const releasesByTitle = new Map();
  const releasesByCompactTitle = new Map();
  for (const release of releases) {
    const titleKey = release.titleKey;
    const compactKey = compactTitle(release.title);
    if (!releasesByTitle.has(titleKey)) releasesByTitle.set(titleKey, []);
    releasesByTitle.get(titleKey).push(release);
    if (compactKey) {
      if (!releasesByCompactTitle.has(compactKey)) releasesByCompactTitle.set(compactKey, []);
      releasesByCompactTitle.get(compactKey).push(release);
    }
  }

  const exactTitleUnresolved = [];
  const strongCompactTitleCandidates = [];
  const publisherVerifiedContainmentCandidates = [];
  const noTitleCandidate = [];

  for (const game of c64Games) {
    const variants = gameTitleSet(game);
    const exactCandidates = [...new Set([...variants].flatMap((key) => releasesByTitle.get(key) || []))];
    const matched = matchGameToUta(game, releases);

    if (exactCandidates.length && !matched.releases.length) {
      exactTitleUnresolved.push({
        slug: game.slug,
        title: game.title,
        year: game.year,
        publishers: [...new Set(getPublisherCredits(game).original.values())],
        reReleasers: [...new Set(getPublisherCredits(game).rerelease.values())],
        candidates: exactCandidates.map((release) => releaseSummary(release, candidateRole(game, release)))
      });
      continue;
    }

    if (exactCandidates.length) continue;

    const compactKeys = new Set(
      [game?.title, game?.sorttitle]
        .filter(Boolean)
        .map(compactTitle)
        .filter(Boolean)
    );
    const compactCandidates = [...new Set([...compactKeys].flatMap((key) => releasesByCompactTitle.get(key) || []))];
    const strongCompact = compactCandidates
      .map((release) => ({ release, relation: candidateRole(game, release) }))
      .filter(({ relation }) => relation.publisherMatched && relation.yearCompatible);

    if (strongCompact.length) {
      strongCompactTitleCandidates.push({
        slug: game.slug,
        title: game.title,
        year: game.year,
        candidates: strongCompact.map(({ release, relation }) => releaseSummary(release, relation))
      });
      continue;
    }

    const gameNorms = [...variants];
    const containment = releases
      .map((release) => ({ release, relation: candidateRole(game, release) }))
      .filter(({ relation }) => relation.publisherMatched && relation.yearCompatible)
      .filter(({ release }) => {
        const rt = release.titleKey;
        return gameNorms.some((gt) =>
          gt.length >= 8
          && rt.length >= 8
          && gt !== rt
          && (gt.includes(rt) || rt.includes(gt))
        );
      });

    if (containment.length) {
      publisherVerifiedContainmentCandidates.push({
        slug: game.slug,
        title: game.title,
        year: game.year,
        candidates: containment.slice(0, 12).map(({ release, relation }) => releaseSummary(release, relation))
      });
      continue;
    }

    noTitleCandidate.push({ slug: game.slug, title: game.title, year: game.year });
  }

  const summary = {
    auditedAt: new Date().toISOString(),
    source: UTA_INDEX_URL,
    utaReleasesParsed: releases.length,
    gamesTotal: games.length,
    c64Games: c64Games.length,
    committedMappedGames: Object.keys(committed.games || {}).length,
    committedMappedReleases: Object.values(committed.games || {}).reduce((sum, record) => sum + (record.releases?.length || 0), 0),
    liveConfidentMappedGames: Object.keys(live.games || {}).length,
    liveConfidentMappedReleases: Object.values(live.games || {}).reduce((sum, record) => sum + (record.releases?.length || 0), 0),
    liveManualReviewGames: manual.entries.length,
    missingConfidentGamesInCommitted: missingConfidentInCommitted.length,
    staleCommittedGames: staleCommitted.length,
    exactTitleUnresolvedGames: exactTitleUnresolved.length,
    strongCompactTitleCandidateGames: strongCompactTitleCandidates.length,
    publisherVerifiedContainmentCandidateGames: publisherVerifiedContainmentCandidates.length,
    noTitleCandidateGames: noTitleCandidate.length
  };

  const report = {
    summary,
    missingConfidentInCommitted,
    staleCommitted,
    changedConfident,
    exactTitleUnresolved,
    strongCompactTitleCandidates,
    publisherVerifiedContainmentCandidates,
    noTitleCandidate
  };

  fs.mkdirSync(REPORT_DIR, { recursive: true });
  fs.writeFileSync(REPORT_JSON, JSON.stringify(report, null, 2) + "\n");
  fs.writeFileSync(LIVE_MAPPING_JSON, JSON.stringify(live, null, 2) + "\n");
  fs.writeFileSync(LIVE_REVIEW_JSON, JSON.stringify(manual, null, 2) + "\n");

  const md = [
    "# Ultimate Tape Archive full C64 catalogue audit",
    "",
    `Generated: ${summary.auditedAt}`,
    "",
    "## Summary",
    "",
    markdownTable(
      ["Metric", "Count"],
      Object.entries(summary)
        .filter(([, value]) => typeof value === "number")
        .map(([key, value]) => [key, value])
    ),
    "## Confident live matches missing from committed mapping",
    "",
    markdownTable(
      ["Slug", "Title", "Missing archive IDs"],
      missingConfidentInCommitted.map((row) => [row.slug, row.title, row.archiveIds.join(", ")])
    ),
    "",
    "## Committed matches no longer reproduced by the live generator",
    "",
    markdownTable(
      ["Slug", "Title", "Stale archive IDs"],
      staleCommitted.map((row) => [row.slug, row.title, row.archiveIds.join(", ")])
    ),
    "",
    "## Exact-title matches blocked by publisher/year evidence",
    "",
    markdownTable(
      ["Slug", "Title", "Year", "UTA candidates"],
      exactTitleUnresolved.map((row) => [
        row.slug,
        row.title,
        row.year,
        row.candidates.map((c) => `${c.archiveId} ${c.publisher} ${c.yearLabel} (publisher=${c.publisherMatched}, year=${c.yearCompatible})`).join("; ")
      ])
    ),
    "",
    "## Strong compact-title candidates",
    "",
    "These are not auto-published by this audit. They have an exact title after whitespace/punctuation compaction plus publisher/year evidence and should be reviewed as likely title-normalisation gaps.",
    "",
    markdownTable(
      ["Slug", "Title", "Year", "UTA candidates"],
      strongCompactTitleCandidates.map((row) => [
        row.slug,
        row.title,
        row.year,
        row.candidates.map((c) => `${c.archiveId} ${c.title} / ${c.publisher} ${c.yearLabel}`).join("; ")
      ])
    ),
    "",
    "## Publisher-verified containment candidates",
    "",
    "These are diagnostic only and require human verification before any matching rule is widened.",
    "",
    markdownTable(
      ["Slug", "Title", "Year", "UTA candidates"],
      publisherVerifiedContainmentCandidates.map((row) => [
        row.slug,
        row.title,
        row.year,
        row.candidates.map((c) => `${c.archiveId} ${c.title} / ${c.publisher} ${c.yearLabel}`).join("; ")
      ])
    ),
    "",
    "## C64 games with no title candidate under the audit heuristics",
    "",
    markdownTable(
      ["Slug", "Title", "Year"],
      noTitleCandidate.map((row) => [row.slug, row.title, row.year])
    )
  ].join("\n");

  fs.writeFileSync(REPORT_MD, md + "\n");

  console.log(JSON.stringify(summary, null, 2));
  console.log(`Audit report: ${path.relative(ROOT, REPORT_JSON)}`);
  console.log(`Live generated mapping: ${path.relative(ROOT, LIVE_MAPPING_JSON)}`);
  console.log(`Live manual review: ${path.relative(ROOT, LIVE_REVIEW_JSON)}`);
}

main().catch((error) => {
  console.error("[uta-audit]", error && error.stack ? error.stack : error);
  process.exit(1);
});
