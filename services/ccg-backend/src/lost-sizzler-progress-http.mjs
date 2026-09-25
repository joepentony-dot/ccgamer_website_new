import { readJsonBody } from './cloud-save.mjs';

const ACHIEVEMENTS_PATH = '/v1/lost-sizzler/achievements';
const COLLECTION_PATH = '/v1/lost-sizzler/collection';

function requestError(error) {
  const code = String(error?.code || error?.message || '');
  if (code === 'invalid_json') return Object.freeze({ statusCode: 400, body: { error: 'invalid_json' }, headers: {} });
  if (code === 'content_type_must_be_json') return Object.freeze({ statusCode: 415, body: { error: 'content_type_must_be_json' }, headers: {} });
  if (code === 'request_too_large') return Object.freeze({ statusCode: 413, body: { error: 'request_too_large' }, headers: {} });
  if (code === 'empty_request_body') return Object.freeze({ statusCode: 400, body: { error: 'empty_request_body' }, headers: {} });
  const statusCode = Number.isInteger(error?.statusCode) ? error.statusCode : 500;
  return Object.freeze({
    statusCode,
    body: { error: statusCode === 500 ? 'internal_error' : code || 'request_failed' },
    headers: {},
  });
}

export function createLostSizzlerProgressHttp({ auth, progress } = {}) {
  if (!auth?.verifyBearer) throw new Error('Lost Sizzler progress HTTP requires an authentication boundary.');
  if (!progress?.listAchievements || !progress?.unlockAchievement || !progress?.getCollection || !progress?.putCollection) {
    throw new Error('Lost Sizzler progress HTTP requires a progress store.');
  }

  return Object.freeze({
    handles(method, pathname) {
      return pathname === ACHIEVEMENTS_PATH || pathname === COLLECTION_PATH;
    },

    async handle(request, pathname) {
      try {
        const identity = await auth.verifyBearer(request.headers.authorization);
        if (pathname === ACHIEVEMENTS_PATH) {
          if (request.method === 'GET') {
            const achievements = await progress.listAchievements(identity.userId);
            return Object.freeze({ statusCode: 200, body: { achievements }, headers: {} });
          }
          if (request.method === 'POST') {
            const body = await readJsonBody(request);
            const achievement = await progress.unlockAchievement(identity.userId, body);
            return Object.freeze({ statusCode: 200, body: { achievement }, headers: {} });
          }
          return Object.freeze({
            statusCode: 405,
            body: { error: 'method_not_allowed' },
            headers: { allow: 'GET, POST, OPTIONS' },
          });
        }

        if (pathname === COLLECTION_PATH) {
          if (request.method === 'GET') {
            const collection = await progress.getCollection(identity.userId);
            return Object.freeze({ statusCode: 200, body: { collection }, headers: {} });
          }
          if (request.method === 'PUT') {
            const body = await readJsonBody(request);
            const collection = await progress.putCollection(identity.userId, body);
            return Object.freeze({ statusCode: 200, body: { collection }, headers: {} });
          }
          return Object.freeze({
            statusCode: 405,
            body: { error: 'method_not_allowed' },
            headers: { allow: 'GET, PUT, OPTIONS' },
          });
        }

        return Object.freeze({ statusCode: 404, body: { error: 'not_found' }, headers: {} });
      } catch (error) {
        return requestError(error);
      }
    },
  });
}
