import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const S = require("../js/sizzler-saboteurs.js");

assert.equal(S.MODE_ID, "sizzler-saboteurs");
assert.equal(S.MODE_NAME, "Sizzler Saboteurs");
assert.equal(S.PLAYER_COUNT, 2);
assert.equal(S.BEST_OF, 5);
assert.equal(S.ROUNDS_TO_WIN, 3);
assert.equal(S.TRAPS_PER_ROUND, 3);
assert.equal(S.NO_MINIMAP, true);
assert.equal(S.LIGHT_RADIUS, 5);
assert.equal(S.IDENTITIES[0].colour, "#26e8ff");
assert.equal(S.IDENTITIES[1].colour, "#ff3ca6");
assert.notEqual(S.IDENTITIES[0].emblem, S.IDENTITIES[1].emblem);
assert.equal(Object.keys(S.WEAPONS).length, 8);
assert.equal(Object.keys(S.TRAPS).length, 6);

for (let round = 1; round <= 5; round += 1) {
  const map = S.distributeContents(S.createMap("MAP-TEST", round), `MAP-TEST-${round}`);
  assert.ok(map.rooms.length >= 20 && map.rooms.length <= 28);
  assert.equal(S.connected(map), true);
  assert.equal(map.noMinimap, true);
  assert.equal(map.spawnRoomIds.length, 2);
  assert.notEqual(map.spawnRoomIds[0], map.spawnRoomIds[1]);
  assert.ok(map.extractionRoomId);
  assert.ok(map.rooms.flatMap(room => room.furniture).some(item => item.contents === "case"));
  assert.ok(map.rooms.flatMap(room => room.furniture).some(item => item.contents === "joystick"));
  assert.ok(map.rooms.flatMap(room => room.furniture).some(item => item.contents === "tape"));
  assert.ok(map.rooms.flatMap(room => room.furniture).some(item => item.contents === "key"));
}

const match = S.createMatch({ seed: "SABOTEUR-TEST", now: 0, players: [{ id: "CYAN", name: "Cyan" }, { id: "MAGENTA", name: "Magenta" }] });
assert.equal(match.state, "splash");
assert.equal(S.beginRound(match, 1000), true);
assert.equal(match.state, "playing");
assert.equal(match.players.length, 2);
assert.ok(match.players.every(player => player.hp === 6));
assert.ok(match.players.every(player => player.trapCharges >= 3));
assert.equal(match.trapLoadout.length, 3);

const p1 = match.players[0], p2 = match.players[1];
const ordinaryTrap = match.trapLoadout.find(id => id !== "timeBomb");
const trapDefinition = S.TRAPS[ordinaryTrap];
const trapRoom = match.map.rooms.find(room => !room.spawn && !room.extraction);
p1.roomId = trapRoom.id; p2.roomId = trapRoom.id;
const targetType = trapDefinition.locations[0];
const targetId = targetType === "furniture" ? trapRoom.furniture[0].id : targetType === "door" ? match.map.edges.find(edge => edge.a === trapRoom.id || edge.b === trapRoom.id)?.id : null;
const placed = S.placeTrap(match, p1.id, ordinaryTrap, { type: targetType, id: targetId }, 2000);
assert.ok(placed);
assert.equal(p1.trapCharges, (3 + Number(match.modifier.trapDelta || 0)) - 1);

if (trapDefinition.counter) {
  p2.counter = trapDefinition.counter;
  assert.equal(S.disarmTrap(match, p2.id, placed.id, 2200), true);
  assert.equal(placed.armed, false);
}

const selfMatch = S.createMatch({ seed: "SELF-TRAP", now: 0, players: [{ id: "A" }, { id: "B" }] });
S.beginRound(selfMatch, 1000);
const selfPlayer = selfMatch.players[0];
const selfRoom = selfMatch.map.rooms.find(room => !room.spawn && !room.extraction);
selfPlayer.roomId = selfRoom.id;
const floorTrap = selfMatch.trapLoadout.find(id => S.TRAPS[id].locations.includes("floor"));
if (floorTrap) {
  const selfPlaced = S.placeTrap(selfMatch, selfPlayer.id, floorTrap, { type: "floor" }, 2000);
  assert.ok(selfPlaced);
  assert.equal(S.triggerTrap(selfMatch, selfPlayer.id, { type: "floor", roomId: selfRoom.id }, 2100), true);
  assert.equal(selfPlaced.armed, false);
}

const objectiveMatch = S.createMatch({ seed: "OBJECTIVE", now: 0, players: [{ id: "A" }, { id: "B" }] });
S.beginRound(objectiveMatch, 1000);
const agent = objectiveMatch.players[0];
agent.roomId = objectiveMatch.map.extractionRoomId;
assert.equal(S.beginExtraction(objectiveMatch, agent.id, 2000), false);
for (const id of ["case", "joystick", "tape", "key"]) assert.equal(S.collectObjective(objectiveMatch, agent.id, id, 2100), true);
assert.equal(S.hasCompleteCase(agent), true);
assert.equal(S.beginExtraction(objectiveMatch, agent.id, 3000), true);
S.tickExtraction(objectiveMatch, 5999);
assert.equal(objectiveMatch.state, "playing");
S.tickExtraction(objectiveMatch, 6000);
assert.equal(objectiveMatch.state, "round-complete");
assert.equal(objectiveMatch.wins.A, 1);

for (let win = 2; win <= 3; win += 1) {
  assert.equal(S.beginRound(objectiveMatch, 7000 * win), true);
  assert.equal(S.awardRound(objectiveMatch, "A", 7000 * win + 1000, "test"), true);
}
assert.equal(objectiveMatch.state, "match-complete");
assert.equal(objectiveMatch.matchWinnerId, "A");
assert.equal(objectiveMatch.wins.A, 3);

const darkMatch = S.createMatch({ seed: "DARK", now: 0, players: [{ id: "A" }, { id: "B" }] });
S.beginRound(darkMatch, 1000);
const view = S.visibilityFor(darkMatch, "A", 2000);
assert.equal(view.minimap, false);
assert.ok(view.lightRadius >= 3 && view.lightRadius <= 7);

const voice1 = S.tryAnnounce(darkMatch, "matchStart", 3000, 2500);
const voiceStack = S.tryAnnounce(darkMatch, "round1", 3500, 2000);
const voice2 = S.tryAnnounce(darkMatch, "round1", 5501, 2000);
assert.ok(voice1);
assert.equal(voiceStack, null);
assert.ok(voice2);

const tie = S.createMatch({ seed: "TIE", now: 0, players: [{ id: "A" }, { id: "B" }] });
S.beginRound(tie, 1000);
S.resolveTime(tie, 241000);
assert.equal(tie.state, "sudden-death");
assert.ok(tie.looseObjects.some(item => item.suddenDeath && item.objectiveId === "case"));

console.log("Sizzler Saboteurs contract tests passed.");
