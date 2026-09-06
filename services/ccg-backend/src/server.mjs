import http from 'node:http';
import { loadConfig } from './config.mjs';
import { createDatabase } from './db.mjs';
import { createAuth } from './auth.mjs';
import { createProfileStore } from './profile-store.mjs';
import { createCloudSaveStore, readJsonBody } from './cloud-save.mjs';

function writeJson(response, statusCode, body, headers = {}) {
  const payload = Buffer.from(`${JSON.stringify(body)}\n`, 'utf8');
  response.writeHead(statusCode, {
    'content-type': 'application/json; charset=utf-8',
    'content-length': payload.length,
    'cache-control': 'no-store',
    ...headers,
  });
  response.end(payload);
}

function corsHeaders(request, config) {
  const origin = request.headers.origin;
  if (!origin) return {};
  if (!config.allowedOrigins.has(origin)) return null;
  return {
    'access-control-allow-origin': origin,
    'access-control-allow-credentials': 'true',
    'vary': 'Origin',
  };
}

async function main() {
  const config = loadConfig();
  const database = createDatabase(config.databaseUrl);
  const auth = createAuth(config);
  const profiles = createProfileStore(database);
  const cloudSaves = createCloudSaveStore(database);

  const server = http.createServer(async (request, response) => {
    const cors = corsHeaders(request, config);
    if (cors === null) {
      writeJson(response, 403, { error: 'origin_not_allowed' });
      return;
    }

    if (request.method === 'OPTIONS') {
      response.writeHead(204, {
        ...cors,
        'access-control-allow-methods': 'GET,PUT,OPTIONS',
        'access-control-allow-headers': 'authorization,content-type',
        'access-control-max-age': '600',
      });
      response.end();
      return;
    }

    try {
      const url = new URL(request.url || '/', 'http://localhost');

      if (request.method === 'GET' && url.pathname === '/health') {
        writeJson(response, 200, { ok: true, service: config.serviceName }, cors);
        return;
      }

      if (request.method === 'GET' && url.pathname === '/ready') {
        const databaseOk = await database.ping();
        writeJson(response, databaseOk ? 200 : 503, { ok: databaseOk, database: databaseOk }, cors);
        return;
      }

      if (request.method === 'GET' && url.pathname === '/v1/me') {
        const identity = await auth.verifyBearer(request.headers.authorization);
        const profile = await profiles.get(identity.userId);
        writeJson(response, 200, { user_id: identity.userId, profile }, cors);
        return;
      }

      if (url.pathname === '/v1/lost-sizzler/cloud-save') {
        const identity = await auth.verifyBearer(request.headers.authorization);

        if (request.method === 'GET') {
          const save = await cloudSaves.get(identity.userId);
          writeJson(response, 200, { save }, cors);
          return;
        }

        if (request.method === 'PUT') {
          const body = await readJsonBody(request);
          const save = await cloudSaves.put(identity.userId, body);
          writeJson(response, 200, { save }, cors);
          return;
        }
      }

      writeJson(response, 404, { error: 'not_found' }, cors);
    } catch (error) {
      const statusCode = Number.isInteger(error?.statusCode) ? error.statusCode : 500;
      const errorCode = statusCode === 500 ? 'internal_error' : (error.code || error.message);
      writeJson(response, statusCode, { error: errorCode }, cors || {});
    }
  });

  const shutdown = async () => {
    server.close(async () => {
      await database.close();
      process.exit(0);
    });
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  server.listen(config.port, '127.0.0.1', () => {
    console.log(`${config.serviceName} listening on 127.0.0.1:${config.port}`);
  });
}

main().catch((error) => {
  console.error(`CCG backend failed to start: ${error.message}`);
  process.exitCode = 1;
});
