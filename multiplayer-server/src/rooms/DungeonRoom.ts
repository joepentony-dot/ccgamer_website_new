import type { Client } from "colyseus";
import { Room } from "colyseus";

type DungeonJoinOptions = {
  name?: string;
  actorId?: string;
  roomCode?: string;
  isLobbyHost?: boolean;
};

type DungeonGameMessage = {
  event?: string;
  payload?: unknown;
};

type RoleMessage = {
  name?: string;
  isLobbyHost?: boolean;
};

const cleanName = (value: unknown) => String(value ?? "Player").trim().slice(0, 18) || "Player";
const cleanCode = (value: unknown) => String(value ?? "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6);
const cleanActorId = (value: unknown, fallback: string) => String(value ?? fallback).replace(/[^A-Za-z0-9_.:-]/g, "").slice(0, 80) || fallback;
const cleanEvent = (value: unknown) => String(value ?? "").replace(/[^A-Za-z0-9_.:-]/g, "").slice(0, 80);

export class DungeonRoom extends Room {
  maxClients = 4;
  maxMessagesPerSecond = 120;

  private roomCode = "";
  private sessionActors = new Map<string, string>();
  private actorNames = new Map<string, string>();
  private lobbyHostActorId = "";
  private packetSequence = 0;

  onCreate(options: DungeonJoinOptions = {}) {
    this.roomCode = cleanCode(options.roomCode) || cleanCode(this.roomId.slice(-6));
    this.setMetadata({ mode: "dungeon", roomCode: this.roomCode, playerCap: 4, transport: "colyseus" });

    this.onMessage("game", (client, message: DungeonGameMessage) => this.relayGame(client, message));
    this.onMessage("role", (client, message: RoleMessage) => this.updateRole(client, message));
    this.onMessage("ping", (client, message: { sentAt?: number }) => {
      client.send("pong", { sentAt: Number(message?.sentAt) || 0, serverAt: Date.now() });
    });
  }

  onJoin(client: Client, options: DungeonJoinOptions = {}) {
    const actorId = cleanActorId(options.actorId, client.sessionId);
    const name = cleanName(options.name);
    this.sessionActors.set(client.sessionId, actorId);
    this.actorNames.set(actorId, name);
    this.chooseHost(Boolean(options.isLobbyHost) ? actorId : "");
    this.broadcastStatus("join");
  }

  onLeave(client: Client) {
    const actorId = this.sessionActors.get(client.sessionId) || "";
    this.sessionActors.delete(client.sessionId);
    if (actorId) this.actorNames.delete(actorId);
    if (actorId && actorId === this.lobbyHostActorId) this.lobbyHostActorId = "";
    this.chooseHost();
    this.broadcastStatus("leave");
  }

  private actorFor(client: Client) {
    return this.sessionActors.get(client.sessionId) || "";
  }

  private chooseHost(preferred = "") {
    const liveActors = [...this.sessionActors.values()].sort((a, b) => a.localeCompare(b));
    if (preferred && liveActors.includes(preferred)) {
      this.lobbyHostActorId = preferred;
      return preferred;
    }
    if (this.lobbyHostActorId && liveActors.includes(this.lobbyHostActorId)) return this.lobbyHostActorId;
    this.lobbyHostActorId = liveActors[0] || "";
    return this.lobbyHostActorId;
  }

  private updateRole(client: Client, message: RoleMessage) {
    const actorId = this.actorFor(client);
    if (!actorId) return;
    if (message?.name) this.actorNames.set(actorId, cleanName(message.name));
    if (message?.isLobbyHost === true) this.chooseHost(actorId);
    else this.chooseHost();
    this.broadcastStatus("role");
  }

  private broadcastStatus(reason: string) {
    const payload = {
      mode: "dungeon",
      transport: "colyseus",
      roomCode: this.roomCode,
      hostActorId: this.chooseHost(),
      playerCount: this.sessionActors.size,
      reason,
      serverAt: Date.now(),
    };
    this.broadcast("server_status", payload);
  }

  private relayGame(client: Client, message: DungeonGameMessage) {
    const actorId = this.actorFor(client);
    const event = cleanEvent(message?.event);
    if (!actorId || !event) return;

    // Preserve the existing Dungeon host-authoritative simulation while moving
    // gameplay transport away from Supabase. Payloads are deliberately relayed
    // unchanged so the mature game-network packet handlers remain the owner of
    // validation, world mutation and host-only actions during this migration.
    this.packetSequence += 1;
    this.broadcast("game", {
      event,
      payload: message?.payload ?? null,
      senderActorId: actorId,
      sequence: this.packetSequence,
      serverAt: Date.now(),
    }, { except: client });
  }
}
