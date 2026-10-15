// Regression coverage for the single C64 catalogue and CRT-priority rules.
// Load the actual browser module as source so this works without package.json
// "type": "module" and without requiring a bundler.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const text = readFileSync(new URL("../js/ccg-c64/game-catalog.js", import.meta.url), "utf8");
const catalog = await import("data:text/javascript;base64," + Buffer.from(text).toString("base64"));
const { preferSelectedCartridges, catalogGameIdentity, searchCatalogEntries,
        suggestCatalogGames } = catalog;

const row = (id, title, format, approved = true, extra = {}) =>
  ({ id, title, format, approved, ...extra });

test("Le Mans cartridge replaces its PRG and both spellings resolve to one identity", () => {
  const entries = [
    row("blast-0967", "Le Mans", "prg"),
    row("le-mans-crt", "LeMans", "crt", true, {preferOverOtherFormats: true}),
  ];
  const visible = preferSelectedCartridges(entries);
  assert.deepEqual(visible.map(item => item.id), ["le-mans-crt"]);
  assert.equal(catalogGameIdentity("Le Mans"), catalogGameIdentity("lemans"));
  assert.equal(searchCatalogEntries(visible, "le mans")[0].id, "le-mans-crt");
  assert.equal(searchCatalogEntries(visible, "lemans")[0].id, "le-mans-crt");
});

test("approved CRT wins over PRG or disk in either load order", () => {
  for (const files of [
    [row("prg", "Target", "prg"), row("crt", "Target", "crt")],
    [row("crt", "Target", "crt"), row("disk", "Target", "d64")],
  ]) {
    assert.equal(preferSelectedCartridges(files).length, 1);
    assert.equal(preferSelectedCartridges(files)[0].format, "crt");
  }
});

test("unapproved CRT cannot suppress an approved PRG fallback", () => {
  const result = preferSelectedCartridges([
    row("prg", "Target", "prg"),
    row("unapproved-crt", "Target", "crt", false),
  ]);
  assert.equal(result.length, 1);
  assert.equal(result[0].id, "prg");
});

test("do not merge sequels, plus editions or related titles", () => {
  const entries = [
    row("pitfall", "Pitfall", "prg"),
    row("pitfall-ii", "Pitfall II", "crt"),
    row("uridium", "Uridium", "prg"),
    row("uridium-plus", "Uridium+", "crt"),
    row("bc", "B.C.'s Quest for Tires", "prg"),
    row("bc-2", "B.C. II: Grog's Revenge", "prg"),
  ];
  assert.equal(preferSelectedCartridges(entries).length, entries.length);
  assert.notEqual(catalogGameIdentity("Uridium"), catalogGameIdentity("Uridium+"));
});

test("existing PRG aliases collapse to one option even before a CRT arrives", () => {
  const visible = preferSelectedCartridges([
    row("old", "Trapdoor", "prg"),
    row("archive", "Trapdoor", "prg"),
  ]);
  assert.deepEqual(visible.map(v => v.id), ["old"]);
});

test("fuzzy search offers spelling mistakes without swapping numbered sequels", () => {
  const entries = [
    row("le", "Le Mans", "crt"),
    row("beach1", "Beach-Head", "prg"),
    row("beach2", "Beach-Head II", "prg"),
  ];
  assert.equal(suggestCatalogGames(entries, "lemans").games[0].id, "le");
  assert.equal(searchCatalogEntries(entries, "Beach Head 2")[0]?.id, "beach2");
  assert.equal(searchCatalogEntries(entries, "Le Mnas")[0]?.id, "le");
});
