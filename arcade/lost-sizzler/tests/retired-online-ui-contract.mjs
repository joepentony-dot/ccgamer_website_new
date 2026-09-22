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
  'id="continue-save-btn"'
]) {
  assert.equal(html.includes(retainedSurface),true,`supported Solo/Tutorial UI stays present: ${retainedSurface}`);
}

for (const retiredSurface of [
  'id="weekly-vault"',
  'WEEKLY HIGH-SCORE VAULT LEADERBOARD',
  'Weekly High-Score Vault',
  '2P Split Screen',
  'P2:'
]) {
  assert.equal(html.includes(retiredSurface),false,`retired Weekly/Split UI stays absent: ${retiredSurface}`);
}

for (const compatibilityAnchor of ['daily-btn','split-btn']) {
  const tag=html.match(new RegExp(`<button[^>]*id="${compatibilityAnchor}"[^>]*>`,"i"))?.[0]||"";
  assert.match(tag,/hidden/i,`retired compatibility anchor stays hidden: ${compatibilityAnchor}`);
  assert.match(tag,/aria-hidden="true"/i,`retired compatibility anchor stays aria-hidden: ${compatibilityAnchor}`);
}

console.log("Dungeon Carnage retired online UI contract checks passed");
