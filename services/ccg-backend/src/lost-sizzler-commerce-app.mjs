import { createLostSizzlerCommerceService } from './lost-sizzler-commerce.mjs';
import { createLostSizzlerCommerceHttp } from './lost-sizzler-commerce-http.mjs';
import { createLostSizzlerCommerceReconciliation } from './lost-sizzler-commerce-reconciliation.mjs';
import { createLostSizzlerCommerceRouter } from './lost-sizzler-commerce-router.mjs';
import { createLostSizzlerPayPalWebhookHttp } from './lost-sizzler-paypal-webhook-http.mjs';
import { createLostSizzlerSecureDownloadService } from './lost-sizzler-secure-download.mjs';
import { createLostSizzlerSecureDownloadHttp } from './lost-sizzler-secure-download-http.mjs';
import { createPayPalOrdersGateway } from './paypal-orders.mjs';
import { createPayPalWebhookVerifier } from './paypal-webhooks.mjs';

const WEBHOOK_PATH = '/v1/lost-sizzler/commerce/paypal/webhook';

function httpError(statusCode, code, message = code) {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.code = code;
  return error;
}

function requireDatabase(database) {
  if (!database?.query || !database?.transaction) {
    throw new Error('C64 Dungeon Carnage commerce application requires a database adapter.');
  }
  return database;
}

function requireAuth(auth) {
  if (!auth?.verifyBearer) {
    throw new Error('C64 Dungeon Carnage commerce application requires an authentication adapter.');
  }
  return auth;
}

function requireText(value, name) {
  const text = String(value || '').trim();
  if (!text) throw new Error(`C64 Dungeon Carnage commerce requires ${name}.`);
  return text;
}

function requirePayPalConfig(config) {
  const environment = String(config?.paypalEnvironment || '').trim().toLowerCase();
  if (!['sandbox', 'live'].includes(environment)) {
    throw new Error('C64 Dungeon Carnage commerce requires PayPal environment sandbox or live.');
  }
  return Object.freeze({
    environment,
    clientId: requireText(config?.paypalClientId, 'PayPal client id'),
    clientSecret: requireText(config?.paypalClientSecret, 'PayPal client secret'),
    webhookId: requireText(config?.paypalWebhookId, 'PayPal webhook id'),
  });
}

function createDisabledWebhookHttp() {
  return Object.freeze({
    handles(method, pathname) {
      return method === 'POST' && pathname === WEBHOOK_PATH;
    },
    async handle() {
      throw httpError(503, 'commerce_unavailable');
    },
  });
}

export function createLostSizzlerCommerceApplication({
  database,
  auth,
  config = {},
  packageDelivery = null,
  fetchImpl = globalThis.fetch,
  now = () => Date.now(),
  randomUuidImpl,
} = {}) {
  const db = requireDatabase(database);
  const authentication = requireAuth(auth);
  const commerceEnabled = config?.commerceEnabled === true;

  let gateway = null;
  let paypalWebhookHttp = createDisabledWebhookHttp();

  if (commerceEnabled) {
    const paypal = requirePayPalConfig(config);
    gateway = createPayPalOrdersGateway({
      environment: paypal.environment,
      clientId: paypal.clientId,
      clientSecret: paypal.clientSecret,
      fetchImpl,
      now,
    });
    const verifier = createPayPalWebhookVerifier({
      environment: paypal.environment,
      clientId: paypal.clientId,
      clientSecret: paypal.clientSecret,
      webhookId: paypal.webhookId,
      fetchImpl,
      now,
    });
    const reconciliation = createLostSizzlerCommerceReconciliation({ database: db });
    paypalWebhookHttp = createLostSizzlerPayPalWebhookHttp({ verifier, reconciliation });
  }

  const commerce = createLostSizzlerCommerceService({
    database: db,
    gateway,
    commerceEnabled,
    ...(randomUuidImpl ? { randomUuidImpl } : {}),
  });
  const commerceHttp = createLostSizzlerCommerceHttp({ auth: authentication, commerce });

  let secureDownloadHttp = null;
  if (packageDelivery) {
    const downloads = createLostSizzlerSecureDownloadService({
      commerce,
      delivery: packageDelivery,
      now,
    });
    secureDownloadHttp = createLostSizzlerSecureDownloadHttp({ auth: authentication, downloads });
  }

  const router = createLostSizzlerCommerceRouter({ commerceHttp, paypalWebhookHttp, secureDownloadHttp });

  return Object.freeze({
    router,
    status: Object.freeze({
      commerce_enabled: commerceEnabled,
      provider: commerceEnabled ? 'paypal' : null,
      webhook_enabled: commerceEnabled,
      secure_download_enabled: Boolean(secureDownloadHttp),
    }),
  });
}
