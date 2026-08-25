import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const HA = require("../js/horde-survivor-audio.js");

assert.equal(HA.HORDE_TRACK.id, "horde-master");
assert.equal(HA.HORDE_TRACK.src, "assets/audio/music/horde-survivor-master.ogg");
assert.equal(HA.trackForWave(1, 1).id, "horde-master");
assert.equal(HA.trackForWave(5, 1).id, "horde-master");
assert.equal(HA.trackForWave(10, 1).id, "horde-master");
assert.equal(HA.trackForWave(4, 2).id, "horde-master");
assert.equal(HA.trackForWave(5, 2).id, "horde-master");
assert.equal(HA.trackForWave(10, 4).id, "horde-master");

class FakeAudio {
  constructor() {
    this.src = "";
    this.volume = 0;
    this.currentTime = 0;
    this.playCount = 0;
    this.pauseCount = 0;
  }
  addEventListener() {}
  async play() { this.playCount += 1; }
  pause() { this.pauseCount += 1; }
}

const music = HA.createController({
  AudioClass: FakeAudio,
  playerCount: 1,
  fadeInMs: 0,
  fadeOutMs: 0,
  runtimeSyncMs: 1000
});

assert.equal(await music.start(1), true);
assert.equal(music.state().waveTrack, "horde-master");
assert.equal(music.state().solo, true);
assert.equal(music.state().playerCount, 1);
assert.equal(music.state().volume, 0.22);

assert.equal(await music.setWave(7), true);
assert.equal(music.state().waveTrack, "horde-master");
assert.equal(music.state().wave, 7);

assert.equal(await music.setPlayerCount(2), true);
assert.equal(music.state().solo, false);
assert.equal(music.state().waveTrack, "horde-master");
assert.equal(music.state().volume, 0.22);

assert.equal(await music.setPlayerCount(1), true);
assert.equal(music.state().waveTrack, "horde-master");
assert.equal(music.setVolume(1), 0.26);
music.dispose();

console.log("Horde solo music contract tests passed.");
