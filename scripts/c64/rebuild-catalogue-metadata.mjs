// Refresh verified CCG game-page publisher/year facts in the lightweight
// emulator catalogue index without changing any media files, URLs or hashes.
// Usage: node scripts/c64/rebuild-catalogue-metadata.mjs [--check]
// External reference facts are retained from the reviewed index; no web scraping.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const jsonPath = path.join(root, "emulator/c64/catalogue-metadata.json");
const gamesPath = path.join(root, "games/games.json");
const checkOnly = process.argv.includes("--check");

function key(title) {
  const value = String(title || "").replace(/\+/g, " plus ").normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "").replace(/&/g, " and ")
    .replace(/['\u2018\u2019\u0060]/g, "").replace(/[^a-zA-Z0-9]+/g, " ")
    .trim().replace(/\s+/g, " ").toLocaleLowerCase();
  return value === "lemans" ? "le mans" : value;
}

const data = JSON.parse(fs.readFileSync(jsonPath, "utf8"));
const pages = JSON.parse(fs.readFileSync(gamesPath, "utf8"));
if (data.version !== 1 || !Array.isArray(data.entries) || !Array.isArray(pages)) {
  throw new Error("Unexpected CCG metadata schema or games.json format.");
}
const byKey = new Map();
for (const row of data.entries) {
  if (!Array.isArray(row) || row.length !== 4 || typeof row[0] !== "string" ||
      byKey.has(row[0])) throw new Error("Invalid or duplicate metadata title key.");
  byKey.set(row[0], row);
}
const c64 = new Map();
const conflicts = new Set();
for (const page of pages) {
  if (String(page.system || "").toUpperCase() !== "C64" || !page.title) continue;
  const id = key(page.title);
  if (!id) continue;
  const publishers = Array.isArray(page.credits?.publisher) ?
    [...new Set(page.credits.publisher.filter(x => typeof x === "string" && x.trim()))] : [];
  const year = Number(page.year);
  const info = [publishers, Number.isInteger(year) && year >= 1982 && year <= 2100 ? year : null];
  if (c64.has(id) && JSON.stringify(c64.get(id)) !== JSON.stringify(info)) conflicts.add(id);
  else c64.set(id, info);
}
for (const id of conflicts) c64.delete(id);
for (const [id, [publishers, year]] of c64) {
  const previous = byKey.get(id) || [id, [], null, "ccg"];
  const candidate = [id, publishers.length ? publishers : previous[1],
    year || previous[2], "ccg"];
  if (candidate[1].length || candidate[2]) byKey.set(id, candidate);
}
data.entries = [...byKey.values()].sort((a, b) => a[0].localeCompare(b[0], "en"));
const next = JSON.stringify(data) + "\n";
const old = fs.readFileSync(jsonPath, "utf8");
if (checkOnly) {
  if (next !== old) {
    console.error("C64 metadata index has drifted from games/games.json. Run node scripts/c64/rebuild-catalogue-metadata.mjs");
    process.exitCode = 1;
  } else {
    console.log("C64 metadata index is current for CCG game-page credits.");
  }
} else if (next !== old) {
  fs.writeFileSync(jsonPath, next);
  console.log("Updated", data.entries.length, "C64 metadata entries.");
} else {
  console.log("C64 metadata index already current.");
}
