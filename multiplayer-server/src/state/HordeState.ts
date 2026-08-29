import { MapSchema, Schema, type } from "@colyseus/schema";

export class HordePlayerState extends Schema {
  @type("string") sessionId = "";
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
  @type("number") kills = 0;
  @type("number") revives = 0;
}

export class HordeEnemyState extends Schema {
  @type("string") id = "";
  @type("string") kind = "spider";
  @type("number") x = 0;
  @type("number") y = 0;
  @type("number") health = 1;
  @type("number") maxHealth = 1;
  @type("boolean") alive = true;
}

export class HordeState extends Schema {
  @type("string") mode = "horde-survivor";
  @type("string") status = "lobby";
  @type("string") roomCode = "";
  @type("string") seed = "";
  @type("number") wave = 0;
  @type("number") score = 0;
  @type("number") serverTick = 0;
  @type({ map: HordePlayerState }) players = new MapSchema<HordePlayerState>();
  @type({ map: HordeEnemyState }) enemies = new MapSchema<HordeEnemyState>();
}
