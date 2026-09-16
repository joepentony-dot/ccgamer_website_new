import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";

const here=path.dirname(fileURLToPath(import.meta.url));
const gameDir=path.resolve(here,"..");
const html=fs.readFileSync(path.join(gameDir,"index.html"),"utf8");

for (const retiredSurface of [
  'id="create-btn"',
  'class="online-howto"',
  'id="room-code"',
  'id="join-btn"',
  'id="online-lobby"',
  'Dungeon Multiplayer',
  'Join Online Room',
  'ONLINE MULTIPLAYER'
]) {
  assert.equal(html.includes(retiredSurface),false,`retired online UI stays absent: ${retiredSurface}`);
}

for (const retainedSurface of [
  'id="solo-btn"',
  'id="tutorial-zone-btn"',
  'id="continue-save-btn"',
  'id="daily-btn"',
  'id="split-btn"',
  'id="weekly-vault"',
  'WEEKLY HIGH-SCORE VAULT LEADERBOARD'
]) {
  assert.equal(html.includes(retainedSurface),true,`retained local/release UI stays present: ${retainedSurface}`);
}

console.log("Dungeon Carnage retired online UI contract checks passed");
