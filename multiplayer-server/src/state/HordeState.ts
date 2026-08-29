import { MapSchema, Schema, type } from "@colyseus/schema";

export class HordePlayerState extends Schema {
  @type("string") sessionId = "";
  @type("string") actorId = "";
  @type("string") name = "Player";
  @type("number") x = 0;
  @type("number") y = 0;
  @type("number") health = 10;
  @type("number") maxHealth = 10;
  @type("number") mana = 120;
  @type("number") maxMana = 120;
  @type("number") dirX = 1;
  @type("number") dirY = 0;
  @type("string") status = "active";
  @type("string") currentWeapon = "starter";
  @type("number") kills = 0;
  @type("number") revives = 0;
  @type("number") downExpiresAt = 0;
  @type("number") invulnerableUntil = 0;
}

export class HordeEnemyState extends Schema {
  @type("string") id = "";
  @type("string") kind = "spider";
  @type("string") name = "Enemy";
  @type("number") x = 0;
  @type("number") y = 0;
  @type("number") health = 1;
  @type("number") maxHealth = 1;
  @type("number") damage = 1;
  @type("number") speed = 1;
  @type("number") score = 0;
  @type("boolean") alive = true;
  @type("boolean") boss = false;
  @type("string") targetId = "";
}

export class HordePickupState extends Schema {
  @type("string") id = "";
  @type("number") x = 0;
  @type("number") y = 0;
  @type("number") restore = 2;
}

export class HordeState extends Schema {
  @type("string") mode = "horde-survivor";
  @type("string") status = "lobby";
  @type("string") roomCode = "";
  @type("string") seed = "";
  @type("string") waveTitle = "WAITING";
  @type("string") message = "Waiting for players";
  @type("number") wave = 0;
  @type("number") score = 0;
  @type("number") serverTick = 0;
  @type("number") playerCount = 0;
  @type("number") spawned = 0;
  @type("number") defeated = 0;
  @type("number") quota = 0;
  @type("number") waveEndsAt = 0;
  @type("number") intermissionEndsAt = 0;
  @type("boolean") arenaReady = false;
  @type("boolean") serverAuthoritative = true;
  @type({ map: HordePlayerState }) players = new MapSchema<HordePlayerState>();
  @type({ map: HordeEnemyState }) enemies = new MapSchema<HordeEnemyState>();
  @type({ map: HordePickupState }) pickups = new MapSchema<HordePickupState>();
}
