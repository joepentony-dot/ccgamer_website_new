import { defineRoom, defineServer } from "colyseus";
import type { NextFunction, Request, Response } from "express";
import { DungeonRoom } from "./rooms/DungeonRoom.js";
import { HordeRoom } from "./rooms/HordeRoom.js";

const port = Number.parseInt(process.env.PORT || "10000", 10) || 10000;
const configuredOrigins = String(process.env.ALLOWED_ORIGINS || "https://www.cheekycommodoregamer.co.uk,https://cheekycommodoregamer.co.uk,http://localhost:8000,http://127.0.0.1:8000")
  .split(",")
  .map((value) => value.trim())
  .filter(Boolean);
const allowedOrigins = new Set(configuredOrigins);

const server = defineServer({
  rooms: {
    horde_v1: defineRoom(HordeRoom).filterBy(["roomCode"]),
    dungeon_v1: defineRoom(DungeonRoom).filterBy(["roomCode"]),
  },
  express: (app) => {
    app.use((req: Request, res: Response, next: NextFunction) => {
      const origin = String(req.headers.origin || "");
      if (origin && allowedOrigins.has(origin)) {
        res.setHeader("Access-Control-Allow-Origin", origin);
        res.setHeader("Vary", "Origin");
        res.setHeader("Access-Control-Allow-Credentials", "true");
      }
      res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
      res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
      if (req.method === "OPTIONS") {
        res.status(204).end();
        return;
      }
      next();
    });

    app.get("/", (_req: Request, res: Response) => {
      res.json({
        service: "The Lost Sizzler Multiplayer",
        transport: "colyseus",
        version: "0.3.0",
        rooms: ["horde_v1", "dungeon_v1"],
        hordeAuthority: "server",
        dungeonTransport: "colyseus",
        status: "online",
      });
    });

    app.get("/healthz", (_req: Request, res: Response) => {
      res.status(200).json({
        ok: true,
        service: "lost-sizzler-multiplayer",
        version: "0.3.0",
        hordeAuthority: "server",
        dungeonTransport: "colyseus",
      });
    });
  },
});

await server.listen(port);
console.log(`[Lost Sizzler Multiplayer] Colyseus listening on port ${port}`);
