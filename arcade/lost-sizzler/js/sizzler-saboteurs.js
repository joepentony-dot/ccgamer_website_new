/* The Lost Sizzler — Sizzler Saboteurs rules engine.
 * Two-player, best-of-five search, sabotage and extraction mode.
 * This file is additive and does not alter the live dungeon until its adapter is loaded.
 */
(function installSizzlerSaboteurs(root, factory) {
  "use strict";
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.CCGLostSizzlerSaboteurs = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function createSaboteursApi() {
  "use strict";

  const MODE_ID = "sizzler-saboteurs";
  const MODE_NAME = "Sizzler Saboteurs";
  const TAGLINE = "TRAPS • TREACHERY • TERRIBLE WEAPONS";
  const PLAYER_COUNT = 2;
  const BEST_OF = 5;
  const ROUNDS_TO_WIN = 3;
  const ROUND_MS = 240000;
  const RESPAWN_MS = 6000;
  const SUDDEN_DEATH_MS = 60000;
  const EXTRACTION_MS = 3000;
  const STARTING_HP = 6;
  const TRAPS_PER_ROUND = 3;
  const LIGHT_RADIUS = 5;
  const CAMP_WARNING_MS = 20000;
  const NO_MINIMAP = true;

  const AUDIO = Object.freeze({
    theme: "assets/audio/music/sizzler-saboteurs-theme.ogg",
    baseVolume: 0.14,
    duckedVolume: 0.055,
    maximumVolume: 0.18,
    fadeInMs: 900,
    fadeOutMs: 600,
    loop: true
  });

  const IDENTITIES = Object.freeze([
    Object.freeze({ slot: 1, colour: "#26e8ff", shadow: "#075d8b", emblem: "square", label: "CYAN AGENT" }),
    Object.freeze({ slot: 2, colour: "#ff3ca6", shadow: "#7c174f", emblem: "triangle", label: "MAGENTA AGENT" })
  ]);

  const OBJECTIVES = Object.freeze([
    Object.freeze({ id: "case", name: "Sizzler Case", required: true }),
    Object.freeze({ id: "joystick", name: "Golden Joystick", required: true }),
    Object.freeze({ id: "tape", name: "Secret Loading Tape", required: true }),
    Object.freeze({ id: "key", name: "Dungeon Key", required: true })
  ]);

  const WEAPONS = Object.freeze({
    chicken: Object.freeze({ id: "chicken", name: "Rubber Chicken", uses: 5, damage: 1, knockback: 2, effect: "squeak" }),
    glove: Object.freeze({ id: "glove", name: "Spring Boxing Glove", uses: 2, damage: 1, knockback: 4, effect: "launch" }),
    pie: Object.freeze({ id: "pie", name: "Custard Pie", uses: 2, damage: 0, knockback: 1, effect: "obscure", effectMs: 2600 }),
    tangler: Object.freeze({ id: "tangler", name: "Datasette Tangler", uses: 2, damage: 0, knockback: 0, effect: "slow", effectMs: 3200 }),
    brick: Object.freeze({ id: "brick", name: "Power-Brick Tosser", uses: 1, damage: 2, knockback: 3, effect: "drop" }),
    joystick: Object.freeze({ id: "joystick", name: "Faulty Joystick", uses: 3, damage: 1, knockback: 1, effect: "wobble" }),
    decoy: Object.freeze({ id: "decoy", name: "Inflatable Death Stalker", uses: 1, damage: 0, knockback: 0, effect: "decoy", effectMs: 9000 }),
    zapper: Object.freeze({ id: "zapper", name: "Golden Zapper", uses: 2, damage: 2, knockback: 2, effect: "flash", effectMs: 900 })
  });

  const TRAPS = Object.freeze({
    spring: Object.freeze({ id: "spring", name: "Spring-Loaded Joystick", locations: Object.freeze(["furniture"]), effect: "launch", damage: 1, counter: "screwdriver" }),
    snare: Object.freeze({ id: "snare", name: "Datasette Snare", locations: Object.freeze(["furniture", "floor"]), effect: "slow", damage: 0, effectMs: 3500, counter: "scissors" }),
    custard: Object.freeze({ id: "custard", name: "Custard Bucket", locations: Object.freeze(["door"]), effect: "obscure-reveal", damage: 0, effectMs: 2800, counter: "raincoat" }),
    powerBrick: Object.freeze({ id: "powerBrick", name: "Exploding Power Brick", locations: Object.freeze(["furniture"]), effect: "blast", damage: 2, counter: "fusePuller" }),
    fakeHealth: Object.freeze({ id: "fakeHealth", name: "Fake Health Pack", locations: Object.freeze(["floor"]), effect: "reveal", damage: 0, effectMs: 4000, counter: "scanner" }),
    timeBomb: Object.freeze({ id: "timeBomb", name: "C64 Time Bomb", locations: Object.freeze(["floor"]), effect: "timed-blast", damage: 3, fuseMs: 10000, counter: null, oncePerMatch: true })
  });

  const COUNTERS = Object.freeze({
    screwdriver: Object.freeze({ id: "screwdriver", name: "Screwdriver", counters: "spring" }),
    scissors: Object.freeze({ id: "scissors", name: "Scissors", counters: "snare" }),
    raincoat: Object.freeze({ id: "raincoat", name: "Raincoat", counters: "custard" }),
    fusePuller: Object.freeze({ id: "fusePuller", name: "Fuse Puller", counters: "powerBrick" }),
    scanner: Object.freeze({ id: "scanner", name: "Trap Scanner", counters: "fakeHealth" })
  });

  const MODIFIERS = Object.freeze([
    Object.freeze({ id: "standard", name: "STANDARD DOUBLE-CROSS", lightDelta: 0, trapDelta: 0, noiseScale: 1 }),
    Object.freeze({ id: "power-cut", name: "POWER CUT", lightDelta: -1, trapDelta: 0, noiseScale: 1 }),
    Object.freeze({ id: "loaded-furniture", name: "LOADED FURNITURE", lightDelta: 0, trapDelta: 0, weaponDensity: 1.5, noiseScale: 1 }),
    Object.freeze({ id: "thin-walls", name: "THIN WALLS", lightDelta: 0, trapDelta: 0, noiseScale: 1.6 }),
    Object.freeze({ id: "sticky-fingers", name: "STICKY FINGERS", lightDelta: 0, trapDelta: 0, scatterDrops: true, noiseScale: 1 }),
    Object.freeze({ id: "trap-happy", name: "TRAP HAPPY", lightDelta: 0, trapDelta: 1, noiseScale: 1 }),
    Object.freeze({ id: "last-laugh", name: "LAST LAUGH", lightDelta: 0, trapDelta: 0, noRespawnFinalMs: 60000, noiseScale: 1 })
  ]);

  const VOICE = Object.freeze({
    matchStart: "Sizzler Saboteurs.", round1: "Round one. Play dirty.", round2: "Round two.",
    round3: "Round three. Someone is getting smug.", round4: "Round four.", finalRound: "Final round.",
    trapArmed: "Trap armed.", caseFound: "Someone has found the case.", caseDropped: "The case has been dropped.",
    extraction: "Extraction has started.", thirtySeconds: "Thirty seconds remaining.", suddenDeath: "Sudden death.",
    knockout: "That was embarrassing.", matchWon: "Match won."
  });

  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const copy = value => JSON.parse(JSON.stringify(value));
  const roomKey = (x, y) => `${x},${y}`;

  function hash32(value) {
    let hash = 2166136261 >>> 0;
    for (const char of String(value || "")) { hash ^= char.charCodeAt(0); hash = Math.imul(hash, 16777619); }
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

  function shuffle(list, random) {
    const result = [...list];
    for (let i = result.length - 1; i > 0; i -= 1) { const j = Math.floor(random() * (i + 1)); [result[i], result[j]] = [result[j], result[i]]; }
    return result;
  }

  function neighbours(cell, columns, rows) {
    return [[1, 0], [-1, 0], [0, 1], [0, -1]].map(([dx, dy]) => ({ x: cell.x + dx, y: cell.y + dy })).filter(entry => entry.x >= 0 && entry.y >= 0 && entry.x < columns && entry.y < rows);
  }

  function graphDistance(map, fromId, toId) {
    if (fromId === toId) return 0;
    const queue = [{ id: fromId, distance: 0 }], visited = new Set([fromId]);
    while (queue.length) {
      const current = queue.shift();
      for (const edge of map.edges) {
        const next = edge.a === current.id ? edge.b : edge.b === current.id ? edge.a : null;
        if (!next || visited.has(next)) continue;
        if (next === toId) return current.distance + 1;
        visited.add(next); queue.push({ id: next, distance: current.distance + 1 });
      }
    }
    return Infinity;
  }

  function connected(map) {
    if (!map.rooms.length) return false;
    return map.rooms.every(room => Number.isFinite(graphDistance(map, map.rooms[0].id, room.id)));
  }

  function createMap(seed, roundNumber = 1) {
    const random = makeRng(`${seed}|ROUND-${roundNumber}|MAP`), columns = 6, rows = 5;
    const target = clamp(20 + (roundNumber - 1) * 2, 20, 28);
    const selected = new Map(), frontier = [];
    const start = { x: Math.floor(columns / 2), y: Math.floor(rows / 2) };
    selected.set(roomKey(start.x, start.y), start); frontier.push(...shuffle(neighbours(start, columns, rows), random));
    while (selected.size < target && frontier.length) {
      const cell = frontier.splice(Math.floor(random() * frontier.length), 1)[0], key = roomKey(cell.x, cell.y);
      if (selected.has(key)) continue;
      if (!neighbours(cell, columns, rows).some(entry => selected.has(roomKey(entry.x, entry.y)))) continue;
      selected.set(key, cell);
      for (const next of shuffle(neighbours(cell, columns, rows), random)) if (!selected.has(roomKey(next.x, next.y))) frontier.push(next);
    }
    const cells = [...selected.values()];
    const rooms = cells.map((cell, index) => ({
      id: `room-${index + 1}`, gridX: cell.x, gridY: cell.y, x: cell.x * 12 + 2, y: cell.y * 10 + 2,
      w: 8 + Math.floor(random() * 3), h: 7 + Math.floor(random() * 2), furniture: [], extraction: false, spawn: null
    }));
    const byCell = new Map(rooms.map(room => [roomKey(room.gridX, room.gridY), room]));
    const edges = [], edgeSet = new Set(), linked = new Set([rooms[0].id]), pending = rooms.slice(1);
    while (pending.length) {
      let linkedRoom = null, unlinkedRoom = null;
      for (const room of shuffle([...linked].map(id => rooms.find(entry => entry.id === id)), random)) {
        const choices = shuffle(neighbours({ x: room.gridX, y: room.gridY }, columns, rows).map(cell => byCell.get(roomKey(cell.x, cell.y))).filter(Boolean).filter(entry => !linked.has(entry.id)), random);
        if (choices.length) { linkedRoom = room; unlinkedRoom = choices[0]; break; }
      }
      if (!linkedRoom || !unlinkedRoom) break;
      const key = [linkedRoom.id, unlinkedRoom.id].sort().join("|"); edgeSet.add(key); edges.push({ id: `door-${edges.length + 1}`, a: linkedRoom.id, b: unlinkedRoom.id, trappedBy: null }); linked.add(unlinkedRoom.id);
      pending.splice(pending.findIndex(room => room.id === unlinkedRoom.id), 1);
    }
    for (const room of rooms) for (const cell of neighbours({ x: room.gridX, y: room.gridY }, columns, rows)) {
      const other = byCell.get(roomKey(cell.x, cell.y)); if (!other || room.id === other.id || random() > 0.32) continue;
      const key = [room.id, other.id].sort().join("|"); if (edgeSet.has(key)) continue;
      edgeSet.add(key); edges.push({ id: `door-${edges.length + 1}`, a: room.id, b: other.id, trappedBy: null });
    }
    const spawnA = rooms.reduce((best, room) => room.gridX + room.gridY < best.gridX + best.gridY ? room : best, rooms[0]);
    const spawnB = rooms.reduce((best, room) => graphDistance({ rooms, edges }, spawnA.id, room.id) > graphDistance({ rooms, edges }, spawnA.id, best.id) ? room : best, rooms[0]);
    const extraction = rooms.filter(room => room.id !== spawnA.id && room.id !== spawnB.id).sort((a, b) => Math.min(graphDistance({ rooms, edges }, spawnA.id, b.id), graphDistance({ rooms, edges }, spawnB.id, b.id)) - Math.min(graphDistance({ rooms, edges }, spawnA.id, a.id), graphDistance({ rooms, edges }, spawnB.id, a.id)))[0];
    spawnA.spawn = 1; spawnB.spawn = 2; extraction.extraction = true;
    const furnitureTypes = ["desk", "bookcase", "cupboard", "barrel", "painting", "cabinet"];
    for (const room of rooms) for (let index = 0; index < 2 + Math.floor(random() * 3); index += 1) room.furniture.push({ id: `${room.id}-f${index + 1}`, type: furnitureTypes[Math.floor(random() * furnitureTypes.length)], searched: false, trappedBy: null, contents: null });
    return { seed, roundNumber, width: columns * 12 + 4, height: rows * 10 + 4, rooms, edges, spawnRoomIds: [spawnA.id, spawnB.id], extractionRoomId: extraction.id, noMinimap: true };
  }

  function distributeContents(map, seed) {
    const random = makeRng(`${seed}|CONTENTS`), safeRooms = map.rooms.filter(room => !room.spawn && !room.extraction), furniture = shuffle(safeRooms.flatMap(room => room.furniture.map(item => ({ room, item }))), random);
    const contents = ["case", "joystick", "tape", "key", ...shuffle(Object.keys(WEAPONS), random).slice(0, 6).map(id => `weapon:${id}`), ...shuffle(Object.keys(COUNTERS), random).map(id => `counter:${id}`)];
    contents.forEach((content, index) => { if (furniture[index]) furniture[index].item.contents = content; });
    return map;
  }

  function makePlayer(slot, entry, spawnRoomId) {
    const identity = IDENTITIES[slot - 1];
    return {
      id: String(entry?.id || `P${slot}`), name: String(entry?.name || `Player ${slot}`).slice(0, 18), slot,
      colour: identity.colour, shadow: identity.shadow, emblem: identity.emblem, roomId: spawnRoomId,
      hp: STARTING_HP, maxHp: STARTING_HP, status: "active", respawnAt: 0, invulnerableUntil: 0,
      hasCase: false, objectives: [], looseItem: null, weapon: null, counter: null, trapCharges: TRAPS_PER_ROUND,
      timeBombUsed: false, effects: {}, knockouts: 0, trapHits: 0, searches: 0, roomEnteredAt: 0, revealedUntil: 0
    };
  }

  function modifierFor(seed, roundNumber) {
    if (roundNumber === BEST_OF) return MODIFIERS.find(modifier => modifier.id === "last-laugh");
    const random = makeRng(`${seed}|ROUND-${roundNumber}|MODIFIER`);
    return MODIFIERS[Math.floor(random() * (MODIFIERS.length - 1))];
  }

  function trapLoadout(seed, roundNumber) {
    const random = makeRng(`${seed}|ROUND-${roundNumber}|TRAPS`);
    const ordinary = shuffle(Object.keys(TRAPS).filter(id => id !== "timeBomb"), random).slice(0, 3);
    if (roundNumber >= 3) ordinary[2] = "timeBomb";
    return ordinary;
  }

  function createMatch(options = {}) {
    const entries = Array.isArray(options.players) ? options.players.slice(0, 2) : [];
    while (entries.length < 2) entries.push({ id: `P${entries.length + 1}`, name: `Player ${entries.length + 1}` });
    return {
      version: 1, mode: MODE_ID, name: MODE_NAME, seed: String(options.seed || `SABOTEURS-${Date.now()}`),
      hostId: String(options.hostId || entries[0].id || "P1"), state: "splash", bestOf: BEST_OF, roundsToWin: ROUNDS_TO_WIN,
      round: 0, roundStartedAt: 0, roundEndsAt: 0, suddenDeathEndsAt: 0, roundWinnerId: null, matchWinnerId: null,
      wins: { [String(entries[0].id || "P1")]: 0, [String(entries[1].id || "P2")]: 0 }, players: [], entries: copy(entries),
      map: null, modifier: null, traps: [], trapLoadout: [], looseObjects: [], extraction: null, noise: [], events: [],
      announcer: { busyUntil: 0, lastPlayed: {}, current: null }, startedAt: Number(options.now || 0), completedAt: 0
    };
  }

  function beginRound(match, now) {
    if (["match-complete", "abandoned"].includes(match.state) || match.round >= BEST_OF) return false;
    match.round += 1; match.state = "playing"; match.roundStartedAt = now; match.roundEndsAt = now + ROUND_MS;
    match.roundWinnerId = null; match.modifier = modifierFor(match.seed, match.round); match.trapLoadout = trapLoadout(match.seed, match.round);
    match.map = distributeContents(createMap(match.seed, match.round), `${match.seed}|ROUND-${match.round}`);
    match.players = match.entries.map((entry, index) => makePlayer(index + 1, entry, match.map.spawnRoomIds[index]));
    const charges = TRAPS_PER_ROUND + Number(match.modifier.trapDelta || 0); for (const player of match.players) player.trapCharges = charges;
    match.traps = []; match.looseObjects = []; match.extraction = null; match.noise = [];
    match.events.push({ type: "round-start", round: match.round, modifier: copy(match.modifier), trapLoadout: [...match.trapLoadout], endsAt: match.roundEndsAt, at: now });
    return true;
  }

  function playerById(match, playerId) { return match.players.find(player => player.id === playerId); }
  function roomById(match, roomId) { return match.map?.rooms.find(room => room.id === roomId); }
  function carriedCount(player) { return player.objectives.length + (player.looseItem && ["joystick", "tape", "key"].includes(player.looseItem) ? 1 : 0); }
  function hasCompleteCase(player) { return Boolean(player.hasCase && ["joystick", "tape", "key"].every(id => player.objectives.includes(id))); }

  function movePlayer(match, playerId, roomId, now) {
    const player = playerById(match, playerId); if (!player || player.status !== "active") return false;
    const edge = match.map.edges.find(entry => (entry.a === player.roomId && entry.b === roomId) || (entry.b === player.roomId && entry.a === roomId));
    if (!edge) return false;
    player.roomId = roomId; player.roomEnteredAt = now; match.events.push({ type: "player-moved", playerId, roomId, doorId: edge.id, at: now });
    triggerTrap(match, playerId, { type: "door", id: edge.id, roomId }, now); return true;
  }

  function searchFurniture(match, playerId, furnitureId, now) {
    const player = playerById(match, playerId), room = roomById(match, player?.roomId), furniture = room?.furniture.find(item => item.id === furnitureId);
    if (!player || player.status !== "active" || !furniture) return false;
    player.searches += 1; emitNoise(match, player.roomId, playerId, "search", 1, now);
    if (triggerTrap(match, playerId, { type: "furniture", id: furnitureId, roomId: room.id }, now)) return { trapped: true };
    if (furniture.searched || !furniture.contents) return { empty: true };
    furniture.searched = true; const content = furniture.contents; furniture.contents = null;
    if (content.startsWith("weapon:")) { const weapon = WEAPONS[content.split(":")[1]]; player.weapon = { ...weapon }; match.events.push({ type: "weapon-found", playerId, weapon: copy(player.weapon), at: now }); return { weapon: copy(player.weapon) }; }
    if (content.startsWith("counter:")) { const counter = COUNTERS[content.split(":")[1]]; player.counter = counter.id; match.events.push({ type: "counter-found", playerId, counter: counter.id, at: now }); return { counter: counter.id }; }
    collectObjective(match, playerId, content, now); return { objective: content };
  }

  function collectObjective(match, playerId, objectiveId, now) {
    const player = playerById(match, playerId); if (!player || !OBJECTIVES.some(item => item.id === objectiveId)) return false;
    if (objectiveId === "case") {
      if (player.hasCase) return false; player.hasCase = true;
      if (player.looseItem && ["joystick", "tape", "key"].includes(player.looseItem)) { player.objectives.push(player.looseItem); player.looseItem = null; }
      match.events.push({ type: "case-found", playerId, at: now }); return true;
    }
    if (player.hasCase) { if (!player.objectives.includes(objectiveId)) player.objectives.push(objectiveId); }
    else if (!player.looseItem) player.looseItem = objectiveId;
    else { match.looseObjects.push({ id: `loose-${objectiveId}-${now}`, objectiveId, roomId: player.roomId }); return false; }
    match.events.push({ type: "objective-found", playerId, objectiveId, complete: hasCompleteCase(player), at: now }); return true;
  }

  function placeTrap(match, playerId, trapId, target, now) {
    const player = playerById(match, playerId), trap = TRAPS[trapId], room = roomById(match, player?.roomId);
    if (!player || player.status !== "active" || !trap || !match.trapLoadout.includes(trapId) || player.trapCharges <= 0 || !room || room.spawn || room.extraction) return false;
    if (!trap.locations.includes(target?.type)) return false;
    if (match.traps.some(entry => entry.roomId === room.id && entry.armed)) return false;
    if (trap.oncePerMatch && player.timeBombUsed) return false;
    const placed = { id: `trap-${match.round}-${match.traps.length + 1}`, trapId, ownerId: player.id, roomId: room.id, targetType: target.type, targetId: target.id || null, armed: true, placedAt: now, detonatesAt: trap.fuseMs ? now + trap.fuseMs : 0 };
    match.traps.push(placed); player.trapCharges -= 1; if (trap.oncePerMatch) player.timeBombUsed = true;
    match.events.push({ type: "trap-armed", playerId, trap: copy(placed), at: now }); emitNoise(match, room.id, playerId, "trap-armed", 0.6, now); return placed;
  }

  function disarmTrap(match, playerId, trapId, now) {
    const player = playerById(match, playerId), placed = match.traps.find(entry => entry.id === trapId && entry.armed), trap = TRAPS[placed?.trapId];
    if (!player || !placed || player.roomId !== placed.roomId || !trap?.counter || player.counter !== trap.counter) return false;
    placed.armed = false; player.counter = null; match.events.push({ type: "trap-disarmed", playerId, trapId, at: now }); return true;
  }

  function triggerTrap(match, playerId, target, now) {
    const player = playerById(match, playerId); if (!player || player.status !== "active") return false;
    const placed = match.traps.find(entry => entry.armed && entry.roomId === player.roomId && entry.targetType === target.type && (entry.targetId === null || entry.targetId === target.id));
    if (!placed) return false; const trap = TRAPS[placed.trapId];
    if (trap.counter && player.counter === trap.counter) return Boolean(disarmTrap(match, playerId, placed.id, now));
    placed.armed = false; const owner = playerById(match, placed.ownerId); if (owner && owner.id !== player.id) owner.trapHits += 1;
    applyEffect(player, trap.effect, trap.effectMs || 0, now); if (trap.damage) damagePlayer(match, player.id, trap.damage, placed.ownerId, now, `trap:${trap.id}`);
    if (["launch", "blast"].includes(trap.effect)) dropCarried(match, player.id, now, true);
    player.revealedUntil = Math.max(player.revealedUntil, now + (trap.effect.includes("reveal") ? trap.effectMs || 4000 : 0));
    match.events.push({ type: "trap-triggered", trapId: placed.id, trapType: trap.id, ownerId: placed.ownerId, victimId: player.id, selfTriggered: placed.ownerId === player.id, at: now });
    emitNoise(match, player.roomId, player.id, "trap", trap.id === "timeBomb" ? 3 : 2, now); return true;
  }

  function applyEffect(player, effect, duration, now) { if (duration > 0) player.effects[effect] = now + duration; }

  function useWeapon(match, attackerId, targetId, now) {
    const attacker = playerById(match, attackerId), target = playerById(match, targetId);
    if (!attacker || !target || attacker.status !== "active" || target.status !== "active" || attacker.roomId !== target.roomId) return false;
    const weapon = attacker.weapon || { id: "melee", name: "Rolled-Up Rulebook", uses: Infinity, damage: 1, knockback: 1, effect: "bonk" };
    if (weapon.uses <= 0) return false; if (Number.isFinite(weapon.uses)) weapon.uses -= 1;
    applyEffect(target, weapon.effect, weapon.effectMs || 0, now); if (weapon.effect === "drop") dropCarried(match, target.id, now, false);
    if (weapon.damage > 0) damagePlayer(match, target.id, weapon.damage, attacker.id, now, `weapon:${weapon.id}`);
    emitNoise(match, attacker.roomId, attacker.id, "weapon", weapon.id === "zapper" ? 2.5 : 1.5, now);
    match.events.push({ type: "weapon-used", attackerId, targetId, weaponId: weapon.id, remainingUses: weapon.uses, at: now }); return true;
  }

  function damagePlayer(match, playerId, amount, attackerId, now, source) {
    const player = playerById(match, playerId); if (!player || player.status !== "active" || now < player.invulnerableUntil) return false;
    player.hp = Math.max(0, player.hp - Math.max(0, Math.round(Number(amount) || 0)));
    if (player.hp > 0) return true;
    knockout(match, playerId, attackerId, now, source); return true;
  }

  function dropCarried(match, playerId, now, scatter) {
    const player = playerById(match, playerId); if (!player) return [];
    const dropped = [];
    if (player.hasCase) { dropped.push({ objectiveId: "case", roomId: player.roomId }); player.hasCase = false; }
    for (const objectiveId of player.objectives.splice(0)) dropped.push({ objectiveId, roomId: player.roomId });
    if (player.looseItem) { dropped.push({ objectiveId: player.looseItem, roomId: player.roomId }); player.looseItem = null; }
    for (const item of dropped) match.looseObjects.push({ id: `loose-${item.objectiveId}-${now}-${match.looseObjects.length}`, ...item, scattered: Boolean(scatter) });
    if (dropped.some(item => item.objectiveId === "case")) match.events.push({ type: "case-dropped", playerId, roomId: player.roomId, at: now });
    return dropped;
  }

  function knockout(match, playerId, attackerId, now, source) {
    const player = playerById(match, playerId); if (!player || player.status !== "active") return false;
    dropCarried(match, playerId, now, Boolean(match.modifier?.scatterDrops)); player.status = "knocked-out"; player.hp = 0;
    const noRespawn = match.state === "sudden-death" || (match.modifier?.noRespawnFinalMs && match.roundEndsAt - now <= match.modifier.noRespawnFinalMs);
    player.respawnAt = noRespawn ? Infinity : now + RESPAWN_MS; const attacker = playerById(match, attackerId); if (attacker && attacker.id !== player.id) attacker.knockouts += 1;
    match.events.push({ type: "knockout", playerId, attackerId, source, respawnAt: player.respawnAt, at: now });
    if (noRespawn) { const survivor = match.players.find(entry => entry.status === "active"); if (survivor) awardRound(match, survivor.id, now, "last-agent-standing"); }
    return true;
  }

  function respawnPlayers(match, now) {
    for (const player of match.players) if (player.status === "knocked-out" && now >= player.respawnAt) {
      player.status = "active"; player.hp = player.maxHp; player.roomId = match.map.spawnRoomIds[player.slot - 1]; player.invulnerableUntil = now + 1800; player.roomEnteredAt = now; player.weapon = null;
      match.events.push({ type: "respawn", playerId: player.id, roomId: player.roomId, at: now });
    }
  }

  function collectLoose(match, playerId, looseId, now) {
    const player = playerById(match, playerId), index = match.looseObjects.findIndex(item => item.id === looseId && item.roomId === player?.roomId);
    if (!player || player.status !== "active" || index < 0) return false;
    const item = match.looseObjects[index]; if (!collectObjective(match, playerId, item.objectiveId, now)) return false;
    match.looseObjects.splice(index, 1); return true;
  }

  function beginExtraction(match, playerId, now) {
    const player = playerById(match, playerId); if (!player || player.status !== "active" || player.roomId !== match.map.extractionRoomId || !hasCompleteCase(player)) return false;
    match.extraction = { playerId, startedAt: now, completesAt: now + EXTRACTION_MS };
    match.events.push({ type: "extraction-start", playerId, completesAt: now + EXTRACTION_MS, at: now }); emitNoise(match, player.roomId, player.id, "extraction", 4, now); return true;
  }

  function tickExtraction(match, now) {
    const attempt = match.extraction; if (!attempt) return false; const player = playerById(match, attempt.playerId);
    if (!player || player.status !== "active" || player.roomId !== match.map.extractionRoomId || !hasCompleteCase(player)) { match.extraction = null; match.events.push({ type: "extraction-cancelled", playerId: attempt.playerId, at: now }); return false; }
    if (now < attempt.completesAt) return false; awardRound(match, player.id, now, "extraction"); return true;
  }

  function awardRound(match, playerId, now, reason) {
    if (!["playing", "sudden-death"].includes(match.state)) return false;
    match.roundWinnerId = playerId; match.wins[playerId] = Number(match.wins[playerId] || 0) + 1; match.state = "round-complete"; match.extraction = null;
    match.events.push({ type: "round-won", playerId, round: match.round, reason, wins: match.wins[playerId], at: now });
    if (match.wins[playerId] >= ROUNDS_TO_WIN) { match.state = "match-complete"; match.matchWinnerId = playerId; match.completedAt = now; match.events.push({ type: "match-won", playerId, at: now }); }
    return true;
  }

  function startSuddenDeath(match, now) {
    match.state = "sudden-death"; match.suddenDeathEndsAt = now + SUDDEN_DEATH_MS; match.extraction = null;
    for (const player of match.players) { player.status = "active"; player.hp = player.maxHp; player.respawnAt = Infinity; dropCarried(match, player.id, now, false); }
    const centre = match.map.rooms.reduce((best, room) => Math.abs(room.gridX - 2.5) + Math.abs(room.gridY - 2) < Math.abs(best.gridX - 2.5) + Math.abs(best.gridY - 2) ? room : best, match.map.rooms[0]);
    match.looseObjects.push({ id: `sudden-case-${now}`, objectiveId: "case", roomId: centre.id, suddenDeath: true });
    for (const objectiveId of ["joystick", "tape", "key"]) match.looseObjects.push({ id: `sudden-${objectiveId}-${now}`, objectiveId, roomId: centre.id, suddenDeath: true });
    match.events.push({ type: "sudden-death", roomId: centre.id, endsAt: match.suddenDeathEndsAt, at: now }); return true;
  }

  function resolveTime(match, now) {
    const ranked = [...match.players].sort((a, b) => carriedCount(b) - carriedCount(a) || b.hp - a.hp || b.knockouts - a.knockouts || b.trapHits - a.trapHits);
    const a = ranked[0], b = ranked[1];
    if (carriedCount(a) !== carriedCount(b) || a.hp !== b.hp || a.knockouts !== b.knockouts || a.trapHits !== b.trapHits) return awardRound(match, a.id, now, "timer");
    return startSuddenDeath(match, now);
  }

  function emitNoise(match, roomId, playerId, kind, radius, now) {
    const event = { id: `noise-${now}-${match.noise.length}`, roomId, playerId, kind, radius: radius * Number(match.modifier?.noiseScale || 1), at: now, expiresAt: now + 1800 };
    match.noise.push(event); match.events.push({ type: "noise", ...event }); return event;
  }

  function audibleNoises(match, playerId, now) {
    const player = playerById(match, playerId); if (!player) return [];
    return match.noise.filter(noise => noise.expiresAt > now && noise.playerId !== playerId && graphDistance(match.map, player.roomId, noise.roomId) <= noise.radius);
  }

  function visibilityFor(match, playerId, now) {
    const player = playerById(match, playerId), opponent = match.players.find(entry => entry.id !== playerId); if (!player || !opponent) return { opponentVisible: false, lightRadius: LIGHT_RADIUS, minimap: false };
    const lightRadius = clamp(LIGHT_RADIUS + Number(match.modifier?.lightDelta || 0), 3, 7), sameRoom = player.roomId === opponent.roomId;
    return { opponentVisible: sameRoom || opponent.revealedUntil > now, opponentRoomId: opponent.revealedUntil > now ? opponent.roomId : null, lightRadius, minimap: false };
  }

  function tickCamping(match, now) {
    for (const player of match.players) if (player.status === "active" && now - player.roomEnteredAt >= CAMP_WARNING_MS && player.revealedUntil < now) {
      player.revealedUntil = now + 3000; match.events.push({ type: "camp-reveal", playerId: player.id, roomId: player.roomId, until: player.revealedUntil, at: now }); emitNoise(match, player.roomId, player.id, "security-buzzer", 4, now);
    }
  }

  function tickTimedTraps(match, now) {
    for (const placed of match.traps.filter(entry => entry.armed && entry.detonatesAt && now >= entry.detonatesAt)) {
      placed.armed = false; const victims = match.players.filter(player => player.status === "active" && player.roomId === placed.roomId);
      for (const player of victims) { damagePlayer(match, player.id, TRAPS.timeBomb.damage, placed.ownerId, now, "trap:timeBomb"); dropCarried(match, player.id, now, true); }
      match.events.push({ type: "time-bomb-detonated", trapId: placed.id, ownerId: placed.ownerId, victims: victims.map(player => player.id), at: now }); emitNoise(match, placed.roomId, placed.ownerId, "time-bomb", 5, now);
    }
  }

  function tick(match, now) {
    if (!match || ["match-complete", "abandoned", "splash"].includes(match.state)) return match;
    match.noise = match.noise.filter(noise => noise.expiresAt > now); respawnPlayers(match, now); tickTimedTraps(match, now); tickCamping(match, now); tickExtraction(match, now);
    if (match.state === "playing" && now >= match.roundEndsAt) resolveTime(match, now);
    else if (match.state === "sudden-death" && now >= match.suddenDeathEndsAt) {
      const winner = [...match.players].sort((a, b) => b.hp - a.hp || b.knockouts - a.knockouts || b.trapHits - a.trapHits)[0]; awardRound(match, winner.id, now, "sudden-death-timer");
    }
    return match;
  }

  function tryAnnounce(match, eventId, now, durationMs = 2400, cooldownMs = 0) {
    const line = VOICE[eventId]; if (!line || now < match.announcer.busyUntil) return null;
    const last = Number(match.announcer.lastPlayed[eventId] || -Infinity); if (now - last < cooldownMs) return null;
    match.announcer.busyUntil = now + Math.max(250, durationMs); match.announcer.lastPlayed[eventId] = now; match.announcer.current = eventId;
    const event = { type: "voice", id: eventId, line, at: now, endsAt: match.announcer.busyUntil }; match.events.push(event); return event;
  }

  function drainEvents(match) { return match.events.splice(0); }

  function matchResult(match) {
    const ended = match.completedAt || Date.now();
    return {
      mode: MODE_ID, winnerId: match.matchWinnerId, bestOf: BEST_OF, roundsToWin: ROUNDS_TO_WIN, roundsPlayed: match.round,
      wins: { ...match.wins }, players: match.players.map(player => ({ id: player.id, name: player.name, colour: player.colour, emblem: player.emblem, knockouts: player.knockouts, trapHits: player.trapHits, searches: player.searches })),
      completionMs: Math.max(0, ended - match.startedAt), seed: match.seed, completedAt: ended
    };
  }

  function publicState(match) { return copy({ ...match, announcer: undefined, events: undefined }); }

  return Object.freeze({
    MODE_ID, MODE_NAME, TAGLINE, PLAYER_COUNT, BEST_OF, ROUNDS_TO_WIN, ROUND_MS, RESPAWN_MS, SUDDEN_DEATH_MS,
    EXTRACTION_MS, STARTING_HP, TRAPS_PER_ROUND, LIGHT_RADIUS, CAMP_WARNING_MS, NO_MINIMAP,
    AUDIO, IDENTITIES, OBJECTIVES, WEAPONS, TRAPS, COUNTERS, MODIFIERS, VOICE,
    hash32, makeRng, graphDistance, connected, createMap, distributeContents, modifierFor, trapLoadout,
    createMatch, beginRound, movePlayer, searchFurniture, collectObjective, placeTrap, disarmTrap, triggerTrap,
    useWeapon, damagePlayer, dropCarried, knockout, respawnPlayers, collectLoose, beginExtraction, tickExtraction,
    awardRound, startSuddenDeath, resolveTime, emitNoise, audibleNoises, visibilityFor, tickCamping, tickTimedTraps,
    tick, tryAnnounce, drainEvents, hasCompleteCase, matchResult, publicState
  });
});
