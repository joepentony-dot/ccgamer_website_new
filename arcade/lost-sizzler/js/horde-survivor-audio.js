/* The Lost Sizzler — quiet, wave-aware Horde Survivor music controller. */
(function installHordeAudio(root, factory) {
  "use strict";
  const api = factory(root);
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.CCGLostSizzlerHordeAudio = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function createHordeAudioApi(root) {
  "use strict";

  const TRACKS = Object.freeze([
    Object.freeze({ id: "waves-1-4", from: 1, to: 4, src: "assets/audio/music/horde-survival-waves-1-4.ogg" }),
    Object.freeze({ id: "waves-5-9", from: 5, to: 9, src: "assets/audio/music/horde-survival-waves-5-9.ogg" }),
    Object.freeze({ id: "wave-10", from: 10, to: 10, src: "assets/audio/music/horde-survival-wave-10.ogg" })
  ]);

  const DEFAULTS = Object.freeze({
    baseVolume: 0.13,
    duckedVolume: 0.05,
    maximumVolume: 0.18,
    fadeInMs: 900,
    fadeOutMs: 500,
    voiceDuckMs: 2800
  });

  const clamp = (value, min, max) => Math.max(min, Math.min(max, Number(value) || 0));
  const trackForWave = wave => TRACKS.find(track => Number(wave) >= track.from && Number(wave) <= track.to) || null;

  function createController(options = {}) {
    const config = { ...DEFAULTS, ...options };
    config.maximumVolume = clamp(config.maximumVolume, 0, DEFAULTS.maximumVolume);
    config.baseVolume = clamp(config.baseVolume, 0, config.maximumVolume);
    config.duckedVolume = clamp(config.duckedVolume, 0, config.baseVolume);
    const AudioClass = options.AudioClass || root?.Audio;
    let audio = null, enabled = true, playing = false, currentTrack = null;
    let baseVolume = config.baseVolume, fadeTimer = null, duckTimer = null;

    function clearFade() { if (fadeTimer !== null) { clearInterval(fadeTimer); fadeTimer = null; } }
    function clearDuck() { if (duckTimer !== null) { clearTimeout(duckTimer); duckTimer = null; } }
    function ensureAudio() {
      if (audio || !AudioClass) return audio;
      audio = new AudioClass(); audio.loop = true; audio.preload = "auto"; audio.volume = 0;
      audio.addEventListener?.("error", () => { playing = false; });
      return audio;
    }
    function fadeTo(target, durationMs) {
      const element = ensureAudio(); if (!element) return false;
      clearFade(); const safeTarget = clamp(target, 0, config.maximumVolume), duration = Math.max(0, Number(durationMs) || 0);
      if (!duration) { element.volume = safeTarget; return true; }
      const startedAt = Date.now(), start = element.volume;
      fadeTimer = setInterval(() => {
        const progress = Math.min(1, (Date.now() - startedAt) / duration);
        element.volume = clamp(start + (safeTarget - start) * progress, 0, config.maximumVolume);
        if (progress >= 1) clearFade();
      }, 40);
      fadeTimer.unref?.(); return true;
    }
    async function setWave(wave) {
      const next = trackForWave(wave), element = ensureAudio();
      if (!next || !element) return false;
      if (currentTrack?.id === next.id && playing) return true;
      if (currentTrack && playing && config.fadeOutMs > 0) {
        fadeTo(0, config.fadeOutMs);
        await new Promise(resolve => setTimeout(resolve, config.fadeOutMs));
      }
      clearFade(); element.pause?.(); element.volume = 0; element.src = next.src; element.currentTime = 0; currentTrack = next; playing = false;
      if (enabled) {
        try { await element.play(); playing = true; fadeTo(baseVolume, config.fadeInMs); }
        catch { playing = false; }
      }
      return true;
    }
    async function start(wave = 1) { return setWave(wave); }
    function stop() {
      const element = ensureAudio(); if (!element) return false;
      clearDuck(); fadeTo(0, config.fadeOutMs);
      const timer = setTimeout(() => { element.pause?.(); playing = false; }, config.fadeOutMs + 50); timer.unref?.(); return true;
    }
    function duck(durationMs = config.voiceDuckMs) {
      const element = ensureAudio(); if (!element || !playing) return false;
      clearDuck(); fadeTo(config.duckedVolume, 120);
      duckTimer = setTimeout(() => { duckTimer = null; if (enabled && playing) fadeTo(baseVolume, 280); }, Math.max(250, durationMs));
      duckTimer.unref?.(); return true;
    }
    function setVolume(value) {
      baseVolume = clamp(value, 0, config.maximumVolume);
      if (audio && playing && duckTimer === null) fadeTo(baseVolume, 120);
      return baseVolume;
    }
    function setEnabled(value) { enabled = Boolean(value); if (!enabled) stop(); return enabled; }
    function dispose() { clearFade(); clearDuck(); audio?.pause?.(); audio = null; playing = false; currentTrack = null; }
    function state() { return Object.freeze({ enabled, playing, waveTrack: currentTrack?.id || null, volume: audio?.volume || 0, baseVolume }); }

    return Object.freeze({ start, stop, setWave, duck, setVolume, setEnabled, dispose, state });
  }

  return Object.freeze({ TRACKS, DEFAULTS, trackForWave, createController });
});
