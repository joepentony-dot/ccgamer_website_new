import assert from 'node:assert/strict';
import http from 'node:http';
import net from 'node:net';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { WebSocket } from 'ws';

const BROWSER_ORIGIN = 'https://www.cheekycommodoregamer.co.uk';
const SERVICE_ROOT = fileURLToPath(new URL('../', import.meta.url));

async function reservePort() {
  const server = net.createServer();
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  const address = server.address();
  assert.ok(address && typeof address === 'object');
  const port = address.port;
  await new Promise((resolve) => server.close(resolve));
  return port;
}

function backendEnvironment(port, enabled) {
  return {
    ...process.env,
    PORT: String(port),
    DATABASE_URL: 'postgresql://ccg_test:ccg_test@127.0.0.1:65432/ccg_test',
    CCG_ALLOWED_ORIGINS: BROWSER_ORIGIN,
    CCG_AUTH_MODE: 'external',
    CCG_JWT_ISSUER: 'https://identity.example.test/',
    CCG_JWT_AUDIENCE: 'ccg-backend',
    CCG_JWT_JWKS_URL: 'https://identity.example.test/.well-known/jwks.json',
    CCG_LOST_SIZZLER_REALTIME_ENABLED: enabled ? 'true' : 'false',
  };
}

function startBackend(port, enabled) {
  const child = spawn(process.execPath, ['src/server.mjs'], {
    cwd: SERVICE_ROOT,
    env: backendEnvironment(port, enabled),
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let stdout = '';
  let stderr = '';

  const ready = new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`Timed out starting backend. stdout=${stdout} stderr=${stderr}`));
    }, 5_000);

    const maybeReady = () => {
      if (!stdout.includes('listening on 127.0.0.1:')) return;
      clearTimeout(timer);
      resolve();
    };

    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString('utf8');
      maybeReady();
    });
    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString('utf8');
    });
    child.once('exit', (code, signal) => {
      clearTimeout(timer);
      if (!stdout.includes('listening on 127.0.0.1:')) {
        reject(new Error(`Backend exited before startup (code=${code}, signal=${signal}). stdout=${stdout} stderr=${stderr}`));
      }
    });
  });

  return {
    child,
    ready,
    output() {
      return { stdout, stderr };
    },
  };
}

function getJson(port, path) {
  return new Promise((resolve, reject) => {
    const request = http.get({ hostname: '127.0.0.1', port, path, timeout: 2_000 }, (response) => {
      const chunks = [];
      response.on('data', (chunk) => chunks.push(chunk));
      response.on('end', () => {
        try {
          resolve({
            statusCode: response.statusCode,
            body: JSON.parse(Buffer.concat(chunks).toString('utf8')),
          });
        } catch (error) {
          reject(error);
        }
      });
    });
    request.once('timeout', () => request.destroy(new Error('HTTP request timed out.')));
    request.once('error', reject);
  });
}

function expectHello(port) {
  return new Promise((resolve, reject) => {
    const socket = new WebSocket(`ws://127.0.0.1:${port}/v1/lost-sizzler/realtime`, { origin: BROWSER_ORIGIN });
    const timer = setTimeout(() => {
      socket.terminate();
      reject(new Error('Timed out waiting for backend realtime hello.'));
    }, 3_000);

    socket.on('message', (data, isBinary) => {
      if (isBinary) return;
      let frame;
      try {
        frame = JSON.parse(Buffer.from(data).toString('utf8'));
      } catch {
        return;
      }
      if (frame?.type !== 'hello') return;
      clearTimeout(timer);
      socket.close();
      resolve(frame);
    });
    socket.once('error', (error) => {
      clearTimeout(timer);
      reject(error);
    });
  });
}

function expectRealtimeUnavailable(port) {
  return new Promise((resolve, reject) => {
    const socket = new WebSocket(`ws://127.0.0.1:${port}/v1/lost-sizzler/realtime`, { origin: BROWSER_ORIGIN });
    let opened = false;
    let settled = false;
    const finish = (error = null) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      try { socket.terminate(); } catch {}
      if (error) reject(error);
      else resolve();
    };
    const timer = setTimeout(() => finish(new Error('Disabled realtime endpoint did not reject the WebSocket attempt.')), 3_000);

    socket.once('open', () => {
      opened = true;
      finish(new Error('Realtime WebSocket opened while CCG_LOST_SIZZLER_REALTIME_ENABLED=false.'));
    });
    socket.once('unexpected-response', (_request, response) => {
      response.resume();
      finish();
    });
    socket.once('error', () => {
      if (!opened) finish();
    });
    socket.once('close', () => {
      if (!opened) finish();
    });
  });
}

async function stopBackend(instance) {
  if (instance.child.exitCode !== null || instance.child.signalCode !== null) return;
  const exited = new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      try { instance.child.kill('SIGKILL'); } catch {}
      reject(new Error(`Timed out stopping backend. ${JSON.stringify(instance.output())}`));
    }, 4_000);
    instance.child.once('exit', (code, signal) => {
      clearTimeout(timer);
      resolve({ code, signal });
    });
  });
  instance.child.kill('SIGTERM');
  await exited;
}

const disabledPort = await reservePort();
const disabled = startBackend(disabledPort, false);
try {
  await disabled.ready;
  const health = await getJson(disabledPort, '/health');
  assert.equal(health.statusCode, 200);
  assert.equal(health.body.ok, true);
  assert.equal(health.body.service, 'ccg-backend');
  assert.equal(health.body.lost_sizzler_realtime, false);
  assert.match(disabled.output().stdout, /realtime disabled/);
  await expectRealtimeUnavailable(disabledPort);
} finally {
  await stopBackend(disabled);
}

const enabledPort = await reservePort();
const enabled = startBackend(enabledPort, true);
try {
  await enabled.ready;
  const health = await getJson(enabledPort, '/health');
  assert.equal(health.statusCode, 200);
  assert.equal(health.body.lost_sizzler_realtime, true);
  assert.match(enabled.output().stdout, /realtime enabled/);

  const hello = await expectHello(enabledPort);
  assert.match(hello.sessionId, /^[A-Za-z0-9_-]{16}$/);
  assert.equal(hello.protocol, 'ccg-lost-sizzler-realtime-v1');
} finally {
  await stopBackend(enabled);
}

console.log('CCG backend realtime opt-in contract passed: the production server keeps Lost Sizzler WebSockets disabled by default, reports the disabled boundary, rejects upgrades while disabled and serves the tested CCG realtime protocol only after explicit enablement.');
