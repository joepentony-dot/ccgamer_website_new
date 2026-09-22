import assert from "node:assert/strict";
import fs from "node:fs";

const read = (path) => fs.readFileSync(new URL("../" + path, import.meta.url), "utf8");

const gate = read("js/ccg-play-maintenance-gate.js");
assert.match(gate, /www\.cheekycommodoregamer\.co\.uk/);
assert.match(gate, /cheekycommodoregamer\.co\.uk/);
assert.match(gate, /location\.replace\(maintenancePath\)/);

for (const path of [
  "games/commodore-quest/index.html",
  "arcade/quest/index.html",
  "arcade/lost-sizzler/index.html"
]) {
  const html = read(path);
  assert.match(html, /<script src="\/js\/ccg-play-maintenance-gate\.js"><\/script>/, path + " must load the maintenance gate");
}

const hub = read("games/ccg-games/index.html");
assert.match(hub, /CCG originals — maintenance/);
assert.match(hub, /href="\/quiz\/quiz\.html"/);
assert.match(hub, /href="\/quiz\/pack-6\.html"/);
assert.doesNotMatch(hub, /href="\/games\/commodore-quest\/"/);
assert.doesNotMatch(hub, /href="\/games\/ccg-games\/cheeky-commodore-quest\/"/);

console.log("Temporary play-games maintenance contract passed.");
