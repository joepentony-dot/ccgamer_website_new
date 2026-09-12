function httpError(statusCode, code, message = code) {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.code = code;
  return error;
}

function pathnameFromRequest(request) {
  if (request?.pathname) return String(request.pathname);
  if (!request?.url) return '/';
  try {
    return new URL(String(request.url), 'https://ccg.invalid').pathname;
  } catch {
    throw httpError(400, 'invalid_request_url');
  }
}

export function createLostSizzlerCommerceRouter({ commerceHttp, paypalWebhookHttp, secureDownloadHttp = null } = {}) {
  if (!commerceHttp?.handles || !commerceHttp?.handle) {
    throw new Error('C64 Dungeon Carnage commerce router requires the authenticated commerce HTTP boundary.');
  }
  if (!paypalWebhookHttp?.handles || !paypalWebhookHttp?.handle) {
    throw new Error('C64 Dungeon Carnage commerce router requires the verified PayPal webhook HTTP boundary.');
  }
  if (secureDownloadHttp && (!secureDownloadHttp?.handles || !secureDownloadHttp?.handle)) {
    throw new Error('C64 Dungeon Carnage commerce router secure download boundary is invalid.');
  }

  return Object.freeze({
    async handle(request) {
      const method = String(request?.method || 'GET').toUpperCase();
      const pathname = pathnameFromRequest(request);

      // PayPal's provider-authenticated webhook must be routed before account-authenticated
      // commerce traffic. Its own boundary performs PayPal signature verification before
      // reconciliation can run.
      if (paypalWebhookHttp.handles(method, pathname)) {
        return paypalWebhookHttp.handle({ ...request, method }, pathname);
      }

      // Purchaser downloads are account-authenticated but have a stricter entitlement and
      // private-delivery contract than ordinary commerce requests, so route them through
      // their dedicated boundary before the general account-commerce handler.
      if (secureDownloadHttp?.handles(method, pathname)) {
        return secureDownloadHttp.handle({ ...request, method }, pathname);
      }

      if (commerceHttp.handles(method, pathname)) {
        return commerceHttp.handle({ ...request, method }, pathname);
      }

      throw httpError(404, 'not_found');
    },
  });
}
