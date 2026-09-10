import { randomUUID } from 'node:crypto';

const PRODUCT_SLUG = 'the-lost-sizzler-full-game';
const GAME_SLUG = 'the-lost-sizzler';

function commerceError(statusCode, code, message = code) {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.code = code;
  return error;
}

function requireUserId(value) {
  const userId = String(value || '').trim();
  if (!userId || userId.length > 256) throw commerceError(401, 'authentication_required');
  return userId;
}

function requireProviderOrderId(value) {
  const orderId = String(value || '').trim();
  if (!/^[A-Za-z0-9-]{1,128}$/.test(orderId)) throw commerceError(400, 'invalid_paypal_order_id');
  return orderId;
}

function minorFromProviderValue(value) {
  const raw = String(value || '').trim();
  const match = raw.match(/^(\d{1,7})\.(\d{2})$/);
  if (!match) return null;
  const minor = Number(match[1]) * 100 + Number(match[2]);
  return Number.isSafeInteger(minor) ? minor : null;
}

function publicProduct(row) {
  if (!row) return null;
  return Object.freeze({
    product_slug: String(row.product_slug),
    game_slug: String(row.game_slug),
    title: String(row.title),
    currency: String(row.currency),
    price_minor: Number(row.price_minor),
    permanent: String(row.entitlement_kind) === 'permanent',
    includes_all_updates: Boolean(row.includes_all_updates),
  });
}

function publicEntitlement(row) {
  if (!row) {
    return Object.freeze({
      product_slug: PRODUCT_SLUG,
      owned: false,
      permanent: true,
      includes_all_updates: true,
      granted_at: null,
    });
  }
  return Object.freeze({
    product_slug: String(row.product_slug),
    owned: String(row.status) === 'active',
    permanent: String(row.entitlement_kind) === 'permanent',
    includes_all_updates: Boolean(row.includes_all_updates),
    granted_at: row.granted_at ? new Date(row.granted_at).toISOString() : null,
  });
}

export function createLostSizzlerCommerceService({
  database,
  gateway = null,
  commerceEnabled = false,
  randomUuidImpl = randomUUID,
} = {}) {
  if (!database?.query || !database?.transaction) throw new Error('Lost Sizzler commerce requires a database.');
  if (commerceEnabled && (!gateway?.createOrder || !gateway?.captureOrder || !gateway?.publicConfig)) {
    throw new Error('Enabled Lost Sizzler commerce requires a PayPal Orders gateway.');
  }
  if (typeof randomUuidImpl !== 'function') throw new Error('Lost Sizzler commerce requires a UUID source.');

  async function readProduct(queryable = database) {
    const result = await queryable.query(
      `select product_slug, game_slug, title, currency, price_minor, entitlement_kind, includes_all_updates, active
         from game_products
        where product_slug = $1`,
      [PRODUCT_SLUG]
    );
    const row = result.rows?.[0] || null;
    if (!row || !row.active) throw commerceError(503, 'product_unavailable');
    if (String(row.game_slug) !== GAME_SLUG || String(row.entitlement_kind) !== 'permanent') {
      throw commerceError(500, 'invalid_product_configuration');
    }
    return row;
  }

  async function readEntitlement(userId, queryable = database) {
    const result = await queryable.query(
      `select e.product_slug, e.entitlement_kind, e.status, e.granted_at, p.includes_all_updates
         from game_entitlements e
         join game_products p on p.product_slug = e.product_slug
        where e.user_id = $1 and e.product_slug = $2`,
      [userId, PRODUCT_SLUG]
    );
    return result.rows?.[0] || null;
  }

  async function markFailed(localOrderId, code) {
    await database.query(
      `update game_purchase_orders
          set status = 'failed', failure_code = $2, updated_at = now()
        where id = $1 and status in ('creating','created')`,
      [localOrderId, String(code || 'payment_failed').slice(0, 160)]
    );
  }

  return Object.freeze({
    async offer() {
      const product = publicProduct(await readProduct());
      const paypal = commerceEnabled ? gateway.publicConfig() : null;
      return Object.freeze({
        commerce_available: Boolean(commerceEnabled),
        requires_account: true,
        product,
        paypal: paypal ? Object.freeze({ environment: paypal.environment, client_id: paypal.clientId }) : null,
        message: 'Unlock The Lost Sizzler permanently. Your purchase is tied to your CCG account, supports continued development and support, and includes all future game updates at no extra charge.',
      });
    },

    async entitlement(userIdValue) {
      const userId = requireUserId(userIdValue);
      await readProduct();
      return publicEntitlement(await readEntitlement(userId));
    },

    async createOrder(userIdValue) {
      const userId = requireUserId(userIdValue);
      if (!commerceEnabled) throw commerceError(503, 'commerce_unavailable');
      const product = await readProduct();
      const existingEntitlement = await readEntitlement(userId);
      if (existingEntitlement?.status === 'active') {
        return Object.freeze({ already_owned: true, entitlement: publicEntitlement(existingEntitlement) });
      }

      const localOrderId = String(randomUuidImpl());
      if (!/^[0-9a-f-]{36}$/i.test(localOrderId)) throw new Error('Commerce UUID source returned an invalid UUID.');
      await database.query(
        `insert into game_purchase_orders
          (id, user_id, product_slug, amount_minor, currency, status)
         values ($1, $2, $3, $4, $5, 'creating')`,
        [localOrderId, userId, PRODUCT_SLUG, Number(product.price_minor), String(product.currency)]
      );

      let providerOrder;
      try {
        providerOrder = await gateway.createOrder({
          requestId: `create:${localOrderId}`,
          localOrderId,
          amountMinor: Number(product.price_minor),
          currency: String(product.currency),
          description: 'The Lost Sizzler — permanent full-game unlock including all future updates',
        });
      } catch (error) {
        await markFailed(localOrderId, error?.code || 'paypal_create_failed');
        throw error;
      }

      const providerOrderId = requireProviderOrderId(providerOrder.orderId);
      await database.query(
        `update game_purchase_orders
            set provider_order_id = $2,
                provider_status = $3,
                status = 'created',
                updated_at = now()
          where id = $1 and status = 'creating'`,
        [localOrderId, providerOrderId, String(providerOrder.status || 'CREATED').slice(0, 64)]
      );

      return Object.freeze({
        already_owned: false,
        order_id: providerOrderId,
        product: publicProduct(product),
      });
    },

    async captureOrder(userIdValue, providerOrderIdValue) {
      const userId = requireUserId(userIdValue);
      if (!commerceEnabled) throw commerceError(503, 'commerce_unavailable');
      const providerOrderId = requireProviderOrderId(providerOrderIdValue);

      const existing = await database.query(
        `select id, user_id, product_slug, provider_order_id, provider_capture_id,
                amount_minor, currency, status
           from game_purchase_orders
          where provider_order_id = $1 and user_id = $2`,
        [providerOrderId, userId]
      );
      const purchase = existing.rows?.[0] || null;
      if (!purchase) throw commerceError(404, 'purchase_order_not_found');

      if (purchase.status === 'completed') {
        const entitlement = await readEntitlement(userId);
        if (!entitlement || entitlement.status !== 'active') throw commerceError(409, 'purchase_reconciliation_required');
        return Object.freeze({ completed: true, entitlement: publicEntitlement(entitlement) });
      }
      if (purchase.status !== 'created') throw commerceError(409, 'purchase_order_not_capturable');

      const captured = await gateway.captureOrder({
        orderId: providerOrderId,
        requestId: `capture:${purchase.id}`,
      });
      const capturedMinor = minorFromProviderValue(captured.value);
      const valid = (
        captured.orderId === providerOrderId &&
        captured.orderStatus === 'COMPLETED' &&
        captured.captureStatus === 'COMPLETED' &&
        Boolean(captured.captureId) &&
        captured.customId === String(purchase.id) &&
        captured.currency === String(purchase.currency) &&
        capturedMinor === Number(purchase.amount_minor)
      );
      if (!valid) {
        await markFailed(purchase.id, 'paypal_capture_mismatch');
        throw commerceError(409, 'purchase_reconciliation_required');
      }

      return database.transaction(async (tx) => {
        const locked = await tx.query(
          `select id, status, amount_minor, currency
             from game_purchase_orders
            where id = $1 and user_id = $2
            for update`,
          [purchase.id, userId]
        );
        const current = locked.rows?.[0] || null;
        if (!current) throw commerceError(404, 'purchase_order_not_found');

        if (current.status !== 'completed') {
          if (current.status !== 'created') throw commerceError(409, 'purchase_reconciliation_required');
          if (Number(current.amount_minor) !== capturedMinor || String(current.currency) !== captured.currency) {
            throw commerceError(409, 'purchase_reconciliation_required');
          }
          await tx.query(
            `update game_purchase_orders
                set provider_capture_id = $2,
                    provider_status = 'COMPLETED',
                    status = 'completed',
                    failure_code = null,
                    completed_at = now(),
                    updated_at = now()
              where id = $1`,
            [purchase.id, captured.captureId]
          );
          await tx.query(
            `insert into game_entitlements
              (user_id, product_slug, entitlement_kind, status, source_provider, source_purchase_id, granted_at, revoked_at, revoked_reason, updated_at)
             values ($1, $2, 'permanent', 'active', 'paypal', $3, now(), null, null, now())
             on conflict (user_id, product_slug) do update
               set entitlement_kind = 'permanent',
                   status = 'active',
                   source_provider = 'paypal',
                   source_purchase_id = excluded.source_purchase_id,
                   granted_at = case
                     when game_entitlements.status = 'active' then game_entitlements.granted_at
                     else excluded.granted_at
                   end,
                   revoked_at = null,
                   revoked_reason = null,
                   updated_at = now()`,
            [userId, PRODUCT_SLUG, purchase.id]
          );
        }

        const entitlement = await readEntitlement(userId, tx);
        if (!entitlement || entitlement.status !== 'active') throw commerceError(500, 'entitlement_grant_failed');
        return Object.freeze({ completed: true, entitlement: publicEntitlement(entitlement) });
      });
    },
  });
}
