# The Lost Sizzler Multiplayer Server

Authoritative Colyseus server for The Lost Sizzler online modes.

## Current migration stage

- Colyseus 0.18 server foundation.
- Render-ready health endpoint at `/healthz`.
- First `horde_v1` room with a four-player cap, synchronized player state, 20 Hz authoritative timestep and compact movement messages.
- Existing Supabase gameplay networking remains untouched while the Colyseus path is developed and tested.
- Supabase remains the intended home for website authentication, saves, Weekly Vault, leaderboards and persistent account data.

## Local development

Requires Node.js 22 or newer.

```bash
npm install
npm run dev
```

The server uses `PORT` when supplied and otherwise listens on port `10000`.

## Production build

```bash
npm install
npm run build
npm start
```

## Render

The repository root contains `render.yaml`. A Render Blueprint can create the free Frankfurt web service automatically.

The service root directory is `multiplayer-server`, its health check path is `/healthz`, and public WebSocket/HTTP traffic uses the single Render web-service port.
