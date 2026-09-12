const TRUE_VALUES = new Set(['1', 'true', 'yes', 'on']);
const FALSE_VALUES = new Set(['', '0', 'false', 'no', 'off']);

function readText(env, name) {
  return String(env?.[name] ?? '').trim();
}

function readBoolean(env, name, fallback = false) {
  const raw = readText(env, name).toLowerCase();
  if (!raw) return fallback;
  if (TRUE_VALUES.has(raw)) return true;
  if (FALSE_VALUES.has(raw)) return false;
  throw new Error(`C64 Dungeon Carnage commerce environment variable ${name} must be a boolean value.`);
}

function requireText(env, name) {
  const value = readText(env, name);
  if (!value) throw new Error(`C64 Dungeon Carnage commerce requires ${name}.`);
  return value;
}

function requireEnvironment(env) {
  const value = requireText(env, 'CCG_COMMERCE_PAYPAL_ENVIRONMENT').toLowerCase();
  if (!['sandbox', 'live'].includes(value)) {
    throw new Error('C64 Dungeon Carnage commerce PayPal environment must be sandbox or live.');
  }
  return value;
}

export function createLostSizzlerCommerceRuntimeConfig(env = process.env) {
  const commerceEnabled = readBoolean(env, 'CCG_COMMERCE_ENABLED', false);

  if (!commerceEnabled) {
    return Object.freeze({ commerceEnabled: false });
  }

  const paypalEnvironment = requireEnvironment(env);
  if (paypalEnvironment === 'live' && !readBoolean(env, 'CCG_COMMERCE_LIVE_ACKNOWLEDGED', false)) {
    throw new Error('C64 Dungeon Carnage live commerce requires explicit CCG_COMMERCE_LIVE_ACKNOWLEDGED=true.');
  }

  return Object.freeze({
    commerceEnabled: true,
    paypalEnvironment,
    paypalClientId: requireText(env, 'CCG_COMMERCE_PAYPAL_CLIENT_ID'),
    paypalClientSecret: requireText(env, 'CCG_COMMERCE_PAYPAL_CLIENT_SECRET'),
    paypalWebhookId: requireText(env, 'CCG_COMMERCE_PAYPAL_WEBHOOK_ID'),
  });
}
