/* The Lost Sizzler — Horde Survivor rules engine.
 * Additive and runtime-agnostic: the live-game adapter is installed only after
 * the current gameplay, multiplayer, audio and leaderboard branches converge.
 */
(function installHordeSurvivor(root, factory) {
  "use strict";
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.CCGLostSizzlerHorde = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function createHordeSurvivorApi() {
  "use strict";

  const MODE_ID = "horde-survivor";
  const MAX_PLAYERS = 4;
  const STARTING_HP = 10;
  const REVIVE_MS = 5000;
  const DOWNED_MS = 20000;
  const REVIVE_DISTANCE = 1.15;
  const REVIVE_HP = 5;
  const REVIVE_GRACE_MS = 2000;
  const SOLO_SECOND_WIND_WAVE = 5;
  const PLAYER_SCALE = Object.freeze({ 1: 1, 2: 1.65, 3: 2.25, 4: 2.8 });
  const ACTIVE_SCALE = Object.freeze({ 1: 8, 2: 13, 3: 18, 4: 22 });

  const AUDIO = Object.freeze({
    tracks: Object.freeze([
      Object.freeze({ waves: Object.freeze([1, 2, 3, 4]), src: "assets/audio/music/horde-survival-waves-1-4.ogg" }),
      Object.freeze({ waves: Object.freeze([5, 6, 7, 8, 9]), src: "assets/audio/music/horde-survival-waves-5-9.ogg" }),
      Object.freeze({ waves: Object.freeze([10]), src: "assets/audio/music/horde-survival-wave-10.ogg" })
    ]),
    baseVolume: 0.13,
    duckedVolume: 0.05,
    maximumVolume: 0.18,
    fadeInMs: 900,
    fadeOutMs: 500,
    loop: true
  });

  const ENEMIES = Object.freeze({
    spider: Object.freeze({ id: "spider", name: "Dustweb Spider", hp: 1, damage: 1, speed: 1.05, score: 25 }),
    skeleton: Object.freeze({ id: "skeleton", name: "Crypt Skeleton", hp: 2, damage: 1, speed: 0.9, score: 40 }),
    bat: Object.freeze({ id: "bat", name: "Vault Bat", hp: 1, damage: 1, speed: 1.35, score: 35 }),
    fighter: Object.freeze({ id: "fighter", name: "Dungeon Fighter", hp: 3, damage: 1, speed: 1, score: 55 }),
    ranger: Object.freeze({ id: "ranger", name: "Archive Ranger", hp: 4, damage: 1, speed: 0.95, score: 70 }),
    elite: Object.freeze({ id: "elite", name: "Citadel Elite", hp: 6, damage: 2, speed: 1, score: 100 }),
    knight: Object.freeze({ id: "knight", name: "Armoured Knight", hp: 9, damage: 2, speed: 0.82, score: 140 }),
    warden: Object.freeze({ id: "warden", name: "The Horde Warden", hp: 100, damage: 2, speed: 0.92, score: 5000 })
  });

  const WEAPONS = Object.freeze([
    Object.freeze({ wave: 1, id: "starter", name: "Archive Sidearm", role: "accurate starter" }),
    Object.freeze({ wave: 2, id: "repeater", name: "Bone Repeater", role: "rapid fire" }),
    Object.freeze({ wave: 3, id: "scatter", name: "Bat Scattergun", role: "wide spread" }),
    Object.freeze({ wave: 4, id: "rifle", name: "Sizzler Rifle", role: "strong single target" }),
    Object.freeze({ wave: 5, id: "arc", name: "Arc Blaster", role: "crowd control" }),
    Object.freeze({ wave: 6, id: "piercer", name: "Archive Piercer", role: "piercing fire" }),
    Object.freeze({ wave: 7, id: "cannon", name: "Gold Medal Cannon", role: "high damage" }),
    Object.freeze({ wave: 8, id: "launcher", name: "Vault Launcher", role: "area damage" }),
    Object.freeze({ wave: 9, id: "sizzler", name: "Sizzler Prototype", role: "top tier" }),
    Object.freeze({ wave: 10, id: "warden-breaker", name: "Warden Breaker", role: "boss weapon" })
  ]);

  const WAVES = Object.freeze([
    Object.freeze({ level: 1, title: "SPIDERS", quota: 18, groups: Object.freeze([{ kind: "spider", weight: 1 }]), weapon: "starter" }),
    Object.freeze({ level: 2, title: "SKELETONS", quota: 22, groups: Object.freeze([{ kind: "skeleton", weight: 1 }]), weapon: "repeater" }),
    Object.freeze({ level: 3, title: "BATS", quota: 28, groups: Object.freeze([{ kind: "bat", weight: 1 }]), weapon: "scatter" }),
    Object.freeze({ level: 4, title: "DUNGEON FIGHTERS", quota: 26, groups: Object.freeze([{ kind: "fighter", weight: 1 }]), weapon: "rifle" }),
    Object.freeze({ level: 5, title: "MIXED HORDE", quota: 34, groups: Object.freeze([{ kind: "spider", weight: 3 }, { kind: "skeleton", weight: 3 }, { kind: "bat", weight: 2 }, { kind: "fighter", weight: 2 }]), weapon: "arc" }),
    Object.freeze({ level: 6, title: "RANGED ASSAULT", quota: 36, groups: Object.freeze([{ kind: "fighter", weight: 3 }, { kind: "ranger", weight: 2 }, { kind: "skeleton", weight: 2 }]), weapon: "piercer" }),
    Object.freeze({ level: 7, title: "ELITE GUARD", quota: 38, groups: Object.freeze([{ kind: "fighter", weight: 4 }, { kind: "elite", weight: 2 }, { kind: "ranger", weight: 2 }]), weapon: "cannon" }),
    Object.freeze({ level: 8, title: "FULL ASSAULT", quota: 44, groups: Object.freeze([{ kind: "bat", weight: 2 }, { kind: "ranger", weight: 2 }, { kind: "fighter", weight: 3 }, { kind: "elite", weight: 2 }]), weapon: "launcher" }),
    Object.freeze({ level: 9, title: "THE LAST GUARD", quota: 50, groups: Object.freeze([{ kind: "skeleton", weight: 2 }, { kind: "ranger", weight: 2 }, { kind: "elite", weight: 3 }, { kind: "knight", weight: 1 }]), weapon: "sizzler" }),
    Object.freeze({ level: 10, title: "ARMOURED KNIGHT SIEGE", quota: 20, timedMs: 60000, groups: Object.freeze([{ kind: "knight", weight: 1 }]), weapon: "warden-breaker", boss: "warden" })
  ]);

  const VOICE = Object.freeze({
    modeStart: "Horde Survivor. Ten waves. Survive them all.",
    wave1: "Wave one. Spiders.",
    wave2: "Wave two. Skeletons.",
    wave3: "Wave three. Bats incoming.",
    wave4: "Wave four. They are getting stronger.",
    wave5: "Wave five. Mixed horde.",
    wave6: "Wave six. Ranged attackers.",
    wave7: "Wave seven. Elite guard.",
    wave8: "Wave eight. Full assault.",
    wave9: "Wave nine. The last guard.",
    wave10: "Final wave. Hold them back for sixty seconds.",
    weapon: "Weapon upgraded.",
    playerDown: "A player is down.",
    reviving: "Reviving.",
    reviveComplete: "Revive complete.",
    thirtySeconds: "Thirty seconds remaining.",
    tenSeconds: "Ten seconds.",
    boss: "The Horde Warden approaches.",
    victory: "The Warden has fallen. Horde defeated.",
    defeat: "No survivors."
  });

  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const distance = (a, b) => Math.hypot(Number(a?.x || 0) - Number(b?.x || 0), Number(a?.y || 0) - Number(b?.y || 0));
  const copy = value => JSON.parse(JSON.stringify(value));
  const playerCount = value => clamp(Math.floor(Number(value) || 1), 1, MAX_PLAYERS);

  function hash32(value) {
    let hash = 2166136261 >>> 0;
    for (const char of String(value || "")) {
      hash ^= char.charCodeAt(0);
      hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
  }

  function makeRng(seed) {
    let state = hash32(seed) || 0x6d2b79f5;
    return function random() {
      state += 0x6d2b79f5;
      let value = state;
      value = Math.imul(value ^ value >>> 15, value | 1);
      value ^= value + Math.imul(value ^ value >>> 7, value | 61);
      return ((value ^ value >>> 14) >>> 0) / 4294967296;
    };
  }

  function quotaFor(level, count) {
    const wave = WAVES[level - 1];
    if (!wave) return 0;
    return Math.max(1, Math.round(wave.quota * PLAYER_SCALE[playerCount(count)]));
  }

  function activeCapFor(count) {
    return ACTIVE_SCALE[playerCount(count)];
  }

  function bossStats(count) {
    const players = playerCount(count);
    return Object.freeze({
      ...ENEMIES.warden,
      hp: 100 + (players - 1) * 60,
      maxHp: 100 + (players - 1) * 60,
      retargetMinMs: 5000,
      retargetMaxMs: 8000,
      telegraphMs: 850,
      enragesAt: 0.25
    });
  }

  function createArena() {
    const width = 80, height = 52;
    const centre = Object.freeze({ x: 10, y: 8, w: 60, h: 36 });
    const rooms = [];
    const add = (id, x, y, w, h, doorX, doorY) => rooms.push(Object.freeze({ id, x, y, w, h, door: Object.freeze({ x: doorX, y: doorY }) }));
    add("north-1", 12, 1, 10, 7, 17, 8); add("north-2", 28, 1, 10, 7, 33, 8); add("north-3", 44, 1, 10, 7, 49, 8); add("north-4", 60, 1, 8, 7, 64, 8);
    add("south-1", 12, 44, 10, 7, 17, 43); add("south-2", 28, 44, 10, 7, 33, 43); add("south-3", 44, 44, 10, 7, 49, 43); add("south-4", 60, 44, 8, 7, 64, 43);
    add("west-1", 1, 10, 9, 12, 10, 16); add("west-2", 1, 30, 9, 12, 10, 36);
    add("east-1", 70, 10, 9, 12, 69, 16); add("east-2", 70, 30, 9, 12, 69, 36);
    const playerStarts = Object.freeze([{ x: 38, y: 25 }, { x: 41, y: 25 }, { x: 38, y: 28 }, { x: 41, y: 28 }].map(Object.freeze));
    const healthPoints = Object.freeze([{ x: 20, y: 14 }, { x: 40, y: 14 }, { x: 60, y: 14 }, { x: 20, y: 37 }, { x: 40, y: 37 }, { x: 60, y: 37 }, { x: 14, y: 26 }, { x: 65, y: 26 }].map(Object.freeze));
    const cover = Object.freeze([{ x: 27, y: 20 }, { x: 52, y: 20 }, { x: 27, y: 32 }, { x: 52, y: 32 }, { x: 39, y: 18 }, { x: 40, y: 34 }].map(Object.freeze));
    return Object.freeze({ width, height, centre, spawnRooms: Object.freeze(rooms), playerStarts, healthPoints, cover, bossEntrance: Object.freeze({ x: 40, y: 8 }) });
  }

  function weightedKind(wave, random) {
    const total = wave.groups.reduce((sum, group) => sum + group.weight, 0);
    let roll = random() * total;
    for (const group of wave.groups) {
      roll -= group.weight;
      if (roll <= 0) return group.kind;
    }
    return wave.groups[wave.groups.length - 1].kind;
  }

  function chooseSpawnRoom(runState, players, random = Math.random) {
    const rooms = runState.arena.spawnRooms;
    const scored = rooms.map((room, index) => {
      const nearest = Math.min(...players.filter(player => player.status === "active").map(player => distance(room.door, player)), 999);
      const recentlyUsed = runState.spawnHistory.slice(-4).includes(room.id);
      const rotation = (index - runState.spawnCursor + rooms.length) % rooms.length;
      return { room, score: nearest * 10 + rotation - (recentlyUsed ? 1000 : 0) + random() };
    }).sort((a, b) => b.score - a.score);
    const chosen = scored[0].room;
    runState.spawnCursor = (rooms.findIndex(room => room.id === chosen.id) + 1) % rooms.length;
    runState.spawnHistory.push(chosen.id);
    if (runState.spawnHistory.length > 8) runState.spawnHistory.shift();
    return chosen;
  }

  function makePlayer(id, name, start) {
    return {
      id: String(id), name: String(name || "CCG Player").slice(0, 18), x: start.x, y: start.y,
      hp: STARTING_HP, maxHp: STARTING_HP, status: "active", downedAt: 0, downExpiresAt: 0,
      invulnerableUntil: 0, selfReviveAvailable: false, weapons: [], currentWeapon: null,
      kills: 0, revives: 0, damageTaken: 0
    };
  }

  function createRun(options = {}) {
    const ids = Array.isArray(options.players) && options.players.length ? options.players.slice(0, MAX_PLAYERS) : [{ id: "P1", name: "CCG Player" }];
    const arena = createArena();
    const players = ids.map((entry, index) => makePlayer(entry.id || `P${index + 1}`, entry.name, arena.playerStarts[index]));
    return {
      version: 1, mode: MODE_ID, seed: String(options.seed || `HORDE-${Date.now()}`), state: "briefing",
      hostId: String(options.hostId || players[0].id), playerCount: players.length, players, arena,
      wave: 0, waveStartedAt: 0, waveEndsAt: 0, intermissionEndsAt: 0, spawned: 0, defeated: 0,
      activeEnemies: [], spawnCursor: 0, spawnHistory: [], nextEnemyId: 1, score: 0, revives: {},
      health: { active: [], nextSpawnAt: Number(options.now || 0) + 7000, cursor: 0, nextId: 1 },
      boss: null, completedAt: 0, startedAt: Number(options.now || 0), announcer: createAnnouncerState(),
      events: []
    };
  }

  function grantWaveWeapon(runState, level) {
    const unlock = WEAPONS[level - 1];
    if (!unlock) return null;
    for (const player of runState.players) {
      if (!player.weapons.includes(unlock.id)) player.weapons.push(unlock.id);
      player.currentWeapon = unlock.id;
    }
    return unlock;
  }

  function beginWave(runState, level, now) {
    const wave = WAVES[level - 1];
    if (!wave) return false;
    runState.state = level === 10 ? "siege" : "wave";
    runState.wave = level; runState.waveStartedAt = now; runState.waveEndsAt = wave.timedMs ? now + wave.timedMs : 0;
    runState.spawned = 0; runState.defeated = 0; runState.activeEnemies.length = 0;
    const weapon = grantWaveWeapon(runState, level);
    runState.events.push({ type: "wave-start", wave: level, title: wave.title, quota: quotaFor(level, runState.playerCount), at: now });
    runState.events.push({ type: "weapon-unlocked", weapon: copy(weapon), at: now });
    return true;
  }

  function spawnNext(runState, now, random = makeRng(`${runState.seed}|${runState.wave}|${runState.spawned}`)) {
    if (!["wave", "siege"].includes(runState.state)) return null;
    const wave = WAVES[runState.wave - 1], quota = quotaFor(runState.wave, runState.playerCount);
    if (!wave || runState.spawned >= quota || runState.activeEnemies.length >= activeCapFor(runState.playerCount)) return null;
    const room = chooseSpawnRoom(runState, runState.players, random), kind = weightedKind(wave, random), base = ENEMIES[kind];
    const enemy = {
      id: `horde-${runState.wave}-${runState.nextEnemyId++}`, kind, name: base.name, hp: base.hp, maxHp: base.hp,
      damage: base.damage, speed: base.speed, score: base.score, alive: true, spawnRoomId: room.id,
      x: Math.round(room.x + 1 + random() * Math.max(1, room.w - 3)), y: Math.round(room.y + 1 + random() * Math.max(1, room.h - 3)),
      spawnedAt: now, targetId: null
    };
    runState.spawned += 1; runState.activeEnemies.push(enemy);
    runState.events.push({ type: "enemy-spawn", enemy: copy(enemy), at: now });
    return enemy;
  }

  function defeatEnemy(runState, enemyId, playerId, now) {
    const enemy = runState.activeEnemies.find(entry => entry.id === enemyId && entry.alive);
    if (!enemy) return false;
    enemy.alive = false; runState.activeEnemies = runState.activeEnemies.filter(entry => entry.alive);
    runState.defeated += 1; runState.score += enemy.score;
    const player = runState.players.find(entry => entry.id === playerId); if (player) player.kills += 1;
    runState.events.push({ type: "enemy-defeated", enemyId, playerId, score: enemy.score, at: now });
    return true;
  }

  function completeWave(runState, now) {
    const level = runState.wave;
    runState.score += 1000 * level * runState.playerCount;
    if (level >= SOLO_SECOND_WIND_WAVE && runState.playerCount === 1) runState.players[0].selfReviveAvailable = true;
    if (level >= 10) return beginBoss(runState, now);
    runState.state = "intermission"; runState.intermissionEndsAt = now + 12000;
    runState.events.push({ type: "wave-complete", wave: level, at: now });
    return true;
  }

  function beginBoss(runState, now) {
    runState.state = "boss";
    runState.boss = { ...bossStats(runState.playerCount), id: "horde-warden", alive: true, x: runState.arena.bossEntrance.x, y: runState.arena.bossEntrance.y, targetId: null, nextRetargetAt: now, spawnedAt: now };
    runState.events.push({ type: "boss-start", boss: copy(runState.boss), at: now });
    return runState.boss;
  }

  function chooseBossTarget(runState, now, random = Math.random) {
    if (!runState.boss?.alive) return null;
    const candidates = runState.players.filter(player => player.status === "active");
    if (!candidates.length) return null;
    const revivers = new Set(Object.values(runState.revives).map(revive => revive.reviverId));
    const weighted = candidates.flatMap(player => revivers.has(player.id) && random() < 0.35 ? [player, player] : [player]);
    const target = weighted[Math.floor(random() * weighted.length)];
    runState.boss.targetId = target.id;
    runState.boss.nextRetargetAt = now + runState.boss.retargetMinMs + random() * (runState.boss.retargetMaxMs - runState.boss.retargetMinMs);
    return target;
  }

  function damageBoss(runState, amount, playerId, now) {
    if (!runState.boss?.alive) return false;
    runState.boss.hp = Math.max(0, runState.boss.hp - Math.max(0, Number(amount) || 0));
    if (runState.boss.hp > 0) return true;
    runState.boss.alive = false; runState.score += runState.boss.score;
    const elapsed = Math.max(0, now - runState.startedAt), timeBonus = Math.max(0, 300000 - elapsed);
    runState.score += Math.floor(timeBonus / 1000) * 25;
    runState.state = "victory"; runState.completedAt = now;
    runState.events.push({ type: "victory", playerId, at: now });
    return true;
  }

  function applyDamage(runState, playerId, amount, now) {
    const player = runState.players.find(entry => entry.id === playerId);
    if (!player || player.status !== "active" || now < player.invulnerableUntil) return false;
    const damage = Math.max(0, Math.round(Number(amount) || 0));
    player.hp = Math.max(0, player.hp - damage); player.damageTaken += damage;
    if (player.hp > 0) return true;
    if (runState.playerCount === 1 && player.selfReviveAvailable) {
      player.selfReviveAvailable = false; player.status = "second-wind"; player.downedAt = now; player.downExpiresAt = now + 3000;
      runState.events.push({ type: "second-wind", playerId, readyAt: player.downExpiresAt, at: now });
      return true;
    }
    player.status = "downed"; player.downedAt = now; player.downExpiresAt = now + DOWNED_MS;
    runState.events.push({ type: "player-down", playerId, expiresAt: player.downExpiresAt, at: now });
    return true;
  }

  function startRevive(runState, reviverId, targetId, now) {
    const reviver = runState.players.find(player => player.id === reviverId), target = runState.players.find(player => player.id === targetId);
    if (!reviver || !target || reviver.id === target.id || reviver.status !== "active" || target.status !== "downed" || distance(reviver, target) > REVIVE_DISTANCE) return false;
    runState.revives[targetId] = { reviverId, targetId, startedAt: now, completesAt: now + REVIVE_MS, origin: { x: reviver.x, y: reviver.y } };
    runState.events.push({ type: "revive-start", reviverId, targetId, completesAt: now + REVIVE_MS, at: now });
    return true;
  }

  function cancelRevive(runState, targetId, reason, now) {
    const revive = runState.revives[targetId]; if (!revive) return false;
    delete runState.revives[targetId]; runState.events.push({ type: "revive-cancel", ...revive, reason, at: now }); return true;
  }

  function tickRevives(runState, now, options = {}) {
    const damaged = new Set(options.damagedReviverIds || []);
    for (const [targetId, revive] of Object.entries(runState.revives)) {
      const reviver = runState.players.find(player => player.id === revive.reviverId), target = runState.players.find(player => player.id === targetId);
      if (!reviver || !target || reviver.status !== "active" || target.status !== "downed") { cancelRevive(runState, targetId, "invalid", now); continue; }
      if (damaged.has(reviver.id)) { cancelRevive(runState, targetId, "damaged", now); continue; }
      if (distance(reviver, target) > REVIVE_DISTANCE || distance(reviver, revive.origin) > 0.2) { cancelRevive(runState, targetId, "moved", now); continue; }
      runState.events.push({ type: "revive-progress", reviverId: reviver.id, targetId, remainingMs: Math.max(0, revive.completesAt - now), at: now });
      if (now < revive.completesAt) continue;
      target.status = "active"; target.hp = REVIVE_HP; target.invulnerableUntil = now + REVIVE_GRACE_MS; target.downedAt = target.downExpiresAt = 0;
      reviver.revives += 1; runState.score += 500; delete runState.revives[targetId];
      runState.events.push({ type: "revive-complete", reviverId: reviver.id, targetId, hp: REVIVE_HP, at: now });
    }
  }

  function tickDowned(runState, now) {
    for (const player of runState.players) {
      if (player.status === "second-wind" && now >= player.downExpiresAt) {
        player.status = "active"; player.hp = REVIVE_HP; player.invulnerableUntil = now + REVIVE_GRACE_MS; player.downedAt = player.downExpiresAt = 0;
        runState.events.push({ type: "second-wind-complete", playerId: player.id, hp: REVIVE_HP, at: now });
      } else if (player.status === "downed" && now >= player.downExpiresAt) {
        player.status = "eliminated"; delete runState.revives[player.id]; runState.events.push({ type: "player-eliminated", playerId: player.id, at: now });
      }
    }
    if (!runState.players.some(player => ["active", "second-wind"].includes(player.status))) {
      runState.state = "defeat"; runState.completedAt = now; runState.events.push({ type: "defeat", at: now });
    }
  }

  function healthSpawnDelay(runState) {
    const active = runState.players.filter(player => player.status === "active"), missing = active.reduce((sum, player) => sum + player.maxHp - player.hp, 0);
    const capacity = active.reduce((sum, player) => sum + player.maxHp, 0) || STARTING_HP;
    const need = missing / capacity;
    return need >= 0.6 ? 4000 : need >= 0.35 ? 7000 : need >= 0.15 ? 10000 : 13000;
  }

  function tickHealth(runState, now) {
    const maxGround = Math.min(8, 2 + runState.playerCount);
    if (now < runState.health.nextSpawnAt || runState.health.active.length >= maxGround) return null;
    const injured = runState.players.some(player => player.status === "active" && player.hp < player.maxHp);
    if (!injured && runState.health.active.length >= 1) { runState.health.nextSpawnAt = now + 13000; return null; }
    const point = runState.arena.healthPoints[runState.health.cursor++ % runState.arena.healthPoints.length];
    const pickup = { id: `horde-health-${runState.health.nextId++}`, x: point.x, y: point.y, restore: 3, spawnedAt: now };
    runState.health.active.push(pickup); runState.health.nextSpawnAt = now + healthSpawnDelay(runState);
    runState.events.push({ type: "health-spawn", pickup: copy(pickup), at: now }); return pickup;
  }

  function collectHealth(runState, pickupId, playerId, now) {
    const player = runState.players.find(entry => entry.id === playerId), index = runState.health.active.findIndex(entry => entry.id === pickupId);
    if (!player || player.status !== "active" || index < 0 || player.hp >= player.maxHp) return false;
    const pickup = runState.health.active[index]; runState.health.active.splice(index, 1);
    player.hp = Math.min(player.maxHp, player.hp + pickup.restore); runState.events.push({ type: "health-collected", playerId, pickupId, hp: player.hp, at: now }); return true;
  }

  function tick(runState, now, options = {}) {
    if (!runState || ["victory", "defeat"].includes(runState.state)) return runState;
    tickRevives(runState, now, options); tickDowned(runState, now); if (runState.state === "defeat") return runState;
    tickHealth(runState, now);
    if (runState.state === "briefing" && now - runState.startedAt >= 3000) beginWave(runState, 1, now);
    else if (runState.state === "intermission" && now >= runState.intermissionEndsAt) beginWave(runState, runState.wave + 1, now);
    else if (runState.state === "wave") {
      const quota = quotaFor(runState.wave, runState.playerCount);
      if (runState.defeated >= quota && runState.activeEnemies.length === 0) completeWave(runState, now);
    } else if (runState.state === "siege") {
      if (now >= runState.waveEndsAt && runState.spawned >= quotaFor(10, runState.playerCount) && runState.activeEnemies.length === 0) completeWave(runState, now);
    } else if (runState.state === "boss" && runState.boss?.alive && now >= runState.boss.nextRetargetAt) chooseBossTarget(runState, now, options.random || Math.random);
    return runState;
  }

  function createAnnouncerState() { return { busyUntil: 0, lastPlayed: {}, current: null }; }

  function tryAnnounce(runState, eventId, now, durationMs = 2500, cooldownMs = 0) {
    const line = VOICE[eventId]; if (!line || now < runState.announcer.busyUntil) return null;
    const last = Number(runState.announcer.lastPlayed[eventId] || -Infinity); if (now - last < cooldownMs) return null;
    runState.announcer.busyUntil = now + Math.max(250, durationMs); runState.announcer.lastPlayed[eventId] = now; runState.announcer.current = eventId;
    const announcement = { type: "voice", id: eventId, line, at: now, endsAt: runState.announcer.busyUntil };
    runState.events.push(announcement); return announcement;
  }

  function drainEvents(runState) { const events = runState.events.splice(0); return events; }

  function leaderboardCategory(count) { return ["", "SOLO", "DUO", "TRIO", "SQUAD"][playerCount(count)]; }

  function leaderboardResult(runState) {
    const ended = runState.completedAt || Date.now();
    return {
      mode: MODE_ID, category: leaderboardCategory(runState.playerCount), playerCount: runState.playerCount,
      players: runState.players.map(player => ({ id: player.id, name: player.name, kills: player.kills, revives: player.revives })),
      score: Math.max(0, Math.floor(runState.score)), highestWave: runState.wave, bossDefeated: runState.state === "victory",
      completionMs: Math.max(0, ended - runState.startedAt), revives: runState.players.reduce((sum, player) => sum + player.revives, 0),
      seed: runState.seed, completedAt: ended
    };
  }

  function publicState(runState) {
    return copy({ ...runState, announcer: undefined, events: undefined });
  }

  return Object.freeze({
    MODE_ID, MAX_PLAYERS, STARTING_HP, REVIVE_MS, DOWNED_MS, REVIVE_DISTANCE, REVIVE_HP, REVIVE_GRACE_MS,
    SOLO_SECOND_WIND_WAVE, PLAYER_SCALE, ACTIVE_SCALE, AUDIO, ENEMIES, WEAPONS, WAVES, VOICE,
    hash32, makeRng, quotaFor, activeCapFor, bossStats, createArena, createRun, beginWave, spawnNext, defeatEnemy,
    completeWave, beginBoss, chooseBossTarget, damageBoss, applyDamage, startRevive, cancelRevive, tickRevives,
    tickDowned, healthSpawnDelay, tickHealth, collectHealth, tick, tryAnnounce, drainEvents,
    leaderboardCategory, leaderboardResult, publicState
  });
});
