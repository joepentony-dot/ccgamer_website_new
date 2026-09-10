import http from 'node:http';
import { promises as fs } from 'node:fs';
import { loadConfig } from './config.mjs';
import { createDatabase } from './db.mjs';
import { createAuth } from './auth.mjs';
import { createLocalAuthService } from './local-auth.mjs';
import { createAuthHttp } from './auth-http.mjs';
import { createAuthEmailSender, createAuthRecoveryEmailSender } from './auth-email.mjs';
import { createAuthRegistrationService } from './auth-registration.mjs';
import { createAuthRegistrationHttp } from './auth-registration-http.mjs';
import { createPasswordRecoveryService } from './password-recovery.mjs';
import { createAuthRecoveryHttp } from './auth-recovery-http.mjs';
import { createAccountStore } from './account-store.mjs';
import { createProfileStore } from './profile-store.mjs';
import { createCloudSaveStore, readJsonBody } from './cloud-save.mjs';
import { createWeeklyVaultService } from './weekly-vault.mjs';
import { createWeeklyVaultHttp } from './weekly-vault-http.mjs';
import { createLostSizzlerFeedbackService } from './lost-sizzler-feedback.mjs';
import { createLostSizzlerFeedbackHttp } from './lost-sizzler-feedback-http.mjs';
import { createLostSizzlerProgressStore } from './lost-sizzler-progress.mjs';
import { createLostSizzlerProgressHttp } from './lost-sizzler-progress-http.mjs';
import { createLostSizzlerRealtimeWebSocketTransport } from './lost-sizzler-realtime-ws.mjs';
import { createPayPalOrdersGateway } from './paypal-orders.mjs';
import { createLostSizzlerCommerceService } from './lost-sizzler-commerce.mjs';
import { createLostSizzlerCommerceHttp } from './lost-sizzler-commerce-http.mjs';
import { createStagingBrowserPilot, readStagingBrowserPilotEnabled } from './staging-browser-pilot.mjs';

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

async function readJwkFile(filePath, label) {
  const bytes = await fs.readFile(filePath);
  if (bytes.length < 2 || bytes.length > 64 * 1024) throw new Error(`Invalid ${label} file size.`);
  try {
    const parsed = JSON.parse(bytes.toString('utf8'));
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('JWK object required');
    return parsed;
  } catch {
    throw new Error(`Invalid ${label} JSON.`);
  }
}

async function createAuthentication(config, database) {
  if (config.authMode !== 'local') {
    return Object.freeze({ auth: createAuth(config), authHttp: null });
  }

  const privateJwk = await readJwkFile(config.localAuth.privateJwkFile, 'local-auth signing JWK');
  const publicJwk = await readJwkFile(config.localAuth.publicJwkFile, 'local-auth public JWK');
  const auth = createLocalAuthService({
    database,
    issuer: config.localAuth.issuer,
    audience: config.localAuth.audience,
    privateJwk,
    publicJwk,
    keyId: config.localAuth.keyId,
  });
  return Object.freeze({ auth, authHttp: createAuthHttp(auth) });
}

function createRegistration(config, database) {
  if (!config.registrationEnabled) return null;
  const emailSender = createAuthEmailSender({
    apiKey: config.registrationEmail.resendApiKey,
    from: config.registrationEmail.from,
    verifyUrl: config.registrationEmail.verifyUrl,
  });
  const registration = createAuthRegistrationService({ database, emailSender });
  return createAuthRegistrationHttp(registration);
}

function createRecovery(config, database) {
  if (!config.recoveryEnabled) return null;
  const emailSender = createAuthRecoveryEmailSender({
    apiKey: config.recoveryEmail.resendApiKey,
    from: config.recoveryEmail.from,
    recoveryUrl: config.recoveryEmail.recoveryUrl,
  });
  const recovery = createPasswordRecoveryService({
    database,
    sendRecovery: (payload) => emailSender.sendRecovery(payload),
  });
  return createAuthRecoveryHttp(recovery);
}

async function main() {
  const config = loadConfig();
  const database = createDatabase(config.databaseUrl);
  const { auth, authHttp } = await createAuthentication(config, database);
  const stagingBrowserPilot = createStagingBrowserPilot({
    enabled: readStagingBrowserPilotEnabled(process.env.CCG_STAGING_BROWSER_PILOT_ENABLED, config.authMode),
  });
  const registrationHttp = createRegistration(config, database);
  const recoveryHttp = createRecovery(config, database);
  const accounts = createAccountStore(database);
  const profiles = createProfileStore(database);
  const cloudSaves = createCloudSaveStore(database);
  const weeklyVault = createWeeklyVaultService({ database });
  const weeklyVaultHttp = createWeeklyVaultHttp({ auth, weeklyVault });
  const lostSizzlerFeedback = createLostSizzlerFeedbackService({
    database,
    email: config.feedbackEmail,
  });
  const lostSizzlerFeedbackHttp = createLostSizzlerFeedbackHttp({
    auth,
    service: lostSizzlerFeedback,
  });
  const lostSizzlerProgress = createLostSizzlerProgressStore(database);
  const lostSizzlerProgressHttp = createLostSizzlerProgressHttp({
    auth,
    progress: lostSizzlerProgress,
  });
  const paypalGateway = config.lostSizzlerCommerceEnabled
    ? createPayPalOrdersGateway({
        environment: config.paypal.environment,
        clientId: config.paypal.clientId,
        clientSecret: config.paypal.clientSecret,
      })
    : null;
  const lostSizzlerCommerce = createLostSizzlerCommerceService({
    database,
    gateway: paypalGateway,
    commerceEnabled: config.lostSizzlerCommerceEnabled,
  });
  const lostSizzlerCommerceHttp = createLostSizzlerCommerceHttp({
    auth,
    commerce: lostSizzlerCommerce,
  });

  const server = http.createServer(async (request, response) => {
    const cors = corsHeaders(request, config);
    if (cors === null) {
      writeJson(response, 403, { error: 'origin_not_allowed' });
      return;
    }

    if (request.method === 'OPTIONS') {
      response.writeHead(204, {
        ...cors,
        'access-control-allow-methods': 'GET,POST,PUT,OPTIONS',
        'access-control-allow-headers': 'authorization,content-type',
        'access-control-max-age': '600',
      });
      response.end();
      return;
    }

    try {
      const url = new URL(request.url || '/', 'http://localhost');

      if (stagingBrowserPilot?.handles(request.method, url.pathname)) {
        stagingBrowserPilot.handle(request, response);
        return;
      }

      if (request.method === 'GET' && url.pathname === '/health') {
        writeJson(response, 200, {
          ok: true,
          service: config.serviceName,
          auth_mode: config.authMode,
          registration: config.registrationEnabled,
          password_recovery: config.recoveryEnabled,
          lost_sizzler_realtime: config.lostSizzlerRealtimeEnabled,
          lost_sizzler_commerce: config.lostSizzlerCommerceEnabled,
        }, cors);
        return;
      }

      if (request.method === 'GET' && url.pathname === '/ready') {
        const databaseOk = await database.ping();
        writeJson(response, databaseOk ? 200 : 503, { ok: databaseOk, database: databaseOk }, cors);
        return;
      }

      if (registrationHttp?.handles(request.method, url.pathname)) {
        const result = await registrationHttp.handle(request, url.pathname);
        writeJson(response, result.statusCode, result.body, { ...cors, ...result.headers });
        return;
      }

      if (recoveryHttp?.handles(request.method, url.pathname)) {
        const result = await recoveryHttp.handle(request, url.pathname);
        writeJson(response, result.statusCode, result.body, { ...cors, ...result.headers });
        return;
      }

      if (authHttp?.handles(request.method, url.pathname)) {
        const result = await authHttp.handle(request, url.pathname);
        writeJson(response, result.statusCode, result.body, { ...cors, ...result.headers });
        return;
      }

      if (weeklyVaultHttp.handles(request.method, url.pathname)) {
        const result = await weeklyVaultHttp.handle(request, url.pathname);
        writeJson(response, result.statusCode, result.body, { ...cors, ...result.headers });
        return;
      }

      if (lostSizzlerFeedbackHttp.handles(request.method, url.pathname)) {
        const result = await lostSizzlerFeedbackHttp.handle(request);
        writeJson(response, result.statusCode, result.body, { ...cors, ...result.headers });
        return;
      }

      if (lostSizzlerProgressHttp.handles(request.method, url.pathname)) {
        const result = await lostSizzlerProgressHttp.handle(request, url.pathname);
        writeJson(response, result.statusCode, result.body, { ...cors, ...result.headers });
        return;
      }

      if (lostSizzlerCommerceHttp.handles(request.method, url.pathname)) {
        const result = await lostSizzlerCommerceHttp.handle(request, url.pathname);
        writeJson(response, result.statusCode, result.body, { ...cors, ...result.headers });
        return;
      }

      if (request.method === 'GET' && url.pathname === '/v1/me') {
        const identity = await auth.verifyBearer(request.headers.authorization);
        const [account, profile] = await Promise.all([
          accounts.getPublic(identity.userId),
          profiles.get(identity.userId),
        ]);
        writeJson(response, 200, {
          user_id: identity.userId,
          email: account?.email ?? null,
          email_confirmed_at: account?.email_confirmed_at ?? null,
          profile,
        }, cors);
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
      const retryAfter = Number.isSafeInteger(error?.retryAfterSeconds) && error.retryAfterSeconds > 0
        ? { 'retry-after': String(error.retryAfterSeconds) }
        : {};
      writeJson(response, statusCode, { error: errorCode }, { ...(cors || {}), ...retryAfter });
    }
  });

  const realtimeTransport = config.lostSizzlerRealtimeEnabled
    ? createLostSizzlerRealtimeWebSocketTransport({
        allowedOrigins: config.allowedOrigins,
        maxSockets: config.lostSizzlerRealtimeMaxSockets,
      })
    : null;
  realtimeTransport?.attach(server);

  let shuttingDown = false;
  const shutdown = async () => {
    if (shuttingDown) return;
    shuttingDown = true;
    try {
      await realtimeTransport?.close();
    } catch (error) {
      console.error(`CCG realtime shutdown failed: ${error.message}`);
    }
    server.close(async () => {
      await database.close();
      process.exit(0);
    });
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  server.listen(config.port, config.bindHost, () => {
    const realtimeStatus = config.lostSizzlerRealtimeEnabled ? 'realtime enabled' : 'realtime disabled';
    const commerceStatus = config.lostSizzlerCommerceEnabled ? 'commerce enabled' : 'commerce disabled';
    const registrationStatus = config.registrationEnabled ? 'registration enabled' : 'registration disabled';
    const recoveryStatus = config.recoveryEnabled ? 'password recovery enabled' : 'password recovery disabled';
    console.log(`${config.serviceName} listening on ${config.bindHost}:${config.port} (${config.authMode} auth; ${registrationStatus}; ${recoveryStatus}; ${realtimeStatus}; ${commerceStatus})`);
  });
}

main().catch((error) => {
  console.error(`CCG backend failed to start: ${error.message}`);
  process.exitCode = 1;
});
