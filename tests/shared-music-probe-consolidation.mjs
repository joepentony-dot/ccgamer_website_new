import fs from "node:fs";

const source = fs.readFileSync("js/ccg-shared-music-player.js", "utf8");

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const probeCacheCount = (source.match(/const _probeCache/g) || []).length;
assert(probeCacheCount === 1, `expected one shared music probe cache, found ${probeCacheCount}`);
assert(!source.includes("function probePlayable("), "duplicate game-page probe implementation must be removed");
assert(source.includes("NS._probeAudioMetadata"), "game-page music rendering must reuse the shared metadata probe");
assert(source.includes("NS._resolveMp3Url"), "game-page music rendering must reuse the shared URL resolver");
assert(source.includes("NS.renderIfPlayableOnGamePage = async function"), "game-page music API must remain available");
assert(source.includes("renderOmegaGameMusicPlayer(container, slug, { logCtx })"), "Omega game player rendering must remain intact");
assert(source.includes("NS.renderIfPlayable = async function"), "general shared music API must remain intact");

console.log("Shared music probe consolidation guard passed.");
