/*
 * The Lost Sizzler — V10.4 gameplay/accessibility/feedback pass.
 * Loaded after the V10.3 runtime so this can harden the live game without
 * duplicating the main engine files.
 */
(function () {
  "use strict";

  if (window.__CCG_LOST_SIZZLER_V104__) return;
  window.__CCG_LOST_SIZZLER_V104__ = true;

  const CONFIG = window.CCG_CONFIG;
  const PROG = window.CCGProgression;
  const SYSTEMS = window.CCGSystems;
  const AI = window.CCGAI;
  const NETWORK = window.CCGNetwork;
  if (!CONFIG || !PROG || !SYSTEMS || !AI || !NETWORK) return;

  const BUILD = "V10.4";
  const FEEDBACK_FUNCTION = "lost-sizzler-feedback";
  let gameCatalogueReady = false;
  let gameCatalogue = Array.isArray(CONFIG.c64Loot) ? [...CONFIG.c64Loot] : [];
  let adaptiveTick = 0;

  function safeText(value) {
    return String(value == null ? "" : value).trim();
  }

  function hashText(value) {
    let h = 2166136261 >>> 0;
    for (const ch of String(value || "")) {
      h ^= ch.charCodeAt(0);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }

  function gcd(a, b) {
    a = Math.abs(a); b = Math.abs(b);
    while (b) [a, b] = [b, a % b];
    return a || 1;
  }

  function catalogueTitles(payload) {
    const rows = Array.isArray(payload) ? payload : Array.isArray(payload?.games) ? payload.games : [];
    const seen = new Set();
    const out = [];
    for (const row of rows) {
      const title = safeText(row?.title);
      if (!title) continue;
      const key = title.toLocaleLowerCase("en-GB");
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(title);
    }
    return out;
  }

  function setStartButtonsDisabled(disabled) {
    for (const id of ["solo-btn", "daily-btn", "split-btn", "create-btn", "join-btn", "continue-save-btn"]) {
      const button = document.getElementById(id);
      if (!button) continue;
      button.disabled = Boolean(disabled);
      button.toggleAttribute("aria-busy", Boolean(disabled));
    }
  }

  async function loadFullGameCatalogue() {
    setStartButtonsDisabled(true);
    const note = document.getElementById("menu-note");
    const oldNote = note?.textContent || "";
    if (note) note.textContent = "Loading the full CCG game archive for dungeon collectibles…";
    try {
      const response = await fetch("/games/games.json", { cache: "no-cache" });
      if (!response.ok) throw new Error(`games.json returned ${response.status}`);
      const titles = catalogueTitles(await response.json());
      if (!titles.length) throw new Error("No game titles were found in games.json");
      gameCatalogue = titles;
      if (Array.isArray(CONFIG.c64Loot)) CONFIG.c64Loot.splice(0, CONFIG.c64Loot.length, ...titles);
      gameCatalogueReady = true;
      if (note) note.textContent = oldNote;
    } catch (error) {
      console.warn("Lost Sizzler V10.4: full game catalogue unavailable; retaining built-in collectible pool.", error);
      gameCatalogueReady = false;
      if (note) note.textContent = `${oldNote} Full archive collectible loading failed, so the built-in collectible pool is being used for this session.`;
    } finally {
      setStartButtonsDisabled(false);
    }
  }

  function assignCollectibleGames(hostState, runState) {
    if (!hostState?.items?.length || !gameCatalogue.length) return;
    const items = hostState.items.filter((item) => item?.kind === "game");
    if (!items.length) return;
    const n = gameCatalogue.length;
    let step = (hashText(`${runState?.seed || "CCG"}|COLLECTIBLE-STEP`) % Math.max(1, n - 1)) + 1;
    while (n > 1 && gcd(step, n) !== 1) step = (step % n) + 1;
    const start = hashText(`${runState?.seed || "CCG"}|COLLECTIBLE-START`) % n;
    const floor = Math.max(1, Number(runState?.floor || 1));
    const floorStride = 16;
    items.forEach((item, index) => {
      const deckIndex = (start + (((floor - 1) * floorStride) + index) * step) % n;
      item.title = gameCatalogue[deckIndex];
      item.catalogueIndex = deckIndex;
      item.catalogueSize = n;
    });
  }

  function patchProgression() {
    const harderXpNeed = (level) => {
      level = Math.max(1, Math.floor(Number(level) || 1));
      return 500 + level * 260 + level * level * 55;
    };

    PROG.xpNeed = harderXpNeed;
    PROG.gainXP = function gainXPV104(player, runState, amount, reason = "Exploration") {
      const gross = Math.max(0, Math.round(amount));
      const cap = PROG.floorLevelCap(runState);
      if ((player.level || 1) >= cap) {
        player.xp = 0;
        player.xpDebt = 0;
        return { amount: 0, gross, debtPaid: 0, discarded: gross, capped: true, cap, reason, levels: [] };
      }
      const currentXp = Math.max(0, player.xp || 0);
      let capacity = 0;
      let probeLevel = Math.max(1, player.level || 1);
      let probeXp = currentXp;
      while (probeLevel < cap) {
        capacity += Math.max(0, harderXpNeed(probeLevel) - probeXp);
        probeLevel += 1;
        probeXp = 0;
      }
      const earned = Math.min(gross, capacity);
      const discarded = Math.max(0, gross - earned);
      player.xpDebt = 0;
      player.totalXp = (player.totalXp || 0) + earned;
      player.xp = currentXp + earned;
      runState.floorXP = (runState.floorXP || 0) + earned;
      if (earned > 0) {
        player.everEarnedXp = true;
        runState.everEarnedXp = true;
        runState.xpPeak = Math.max(runState.xpPeak || 0, player.totalXp || 0);
      }
      const levels = [];
      while ((player.level || 1) < cap && player.xp >= harderXpNeed(player.level || 1)) {
        player.xp -= harderXpNeed(player.level || 1);
        player.level = (player.level || 1) + 1;
        player.pendingLevels = (player.pendingLevels || 0) + 1;
        levels.push(player.level);
      }
      if ((player.level || 1) >= cap) player.xp = 0;
      return { amount: earned, gross, debtPaid: 0, discarded, capped: (player.level || 1) >= cap, cap, reason, levels };
    };
  }

  function patchSystemDecoration() {
    const originalDecorate = SYSTEMS.decorate.bind(SYSTEMS);
    SYSTEMS.decorate = function decorateV104(worldState, hostState, runState) {
      const result = originalDecorate(worldState, hostState, runState);
      const stalkers = (hostState.enemies || []).filter((enemy) => enemy?.deathStalker);
      if (stalkers.length > 1) {
        const keep = stalkers[0];
        hostState.enemies = hostState.enemies.filter((enemy) => !enemy?.deathStalker || enemy === keep);
        hostState.voidStalkers = [keep.id];
      } else if (stalkers.length === 1) {
        hostState.voidStalkers = [stalkers[0].id];
      } else {
        hostState.voidStalkers = [];
      }
      assignCollectibleGames(hostState, runState);
      return result;
    };
  }

  function playerCombatPower(player) {
    if (!player) return 1;
    const weapon = player.weapon || {};
    const rawPower = Math.max(1, Number(weapon.power || 1) + Number(player.damageBonus || 0));
    const shots = Math.max(1, Number(weapon.shots || 1));
    const fireRate = 1 / Math.max(0.58, Number(weapon.delay || 1));
    return rawPower * (1 + Math.min(0.42, (shots - 1) * 0.12)) * Math.min(1.3, fireRate);
  }

  function adaptEnemyDurability(hostState, players) {
    const player = (players || []).filter(Boolean).sort((a, b) => playerCombatPower(b) - playerCombatPower(a))[0];
    if (!player || !hostState?.enemies) return;
    const combat = playerCombatPower(player);
    const levelGrowth = Math.max(0, (Number(player.level || 1) - 1) * 0.025);
    const weaponGrowth = Math.min(0.58, Math.max(0, combat - 1) * 0.11);
    for (const enemy of hostState.enemies) {
      if (!enemy?.alive || enemy.deathStalker || enemy.treasureGoblin) continue;
      if (!Number.isFinite(enemy.maxHp) || enemy.maxHp <= 0) continue;
      if (!enemy._v104BaseMaxHp) enemy._v104BaseMaxHp = enemy.maxHp;
      const baseBoost = enemy.follower ? 0.96 : enemy.guardian ? 1.02 : enemy.champion ? 1.03 : 1;
      const adaptiveShare = enemy.follower ? 0.42 : enemy.guardian ? 0.62 : 0.82;
      const desiredScale = Math.min(1.62, baseBoost + (weaponGrowth + levelGrowth) * adaptiveShare);
      const oldMax = enemy.maxHp;
      const desiredMax = Math.max(oldMax, Math.ceil(enemy._v104BaseMaxHp * desiredScale));
      if (desiredMax <= oldMax) continue;
      const wasFull = enemy.hp >= oldMax;
      const delta = desiredMax - oldMax;
      enemy.maxHp = desiredMax;
      enemy.hp = wasFull ? desiredMax : Math.min(desiredMax, enemy.hp + Math.max(1, Math.ceil(delta * 0.45)));
    }
  }

  function bulletThreatFor(enemy) {
    if (typeof bullets === "undefined" || !Array.isArray(bullets)) return null;
    let best = null;
    let bestDistance = Infinity;
    for (const bullet of bullets) {
      if (!bullet || bullet.ttl <= 0) continue;
      const dx = enemy.x - bullet.x;
      const dy = enemy.y - bullet.y;
      const distance = Math.hypot(dx, dy);
      if (distance > 4.75 || distance >= bestDistance) continue;
      const approach = dx * Number(bullet.dx || 0) + dy * Number(bullet.dy || 0);
      if (approach <= 0) continue;
      best = bullet;
      bestDistance = distance;
    }
    return best;
  }

  function tryEvadeShot(enemy, hostState, dt) {
    enemy._v104EvadeMs = Math.max(0, Number(enemy._v104EvadeMs || 0) - dt);
    if (enemy._v104EvadeMs > 0 || enemy.guardian || enemy.kind === "guard" || enemy.deathStalker) return false;
    const threat = bulletThreatFor(enemy);
    if (!threat) return false;
    const kind = AI.kindOf?.(enemy) || enemy.kind;
    const chance = kind === "ambusher" ? 0.72 : enemy.follower ? 0.56 : kind === "hunter" ? 0.48 : kind === "scout" ? 0.38 : 0.3;
    if (Math.random() > chance) {
      enemy._v104EvadeMs = 260;
      return false;
    }
    const bx = Number(threat.dx || 0), by = Number(threat.dy || 0);
    const directions = by === 0 ? [[0, 1], [0, -1]] : bx === 0 ? [[1, 0], [-1, 0]] : [[-by, bx], [by, -bx]];
    directions.sort(() => Math.random() - 0.5);
    for (const [dx, dy] of directions) {
      const nx = enemy.x + Math.sign(dx), ny = enemy.y + Math.sign(dy);
      if (!W.walkable(world.map, nx, ny, hostState)) continue;
      if ((hostState.enemies || []).some((other) => other !== enemy && other.alive && other.x === nx && other.y === ny)) continue;
      enemy.x = nx; enemy.y = ny;
      enemy.facing = { x: Math.sign(dx), y: Math.sign(dy) };
      enemy.moveCooldown = Math.max(enemy.moveCooldown || 0, 260);
      enemy._v104EvadeMs = kind === "ambusher" ? 520 : 720;
      return true;
    }
    enemy._v104EvadeMs = 340;
    return false;
  }

  function deathStalkerImpactPenalty(target) {
    if (!target) return;
    const xpLoss = Math.min(10, Math.max(0, Number(target.totalXp || 0)));
    score = Math.max(0, Number(score || 0) - 100);
    target.totalXp = Math.max(0, Number(target.totalXp || 0) - xpLoss);
    target.xp = Math.max(0, Number(target.xp || 0) - xpLoss);
    if (run) run.floorXP = Math.max(0, Number(run.floorXP || 0) - xpLoss);
    if (typeof floatText === "function") floatText(target.x, target.y, `-100 SCORE / -${xpLoss} XP`, P.red);
    S.sfx?.("stalker");
  }

  function announceVisibleDeathStalker(enemy, players, hostState) {
    if (!enemy?.alive || !enemy.deathStalker || enemy._v104Announced) return;
    const visible = (players || []).some((player) => {
      if (!player) return false;
      const distance = Math.hypot(enemy.x - player.x, enemy.y - player.y);
      return distance <= CONFIG.enemy.torchSightRange && AI.lineOfSight(world.map, player, enemy, CONFIG.enemy.torchSightRange, hostState);
    });
    if (!visible && !enemy.hunting) return;
    enemy._v104Announced = true;
    showToast("DEATH STALKER APPEARS", "BANISH FOR GREAT REWARDS", "red", 9000);
  }

  function patchEnemyAI() {
    const originalStepEnemies = AI.stepEnemies.bind(AI);
    AI.stepEnemies = function stepEnemiesV104(hostState, map, players, dt, hooks = {}, worldState) {
      adaptiveTick -= Number(dt || 0);
      if (adaptiveTick <= 0) {
        adaptiveTick = 850;
        adaptEnemyDurability(hostState, players);
      }
      for (const enemy of hostState?.enemies || []) tryEvadeShot(enemy, hostState, Number(dt || 0));
      const originalMelee = hooks.melee;
      const wrappedHooks = {
        ...hooks,
        melee: (enemy, target, power) => {
          const canTakeImpact = !(target?.invuln > 0);
          originalMelee?.(enemy, target, power);
          if (canTakeImpact && enemy?.deathStalker) deathStalkerImpactPenalty(target);
        }
      };
      const result = originalStepEnemies(hostState, map, players, dt, wrappedHooks, worldState);
      for (const enemy of hostState?.enemies || []) {
        announceVisibleDeathStalker(enemy, players, hostState);
        if (!enemy?.alive || enemy.deathStalker || enemy.follower) continue;
        if ((AI.kindOf?.(enemy) || enemy.kind) !== "ambusher") continue;
        if (enemy.attackCooldown > 0) continue;
        const target = (players || []).filter((p) => p && p.health > 0).sort((a, b) => Math.hypot(enemy.x - a.x, enemy.y - a.y) - Math.hypot(enemy.x - b.x, enemy.y - b.y))[0];
        if (!target) continue;
        const range = Math.hypot(enemy.x - target.x, enemy.y - target.y);
        if (range > 8 || !AI.lineOfSight(map, enemy, target, CONFIG.enemy.lineOfSightRange, hostState)) continue;
        const ax = target.x - enemy.x, ay = target.y - enemy.y;
        const dx = Math.abs(ax) >= Math.abs(ay) ? Math.sign(ax) : 0;
        const dy = Math.abs(ay) > Math.abs(ax) ? Math.sign(ay) : 0;
        hooks.shoot?.({ x: enemy.x, y: enemy.y, dx, dy, power: 1, style: "raster", ttl: 12, source: "Raster Ambusher", enemyId: enemy.id });
        enemy.attackCooldown = 1050;
      }
      return result;
    };

    if (typeof collideWithEnemy === "function") {
      const originalCollision = collideWithEnemy;
      collideWithEnemy = function collideWithEnemyV104(player, enemy, fromX, fromY) {
        const canTakeImpact = !(player?.invuln > 0);
        const result = originalCollision(player, enemy, fromX, fromY);
        if (canTakeImpact && enemy?.deathStalker) deathStalkerImpactPenalty(player);
        return result;
      };
    }
  }

  function patchFinalFloor() {
    if (typeof damageEnemy === "function") {
      const originalDamageEnemy = damageEnemy;
      damageEnemy = function damageEnemyV104() {
        const result = originalDamageEnemy.apply(this, arguments);
        if (run?.floor === CONFIG.maxFloors && host?.sigilResolved) {
          const finalItem = (host.items || []).find((item) => item?.active && item.kind === "exitSigil");
          if (finalItem) {
            finalItem.kind = "lostSizzler";
            finalItem.title = "THE LOST SIZZLER";
            host.radarSigilSeen = { x: finalItem.x, y: finalItem.y };
            if (!host._v104SizzlerRevealShown) {
              host._v104SizzlerRevealShown = true;
              showToast("THE LOST SIZZLER REVEALED", "The final Sigil reward is the Lost Sizzler. Recover it to complete the conquest.", "gold", 11000);
            }
          }
        }
        return result;
      };
    }

    if (typeof itemInfo === "function") {
      const originalItemInfo = itemInfo;
      itemInfo = function itemInfoV104(item) {
        if (item?.kind === "lostSizzler") return ["★", P.gold];
        return originalItemInfo(item);
      };
    }

    if (typeof applyItem === "function") {
      const originalApplyItem = applyItem;
      applyItem = function applyItemV104(item, player) {
        if (item?.kind !== "lostSizzler") return originalApplyItem(item, player);
        host.lostSizzlerRecovered = true;
        score += 5000;
        S.sfx?.("win");
        shake = Math.max(shake || 0, 14);
        if (typeof burst === "function") burst(item.x, item.y, P.gold, 40, 2);
        if (typeof ring === "function") ring(item.x, item.y, P.gold, 64);
        if (typeof floatText === "function") floatText(player.x, player.y, "LOST SIZZLER RECOVERED!", P.gold);
        showToast("CONGRATULATIONS — THE LOST SIZZLER IS YOURS", "Five floors conquered. The Lost Sizzler has finally been recovered.", "green", 12000);
        if (!run.floorComplete) {
          PROG.bankFloor(run);
          run.floorComplete = true;
        }
        run.deepest = Math.max(run.deepest || 1, CONFIG.maxFloors);
        setTimeout(() => {
          if (run && typeof endRun === "function") endRun("The Lost Sizzler recovered — conquest complete");
        }, 900);
        return true;
      };
    }
  }

  function patchEndReport() {
    if (typeof endRun !== "function") return;
    const originalEndRun = endRun;
    endRun = function endRunV104(reason) {
      const found = [...new Set([...(run?.bankedGames || []), ...(run?.floorGames || [])].filter(Boolean))];
      const result = originalEndRun(reason);
      if (UI?.endText) {
        const report = found.length ? found.map((title) => `• ${esc(title)}`).join("<br>") : "No game collectibles were recovered on this conquest.";
        UI.endText.innerHTML += `<br><br><strong>GAMES FOUND ON THIS CONQUEST — ${found.length}</strong><br>${report}`;
      }
      return result;
    };
  }

  function patchNetworkLimit() {
    const proto = NETWORK.RoomNetwork?.prototype;
    if (!proto || proto.__v104CapacityPatched) return;
    proto.__v104CapacityPatched = true;
    const originalSyncMembers = proto.syncMembers;
    const originalJoin = proto.join;
    proto.syncMembers = function syncMembersV104() {
      const all = [...this.members.values()].sort((a, b) => (a.joinedAt - b.joinedAt) || a.id.localeCompare(b.id));
      const admitted = all.slice(0, CONFIG.maxPlayers);
      this._v104OverCapacity = all.length > CONFIG.maxPlayers && !admitted.some((member) => member.id === this.sessionId);
      return originalSyncMembers.call(this);
    };
    proto.join = async function joinV104(room, name) {
      const result = await originalJoin.call(this, room, name);
      for (let attempt = 0; attempt < 8; attempt += 1) {
        await new Promise((resolve) => setTimeout(resolve, 125));
        this.syncMembers();
        if (this._v104OverCapacity) {
          await this.leave();
          throw new Error(`Room is full. The Lost Sizzler supports a maximum of ${CONFIG.maxPlayers} online players.`);
        }
        if (this.members.size > 1 || attempt >= 3) break;
      }
      return result;
    };
  }

  function injectStyles() {
    const style = document.createElement("style");
    style.id = "lost-sizzler-v104-style";
    style.textContent = `
      .v104-banish-card{border-color:#b978ff!important;box-shadow:inset 0 0 18px rgba(185,120,255,.12)}
      .v104-banish-card kbd{border-color:#ffd85a;color:#ffd85a}
      .v104-room-chip{position:absolute;top:10px;right:10px;z-index:5;display:none;padding:8px 10px;border:2px solid #6cecff;background:rgba(5,3,8,.88);box-shadow:0 0 18px rgba(108,236,255,.25);font:700 10px "Courier New",monospace;color:#fff;letter-spacing:.5px;pointer-events:none}
      .v104-room-chip.show{display:block}.v104-room-chip b{color:#ffd85a;font-size:13px;letter-spacing:2px}.v104-room-chip small{display:block;color:#b9aec8;margin-top:2px}
      .v104-feedback-panel textarea,.v104-feedback-panel select,.v104-feedback-panel input{width:100%;padding:10px;background:#08050d;border:1px solid #745797;color:#fff;font:inherit}
      .v104-feedback-panel textarea{min-height:150px;resize:vertical}.v104-feedback-grid{display:grid;gap:10px;text-align:left;max-width:560px;margin:14px auto}.v104-feedback-status{min-height:18px;color:#ffd85a;font-size:10px}.v104-hp{position:absolute!important;left:-10000px!important;width:1px!important;height:1px!important;overflow:hidden!important}
      .v104-touch-controls{position:absolute;left:0;right:0;bottom:0;z-index:5;display:none;justify-content:space-between;align-items:flex-end;gap:12px;padding:12px max(12px,env(safe-area-inset-right)) max(12px,env(safe-area-inset-bottom)) max(12px,env(safe-area-inset-left));pointer-events:none;background:linear-gradient(transparent,rgba(3,2,5,.45));user-select:none;-webkit-user-select:none}
      .v104-touch-controls.active{display:flex}.v104-touch-pad,.v104-touch-actions{pointer-events:auto}.v104-touch-pad{display:grid;grid-template-columns:repeat(3,56px);grid-template-rows:repeat(3,56px);gap:4px}.v104-touch-actions{display:grid;grid-template-columns:repeat(3,minmax(62px,76px));gap:7px;align-items:end}.v104-touch-btn{min-width:56px;min-height:56px;padding:7px;border:2px solid rgba(255,216,90,.78);border-radius:12px;background:rgba(14,8,20,.68);color:#fff;box-shadow:0 0 14px rgba(0,0,0,.34);font:bold 10px "Courier New",monospace;touch-action:none;backdrop-filter:blur(2px)}
      .v104-touch-btn:active,.v104-touch-btn.held{background:rgba(185,120,255,.72);transform:scale(.96)}.v104-touch-fire{min-height:76px;border-color:#ff9950;font-size:13px}.v104-touch-banish{border-color:#b978ff}.v104-touch-pad [data-dir="up"]{grid-column:2;grid-row:1}.v104-touch-pad [data-dir="left"]{grid-column:1;grid-row:2}.v104-touch-pad [data-dir="right"]{grid-column:3;grid-row:2}.v104-touch-pad [data-dir="down"]{grid-column:2;grid-row:3}
      @media (pointer:coarse),(max-width:900px){body.v104-touch-device .v104-touch-controls{display:flex}.v104-room-chip{top:8px;right:8px}.game-area{touch-action:none}.game-message-rail{padding-bottom:112px}}
      @media (max-width:620px){.v104-touch-pad{grid-template-columns:repeat(3,48px);grid-template-rows:repeat(3,48px)}.v104-touch-btn{min-width:48px;min-height:48px}.v104-touch-actions{grid-template-columns:repeat(3,minmax(52px,64px));gap:5px}.v104-touch-fire{min-height:64px}.v104-touch-controls{padding:8px}.critical-strip{overflow-x:auto;grid-auto-flow:column;grid-auto-columns:minmax(160px,1fr)}}
    `;
    document.head.appendChild(style);
  }

  function injectBanishmentCard() {
    const strip = document.querySelector(".critical-strip");
    if (!strip || document.getElementById("v104-banish-held")) return;
    const card = document.createElement("div");
    card.className = "critical-card v104-banish-card";
    card.innerHTML = '<kbd>B</kbd><div><b>BANISHMENT FLASK</b><strong id="v104-banish-held">0 HELD</strong><span>BANISH DEATH STALKERS</span></div>';
    const keysCard = strip.querySelector(".keys-card");
    strip.insertBefore(card, keysCard || null);
  }

  function injectRoomChip() {
    const area = document.querySelector(".game-area");
    if (!area || document.getElementById("v104-room-chip")) return;
    const chip = document.createElement("div");
    chip.id = "v104-room-chip";
    chip.className = "v104-room-chip";
    chip.innerHTML = '<span>ONLINE ROOM</span> <b id="v104-room-code">-----</b><small>MAX 4 PLAYERS</small>';
    area.appendChild(chip);
  }

  function injectTouchControls() {
    const touchDevice = navigator.maxTouchPoints > 0 || matchMedia("(pointer: coarse)").matches;
    if (!touchDevice) return;
    document.body.classList.add("v104-touch-device");
    const area = document.querySelector(".game-area");
    if (!area || document.getElementById("v104-touch-controls")) return;
    const controls = document.createElement("div");
    controls.id = "v104-touch-controls";
    controls.className = "v104-touch-controls active";
    controls.setAttribute("aria-label", "Touch game controls");
    controls.innerHTML = `
      <div class="v104-touch-pad" aria-label="Movement pad">
        <button class="v104-touch-btn" data-dir="up" data-key="KeyW" aria-label="Move up">▲</button>
        <button class="v104-touch-btn" data-dir="left" data-key="KeyA" aria-label="Move left">◀</button>
        <button class="v104-touch-btn" data-dir="right" data-key="KeyD" aria-label="Move right">▶</button>
        <button class="v104-touch-btn" data-dir="down" data-key="KeyS" aria-label="Move down">▼</button>
      </div>
      <div class="v104-touch-actions">
        <button class="v104-touch-btn" data-action="dash">DASH</button>
        <button class="v104-touch-btn" data-action="potion">POTION</button>
        <button class="v104-touch-btn" data-action="torch">TORCH</button>
        <button class="v104-touch-btn v104-touch-fire" data-action="fire">FIRE</button>
        <button class="v104-touch-btn v104-touch-banish" data-action="banish">BANISH</button>
        <button class="v104-touch-btn" data-action="inventory">ITEMS</button>
      </div>`;
    area.appendChild(controls);
    const releaseKey = (button) => {
      const key = button.dataset.key;
      if (key && typeof input !== "undefined") input.delete(key);
      button.classList.remove("held");
    };
    controls.querySelectorAll("[data-key]").forEach((button) => {
      button.addEventListener("pointerdown", (event) => {
        event.preventDefault();
        button.setPointerCapture?.(event.pointerId);
        if (typeof input !== "undefined") input.add(button.dataset.key);
        button.classList.add("held");
      });
      for (const type of ["pointerup", "pointercancel", "lostpointercapture"]) button.addEventListener(type, () => releaseKey(button));
    });
    let fireTimer = null;
    const fireOnce = () => {
      if (typeof mode === "undefined" || mode !== "playing" || !p1) return;
      firePlayer(p1, d1() || p1.dir);
    };
    const stopFire = () => { if (fireTimer) clearInterval(fireTimer); fireTimer = null; };
    controls.querySelectorAll("[data-action]").forEach((button) => {
      const action = button.dataset.action;
      button.addEventListener("pointerdown", (event) => {
        event.preventDefault();
        if (typeof mode === "undefined" || mode !== "playing" || !p1) return;
        if (action === "fire") { fireOnce(); stopFire(); fireTimer = setInterval(fireOnce, 150); }
        else if (action === "dash") dashPlayer(p1, d1() || p1.dir);
        else if (action === "potion") usePotion(p1);
        else if (action === "torch") useUtility(p1);
        else if (action === "banish") useBanishment(p1);
        else if (action === "inventory") toggleInventory();
      });
      for (const type of ["pointerup", "pointercancel", "lostpointercapture"]) button.addEventListener(type, () => { if (action === "fire") stopFire(); });
    });
  }

  function injectFeedbackPanel() {
    const secondary = document.querySelector(".secondary-menu");
    const area = document.querySelector(".game-area");
    if (!secondary || !area || document.getElementById("v104-feedback-btn")) return;
    const button = document.createElement("button");
    button.id = "v104-feedback-btn";
    button.type = "button";
    button.textContent = "BUG REPORT / GAME SUGGESTIONS";
    secondary.appendChild(button);
    const overlay = document.createElement("div");
    overlay.id = "v104-feedback-panel";
    overlay.className = "overlay hidden";
    overlay.innerHTML = `<div class="panel compact v104-feedback-panel">
      <h2>Bug Report / Game Suggestions</h2>
      <p>Send a Lost Sizzler bug report or suggestion directly to CCG. Email is optional.</p>
      <form id="v104-feedback-form" class="v104-feedback-grid">
        <label><span>TYPE</span><select id="v104-feedback-type"><option value="bug">Bug report</option><option value="suggestion">Game suggestion</option></select></label>
        <label><span>MESSAGE</span><textarea id="v104-feedback-message" maxlength="3000" required placeholder="Tell me what happened, or what you would like changed."></textarea></label>
        <label><span>EMAIL (OPTIONAL)</span><input id="v104-feedback-email" maxlength="180" type="email" autocomplete="email" placeholder="you@example.com"></label>
        <label class="v104-hp" aria-hidden="true">Website<input id="v104-feedback-website" tabindex="-1" autocomplete="off"></label>
        <div id="v104-feedback-status" class="v104-feedback-status" aria-live="polite"></div>
        <div class="menu-buttons"><button id="v104-feedback-send" class="primary" type="submit">Send Feedback</button><button id="v104-feedback-close" type="button">Close</button></div>
      </form>
    </div>`;
    area.appendChild(overlay);
    const close = () => overlay.classList.add("hidden");
    button.addEventListener("click", () => overlay.classList.remove("hidden"));
    overlay.querySelector("#v104-feedback-close")?.addEventListener("click", close);
    overlay.querySelector("#v104-feedback-form")?.addEventListener("submit", async (event) => {
      event.preventDefault();
      const status = overlay.querySelector("#v104-feedback-status");
      const send = overlay.querySelector("#v104-feedback-send");
      const message = safeText(overlay.querySelector("#v104-feedback-message")?.value);
      const email = safeText(overlay.querySelector("#v104-feedback-email")?.value);
      const type = safeText(overlay.querySelector("#v104-feedback-type")?.value) || "bug";
      const website = safeText(overlay.querySelector("#v104-feedback-website")?.value);
      if (message.length < 10) { if (status) status.textContent = "Please add a little more detail before sending."; return; }
      if (send) send.disabled = true;
      if (status) status.textContent = "Sending…";
      try {
        const client = await window.ccgSupabase?.getClient?.();
        if (!client) throw new Error("Feedback service is unavailable.");
        const { data, error } = await client.functions.invoke(FEEDBACK_FUNCTION, { body: { type, message, email, website, build: BUILD, page_url: location.href } });
        if (error || !data?.success) throw new Error(data?.error || error?.message || "Feedback could not be sent.");
        if (status) status.textContent = "Thank you for your feedback, I will look into this and get back to you.";
        overlay.querySelector("#v104-feedback-message").value = "";
        setTimeout(close, 2600);
      } catch (error) {
        if (status) status.textContent = safeText(error?.message) || "Feedback could not be sent. Please try again.";
      } finally {
        if (send) send.disabled = false;
      }
    });
  }

  function updateV104Ui() {
    try {
      const banishCount = typeof p1 !== "undefined" && p1 ? PROG.inventoryKindCount(p1, "banishment") : 0;
      const held = document.getElementById("v104-banish-held");
      if (held) held.textContent = `${banishCount} HELD`;
      if (typeof banishmentState === "function" && typeof p1 !== "undefined" && p1 && UI?.banishAlertText) {
        const state = banishmentState(p1);
        if (state.ready) UI.banishAlertText.textContent = "BANISH FOR GREAT REWARDS — PRESS B";
      }
      const chip = document.getElementById("v104-room-chip");
      const chipCode = document.getElementById("v104-room-code");
      const online = typeof playMode !== "undefined" && playMode === "online" && typeof net !== "undefined" && net?.connected && net?.roomCode;
      chip?.classList.toggle("show", Boolean(online));
      if (chipCode && online) chipCode.textContent = net.roomCode;
      const radarLabel = document.getElementById("radar-sigil-label");
      if (radarLabel && typeof run !== "undefined" && run) radarLabel.textContent = run.floor === CONFIG.maxFloors ? "SIZZLER" : "SIGIL";
      const touch = document.getElementById("v104-touch-controls");
      if (touch) touch.classList.toggle("active", document.getElementById("menu")?.classList.contains("hidden") === true);
    } catch (error) {
      console.warn("Lost Sizzler V10.4 UI refresh failed", error);
    }
  }

  function updateBuildLabels() {
    document.querySelectorAll(".build-badge").forEach((node) => { node.textContent = `BUILD ${BUILD}`; });
    const subtitle = document.querySelector(".brand p");
    if (subtitle) subtitle.textContent = `THE LOST SIZZLER — ${BUILD}`;
  }

  function init() {
    injectStyles();
    updateBuildLabels();
    injectBanishmentCard();
    injectRoomChip();
    injectTouchControls();
    injectFeedbackPanel();
    patchProgression();
    patchSystemDecoration();
    patchEnemyAI();
    patchFinalFloor();
    patchEndReport();
    patchNetworkLimit();
    loadFullGameCatalogue();
    setInterval(updateV104Ui, 220);
    updateV104Ui();
  }

  if (document.readyState === "complete") init();
  else window.addEventListener("load", init, { once: true });
})();
