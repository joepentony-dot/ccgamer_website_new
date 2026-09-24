#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = process.env.CCG_REPO_ROOT
  ? path.resolve(process.env.CCG_REPO_ROOT)
  : path.resolve(here, "..");
const gamesPath = path.join(repoRoot, "games", "games.json");
const mappingPath = path.join(repoRoot, "data", "uta-game-matches.json");
const checkOnly = process.argv.includes("--check");

function fail(message) {
  console.error(`[materialize-uta-links] ${message}`);
  process.exitCode = 1;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function isC64(game) {
  const system = String(game?.system || game?.platform || "").trim().toLowerCase();
  return system === "c64" || system === "commodore 64";
}

function gameSlug(game) {
  return String(game?.slug || "").trim().toLowerCase();
}

function validateRelease(slug, release) {
  if (!release || typeof release !== "object") {
    throw new Error(`${slug}: invalid UTA release record`);
  }
  if (!release.url) throw new Error(`${slug}: UTA release is missing its URL`);
  const url = new URL(release.url);
  if (
    url.protocol !== "https:"
    || url.hostname !== "uta.pokefinder.org"
    || !url.pathname.startsWith("/Ultimate_Tape_Archive/")
  ) {
    throw new Error(`${slug}: UTA release URL is outside the approved archive: ${release.url}`);
  }
}

function releaseMeta(label, value) {
  if (value === null || value === undefined || String(value).trim() === "") return "";
  return `                    <span class="ccg-uta-release__meta"><strong>${escapeHtml(label)}: </strong>${escapeHtml(value)}</span>\n`;
}

function buildReleaseCard(game, release) {
  const heading = release.sourceRole === "re-release" ? "Cassette re-release" : "Cassette release";
  return [
    `            <article class="ccg-uta-release" data-ccg-uta-archive-id="${escapeHtml(release.archiveId || "")}">`,
    `                <h3 class="ccg-uta-release__title">${heading}</h3>`,
    `                <div class="ccg-uta-release__details">`,
    releaseMeta("Publisher", release.publisher).trimEnd(),
    releaseMeta("Year", release.year).trimEnd(),
    releaseMeta("Tape loader", release.loader).trimEnd(),
    `                </div>`,
    `                <a class="ccg-btn ccg-btn--secondary ccg-uta-release__button" href="${escapeHtml(release.url)}" target="_blank" rel="noopener noreferrer" aria-label="View ${escapeHtml(game.title || "this game")} tape archive release at Ultimate Tape Archive">View Tape Archive</a>`,
    `            </article>`
  ].filter(Boolean).join("\n");
}

function buildSection(game, record) {
  const releases = Array.isArray(record?.releases) ? record.releases : [];
  const hidden = releases.length ? "" : " hidden";
  const cards = releases.length
    ? `\n${releases.map((release) => buildReleaseCard(game, release)).join("\n")}\n        `
    : "";
  const staticMarker = releases.length ? ' data-ccg-uta-static="true"' : "";

  return [
    `        <section id="game-tape-archive-section" class="game-section ccg-game-resource-section ccg-game-resource-section--tape"${hidden} aria-labelledby="game-tape-archive-title">`,
    `            <p class="game-section__kicker">Original Cassette</p>`,
    `            <h2 class="game-section__title" id="game-tape-archive-title">Tape Archive</h2>`,
    `            <p class="ccg-section__intro">Verified C64 cassette releases linked to the Ultimate Tape Archive. CCG does not host or duplicate the tape files.</p>`,
    `            <div id="game-tape-archive-list" class="ccg-uta-release-list"${staticMarker}>${cards}</div>`,
    `        </section>`
  ].join("\n");
}

function replaceArchiveSection(html, expectedSection, slug) {
  const pattern = /[ \t]*<section\b[^>]*\bid=["']game-tape-archive-section["'][^>]*>[\s\S]*?<\/section>/i;
  if (!pattern.test(html)) {
    throw new Error(`${slug}: canonical page is missing #game-tape-archive-section`);
  }
  return html.replace(pattern, expectedSection);
}

function main() {
  const games = JSON.parse(fs.readFileSync(gamesPath, "utf8"));
  const mapping = JSON.parse(fs.readFileSync(mappingPath, "utf8"));
  const records = mapping?.games || {};
  const c64Games = games.filter(isC64);
  const c64Slugs = new Set(c64Games.map(gameSlug).filter(Boolean));
  const errors = [];
  let changed = 0;
  let matched = 0;
  let releases = 0;

  for (const slug of Object.keys(records)) {
    if (!c64Slugs.has(slug)) errors.push(`${slug}: UTA mapping points to a game that is not a canonical C64 record`);
  }

  for (const game of c64Games) {
    const slug = gameSlug(game);
    if (!slug) {
      errors.push(`${game?.title || "Untitled C64 game"}: missing slug`);
      continue;
    }

    const record = records[slug] || null;
    const recordReleases = Array.isArray(record?.releases) ? record.releases : [];
    if (recordReleases.length) {
      matched += 1;
      releases += recordReleases.length;
      try {
        for (const release of recordReleases) validateRelease(slug, release);
      } catch (error) {
        errors.push(String(error.message || error));
        continue;
      }
    }

    const pagePath = path.join(repoRoot, "games", slug, "index.html");
    if (!fs.existsSync(pagePath)) {
      errors.push(`${slug}: canonical page is missing at games/${slug}/index.html`);
      continue;
    }

    try {
      const current = fs.readFileSync(pagePath, "utf8");
      const expectedSection = buildSection(game, record);
      const next = replaceArchiveSection(current, expectedSection, slug);
      if (next === current) continue;

      changed += 1;
      if (!checkOnly) fs.writeFileSync(pagePath, next, "utf8");
    } catch (error) {
      errors.push(String(error.message || error));
    }
  }

  if (errors.length) {
    errors.forEach((error) => console.error(`[materialize-uta-links] ERROR ${error}`));
    process.exitCode = 1;
    return;
  }

  if (checkOnly && changed) {
    fail(`${changed} C64 canonical page(s) do not contain the materialized UTA state from data/uta-game-matches.json`);
    return;
  }

  console.log(
    `[materialize-uta-links] ${checkOnly ? "verified" : "materialized"} ${matched}/${c64Games.length} mapped C64 games (${releases} verified tape release links); ${changed} page(s) ${checkOnly ? "out of date" : "updated"}.`
  );
}

main();
