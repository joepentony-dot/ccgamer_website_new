/* Sizzler Saboteurs — restrained background-music controller. */
(function installSaboteursAudio(root, factory) {
  "use strict";
  const api = factory(root);
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.CCGLostSizzlerSaboteursAudio = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function createSaboteursAudioApi(root) {
  "use strict";

  const DEFAULTS = Object.freeze({
    src: "assets/audio/music/sizzler-saboteurs-theme.ogg",
    baseVolume: 0.14,
    duckedVolume: 0.055,
    maximumVolume: 0.18,
    fadeInMs: 900,
    fadeOutMs: 600,
    voiceDuckMs: 2800
  });

  const clamp = (value, min, max) => Math.max(min, Math.min(max, Number(value) || 0));

  function createController(options = {}) {
    const config = { ...DEFAULTS, ...options };
    config.maximumVolume = clamp(config.maximumVolume, 0, DEFAULTS.maximumVolume);
    config.baseVolume = clamp(config.baseVolume, 0, config.maximumVolume);
    config.duckedVolume = clamp(config.duckedVolume, 0, config.baseVolume);
    const AudioClass = options.AudioClass || root?.Audio;
    let audio = null, enabled = true, playing = false, baseVolume = config.baseVolume, fadeTimer = null, duckTimer = null;

    function clearFade() { if (fadeTimer !== null) { clearInterval(fadeTimer); fadeTimer = null; } }
    function clearDuck() { if (duckTimer !== null) { clearTimeout(duckTimer); duckTimer = null; } }

    function ensureAudio() {
      if (audio || !AudioClass) return audio;
      audio = new AudioClass(config.src); audio.loop = true; audio.preload = "auto"; audio.volume = 0;
      audio.addEventListener?.("error", () => { playing = false; });
      return audio;
    }

    function fadeTo(target, durationMs) {
      const element = ensureAudio(); if (!element) return false;
      clearFade(); const safeTarget = clamp(target, 0, config.maximumVolume), duration = Math.max(0, Number(durationMs) || 0);
      if (!duration) { element.volume = safeTarget; return true; }
      const start = Number(element.volume) || 0, startedAt = Date.now();
      fadeTimer = setInterval(() => {
        const progress = clamp((Date.now() - startedAt) / duration, 0, 1);
        element.volume = clamp(start + (safeTarget - start) * progress, 0, config.maximumVolume);
        if (progress >= 1) clearFade();
      }, 30);
      return true;
    }

    async function start() {
      if (!enabled) return false; const element = ensureAudio(); if (!element) return false;
      element.loop = true; element.volume = 0;
      try { await element.play(); playing = true; fadeTo(baseVolume, config.fadeInMs); return true; }
      catch (_) { playing = false; return false; }
    }

    function duck(durationMs = config.voiceDuckMs) {
      if (!audio || !playing) return false; clearDuck(); fadeTo(config.duckedVolume, 140);
      duckTimer = setTimeout(() => { duckTimer = null; if (enabled && playing) fadeTo(baseVolume, 420); }, Math.max(250, Number(durationMs) || config.voiceDuckMs));
      return true;
    }

    function stop(reset = true) {
      clearDuck(); if (!audio) return false; fadeTo(0, config.fadeOutMs);
      setTimeout(() => { if (!audio) return; try { audio.pause(); if (reset) audio.currentTime = 0; } catch (_) {} playing = false; }, config.fadeOutMs + 40);
      return true;
    }

    function setEnabled(value) {
      enabled = Boolean(value); if (!enabled && audio) { clearDuck(); clearFade(); audio.volume = 0; try { audio.pause(); } catch (_) {} playing = false; }
      return enabled;
    }

    function setVolume(value) {
      baseVolume = clamp(value, 0, config.maximumVolume); if (audio && playing) fadeTo(baseVolume, 180); return baseVolume;
    }

    function dispose() {
      clearDuck(); clearFade(); if (audio) { try { audio.pause(); audio.currentTime = 0; } catch (_) {} }
      audio = null; playing = false;
    }

    return Object.freeze({
      start, stop, duck, setEnabled, setVolume, dispose,
      state: () => Object.freeze({ enabled, playing, volume: Number(audio?.volume || 0), baseVolume, source: config.src }),
      constants: Object.freeze({ ...config })
    });
  }

  return Object.freeze({ DEFAULTS, createController });
});
