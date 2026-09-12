function httpError(statusCode, code, message = code) {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.code = code;
  return error;
}

function capturePath(pathname) {
  const match = String(pathname || '').match(/^\/v1\/lost-sizzler\/commerce\/orders\/([A-Za-z0-9-]{1,128})\/capture$/);
  return match ? match[1] : null;
}

export function createLostSizzlerCommerceHttp({ auth, commerce } = {}) {
  if (!auth?.verifyBearer) throw new Error('Lost Sizzler commerce HTTP boundary requires authentication.');
  if (!commerce?.offer || !commerce?.entitlement || !commerce?.createOrder || !commerce?.captureOrder) {
    throw new Error('Lost Sizzler commerce HTTP boundary requires the commerce service.');
  }

  return Object.freeze({
    handles(method, pathname) {
      return (
        (method === 'GET' && pathname === '/v1/lost-sizzler/commerce/offer') ||
        (method === 'GET' && pathname === '/v1/lost-sizzler/commerce/entitlement') ||
        (method === 'POST' && pathname === '/v1/lost-sizzler/commerce/orders') ||
        (method === 'POST' && Boolean(capturePath(pathname)))
      );
    },

    async handle(request, pathname) {
      if (request.method === 'GET' && pathname === '/v1/lost-sizzler/commerce/offer') {
        return Object.freeze({ statusCode: 200, body: await commerce.offer(), headers: {} });
      }

      const identity = await auth.verifyBearer(request.headers.authorization);
      if (!identity?.userId) throw httpError(401, 'authentication_required');

      if (request.method === 'GET' && pathname === '/v1/lost-sizzler/commerce/entitlement') {
        return Object.freeze({
          statusCode: 200,
          body: { entitlement: await commerce.entitlement(identity.userId) },
          headers: {},
        });
      }

      if (request.method === 'POST' && pathname === '/v1/lost-sizzler/commerce/orders') {
        return Object.freeze({
          statusCode: 200,
          body: await commerce.createOrder(identity.userId),
          headers: {},
        });
      }

      const orderId = capturePath(pathname);
      if (request.method === 'POST' && orderId) {
        return Object.freeze({
          statusCode: 200,
          body: await commerce.captureOrder(identity.userId, orderId),
          headers: {},
        });
      }

      throw httpError(404, 'not_found');
    },
  });
}
