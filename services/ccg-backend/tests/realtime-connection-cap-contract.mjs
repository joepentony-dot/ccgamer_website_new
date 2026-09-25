import assert from 'node:assert/strict';
import http from 'node:http';
import { WebSocket } from 'ws';
import { createLostSizzlerRealtimeWebSocketTransport } from '../src/lost-sizzler-realtime-ws.mjs';

const ALLOWED_ORIGIN = 'https://www.cheekycommodoregamer.co.uk';

function connectWithHello(url) {
  return new Promise((resolve, reject) => {
    const socket = new WebSocket(url, { origin: ALLOWED_ORIGIN });
    const timer = setTimeout(() => {
      cleanup();
      socket.terminate();
      reject(new Error('Timed out opening capped realtime socket.'));
    }, 2_000);
    let opened = false;
    let hello = null;

    const maybeResolve = () => {
      if (!opened || !hello) return;
      cleanup();
      resolve(socket);
    };
    const onOpen = () => {
      opened = true;
      maybeResolve();
    };
    const onMessage = (data, isBinary) => {
      if (isBinary) return;
      try {
        const frame = JSON.parse(Buffer.from(data).toString('utf8'));
        if (frame?.type === 'hello') {
          hello = frame;
          maybeResolve();
        }
      } catch {}
    };
    const onError = (error) => {
      cleanup();
      reject(error);
    };

    function cleanup() {
      clearTimeout(timer);
      socket.off('open', onOpen);
      socket.off('message', onMessage);
      socket.off('error', onError);
    }

    socket.on('open', onOpen);
    socket.on('message', onMessage);
    socket.on('error', onError);
  });
}

function expectUpgradeStatus(url, expectedStatus) {
  return new Promise((resolve, reject) => {
    const socket = new WebSocket(url, { origin: ALLOWED_ORIGIN });
    const timer = setTimeout(() => {
      socket.terminate();
      reject(new Error(`Timed out waiting for HTTP ${expectedStatus} realtime rejection.`));
    }, 2_000);

    socket.once('unexpected-response', (_request, response) => {
      clearTimeout(timer);
      try {
        assert.equal(response.statusCode, expectedStatus);
        response.resume();
        resolve();
      } catch (error) {
        reject(error);
      }
    });
    socket.once('open', () => {
      clearTimeout(timer);
      socket.terminate();
      reject(new Error('Realtime capacity rejection unexpectedly opened a WebSocket.'));
    });
    socket.once('error', () => {});
  });
}

function closeSocket(socket) {
  if (!socket || socket.readyState === WebSocket.CLOSED) return Promise.resolve();
  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      socket.terminate();
      resolve();
    }, 500);
    socket.once('close', () => {
      clearTimeout(timer);
      resolve();
    });
    socket.close();
  });
}

async function waitFor(check, label, timeoutMs = 2_000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    if (check()) return;
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  throw new Error(`Timed out waiting for ${label}.`);
}

assert.throws(
  () => createLostSizzlerRealtimeWebSocketTransport({
    allowedOrigins: new Set([ALLOWED_ORIGIN]),
    maxSockets: 0,
  }),
  /Realtime max sockets must be between 1 and 10000/
);
assert.throws(
  () => createLostSizzlerRealtimeWebSocketTransport({
    allowedOrigins: new Set([ALLOWED_ORIGIN]),
    maxSockets: 10_001,
  }),
  /Realtime max sockets must be between 1 and 10000/
);

const server = http.createServer((_request, response) => {
  response.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
  response.end('not found\n');
});
const transport = createLostSizzlerRealtimeWebSocketTransport({
  allowedOrigins: new Set([ALLOWED_ORIGIN]),
  maxSockets: 2,
  pingIntervalMs: 1_000,
});
transport.attach(server);

await new Promise((resolve, reject) => {
  server.once('error', reject);
  server.listen(0, '127.0.0.1', resolve);
});
const address = server.address();
assert.ok(address && typeof address === 'object');
const url = `ws://127.0.0.1:${address.port}${transport.endpointPath}`;

const first = await connectWithHello(url);
const second = await connectWithHello(url);
assert.equal(transport.diagnostics().socketCount, 2);

await expectUpgradeStatus(url, 503);
assert.equal(transport.diagnostics().socketCount, 2, 'Rejected capacity probe must not create a session.');

await closeSocket(first);
await waitFor(() => transport.diagnostics().socketCount === 1, 'capacity release after disconnect');

const replacement = await connectWithHello(url);
assert.equal(transport.diagnostics().socketCount, 2, 'A released slot must be reusable without restarting the service.');

await Promise.all([closeSocket(second), closeSocket(replacement)]);
await waitFor(() => transport.diagnostics().socketCount === 0, 'socket cleanup');
await transport.close();
await new Promise((resolve) => server.close(resolve));

console.log('Lost Sizzler realtime connection-cap contract passed: anonymous WebSocket sessions are bounded, excess upgrades receive HTTP 503, rejected upgrades create no session and disconnected capacity is reusable.');
