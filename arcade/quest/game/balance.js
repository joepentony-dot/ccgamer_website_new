(function(){
  'use strict';

  const Q = window.CCGQuest;
  if (!Q || Q.__finalBalanceApplied) return;
  Q.__finalBalanceApplied = true;

  /*
    FINAL GAMEPLAY TUNING
    ---------------------
    Keep the last difficulty adjustments isolated from the main engine so they
    can be tuned or removed without destabilising the established game flow.
  */

  // One physical press = one shot. Holding Z/Ctrl no longer creates autofire.
  // Alien Formation also has a short hard cooldown so rapid tapping cannot
  // turn the player's ship into a machine gun.
  const ALIEN_PLAYER_FIRE_COOLDOWN_MS = 320;
  let lastAlienPlayerShot = -Infinity;
  const originalDown = Q.Input.prototype.down;
  Q.Input.prototype.down = function(...codes) {
    const fireOnly = codes.length > 0 && codes.every((code) => code === 'KeyZ' || code === 'ControlLeft');
    if (!fireOnly) return originalDown.apply(this, codes);

    const pressed = this.tap(...codes);
    if (!pressed) return false;

    const mode = window.CCGQuestDebug?.getState?.().mode;
    if (mode !== 'invaders') return true;

    const t = Q.now();
    if (t - lastAlienPlayerShot < ALIEN_PLAYER_FIRE_COOLDOWN_MS) return false;
    lastAlienPlayerShot = t;
    return true;
  };

  // Alien Formation fires roughly a third more often while preserving the
  // existing early/mid/late volley logic in the main engine.
  const originalRand = Q.rand;
  Q.rand = function(a, b) {
    const mode = window.CCGQuestDebug?.getState?.().mode;
    const looksLikeAlienCooldown = mode === 'invaders' && a >= 0.45 && a <= 0.75 && b >= 0.80 && b <= 1.05;
    if (looksLikeAlienCooldown) {
      return originalRand(Math.max(0.28, a * 0.62), Math.max(0.42, b * 0.68));
    }
    return originalRand(a, b);
  };

  // The base bead room already sends two attacks from the left. Add three more
  // spaced across the run by mirroring selected right-origin bead spawns.
  let lastMode = null;
  let rightBeadCount = 0;
  let extraLeftBeads = 0;
  const extraAt = [4, 9, 14];
  const originalPush = Array.prototype.push;

  Array.prototype.push = function(...items) {
    const mode = window.CCGQuestDebug?.getState?.().mode;

    if (mode !== lastMode) {
      if (mode === 'beads') {
        rightBeadCount = 0;
        extraLeftBeads = 0;
      }
      lastMode = mode;
    }

    if (mode === 'beads' && extraLeftBeads < extraAt.length) {
      const additions = [];

      for (const item of items) {
        const rightOriginBead = item
          && item.k === 'bead'
          && Number.isFinite(item.vx)
          && item.vx < 0
          && Number.isFinite(item.x)
          && item.x > Q.W * 0.75;

        if (!rightOriginBead) continue;

        rightBeadCount += 1;
        if (rightBeadCount === extraAt[extraLeftBeads]) {
          additions.push({
            ...item,
            x: -52,
            vx: Math.abs(item.vx) * 0.93,
            t: 0,
            hit: false,
            scored: false,
          });
          extraLeftBeads += 1;
        }
      }

      if (additions.length) return originalPush.apply(this, items.concat(additions));
    }

    return originalPush.apply(this, items);
  };
})();
