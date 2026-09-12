function httpError(statusCode, code, message = code) {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.code = code;
  return error;
}

function eventBody(request) {
  const body = request?.body;
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw httpError(400, 'invalid_paypal_webhook_body');
  }
  return body;
}

function relatedId(event, key) {
  const value = event?.resource?.supplementary_data?.related_ids?.[key];
  return value ? String(value).trim() : null;
}

function captureId(event) {
  return (
    relatedId(event, 'capture_id') ||
    (String(event?.event_type || '').startsWith('PAYMENT.CAPTURE.') && event?.resource?.id
      ? String(event.resource.id).trim()
      : null)
  );
}

function orderId(event) {
  return relatedId(event, 'order_id');
}

export function createLostSizzlerPayPalWebhookHttp({ verifier, reconciliation } = {}) {
  if (!verifier?.verify) {
    throw new Error('C64 Dungeon Carnage PayPal webhook HTTP boundary requires a verifier.');
  }
  if (!reconciliation?.applyVerifiedPayPalEvent) {
    throw new Error('C64 Dungeon Carnage PayPal webhook HTTP boundary requires reconciliation.');
  }

  const pathname = '/v1/lost-sizzler/commerce/paypal/webhook';

  return Object.freeze({
    handles(method, candidatePathname) {
      return method === 'POST' && candidatePathname === pathname;
    },

    async handle(request, candidatePathname) {
      if (request?.method !== 'POST' || candidatePathname !== pathname) {
        throw httpError(404, 'not_found');
      }

      const event = eventBody(request);
      const verified = await verifier.verify({
        headers: request.headers || {},
        event,
      });

      if (!verified?.verified || verified.event !== event) {
        throw httpError(401, 'paypal_webhook_not_verified');
      }

      const result = await reconciliation.applyVerifiedPayPalEvent({
        eventId: String(event.id || '').trim(),
        eventType: String(event.event_type || '').trim(),
        providerOrderId: orderId(event),
        providerCaptureId: captureId(event),
        rawPayload: request.rawBody ?? event,
      });

      return Object.freeze({
        statusCode: 200,
        body: {
          received: true,
          status: result?.status || null,
          replay: Boolean(result?.replay),
          outcome: result?.outcome || null,
        },
        headers: {},
      });
    },
  });
}
