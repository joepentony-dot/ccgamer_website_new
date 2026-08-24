import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const H = require("../js/horde-survivor.js");
const HA = require("../js/horde-survivor-audio.js");

assert.equal(H.MODE_ID, "horde-survivor");
assert.equal(H.MAX_PLAYERS, 4);
assert.equal(H.STARTING_HP, 10);
assert.equal(H.WAVES.length, 10);
assert.equal(H.WAVES[0].groups[0].kind, "spider");
assert.equal(H.ENEMIES.spider.hp, 1);
assert.equal(H.WAVES[1].groups[0].kind, "skeleton");
assert.equal(H.WAVES[2].groups[0].kind, "bat");
assert.equal(H.ENEMIES.fighter.hp, 3);
assert.equal(H.WAVES[9].timedMs, 60000);
assert.equal(H.WAVES[9].groups[0].kind, "knight");
assert.equal(H.WEAPONS.length, 10);
assert.deepEqual(H.AUDIO.tracks[0].waves, [1, 2, 3, 4]);
assert.deepEqual(H.AUDIO.tracks[1].waves, [5, 6, 7, 8, 9]);
assert.deepEqual(H.AUDIO.tracks[2].waves, [10]);
assert.ok(H.AUDIO.baseVolume <= H.AUDIO.maximumVolume);
assert.equal(HA.trackForWave(4).id, "waves-1-4");
assert.equal(HA.trackForWave(5).id, "waves-5-9");
assert.equal(HA.trackForWave(9).id, "waves-5-9");
assert.equal(HA.trackForWave(10).id, "wave-10");

class FakeAudio {
  constructor() { this.src = ""; this.volume = 0; this.currentTime = 0; this.playCount = 0; }
  addEventListener() {}
  async play() { this.playCount += 1; }
  pause() {}
}
const music = HA.createController({ AudioClass: FakeAudio, fadeInMs: 0, fadeOutMs: 0 });
assert.equal(await music.start(1), true);
assert.equal(music.state().waveTrack, "waves-1-4");
assert.equal(music.state().volume, 0.13);
assert.equal(await music.setWave(6), true);
assert.equal(music.state().waveTrack, "waves-5-9");
assert.equal(await music.setWave(10), true);
assert.equal(music.state().waveTrack, "wave-10");
assert.equal(music.setVolume(1), 0.18);
music.dispose();

const arena = H.createArena();
assert.equal(arena.spawnRooms.length, 12);
assert.equal(arena.playerStarts.length, 4);
assert.ok(arena.centre.w >= 60 && arena.centre.h >= 36);

for (let count = 1; count <= 4; count += 1) {
  assert.ok(H.quotaFor(1, count) > 0);
  assert.ok(H.activeCapFor(count) >= 8);
  assert.equal(H.leaderboardCategory(count), ["", "SOLO", "DUO", "TRIO", "SQUAD"][count]);
}
assert.ok(H.quotaFor(1, 4) < H.quotaFor(1, 1) * 4);

const run = H.createRun({
  seed: "TEST-HORDE",
  now: 0,
  players: [{ id: "P1", name: "One" }, { id: "P2", name: "Two" }, { id: "P3", name: "Three" }, { id: "P4", name: "Four" }]
});
assert.equal(run.players.length, 4);
assert.ok(run.players.every(player => player.hp === 10));
assert.ok(run.players.every(player => player.maxHp === 10));

H.beginWave(run, 1, 1000);
assert.equal(run.state, "wave");
assert.ok(run.players.every(player => player.currentWeapon === "starter"));
const enemy = H.spawnNext(run, 1100, H.makeRng("spawn"));
assert.equal(enemy.kind, "spider");
assert.equal(enemy.hp, 1);
assert.ok(arena.spawnRooms.some(room => room.id === enemy.spawnRoomId));

run.players[0].x = 40; run.players[0].y = 26;
run.players[1].x = 40; run.players[1].y = 26;
H.applyDamage(run, "P2", 10, 2000);
assert.equal(run.players[1].status, "downed");
assert.equal(H.startRevive(run, "P1", "P2", 2500), true);
H.tickRevives(run, 7499);
assert.equal(run.players[1].status, "downed");
H.tickRevives(run, 7500);
assert.equal(run.players[1].status, "active");
assert.equal(run.players[1].hp, 5);
assert.equal(run.players[0].revives, 1);

run.players[2].x = 40; run.players[2].y = 26;
run.players[3].x = 40; run.players[3].y = 26;
H.applyDamage(run, "P4", 10, 10000);
assert.equal(H.startRevive(run, "P3", "P4", 10100), true);
run.players[2].x = 41;
H.tickRevives(run, 11000);
assert.equal(run.revives.P4, undefined);
assert.equal(run.players[3].status, "downed");

run.players[0].hp = 2; run.health.nextSpawnAt = 0;
const health = H.tickHealth(run, 12000);
assert.ok(health && health.restore === 3);
assert.equal(H.collectHealth(run, health.id, "P1", 12100), true);
assert.equal(run.players[0].hp, 5);

const firstVoice = H.tryAnnounce(run, "modeStart", 20000, 3000);
const stackedVoice = H.tryAnnounce(run, "wave1", 21000, 2000);
const laterVoice = H.tryAnnounce(run, "wave1", 23001, 2000);
assert.ok(firstVoice);
assert.equal(stackedVoice, null);
assert.ok(laterVoice);

const boss = H.beginBoss(run, 30000);
assert.equal(boss.hp, 280);
assert.equal(boss.damage, 2);
assert.equal(H.damageBoss(run, 280, "P1", 31000), true);
assert.equal(run.state, "victory");
assert.equal(H.leaderboardResult(run).category, "SQUAD");
assert.equal(H.leaderboardResult(run).bossDefeated, true);

const solo = H.createRun({ seed: "SOLO", now: 0, players: [{ id: "SOLO", name: "Solo" }] });
H.beginWave(solo, 5, 1000);
H.completeWave(solo, 2000);
assert.equal(solo.players[0].selfReviveAvailable, true);
H.applyDamage(solo, "SOLO", 10, 3000);
assert.equal(solo.players[0].status, "second-wind");
H.tickDowned(solo, 6000);
assert.equal(solo.players[0].status, "active");
assert.equal(solo.players[0].hp, 5);

console.log("Horde Survivor contract tests passed.");
