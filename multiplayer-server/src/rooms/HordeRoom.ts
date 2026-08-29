import type { Client } from "colyseus";
import { Room } from "colyseus";
import { HordePlayerState, HordeState } from "../state/HordeState.js";

type HordeJoinOptions = {
  name?: string;
  roomCode?: string;
  seed?: string;
};

type MoveMessage = {
  dx?: number;
  dy?: number;
};

type FaceMessage = {
  x?: number;
  y?: number;
};

const TICK_MS = 50;
const MIN_X = 2;
const MAX_X = 126;
const MIN_Y = 2;
const MAX_Y = 82;

const cleanName = (value: unknown) => String(value ?? "Player").trim().slice(0, 18) || "Player";
const cleanCode = (value: unknown) => String(value ?? "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6);
const axis = (value: unknown) => Math.max(-1, Math.min(1, Math.sign(Number(value) || 0)));
const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

export class HordeRoom extends Room {
  state = new HordeState();
  maxClients = 4;
  patchRate = 50;
  maxMessagesPerSecond = 60;

  onCreate(options: HordeJoinOptions = {}) {
    this.state.roomCode = cleanCode(options.roomCode) || cleanCode(this.roomId.slice(-6));
    this.state.seed = String(options.seed || this.state.roomCode || this.roomId).slice(0, 64);
    this.setMetadata({ mode: "horde-survivor", roomCode: this.state.roomCode, playerCap: 4 });

    this.onMessage("move", (client, message: MoveMessage) => this.applyMove(client, message));
    this.onMessage("face", (client, message: FaceMessage) => this.applyFacing(client, message));
    this.onMessage("ping", (client, message) => client.send("pong", { sentAt: message?.sentAt ?? 0, serverAt: Date.now() }));

    this.setTimestep(() => {
      this.state.serverTick += 1;
    }, TICK_MS);
  }

  onJoin(client: Client, options: HordeJoinOptions = {}) {
    const player = new HordePlayerState();
    player.sessionId = client.sessionId;
    player.name = cleanName(options.name);

    const index = this.state.players.size;
    const spawn = [
      { x: 62, y: 40 },
      { x: 66, y: 40 },
      { x: 62, y: 44 },
      { x: 66, y: 44 },
    ][index % 4];
    player.x = spawn.x;
    player.y = spawn.y;

    this.state.players.set(client.sessionId, player);
    if (this.state.players.size >= 1 && this.state.status === "lobby") this.state.status = "ready";
  }

  onLeave(client: Client) {
    this.state.players.delete(client.sessionId);
    if (this.state.players.size === 0) this.state.status = "lobby";
  }

  private playerFor(client: Client) {
    return this.state.players.get(client.sessionId);
  }

  private applyMove(client: Client, message: MoveMessage) {
    const player = this.playerFor(client);
    if (!player || player.status !== "active") return;

    const dx = axis(message?.dx);
    const dy = axis(message?.dy);
    if (!dx && !dy) return;

    player.dirX = dx;
    player.dirY = dy;
    player.x = clamp(player.x + dx, MIN_X, MAX_X);
    player.y = clamp(player.y + dy, MIN_Y, MAX_Y);
  }

  private applyFacing(client: Client, message: FaceMessage) {
    const player = this.playerFor(client);
    if (!player) return;
    const x = axis(message?.x);
    const y = axis(message?.y);
    if (!x && !y) return;
    player.dirX = x;
    player.dirY = y;
  }
}
