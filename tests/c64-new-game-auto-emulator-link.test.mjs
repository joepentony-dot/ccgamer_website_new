#!/usr/bin/env node
"use strict";

// Contract: newly published C64 games automatically acquire an exact,
// CRT-first deep link when their media is already in the emulator catalogue,
// or acquire it on the next build when approved media is added later.
// The real linker executes against a disposable site; never alter games.json.
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import test from "node:test";

const repository = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const linker = path.join(repository, "scripts/link-c64-emulator-games.js");
const rebuild = fs.readFileSync(path.join(repository, "scripts/rebuild-games.js"), "utf8");
const publisherWorkflow = fs.readFileSync(
  path.join(repository, ".github/workflows/games-publishing.yml"), "utf8");
const admin = fs.readFileSync(path.join(repository, "admin/js/content-publisher.js"), "utf8");
const digest = bytes => createHash("sha256").update(bytes).digest("hex");
const write = (root, relative, contents) => {
  const file = path.join(root, relative);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, contents);
};
const json = (root, relative, value) =>
  write(root, relative, JSON.stringify(value, null, 2) + "\n");

test("new-game pipeline runs game-page generation before emulator linking and publication", () => {
  const generate = rebuild.indexOf('["build-games.js"]');
  const link = rebuild.indexOf('["link-c64-emulator-games.js"]');
  const verify = rebuild.indexOf('["link-c64-emulator-games.js", "--check"]');
  assert.ok(generate >= 0 && link > generate && verify > link);
  assert.match(publisherWorkflow, /"games\/games\.json"/);
  assert.match(publisherWorkflow, /"emulator\/c64\/library\.json"/);
  assert.match(publisherWorkflow, /"emulator\/c64\/media\/cartridge-replacements\/active\.json"/);
  assert.match(publisherWorkflow, /"emulator\/c64\/media\/blast\/catalog\.json"/);
  assert.match(publisherWorkflow, /"emulator\/c64\/media\/prg-archive\/ready\.json"/);
  assert.match(publisherWorkflow, /node scripts\/rebuild-games\.js/);
  assert.match(admin, /const result = await commitFiles\(config, files, .Add \$\{entry\.title\} via CCG Content Publisher/);
});

test("future game entries and future media additions are linked without manual edits", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "ccg-c64-future-publish-"));
  try {
    const mediaRoot = "emulator/c64/media/";
    const games = [];
    const direct = [];
    const cartridgeRows = [];
    const newGame = (slug, title, system = "C64") => {
      games.push({ slug, title, system });
      json(root, "games/games.json", games);
      write(root, "games/" + slug + "/index.html",
        '<!doctype html><html><body><div class="game-hero__actions ccg-share" data-ccg-share>' +
        '<a href="/games/manual/">Manual</a></div></body></html>');
    };
    const directMedia = (slug, title, format = "d64") => {
      const file = slug + "." + format;
      const bytes = Buffer.alloc(format === "d64" ? 174848 : 128, 12);
      write(root, mediaRoot + file, bytes);
      direct.push({
        id: slug, title, format, approved: true,
        license: "Owner-authorised media", sha256: digest(bytes),
        bytes: bytes.length, url: "/emulator/c64/media/" + file,
      });
      json(root, "emulator/c64/library.json", { entries: direct });
    };
    const extraCRT = (title, file) => {
      const bytes = Buffer.alloc(65728, 57);
      write(root, mediaRoot + "cartridge-replacements/" + file, bytes);
      cartridgeRows.push([title, file, bytes.length, digest(bytes), 19]);
      json(root, mediaRoot + "cartridge-replacements/active.json", {
        version: 1, recordCount: cartridgeRows.length,
        ownerRedistributionAttested: true,
        originalFormatsPreserved: true, games: cartridgeRows,
      });
    };
    const packedBytes = Buffer.concat([
      Buffer.from([1, 8, 66, 67, 68, 69, 70, 71]),
      Buffer.from([1, 8, 72, 73, 74, 75, 76, 77]),
      Buffer.from([1, 8, 78, 79, 80, 81, 82, 83]),
    ]);
    const packRows = [
      ["blast-0", "New PRG Adventure", "prg", 0, 0, 8,
        digest(packedBytes.subarray(0, 8))],
      ["blast-1", "New CRT Adventure", "prg", 0, 8, 8,
        digest(packedBytes.subarray(8, 16))],
      ["blast-2", "New Priority Adventure", "prg", 0, 16, 8,
        digest(packedBytes.subarray(16, 24))],
    ];
    const packedCatalog = {
      version: 2, recordCount: packRows.length,
      packs: [{ file: "pack-00.bin", bytes: packedBytes.length,
        sha256: digest(packedBytes) }], games: packRows,
    };
    write(root, mediaRoot + "blast/pack-00.bin", packedBytes);
    json(root, mediaRoot + "blast/catalog.json", packedCatalog);
    json(root, "emulator/c64/library.json", { entries: direct });
    extraCRT("New CRT Adventure", "new-crt-adventure.crt");
    extraCRT("New Priority Adventure", "new-priority-adventure.crt");

    const run = (...args) => {
      const result = spawnSync(process.execPath, [linker, ...args], {
        cwd: repository, encoding: "utf8",
        env: { ...process.env, CCG_REPO_ROOT: root },
      });
      assert.equal(result.status, 0,
        "linker " + args.join(" ") + " failed: " + result.stderr + result.stdout);
      return result.stdout;
    };
    const html = slug => fs.readFileSync(
      path.join(root, "games", slug, "index.html"), "utf8");
    const url = slug => html(slug).match(
      /data-ccg-play-in-emulator="true" href="([^"]+)"/)?.[1] ?? null;
    const single = slug => {
      assert.equal((html(slug).match(/data-ccg-play-in-emulator/g) || []).length, 1);
      assert.match(html(slug), /href="\/games\/manual\/"/);
    };

    // First publishing run: the only C64 title does not yet exist in the media library.
    newGame("new-absent-game", "New Absent Game");
    newGame("amiga-no-button", "New CRT Adventure", "AMIGA");
    run();
    assert.equal(url("new-absent-game"), null);
    assert.equal(url("amiga-no-button"), null);

    // A future admin addition is appended to games.json after the first build.
    newGame("new-crt-adventure", "New CRT Adventure");
    newGame("new-prg-adventure", "New PRG Adventure");
    newGame("new-disk-adventure", "New Disk Adventure");
    newGame("new-priority-adventure", "New Priority Adventure");
    newGame("new-later-media", "New Later Media");
    newGame("shared-arcade-a", "Shared Arcade");
    newGame("shared-arcade-b", "Shared Arcade");
    directMedia("new-disk-adventure", "New Disk Adventure");
    directMedia("new-priority-adventure", "New Priority Adventure");
    directMedia("shared-arcade-a", "Shared Arcade");
    run();

    assert.equal(url("new-crt-adventure"),
      "/emulator/c64/?game=owner-crt-more-new-crt-adventure&amp;autoplay=1");
    assert.equal(url("new-prg-adventure"),
      "/emulator/c64/?game=blast-0&amp;autoplay=1");
    assert.equal(url("new-disk-adventure"),
      "/emulator/c64/?game=new-disk-adventure&amp;autoplay=1");
    assert.equal(url("new-priority-adventure"),
      "/emulator/c64/?game=owner-crt-more-new-priority-adventure&amp;autoplay=1");
    assert.equal(url("shared-arcade-a"),
      "/emulator/c64/?game=shared-arcade-a&amp;autoplay=1");
    assert.equal(url("shared-arcade-b"), null,
      "An ambiguous duplicate title must not guess the wrong game");
    assert.equal(url("new-later-media"), null);
    assert.equal(url("new-absent-game"), null);
    assert.equal(url("amiga-no-button"), null);
    for (const slug of ["new-crt-adventure", "new-prg-adventure",
      "new-disk-adventure", "new-priority-adventure", "shared-arcade-a"]) single(slug);
    run("--check");

    // Media imported and approved AFTER the game's page was first published:
    // the next automatic publishing run adds its button without game-page editing.
    directMedia("new-later-media", "New Later Media", "crt");
    run();
    assert.equal(url("new-later-media"),
      "/emulator/c64/?game=new-later-media&amp;autoplay=1");
    single("new-later-media");
    run();
    run("--check");
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("a missing generated C64 page fails the build instead of silently omitting a link", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "ccg-c64-missing-page-"));
  try {
    json(root, "games/games.json", [
      { slug: "missing-new-game", title: "Missing New Game", system: "C64" },
    ]);
    json(root, "emulator/c64/library.json", { entries: [] });
    const result = spawnSync(process.execPath, [linker], {
      cwd: repository, encoding: "utf8",
      env: { ...process.env, CCG_REPO_ROOT: root },
    });
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /Generated C64 game page missing/);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
