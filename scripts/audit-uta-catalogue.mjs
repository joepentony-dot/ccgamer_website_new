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
const OVERRIDES_PATH = path.join(ROOT, "data", "uta-match-overrides.json");
const REPORT_DIR = path.join(ROOT, "reports");
const REPORT_JSON = path.join(REPORT_DIR, "uta-full-catalogue-audit.json");
const REPORT_MD = path.join(REPORT_DIR, "uta-full-catalogue-audit.md");
const LIVE_MAPPING_JSON = path.join(REPORT_DIR, "uta-live-generated-mapping.json");
const LIVE_REVIEW_JSON = path.join(REPORT_DIR, "uta-live-manual-review.json");
const LIVE_RELEASES_JSON = path.join(REPORT_DIR, "uta-live-release-inventory.json");

function isC64(game) {
  const key = normalizeText(game?.system);
  return key === "c64" || key === "commodore 64";
}

function compactTitle(value) {
  return normalizeText(value).replace(/\s+/g, "");
}

function bigrams(value) {
  const text = compactTitle(value);
  if (text.length < 2) return text ? [text] : [];
  const out = [];
  for (let i = 0; i < text.length - 1; i += 1) out.push(text.slice(i, i + 2));
  return out;
}

function diceSimilarity(a, b) {
  const aa = bigrams(a);
  const bb = bigrams(b);
  if (!aa.length || !bb.length) return 0;
  const counts = new Map();
  for (const gram of aa) counts.set(gram, (counts.get(gram) || 0) + 1);
  let overlap = 0;
  for (const gram of bb) {
    const count = counts.get(gram) || 0;
    if (count > 0) {
      overlap += 1;
      counts.set(gram, count - 1);
    }
  }
  return (2 * overlap) / (aa.length + bb.length);
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

function releaseDirectoriesInIndex(html) {
  const directories = [];
  const hrefPattern = /href=(["'])(.*?)\1/gi;
  let match;

  while ((match = hrefPattern.exec(String(html || "")))) {
    const href = String(match[2] || "");
    if (!href || href === "../" || href.startsWith("?") || href.startsWith("#")) continue;

    try {
      const absolute = new URL(href, UTA_INDEX_URL);
      const segment = absolute.pathname.split("/").filter(Boolean).pop() || "";
      const decoded = decodeURIComponent(segment);
      if (/_\[\d+\]$/i.test(decoded)) directories.push(decoded);
    } catch (_error) {
      // Malformed non-release links are irrelevant to the archive count.
    }
  }

  return directories;
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
  const overrides = fs.existsSync(OVERRIDES_PATH)
    ? JSON.parse(fs.readFileSync(OVERRIDES_PATH, "utf8"))
    : { schemaVersion: 1, games: {} };

  const html = await fetchText(UTA_INDEX_URL);
  const indexReleaseDirectories = releaseDirectoriesInIndex(html);
  const releases = parseUtaIndex(html);
  if (releases.length < 2800) {
    throw new Error(`UTA audit parsed only ${releases.length} releases; refusing incomplete audit.`);
  }
  if (indexReleaseDirectories.length && releases.length !== indexReleaseDirectories.length) {
    const parsedUrls = new Set(releases.map((release) => {
      try {
        return decodeURIComponent(new URL(release.url).pathname.split("/").filter(Boolean).pop() || "");
      } catch (_error) {
        return "";
      }
    }));
    const missingDirectories = indexReleaseDirectories.filter((directory) => !parsedUrls.has(directory));
    throw new Error(
      `UTA parser coverage mismatch: parsed ${releases.length} of ${indexReleaseDirectories.length} release directories; ` +
      `unparsed directories: ${missingDirectories.slice(0, 25).join(", ")}`
    );
  }

  const built = buildUtaMapping(games, releases, overrides);
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
  const fuzzyPublisherCandidates = [];
  const fuzzyTitleOnlyCandidates = [];
  const noTitleCandidate = [];
  const broadTitleDiagnostics = [];

  for (const game of c64Games) {
    const variants = gameTitleSet(game);
    const override = overrides?.games?.[game.slug] || null;
    const excludedIds = new Set((override?.exclude || []).map((row) => String(row?.archiveId || "")));
    const exactCandidates = [...new Set([...variants].flatMap((key) => releasesByTitle.get(key) || []))]
      .filter((release) => !excludedIds.has(String(release.archiveId)));
    const matched = matchGameToUta(game, releases, override);

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

    // A compact-title or curated exact-ID rule may already have resolved this
    // game even though there was no exact normalized-title candidate.
    if (matched.releases.length) continue;

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
      .filter((release) => !excludedIds.has(String(release.archiveId)))
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

    const fuzzy = releases
      .filter((release) => !excludedIds.has(String(release.archiveId)))
      .map((release) => ({
        release,
        relation: candidateRole(game, release),
        similarity: Math.max(
          ...[game?.title, game?.sorttitle]
            .filter(Boolean)
            .map((title) => diceSimilarity(title, release.title))
        )
      }))
      .filter(({ relation, similarity }) =>
        relation.publisherMatched
        && relation.yearCompatible
        && similarity >= 0.68
      )
      .sort((a, b) =>
        b.similarity - a.similarity
        || Number(a.release.archiveId) - Number(b.release.archiveId)
      )
      .slice(0, 3);

    if (fuzzy.length) {
      fuzzyPublisherCandidates.push({
        slug: game.slug,
        title: game.title,
        year: game.year,
        candidates: fuzzy.map(({ release, relation, similarity }) =>
          releaseSummary(release, { ...relation, similarity: Number(similarity.toFixed(3)) })
        )
      });
      continue;
    }

    // Final diagnostic pass: high title similarity even when the CCG publisher
    // metadata does not currently recognise the UTA label. This never changes
    // the public mapping; it exists to expose regional publishers, budget
    // labels and source-data errors for human verification.
    const gameYear = Number(game?.year) || null;
    const fuzzyTitleOnly = releases
      .filter((release) => !excludedIds.has(String(release.archiveId)))
      .map((release) => ({
        release,
        relation: candidateRole(game, release),
        similarity: Math.max(
          ...[game?.title, game?.sorttitle]
            .filter(Boolean)
            .map((title) => diceSimilarity(title, release.title))
        )
      }))
      .filter(({ release, similarity }) => {
        if (similarity < 0.78) return false;
        if (!gameYear || !release.year) return true;
        return release.year >= gameYear - 1 && release.year <= gameYear + 12;
      })
      .sort((a, b) =>
        b.similarity - a.similarity
        || Number(a.release.archiveId) - Number(b.release.archiveId)
      )
      .slice(0, 3);

    if (fuzzyTitleOnly.length) {
      fuzzyTitleOnlyCandidates.push({
        slug: game.slug,
        title: game.title,
        year: game.year,
        candidates: fuzzyTitleOnly.map(({ release, relation, similarity }) =>
          releaseSummary(release, { ...relation, similarity: Number(similarity.toFixed(3)) })
        )
      });
      continue;
    }

    const broadCandidates = releases
      .map((release) => ({
        release,
        relation: candidateRole(game, release),
        similarity: Math.max(
          ...[game?.title, game?.sorttitle]
            .filter(Boolean)
            .map((title) => diceSimilarity(title, release.title))
        )
      }))
      .filter(({ release, similarity }) => {
        if (similarity < 0.5) return false;
        const gameYear = Number(game?.year) || null;
        if (!gameYear || !release.year) return true;
        return release.year >= gameYear - 2 && release.year <= gameYear + 12;
      })
      .sort((a, b) =>
        Number(b.relation.publisherMatched) - Number(a.relation.publisherMatched)
        || b.similarity - a.similarity
        || Number(a.release.archiveId) - Number(b.release.archiveId)
      )
      .slice(0, 5);

    if (broadCandidates.length) {
      broadTitleDiagnostics.push({
        slug: game.slug,
        title: game.title,
        year: game.year,
        candidates: broadCandidates.map(({ release, relation, similarity }) =>
          releaseSummary(release, { ...relation, similarity: Number(similarity.toFixed(3)) })
        )
      });
    }

    noTitleCandidate.push({ slug: game.slug, title: game.title, year: game.year });
  }

  const summary = {
    auditedAt: new Date().toISOString(),
    source: UTA_INDEX_URL,
    utaReleaseDirectoriesSeen: indexReleaseDirectories.length,
    utaUniqueNonZeroArchiveIds: new Set(
      releases.filter((release) => String(release.archiveId) !== "0").map((release) => String(release.archiveId))
    ).size,
    utaZeroIdDirectories: releases.filter((release) => String(release.archiveId) === "0").length,
    utaReleasesParsed: releases.length,
    gamesTotal: games.length,
    c64Games: c64Games.length,
    committedMappedGames: Object.keys(committed.games || {}).length,
    committedMappedReleases: Object.values(committed.games || {}).reduce((sum, record) => sum + (record.releases?.length || 0), 0),
    liveConfidentMappedGames: Object.keys(live.games || {}).length,
    liveConfidentMappedReleases: Object.values(live.games || {}).reduce((sum, record) => sum + (record.releases?.length || 0), 0),
    liveManualReviewGames: manual.entries.length,
    curatedOverrideGames: Object.keys(overrides?.games || {}).length,
    curatedIncludeReleases: Object.values(overrides?.games || {}).reduce(
      (sum, rule) => sum + (Array.isArray(rule?.include) ? rule.include.length : 0),
      0
    ),
    curatedExcludedReleases: Array.isArray(manual.curatedExclusions) ? manual.curatedExclusions.length : 0,
    missingConfidentGamesInCommitted: missingConfidentInCommitted.length,
    staleCommittedGames: staleCommitted.length,
    exactTitleUnresolvedGames: exactTitleUnresolved.length,
    strongCompactTitleCandidateGames: strongCompactTitleCandidates.length,
    publisherVerifiedContainmentCandidateGames: publisherVerifiedContainmentCandidates.length,
    fuzzyPublisherCandidateGames: fuzzyPublisherCandidates.length,
    fuzzyTitleOnlyCandidateGames: fuzzyTitleOnlyCandidates.length,
    noTitleCandidateGames: noTitleCandidate.length,
    broadTitleDiagnosticGames: broadTitleDiagnostics.length
  };

  const report = {
    summary,
    missingConfidentInCommitted,
    staleCommitted,
    changedConfident,
    exactTitleUnresolved,
    strongCompactTitleCandidates,
    publisherVerifiedContainmentCandidates,
    fuzzyPublisherCandidates,
    fuzzyTitleOnlyCandidates,
    broadTitleDiagnostics,
    noTitleCandidate
  };

  fs.mkdirSync(REPORT_DIR, { recursive: true });
  fs.writeFileSync(REPORT_JSON, JSON.stringify(report, null, 2) + "\n");
  fs.writeFileSync(LIVE_MAPPING_JSON, JSON.stringify(live, null, 2) + "\n");
  fs.writeFileSync(LIVE_REVIEW_JSON, JSON.stringify(manual, null, 2) + "\n");
  fs.writeFileSync(LIVE_RELEASES_JSON, JSON.stringify({
    schemaVersion: 1,
    source: UTA_INDEX_URL,
    generatedAt: summary.auditedAt,
    releases
  }, null, 2) + "\n");

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
    "## Fuzzy publisher/year-backed title candidates",
    "",
    "These are diagnostic only. The title similarity is approximate; no candidate in this section is auto-published.",
    "",
    markdownTable(
      ["Slug", "Title", "Year", "UTA candidates"],
      fuzzyPublisherCandidates.map((row) => [
        row.slug,
        row.title,
        row.year,
        row.candidates.map((candidate) =>
          `${candidate.archiveId} ${candidate.title} / ${candidate.publisher} ${candidate.yearLabel} (similarity=${candidate.similarity})`
        ).join("; ")
      ])
    ),
    "",
    "## High-similarity title-only candidates",
    "",
    "These are deliberately not auto-published. They are high-similarity title candidates where publisher evidence is absent or conflicts, and are the final human-review queue for regional labels/source-data errors.",
    "",
    markdownTable(
      ["Slug", "Title", "Year", "UTA candidates"],
      fuzzyTitleOnlyCandidates.map((row) => [
        row.slug,
        row.title,
        row.year,
        row.candidates.map((candidate) =>
          `${candidate.archiveId} ${candidate.title} / ${candidate.publisher} ${candidate.yearLabel} (similarity=${candidate.similarity}, publisher=${candidate.publisherMatched})`
        ).join("; ")
      ])
    ),
    "",
    "## Broad diagnostics for otherwise unmatched C64 games",
    "",
    "These are deliberately non-publishing diagnostics. They expose the five closest live UTA titles at similarity 0.50 or better for games that otherwise had no candidate, so alternate titles and source-data gaps can be reviewed rather than silently missed.",
    "",
    markdownTable(
      ["Slug", "Title", "Year", "Closest UTA candidates"],
      broadTitleDiagnostics.map((row) => [
        row.slug,
        row.title,
        row.year,
        row.candidates.map((candidate) =>
          `${candidate.archiveId} ${candidate.title} / ${candidate.publisher} ${candidate.yearLabel} (similarity=${candidate.similarity}, publisher=${candidate.publisherMatched})`
        ).join("; ")
      ])
    ),
    "",
    "## Curated same-title/different-game exclusions",
    "",
    markdownTable(
      ["Slug", "Title", "UTA archive ID", "UTA title", "Publisher", "Year", "Reason"],
      (manual.curatedExclusions || []).map((row) => [
        row.gameSlug,
        row.title,
        row.archiveId,
        row.utaTitle,
        row.publisher,
        row.yearLabel,
        row.reason
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
