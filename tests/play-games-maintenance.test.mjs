import assert from "node:assert/strict";
import fs from "node:fs";

const read = (path) => fs.readFileSync(new URL("../" + path, import.meta.url), "utf8");

for (const path of [
  "games/commodore-quest/index.html",
  "arcade/quest/index.html",
  "arcade/lost-sizzler/index.html"
]) {
  const html = read(path);
  assert.match(html, /data-ccg-play-maintenance-gate="true"/, path + " must contain the maintenance gate");
  assert.match(html, /www\.cheekycommodoregamer\.co\.uk/);
  assert.match(html, /cheekycommodoregamer\.co\.uk/);
  assert.match(html, /window\.location\.replace\("\/games\/ccg-games\/"\)/);
}

const dungeon = read("arcade/lost-sizzler/index.html");
assert.doesNotMatch(dungeon, /src="\/js\/ccg-play-maintenance-gate\.js"/, "itch package must not inherit a root-relative maintenance script");

const hub = read("games/ccg-games/index.html");
assert.match(hub, /CCG originals — maintenance/);
assert.match(hub, /href="\/quiz\/quiz\.html"/);
assert.match(hub, /href="\/quiz\/pack-6\.html"/);
assert.doesNotMatch(hub, /href="\/games\/commodore-quest\/"/);
assert.doesNotMatch(hub, /href="\/games\/ccg-games\/cheeky-commodore-quest\/"/);

console.log("Temporary play-games maintenance contract passed.");
