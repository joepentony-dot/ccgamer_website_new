import type { Client } from "colyseus";
import { Room } from "colyseus";
import { HordeEnemyState, HordePickupState, HordePlayerState, HordeState } from "../state/HordeState.js";
import { getHordeRules } from "../shared/HordeRules.js";

type HordeJoinOptions = {
  name?: string;
  actorId?: string;
  roomCode?: string;
  seed?: string;
  isLobbyHost?: boolean;
  expectedPlayers?: number;
};

type ArenaInitMessage = {
  width?: number;
  height?: number;
  walkable?: string;
};

type PlayerStateMessage = {
  x?: number;
  y?: number;
  dirX?: number;
  dirY?: number;
  mana?: number;
  maxMana?: number;
};

type EnemyHitMessage = {
  enemyId?: string;
  power?: number;
  element?: string;
};

type ReviveHoldMessage = { holding?: boolean };

type Point = { x: number; y: number };

type ArenaGrid = {
  width: number;
  height: number;
  walkable: Uint8Array;
  cells: Point[];
  spawnCells: Point[];
};

const TICK_MS = 50;
const JOIN_WINDOW_MS = 8000;
const DISCONNECT_GRACE_MS = 3200;
const STARTING_HP = 10;
const SINGLE_PLAYER_QUOTAS = [36, 44, 52, 60, 70, 80, 90, 100, 112, 44] as const;
const PLAYER_QUOTA_SCALE: Record<number, number> = { 1: 1, 2: 1.25, 3: 1.5, 4: 1.75 };
const ACTIVE_CAP: Record<number, number> = { 1: 18, 2: 24, 3: 30, 4: 36 };

const cleanName = (value: unknown) => String(value ?? "Player").trim().slice(0, 18) || "Player";
const cleanCode = (value: unknown) => String(value ?? "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6);
const cleanActorId = (value: unknown, fallback: string) => String(value ?? fallback).replace(/[^A-Za-z0-9_.:-]/g, "").slice(0, 80) || fallback;
const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));
const finite = (value: unknown, fallback = 0) => Number.isFinite(Number(value)) ? Number(value) : fallback;
const distance = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);
const key = (x: number, y: number) => `${Math.round(x)},${Math.round(y)}`;

function hash32(value: unknown) {
  let hash = 2166136261 >>> 0;
  for (const char of String(value ?? "")) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function desiredQuota(wave: number, players: number) {
  const level = clamp(Math.floor(wave || 1), 1, 10);
  const count = clamp(Math.floor(players || 1), 1, 4);
  return Math.max(1, Math.round(SINGLE_PLAYER_QUOTAS[level - 1] * (PLAYER_QUOTA_SCALE[count] || 1)));
}

function desiredActiveCap(players: number) {
  return ACTIVE_CAP[clamp(Math.floor(players || 1), 1, 4)] || ACTIVE_CAP[1];
}

export class HordeRoom extends Room {
  state = new HordeState();
  maxClients = 4;
  patchRate = 50;
  maxMessagesPerSecond = 60;

  private readonly rules = getHordeRules();
  private runState: any | null = null;
  private arena: ArenaGrid | null = null;
  private expectedPlayers = 1;
  private joinWindowEndsAt = 0;
  private lobbyHostSessionId = "";
  private sessionActors = new Map<string, string>();
  private enemyMoveDue = new Map<string, number>();
  private enemyAttackDue = new Map<string, number>();
  private hitDebounce = new Map<string, number>();
  private reviveHolding = new Map<string, boolean>();
  private lastSpawnAt = 0;
  private lastBossId = "";

  onCreate(options: HordeJoinOptions = {}) {
    this.state.roomCode = cleanCode(options.roomCode) || cleanCode(this.roomId.slice(-6));
    this.state.seed = String(options.seed || this.state.roomCode || this.roomId).slice(0, 64);
    this.expectedPlayers = clamp(Math.floor(Number(options.expectedPlayers) || 1), 1, 4);
    this.joinWindowEndsAt = Date.now() + JOIN_WINDOW_MS;
    this.state.status = "warming";
    this.state.message = "Waiting for the Horde arena";
    this.setMetadata({ mode: "horde-survivor", roomCode: this.state.roomCode, playerCap: 4 });

    this.onMessage("arena_init", (client, message: ArenaInitMessage) => this.installArena(client, message));
    this.onMessage("player_state", (client, message: PlayerStateMessage) => this.applyPlayerState(client, message));
    this.onMessage("enemy_hit", (client, message: EnemyHitMessage) => this.applyEnemyHit(client, message));
    this.onMessage("revive_hold", (client, message: ReviveHoldMessage) => this.setReviveHold(client, message));
    this.onMessage("ping", (client, message) => client.send("pong", { sentAt: message?.sentAt ?? 0, serverAt: Date.now() }));

    // Compatibility with the first deployment prototype. New clients publish
    // complete local position snapshots through player_state instead.
    this.onMessage("move", (client, message: { dx?: number; dy?: number }) => {
      const player = this.playerFor(client);
      if (!player) return;
      const dx = Math.sign(finite(message?.dx));
      const dy = Math.sign(finite(message?.dy));
      this.acceptPosition(player, player.x + dx, player.y + dy);
    });
    this.onMessage("face", (client, message: { x?: number; y?: number }) => {
      const player = this.playerFor(client);
      if (!player) return;
      const x = Math.sign(finite(message?.x));
      const y = Math.sign(finite(message?.y));
      if (x || y) { player.dirX = x; player.dirY = y; }
    });

    this.setTimestep(() => this.serverStep(Date.now()), TICK_MS);
  }

  onJoin(client: Client, options: HordeJoinOptions = {}) {
    const actorId = cleanActorId(options.actorId, client.sessionId);
    this.sessionActors.set(client.sessionId, actorId);
    if (options.isLobbyHost) this.lobbyHostSessionId = client.sessionId;
    this.expectedPlayers = Math.max(this.expectedPlayers, clamp(Math.floor(Number(options.expectedPlayers) || 1), 1, 4));
    this.joinWindowEndsAt = Math.max(this.joinWindowEndsAt, Date.now() + 2500);

    let player = this.state.players.get(actorId);
    if (!player) {
      player = new HordePlayerState();
      player.actorId = actorId;
      player.health = STARTING_HP;
      player.maxHealth = STARTING_HP;
      const spawn = this.fallbackPlayerSpawn(this.state.players.size);
      player.x = spawn.x;
      player.y = spawn.y;
      this.state.players.set(actorId, player);
    }
    player.sessionId = client.sessionId;
    player.name = cleanName(options.name);
    this.state.playerCount = this.state.players.size;

    if (this.runState && !["victory", "defeat"].includes(this.runState.state) && !this.runPlayer(actorId)) {
      this.addLateRunPlayer(player, Date.now());
    }
    this.broadcast("server_notice", { type: "player-joined", actorId, name: player.name });
  }

  onLeave(client: Client) {
    const actorId = this.sessionActors.get(client.sessionId) || "";
    this.sessionActors.delete(client.sessionId);
    this.reviveHolding.delete(actorId);
    if (!actorId) return;
    setTimeout(() => {
      const player = this.state.players.get(actorId);
      if (!player || player.sessionId !== client.sessionId) return;
      this.state.players.delete(actorId);
      if (this.runState) {
        this.runState.players = (this.runState.players || []).filter((entry: any) => String(entry.id) !== actorId);
        this.runState.playerCount = Math.max(1, this.runState.players.length || 1);
        for (const [targetId, revive] of Object.entries<any>(this.runState.revives || {})) {
          if (String(revive?.reviverId) === actorId || String(targetId) === actorId) this.rules.cancelRevive(this.runState, targetId, "disconnect", Date.now());
        }
      }
      this.state.playerCount = this.state.players.size;
      this.broadcast("server_notice", { type: "player-left", actorId });
    }, DISCONNECT_GRACE_MS);
  }

  private actorFor(client: Client) {
    return this.sessionActors.get(client.sessionId) || "";
  }

  private playerFor(client: Client) {
    const actorId = this.actorFor(client);
    return actorId ? this.state.players.get(actorId) : undefined;
  }

  private runPlayer(actorId: string) {
    return this.runState?.players?.find((entry: any) => String(entry.id) === String(actorId));
  }

  private fallbackPlayerSpawn(index: number): Point {
    const cells = this.arena?.cells;
    if (cells?.length) {
      const centre = { x: this.arena!.width / 2, y: this.arena!.height / 2 };
      return [...cells].sort((a, b) => distance(a, centre) - distance(b, centre))[Math.min(index * 2, cells.length - 1)];
    }
    return [{ x: 62, y: 40 }, { x: 66, y: 40 }, { x: 62, y: 44 }, { x: 66, y: 44 }][index % 4];
  }

  private installArena(client: Client, message: ArenaInitMessage) {
    if (this.lobbyHostSessionId && client.sessionId !== this.lobbyHostSessionId) return;
    if (!this.lobbyHostSessionId) this.lobbyHostSessionId = client.sessionId;
    const width = clamp(Math.floor(finite(message?.width)), 8, 220);
    const height = clamp(Math.floor(finite(message?.height)), 8, 160);
    const encoded = String(message?.walkable || "");
    if (encoded.length !== width * height || !/^[01]+$/.test(encoded)) {
      client.send("server_error", { code: "arena-invalid", message: "Horde arena grid was rejected." });
      return;
    }
    const walkable = new Uint8Array(encoded.length);
    const cells: Point[] = [];
    let minX = width, maxX = 0, minY = height, maxY = 0;
    for (let i = 0; i < encoded.length; i += 1) {
      if (encoded.charCodeAt(i) !== 49) continue;
      walkable[i] = 1;
      const x = i % width, y = Math.floor(i / width);
      cells.push({ x, y });
      minX = Math.min(minX, x); maxX = Math.max(maxX, x); minY = Math.min(minY, y); maxY = Math.max(maxY, y);
    }
    if (cells.length < 50) {
      client.send("server_error", { code: "arena-empty", message: "Horde arena contains too few walkable cells." });
      return;
    }
    const spawnCells = cells.filter((cell) => cell.x <= minX + 5 || cell.x >= maxX - 5 || cell.y <= minY + 5 || cell.y >= maxY - 5);
    this.arena = { width, height, walkable, cells, spawnCells: spawnCells.length ? spawnCells : cells };
    this.state.arenaReady = true;
    this.state.message = "Dedicated Horde server ready";
    this.broadcast("server_notice", { type: "arena-ready", width, height, cells: cells.length });
  }

  private isWalkable(x: number, y: number) {
    if (!this.arena) return true;
    const ix = Math.round(x), iy = Math.round(y);
    if (ix < 0 || iy < 0 || ix >= this.arena.width || iy >= this.arena.height) return false;
    return this.arena.walkable[iy * this.arena.width + ix] === 1;
  }

  private acceptPosition(player: HordePlayerState, x: number, y: number) {
    if (!Number.isFinite(x) || !Number.isFinite(y)) return false;
    if (distance(player, { x, y }) > 8.5) return false;
    if (!this.isWalkable(x, y)) return false;
    player.x = x;
    player.y = y;
    const runPlayer = this.runPlayer(player.actorId);
    if (runPlayer) { runPlayer.x = x; runPlayer.y = y; }
    return true;
  }

  private applyPlayerState(client: Client, message: PlayerStateMessage) {
    const player = this.playerFor(client);
    if (!player) return;
    this.acceptPosition(player, finite(message?.x, player.x), finite(message?.y, player.y));
    const dirX = Math.sign(finite(message?.dirX));
    const dirY = Math.sign(finite(message?.dirY));
    if (dirX || dirY) { player.dirX = dirX; player.dirY = dirY; }
    player.maxMana = clamp(finite(message?.maxMana, player.maxMana), 1, 500);
    player.mana = clamp(finite(message?.mana, player.mana), 0, player.maxMana);
  }

  private addLateRunPlayer(player: HordePlayerState, now: number) {
    if (!this.runState) return;
    const wave = Math.max(0, Number(this.runState.wave || 0));
    const weapons = this.rules.WEAPONS.slice(0, wave).map((row) => row.id);
    const currentWeapon = wave > 0 ? this.rules.WEAPONS[Math.min(wave - 1, this.rules.WEAPONS.length - 1)]?.id || null : null;
    this.runState.players.push({
      id: player.actorId, name: player.name, x: player.x, y: player.y,
      hp: STARTING_HP, maxHp: STARTING_HP, status: "active", downedAt: 0, downExpiresAt: 0,
      invulnerableUntil: now + 1600, selfReviveAvailable: false, weapons, currentWeapon,
      kills: 0, revives: 0, damageTaken: 0, lateJoinedAt: now,
    });
    this.runState.playerCount = clamp(this.runState.players.length, 1, 4);
  }

  private startRun(now: number) {
    const players = [...this.state.players.values()].slice(0, 4);
    if (!players.length) return false;
    this.runState = this.rules.createRun({
      seed: this.state.seed,
      hostId: players[0].actorId,
      players: players.map((player) => ({ id: player.actorId, name: player.name })),
      now,
    });
    for (const model of this.runState.players || []) {
      const source = this.state.players.get(String(model.id));
      if (!source) continue;
      model.x = source.x; model.y = source.y; model.hp = STARTING_HP; model.maxHp = STARTING_HP;
    }
    this.runState.playerCount = players.length;
    this.state.status = "briefing";
    this.state.message = "Dedicated server owns Horde simulation";
    this.broadcast("server_notice", { type: "authority-started", players: players.length, serverAt: now });
    return true;
  }

  private setReviveHold(client: Client, message: ReviveHoldMessage) {
    const actorId = this.actorFor(client);
    if (!actorId) return;
    this.reviveHolding.set(actorId, Boolean(message?.holding));
    if (!message?.holding && this.runState) {
      for (const [targetId, revive] of Object.entries<any>(this.runState.revives || {})) {
        if (String(revive?.reviverId) === actorId) this.rules.cancelRevive(this.runState, targetId, "released", Date.now());
      }
    }
  }

  private processReviveHolds(now: number) {
    if (!this.runState) return;
    for (const [actorId, holding] of this.reviveHolding) {
      if (!holding) continue;
      const reviver = this.runPlayer(actorId);
      if (!reviver || reviver.status !== "active") continue;
      const target = (this.runState.players || [])
        .filter((player: any) => player.status === "downed" && String(player.id) !== actorId)
        .sort((a: any, b: any) => distance(reviver, a) - distance(reviver, b))[0];
      if (!target || distance(reviver, target) > 1.15) continue;
      const existing = this.runState.revives?.[target.id];
      if (!existing) this.rules.startRevive(this.runState, actorId, String(target.id), now);
    }
  }

  private chooseSpawnCell(id: string): Point {
    const candidates = this.arena?.spawnCells || this.arena?.cells || [];
    if (!candidates.length) return { x: 10, y: 10 };
    const activePlayers = (this.runState?.players || []).filter((player: any) => player.status === "active");
    let best = candidates[hash32(`${this.state.seed}|${id}`) % candidates.length];
    let bestDistance = -1;
    const base = hash32(`${id}|${this.state.serverTick}`);
    for (let i = 0; i < Math.min(48, candidates.length); i += 1) {
      const candidate = candidates[(base + i * 97) % candidates.length];
      const nearest = activePlayers.length ? Math.min(...activePlayers.map((player: any) => distance(candidate, player))) : 999;
      if (nearest > bestDistance && !this.enemyOccupied(candidate.x, candidate.y)) { best = candidate; bestDistance = nearest; }
    }
    return { x: best.x, y: best.y };
  }

  private enemyOccupied(x: number, y: number, exceptId = "") {
    if (!this.runState) return false;
    for (const enemy of this.runState.activeEnemies || []) {
      if (!enemy?.alive || enemy.kind === "reserve" || String(enemy.id) === exceptId) continue;
      if (Math.round(enemy.x) === Math.round(x) && Math.round(enemy.y) === Math.round(y)) return true;
    }
    const boss = this.runState.boss;
    return Boolean(boss?.alive && String(boss.id) !== exceptId && Math.round(boss.x) === Math.round(x) && Math.round(boss.y) === Math.round(y));
  }

  private weightedKind(wave: number, serial: number) {
    const def: any = this.rules.WAVES[Math.max(0, wave - 1)];
    const groups: Array<{ kind: string; weight: number }> = def?.groups || [];
    if (!groups.length) return "spider";
    const total = groups.reduce((sum, row) => sum + Number(row.weight || 0), 0) || 1;
    let roll = (hash32(`${this.state.seed}|EXTRA|${wave}|${serial}`) % 100000) / 100000 * total;
    for (const group of groups) { roll -= Number(group.weight || 0); if (roll <= 0) return group.kind; }
    return groups[groups.length - 1].kind;
  }

  private createExtraEnemy(now: number) {
    if (!this.runState) return null;
    const serial = Number(this.runState.nextEnemyId || 1);
    const kind = this.weightedKind(this.runState.wave, serial);
    const base = this.rules.ENEMIES[kind] || this.rules.ENEMIES.spider;
    const id = `horde-${this.runState.wave}-${serial}`;
    const cell = this.chooseSpawnCell(id);
    this.runState.nextEnemyId = serial + 1;
    const enemy = {
      id, kind, name: base.name, hp: base.hp, maxHp: base.hp, damage: base.damage,
      speed: base.speed, score: base.score, alive: true, spawnRoomId: "server-perimeter",
      x: cell.x, y: cell.y, spawnedAt: now, targetId: null, _serverExtra: true,
    };
    this.runState.spawned += 1;
    this.runState.activeEnemies.push(enemy);
    this.runState.events.push({ type: "enemy-spawn", enemy: { ...enemy }, at: now });
    return enemy;
  }

  private ensureQuotaReserve() {
    if (!this.runState || !["wave", "siege"].includes(this.runState.state)) return;
    const baseQuota = this.rules.quotaFor(this.runState.wave, this.runState.playerCount);
    const targetQuota = desiredQuota(this.runState.wave, this.runState.playerCount);
    const reserveId = `server-wave-${this.runState.wave}-reserve`;
    const reserveIndex = (this.runState.activeEnemies || []).findIndex((enemy: any) => String(enemy.id) === reserveId);
    const realActive = (this.runState.activeEnemies || []).filter((enemy: any) => enemy?.alive && enemy.kind !== "reserve").length;
    const needsReserve = this.runState.spawned >= baseQuota && (this.runState.spawned < targetQuota || this.runState.defeated < targetQuota || realActive > 0);
    if (needsReserve && reserveIndex < 0) {
      this.runState.activeEnemies.push({ id: reserveId, kind: "reserve", name: "Server reinforcement reserve", hp: 1, maxHp: 1, alive: true, score: 0, damage: 0, speed: 0, x: -999, y: -999 });
    } else if (!needsReserve && reserveIndex >= 0) {
      this.runState.activeEnemies.splice(reserveIndex, 1);
    }
  }

  private spawnIfDue(now: number) {
    if (!this.runState || !["wave", "siege"].includes(this.runState.state)) return;
    const targetQuota = desiredQuota(this.runState.wave, this.runState.playerCount);
    const realActive = (this.runState.activeEnemies || []).filter((enemy: any) => enemy?.alive && enemy.kind !== "reserve").length;
    if (this.runState.spawned >= targetQuota || realActive >= desiredActiveCap(this.runState.playerCount)) return;
    const interval = clamp(760 - Number(this.runState.wave || 1) * 35, 330, 760);
    if (now - this.lastSpawnAt < interval) return;
    this.lastSpawnAt = now;
    const baseQuota = this.rules.quotaFor(this.runState.wave, this.runState.playerCount);
    const enemy = this.runState.spawned < baseQuota ? this.rules.spawnNext(this.runState, now) : this.createExtraEnemy(now);
    if (!enemy) return;
    const cell = this.chooseSpawnCell(String(enemy.id));
    enemy.x = cell.x; enemy.y = cell.y; enemy.spawnRoomId = "server-perimeter";
  }

  private targetFor(enemy: any) {
    if (!this.runState) return null;
    const players = (this.runState.players || []).filter((player: any) => player.status === "active");
    const requested = players.find((player: any) => String(player.id) === String(enemy.targetId || ""));
    if (requested) return requested;
    return players.sort((a: any, b: any) => distance(enemy, a) - distance(enemy, b))[0] || null;
  }

  private moveEnemy(enemy: any, now: number, boss = false) {
    if (!enemy?.alive || enemy.kind === "reserve") return;
    const target = this.targetFor(enemy);
    if (!target) return;
    enemy.targetId = String(target.id);
    const dist = distance(enemy, target);
    const ranged = String(enemy.kind) === "ranger";
    const attackRange = ranged ? 6.2 : boss ? 1.8 : 1.45;
    const attackDue = this.enemyAttackDue.get(String(enemy.id)) || 0;
    if (dist <= attackRange && now >= attackDue) {
      const cooldown = ranged ? 1050 : boss ? 650 : 820;
      this.enemyAttackDue.set(String(enemy.id), now + cooldown);
      const before = Number(target.hp || 0);
      this.rules.applyDamage(this.runState, String(target.id), Math.max(1, Number(enemy.damage || 1)), now);
      if (Number(target.hp || 0) < before) {
        this.broadcast("enemy_attack", { enemyId: enemy.id, kind: enemy.kind, targetId: target.id, damage: Math.max(1, Number(enemy.damage || 1)), ranged, x: enemy.x, y: enemy.y });
      }
      return;
    }
    if (ranged && dist < 4.2) return;
    const due = this.enemyMoveDue.get(String(enemy.id)) || 0;
    if (now < due) return;
    const moveDelay = clamp(Math.round(430 / Math.max(0.5, Number(enemy.speed || 1))), 150, 620);
    this.enemyMoveDue.set(String(enemy.id), now + moveDelay);
    const sx = Math.sign(Number(target.x) - Number(enemy.x));
    const sy = Math.sign(Number(target.y) - Number(enemy.y));
    const dirs = [
      { x: sx, y: sy }, { x: sx, y: 0 }, { x: 0, y: sy },
      { x: sx, y: -sy }, { x: -sx, y: sy },
      { x: -sx, y: 0 }, { x: 0, y: -sy },
    ].filter((dir, index, list) => (dir.x || dir.y) && list.findIndex((other) => other.x === dir.x && other.y === dir.y) === index);
    let best: Point | null = null;
    let bestDistance = dist;
    for (const dir of dirs) {
      const candidate = { x: Math.round(enemy.x) + dir.x, y: Math.round(enemy.y) + dir.y };
      if (!this.isWalkable(candidate.x, candidate.y) || this.enemyOccupied(candidate.x, candidate.y, String(enemy.id))) continue;
      const nextDistance = distance(candidate, target);
      if (nextDistance < bestDistance + 0.01) { best = candidate; bestDistance = nextDistance; }
    }
    if (best) { enemy.x = best.x; enemy.y = best.y; }
  }

  private simulateEnemies(now: number) {
    if (!this.runState) return;
    for (const enemy of this.runState.activeEnemies || []) this.moveEnemy(enemy, now, false);
    if (this.runState.boss?.alive) {
      if (String(this.runState.boss.id) !== this.lastBossId || !this.isWalkable(this.runState.boss.x, this.runState.boss.y)) {
        const cell = this.chooseSpawnCell(String(this.runState.boss.id || "warden"));
        this.runState.boss.x = cell.x; this.runState.boss.y = cell.y; this.lastBossId = String(this.runState.boss.id);
      }
      this.moveEnemy(this.runState.boss, now, true);
    }
  }

  private applyEnemyHit(client: Client, message: EnemyHitMessage) {
    if (!this.runState || !["wave", "siege", "boss"].includes(this.runState.state)) return;
    const actorId = this.actorFor(client);
    const player = this.runPlayer(actorId);
    if (!player || player.status !== "active") return;
    const enemyId = String(message?.enemyId || "").slice(0, 100);
    const damage = clamp(Math.round(finite(message?.power, 1)), 1, 20);
    const debounceKey = `${actorId}|${enemyId}`;
    const now = Date.now();
    if (now < (this.hitDebounce.get(debounceKey) || 0)) return;
    this.hitDebounce.set(debounceKey, now + 35);
    let defeated = false;
    if (this.runState.boss?.alive && String(this.runState.boss.id) === enemyId) {
      const before = Number(this.runState.boss.hp || 0);
      this.rules.damageBoss(this.runState, damage, actorId, now);
      defeated = before > 0 && Number(this.runState.boss.hp || 0) <= 0;
    } else {
      const enemy = (this.runState.activeEnemies || []).find((entry: any) => entry?.alive && entry.kind !== "reserve" && String(entry.id) === enemyId);
      if (!enemy) return;
      enemy.hp = Math.max(0, Number(enemy.hp || 0) - damage);
      if (enemy.hp <= 0) defeated = this.rules.defeatEnemy(this.runState, enemyId, actorId, now);
    }
    this.broadcast("horde_fx", { type: defeated ? "defeat" : "hit", enemyId, actorId, power: damage, element: String(message?.element || "energy") });
    this.syncSchema(now);
  }

  private placeHealthPickups() {
    if (!this.runState?.health?.active || !this.arena) return;
    for (const pickup of this.runState.health.active) {
      if (pickup._serverPlaced && this.isWalkable(pickup.x, pickup.y)) continue;
      const cell = this.arena.cells[hash32(`${this.state.seed}|HEALTH|${pickup.id}`) % this.arena.cells.length];
      pickup.x = cell.x; pickup.y = cell.y; pickup._serverPlaced = true;
    }
  }

  private collectHealthPickups(now: number) {
    if (!this.runState?.health?.active) return;
    this.placeHealthPickups();
    for (const player of this.runState.players || []) {
      if (player.status !== "active" || Number(player.hp || 0) >= Number(player.maxHp || STARTING_HP)) continue;
      const pickup = this.runState.health.active.find((entry: any) => distance(player, entry) <= 0.75);
      if (pickup) this.rules.collectHealth(this.runState, String(player.id), String(pickup.id), now);
    }
  }

  private drainAndBroadcastEvents(now: number) {
    if (!this.runState) return;
    const events = this.rules.drainEvents(this.runState) || [];
    for (const event of events) {
      const output = { ...event };
      if (output.type === "wave-start") output.quota = desiredQuota(Number(output.wave || this.runState.wave || 1), this.runState.playerCount);
      this.broadcast("horde_event", output);
    }
    if (events.length) this.syncSchema(now);
  }

  private syncSchema(_now: number) {
    if (!this.runState) return;
    this.state.status = String(this.runState.state || "briefing");
    this.state.wave = Math.max(0, Number(this.runState.wave || 0));
    this.state.waveTitle = String(this.rules.WAVES[Math.max(0, this.state.wave - 1)]?.title || (this.state.wave ? `WAVE ${this.state.wave}` : "BRIEFING"));
    this.state.score = Math.max(0, Math.floor(Number(this.runState.score || 0)));
    this.state.playerCount = Math.max(0, this.state.players.size);
    this.state.spawned = Math.max(0, Number(this.runState.spawned || 0));
    this.state.defeated = Math.max(0, Number(this.runState.defeated || 0));
    this.state.quota = this.state.wave ? desiredQuota(this.state.wave, Math.max(1, this.runState.playerCount || this.state.playerCount || 1)) : 0;
    this.state.waveEndsAt = Math.max(0, Number(this.runState.waveEndsAt || 0));
    this.state.intermissionEndsAt = Math.max(0, Number(this.runState.intermissionEndsAt || 0));

    const livePlayerIds = new Set<string>();
    for (const model of this.runState.players || []) {
      const actorId = String(model.id); livePlayerIds.add(actorId);
      let player = this.state.players.get(actorId);
      if (!player) { player = new HordePlayerState(); player.actorId = actorId; player.name = cleanName(model.name); this.state.players.set(actorId, player); }
      player.x = finite(model.x, player.x); player.y = finite(model.y, player.y);
      player.health = Math.max(0, Number(model.hp || 0)); player.maxHealth = Math.max(1, Number(model.maxHp || STARTING_HP));
      player.status = String(model.status || "active"); player.currentWeapon = String(model.currentWeapon || "starter");
      player.kills = Math.max(0, Number(model.kills || 0)); player.revives = Math.max(0, Number(model.revives || 0));
      player.downExpiresAt = Math.max(0, Number(model.downExpiresAt || 0)); player.invulnerableUntil = Math.max(0, Number(model.invulnerableUntil || 0));
    }

    const models = [...(this.runState.activeEnemies || []).filter((enemy: any) => enemy?.alive && enemy.kind !== "reserve")];
    if (this.runState.boss?.alive) models.push({ ...this.runState.boss, boss: true });
    const liveEnemyIds = new Set<string>();
    for (const model of models) {
      const id = String(model.id); liveEnemyIds.add(id);
      let enemy = this.state.enemies.get(id);
      if (!enemy) { enemy = new HordeEnemyState(); enemy.id = id; this.state.enemies.set(id, enemy); }
      enemy.kind = String(model.kind || (model.boss ? "warden" : "spider")); enemy.name = String(model.name || "Enemy");
      enemy.x = finite(model.x); enemy.y = finite(model.y); enemy.health = Math.max(0, Number(model.hp || 0)); enemy.maxHealth = Math.max(1, Number(model.maxHp || model.hp || 1));
      enemy.damage = Math.max(0, Number(model.damage || 1)); enemy.speed = Math.max(0, Number(model.speed || 1)); enemy.score = Math.max(0, Number(model.score || 0));
      enemy.alive = model.alive !== false && enemy.health > 0; enemy.boss = Boolean(model.boss || model === this.runState.boss); enemy.targetId = String(model.targetId || "");
    }
    for (const id of [...this.state.enemies.keys()]) if (!liveEnemyIds.has(String(id))) this.state.enemies.delete(String(id));

    this.placeHealthPickups();
    const livePickupIds = new Set<string>();
    for (const model of this.runState.health?.active || []) {
      const id = String(model.id); livePickupIds.add(id);
      let pickup = this.state.pickups.get(id);
      if (!pickup) { pickup = new HordePickupState(); pickup.id = id; this.state.pickups.set(id, pickup); }
      pickup.x = finite(model.x); pickup.y = finite(model.y); pickup.restore = Math.max(1, Number(model.restore || 2));
    }
    for (const id of [...this.state.pickups.keys()]) if (!livePickupIds.has(String(id))) this.state.pickups.delete(String(id));
  }

  private serverStep(now: number) {
    this.state.serverTick += 1;
    if (!this.runState) {
      const enoughPlayers = this.state.players.size >= Math.max(1, this.expectedPlayers);
      const timedOut = now >= this.joinWindowEndsAt;
      if (this.state.arenaReady && this.state.players.size > 0 && (enoughPlayers || timedOut)) this.startRun(now);
      return;
    }
    if (["victory", "defeat"].includes(this.runState.state)) { this.syncSchema(now); return; }
    this.runState.playerCount = Math.max(1, Math.min(4, this.runState.players?.length || 1));
    this.processReviveHolds(now);
    this.ensureQuotaReserve();
    this.spawnIfDue(now);
    this.simulateEnemies(now);
    this.collectHealthPickups(now);
    this.ensureQuotaReserve();
    this.rules.tick(this.runState, now);
    this.ensureQuotaReserve();
    this.drainAndBroadcastEvents(now);
    this.syncSchema(now);
  }
}
