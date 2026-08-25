/* The Lost Sizzler — wave-aware Horde music controller with a dedicated solo master. */
(function installHordeAudio(root, factory) {
  "use strict";
  const api = factory(root);
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.CCGLostSizzlerHordeAudio = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function createHordeAudioApi(root) {
  "use strict";

  const HORDE_TRACK = Object.freeze({
  id: "horde-master",
  from: 1,
  to: 10,
  src: "assets/audio/music/horde-survivor-master.ogg"
});
const SOLO_TRACK = HORDE_TRACK;

  const TRACKS = Object.freeze([
    Object.freeze({ id: "waves-1-4", from: 1, to: 4, src: "assets/audio/music/horde-survival-waves-1-4.ogg" }),
    Object.freeze({ id: "waves-5-9", from: 5, to: 9, src: "assets/audio/music/horde-survival-waves-5-9.ogg" }),
    Object.freeze({ id: "wave-10", from: 10, to: 10, src: "assets/audio/music/horde-survival-wave-10.ogg" })
  ]);

  const DEFAULTS = Object.freeze({
    baseVolume: 0.22,
    duckedVolume: 0.08,
    maximumVolume: 0.26,
    soloBaseVolume: 0.22,
    soloDuckedVolume: 0.08,
    soloMaximumVolume: 0.26,
    fadeInMs: 900,
    fadeOutMs: 500,
    voiceDuckMs: 2800,
    runtimeSyncMs: 250
  });

  const clamp = (value, min, max) => Math.max(min, Math.min(max, Number(value) || 0));
  const normalisePlayerCount = value => Math.max(1, Math.min(4, Math.floor(Number(value) || 2)));
  const trackForWave = (wave, playerCount = 2) => HORDE_TRACK;

  function runtimePlayerCount() {
    try {
      const active = root?.CCGLostSizzlerSpecialModes?.active;
      if (active?.type !== "horde-survivor") return null;
      const explicit = Number(active.state?.playerCount);
      if (Number.isFinite(explicit) && explicit > 0) return normalisePlayerCount(explicit);
      const players = active.state?.players;
      if (Array.isArray(players) && players.length) return normalisePlayerCount(players.length);
    } catch (_) {}
    return null;
  }

  /*
   * Horde owns its own audio context. The ordinary dungeon voice director must
   * never leak into this mode: bounty, sanctuary, shop, rare-event, objective,
   * no-ammo and other dungeon-only cues are not Horde announcements. More
   * importantly, delayed dungeon timers must not dump a run of stale speech
   * after a Horde crash. Keep the user's VOICE preference intact, temporarily
   * mute only the legacy director while Horde is active, and restore it on exit.
   */
  const legacyVoiceGuard = {
    active: false,
    previousEnabled: true,
    timer: 0,
    errorListenerInstalled: false,
    clickListenerInstalled: false
  };

  function hordeIsActive() {
    try {
      if (root?.CCGLostSizzlerSpecialModes?.active?.type === "horde-survivor") return true;
      if (root?.document?.body?.dataset?.specialMode === "horde-survivor") return true;
    } catch (_) {}
    return false;
  }

  function legacyVoice() {
    try { return root?.CCGLostSizzlerVoice || null; }
    catch (_) { return null; }
  }

  function cancelSpeechSynthesis() {
    try { root?.speechSynthesis?.cancel?.(); }
    catch (_) {}
  }

  function stopLegacyVoiceNow() {
    const voice = legacyVoice();
    if (!voice) { cancelSpeechSynthesis(); return false; }
    try { voice.stop?.(); } catch (_) {}
    try {
      if (voice.state) {
        if (Array.isArray(voice.state.queue)) voice.state.queue.length = 0;
        voice.state.enabled = false;
      }
    } catch (_) {}
    cancelSpeechSynthesis();
    return true;
  }

  function enterLegacyVoiceGuard() {
    if (legacyVoiceGuard.active) return true;
    const voice = legacyVoice();
    if (!voice) return false;
    try { legacyVoiceGuard.previousEnabled = Boolean(voice.state?.enabled ?? voice.enabled); }
    catch (_) { legacyVoiceGuard.previousEnabled = true; }
    legacyVoiceGuard.active = true;
    stopLegacyVoiceNow();
    return true;
  }

  function maintainLegacyVoiceGuard() {
    if (!legacyVoiceGuard.active) return false;
    const voice = legacyVoice();
    if (!voice) return false;
    try {
      if (voice.state) {
        if (Array.isArray(voice.state.queue) && voice.state.queue.length) voice.state.queue.length = 0;
        if (voice.state.enabled) voice.state.enabled = false;
      }
    } catch (_) {}
    return true;
  }

  function leaveLegacyVoiceGuard() {
    if (!legacyVoiceGuard.active) return false;
    const voice = legacyVoice();
    try {
      if (voice?.state) {
        if (Array.isArray(voice.state.queue)) voice.state.queue.length = 0;
        voice.state.enabled = Boolean(legacyVoiceGuard.previousEnabled);
      }
    } catch (_) {}
    cancelSpeechSynthesis();
    legacyVoiceGuard.active = false;
    return true;
  }

  function syncLegacyVoiceGuard() {
    if (hordeIsActive()) {
      if (!legacyVoiceGuard.active) enterLegacyVoiceGuard();
      else maintainLegacyVoiceGuard();
    } else if (legacyVoiceGuard.active) {
      leaveLegacyVoiceGuard();
    }
  }

  function installLegacyVoiceGuard() {
    if (!root?.document || typeof root.setInterval !== "function") return false;
    if (!legacyVoiceGuard.timer) legacyVoiceGuard.timer = root.setInterval(syncLegacyVoiceGuard, 100);

    if (!legacyVoiceGuard.errorListenerInstalled && typeof root.addEventListener === "function") {
      const crashSilence = () => {
        if (!hordeIsActive()) return;
        enterLegacyVoiceGuard();
        stopLegacyVoiceNow();
      };
      root.addEventListener("error", crashSilence);
      root.addEventListener("unhandledrejection", crashSilence);
      root.addEventListener("pagehide", () => {
        if (legacyVoiceGuard.timer) {
          root.clearInterval?.(legacyVoiceGuard.timer);
          legacyVoiceGuard.timer = 0;
        }
        if (legacyVoiceGuard.active) leaveLegacyVoiceGuard();
      }, { once: true });
      legacyVoiceGuard.errorListenerInstalled = true;
    }

    if (!legacyVoiceGuard.clickListenerInstalled) {
      root.document.addEventListener("click", event => {
        if (!hordeIsActive()) return;
        const button = event.target?.closest?.("#voice-btn");
        if (!button) return;
        event.preventDefault();
        event.stopImmediatePropagation();
        maintainLegacyVoiceGuard();
      }, true);
      legacyVoiceGuard.clickListenerInstalled = true;
    }

    syncLegacyVoiceGuard();
    return true;
  }

  installLegacyVoiceGuard();

  function createController(options = {}) {
    const config = { ...DEFAULTS, ...options };
    config.maximumVolume = clamp(config.maximumVolume, 0, 1);
    config.baseVolume = clamp(config.baseVolume, 0, config.maximumVolume);
    config.duckedVolume = clamp(config.duckedVolume, 0, config.baseVolume);
    config.soloMaximumVolume = clamp(config.soloMaximumVolume, 0, 1);
    config.soloBaseVolume = clamp(config.soloBaseVolume, 0, config.soloMaximumVolume);
    config.soloDuckedVolume = clamp(config.soloDuckedVolume, 0, config.soloBaseVolume);
    config.runtimeSyncMs = Math.max(100, Math.floor(Number(config.runtimeSyncMs) || DEFAULTS.runtimeSyncMs));

    const AudioClass = options.AudioClass || root?.Audio;
    let audio = null, enabled = true, playing = false, currentTrack = null;
    let currentWave = 1, currentPlayerCount = normalisePlayerCount(options.playerCount ?? 2);
    let normalBaseVolume = config.baseVolume, soloBaseVolume = config.soloBaseVolume;
    let fadeTimer = null, duckTimer = null, runtimeTimer = null;

    const soloMode = () => currentPlayerCount === 1;
    const volumeLimit = () => soloMode() ? config.soloMaximumVolume : config.maximumVolume;
    const targetBaseVolume = () => soloMode() ? soloBaseVolume : normalBaseVolume;
    const targetDuckedVolume = () => soloMode() ? config.soloDuckedVolume : config.duckedVolume;

    function clearFade() {
      if (fadeTimer !== null) {
        clearInterval(fadeTimer);
        fadeTimer = null;
      }
    }

    function clearDuck() {
      if (duckTimer !== null) {
        clearTimeout(duckTimer);
        duckTimer = null;
      }
    }

    function clearRuntimeSync() {
      if (runtimeTimer !== null) {
        (root?.clearInterval || clearInterval)(runtimeTimer);
        runtimeTimer = null;
      }
    }

    function ensureAudio() {
      if (audio || !AudioClass) return audio;
      audio = new AudioClass();
      audio.loop = true;
      audio.preload = "auto";
      audio.volume = 0;
      audio.addEventListener?.("error", () => { playing = false; });
      return audio;
    }

    function fadeTo(target, durationMs) {
      const element = ensureAudio();
      if (!element) return false;
      clearFade();
      const safeTarget = clamp(target, 0, volumeLimit());
      const duration = Math.max(0, Number(durationMs) || 0);
      if (!duration) {
        element.volume = safeTarget;
        return true;
      }
      const startedAt = Date.now(), start = element.volume;
      fadeTimer = setInterval(() => {
        const progress = Math.min(1, (Date.now() - startedAt) / duration);
        element.volume = clamp(start + (safeTarget - start) * progress, 0, volumeLimit());
        if (progress >= 1) clearFade();
      }, 40);
      fadeTimer.unref?.();
      return true;
    }

    async function setWave(wave, playerCountOverride = null) {
      currentWave = Math.max(1, Math.min(10, Math.floor(Number(wave) || 1)));
      if (playerCountOverride !== null && playerCountOverride !== undefined) {
        currentPlayerCount = normalisePlayerCount(playerCountOverride);
      }

      root?.CCGLostSizzlerMusicBus?.claim?.("horde-survivor", () => stopImmediate(false));
      const next = trackForWave(currentWave, currentPlayerCount), element = ensureAudio();
      if (!next || !element) return false;

      if (currentTrack?.id === next.id && playing) {
        if (duckTimer === null) fadeTo(targetBaseVolume(), 180);
        return true;
      }

      if (currentTrack && playing && config.fadeOutMs > 0) {
        fadeTo(0, config.fadeOutMs);
        await new Promise(resolve => setTimeout(resolve, config.fadeOutMs));
      }

      clearFade();
      element.pause?.();
      element.volume = 0;
      element.src = next.src;
      element.currentTime = 0;
      currentTrack = next;
      playing = false;

      if (enabled) {
        try {
          await element.play();
          playing = true;
          fadeTo(targetBaseVolume(), config.fadeInMs);
        } catch {
          playing = false;
        }
      }
      return true;
    }

    async function setPlayerCount(value) {
      const nextCount = normalisePlayerCount(value);
      if (nextCount === currentPlayerCount) return true;
      currentPlayerCount = nextCount;
      return setWave(currentWave);
    }

    function startRuntimeSync() {
      if (runtimeTimer !== null || typeof (root?.setInterval || setInterval) !== "function") return false;
      runtimeTimer = (root?.setInterval || setInterval)(() => {
        const nextCount = runtimePlayerCount();
        if (nextCount && nextCount !== currentPlayerCount) {
          setPlayerCount(nextCount).catch(() => {});
        }
      }, config.runtimeSyncMs);
      runtimeTimer.unref?.();
      return true;
    }

    async function start(wave = 1) {
      /*
       * The special-mode adapter creates this controller immediately before it
       * creates the Horde run state. One microtask gives that state time to
       * appear, allowing the first track selection to know whether the room is
       * solo without changing the adapter's established launch order.
       */
      await Promise.resolve();
      const count = runtimePlayerCount();
      if (count) currentPlayerCount = count;
      startRuntimeSync();
      return setWave(wave);
    }

    function stopImmediate(releaseOwnership = true) {
      clearFade();
      clearDuck();
      if (audio) {
        try {
          audio.volume = 0;
          audio.pause?.();
        } catch (_) {}
      }
      playing = false;
      if (releaseOwnership) root?.CCGLostSizzlerMusicBus?.release?.("horde-survivor");
      return true;
    }

    function stop() {
      const element = ensureAudio();
      if (!element) return false;
      clearDuck();
      fadeTo(0, config.fadeOutMs);
      const timer = setTimeout(() => {
        element.pause?.();
        playing = false;
        root?.CCGLostSizzlerMusicBus?.release?.("horde-survivor");
      }, config.fadeOutMs + 50);
      timer.unref?.();
      return true;
    }

    function duck(durationMs = config.voiceDuckMs) {
      const element = ensureAudio();
      if (!element || !playing) return false;
      clearDuck();
      fadeTo(targetDuckedVolume(), 120);
      duckTimer = setTimeout(() => {
        duckTimer = null;
        if (enabled && playing) fadeTo(targetBaseVolume(), 280);
      }, Math.max(250, durationMs));
      duckTimer.unref?.();
      return true;
    }

    function setVolume(value) {
      if (soloMode()) soloBaseVolume = clamp(value, 0, config.soloMaximumVolume);
      else normalBaseVolume = clamp(value, 0, config.maximumVolume);
      if (audio && playing && duckTimer === null) fadeTo(targetBaseVolume(), 120);
      return targetBaseVolume();
    }

    function setEnabled(value) {
      enabled = Boolean(value);
      if (!enabled) stop();
      return enabled;
    }

    function dispose() {
      clearRuntimeSync();
      stopImmediate();
      audio = null;
      currentTrack = null;
    }

    function state() {
      return Object.freeze({
        enabled,
        playing,
        waveTrack: currentTrack?.id || null,
        volume: audio?.volume || 0,
        baseVolume: targetBaseVolume(),
        playerCount: currentPlayerCount,
        solo: soloMode(),
        wave: currentWave
      });
    }

    return Object.freeze({
      start,
      stop,
      stopImmediate,
      setWave,
      setPlayerCount,
      duck,
      setVolume,
      setEnabled,
      dispose,
      state
    });
  }

  return Object.freeze({
    HORDE_TRACK,
    SOLO_TRACK,
    TRACKS,
    DEFAULTS,
    trackForWave,
    runtimePlayerCount,
    createController,
    hordeIsActive,
    syncLegacyVoiceGuard,
    get legacyVoiceGuardState() {
      return Object.freeze({
        active: legacyVoiceGuard.active,
        previousEnabled: legacyVoiceGuard.previousEnabled
      });
    }
  });
});
