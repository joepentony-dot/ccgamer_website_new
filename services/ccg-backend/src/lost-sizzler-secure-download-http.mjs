const DOWNLOAD_PATH = '/v1/lost-sizzler/commerce/downloads/offline';

function httpError(statusCode, code, message = code) {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.code = code;
  return error;
}

export function createLostSizzlerSecureDownloadHttp({ auth, downloads } = {}) {
  if (!auth?.verifyBearer) throw new Error('C64 Dungeon Carnage secure download HTTP boundary requires authentication.');
  if (!downloads?.issueOfflineDownload) throw new Error('C64 Dungeon Carnage secure download HTTP boundary requires the download service.');

  return Object.freeze({
    handles(method, pathname) {
      return method === 'POST' && pathname === DOWNLOAD_PATH;
    },

    async handle(request, pathname) {
      if (request?.method !== 'POST' || pathname !== DOWNLOAD_PATH) throw httpError(404, 'not_found');

      const identity = await auth.verifyBearer(request?.headers?.authorization);
      if (!identity?.userId) throw httpError(401, 'authentication_required');

      return Object.freeze({
        statusCode: 200,
        body: await downloads.issueOfflineDownload(identity.userId),
        headers: Object.freeze({
          'cache-control': 'no-store, private',
          pragma: 'no-cache',
        }),
      });
    },
  });
}
