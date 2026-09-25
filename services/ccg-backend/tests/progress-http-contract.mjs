import assert from 'node:assert/strict';
import { Readable } from 'node:stream';
import { createLostSizzlerProgressHttp } from '../src/lost-sizzler-progress-http.mjs';

function request(method, body, headers = {}) {
  const stream = Readable.from(body === undefined ? [] : [Buffer.from(body, 'utf8')]);
  stream.method = method;
  stream.headers = {
    'content-type': 'application/json',
    ...headers,
  };
  return stream;
}

const calls = [];
const auth = {
  async verifyBearer(value) {
    if (value === 'Bearer valid') return { userId: 'progress-http-user' };
    throw Object.assign(new Error('invalid_token'), { statusCode: 401, code: 'invalid_token' });
  },
};
const progress = {
  async listAchievements(userId) {
    calls.push({ method: 'listAchievements', userId });
    return [{ achievement_key: 'solo.floor-5' }];
  },
  async unlockAchievement(userId, body) {
    calls.push({ method: 'unlockAchievement', userId, body });
    return { achievement_key: body.achievement_key, idempotent: false };
  },
  async getCollection(userId) {
    calls.push({ method: 'getCollection', userId });
    return { revision: 1, payload: { unlocked: ['disk-1'] } };
  },
  async putCollection(userId, body) {
    calls.push({ method: 'putCollection', userId, body });
    if (body.expected_revision === 99) {
      throw Object.assign(new Error('collection_revision_conflict'), { statusCode: 409, code: 'collection_revision_conflict' });
    }
    return { revision: body.expected_revision + 1, payload: body.payload };
  },
};

const http = createLostSizzlerProgressHttp({ auth, progress });
assert.equal(http.handles('GET', '/v1/lost-sizzler/achievements'), true);
assert.equal(http.handles('GET', '/v1/lost-sizzler/collection'), true);
assert.equal(http.handles('GET', '/v1/lost-sizzler/other'), false);

const unauthorized = await http.handle(request('GET'), '/v1/lost-sizzler/achievements');
assert.equal(unauthorized.statusCode, 401);
assert.equal(unauthorized.body.error, 'invalid_token');

const achievements = await http.handle(
  request('GET', undefined, { authorization: 'Bearer valid' }),
  '/v1/lost-sizzler/achievements'
);
assert.equal(achievements.statusCode, 200);
assert.equal(achievements.body.achievements[0].achievement_key, 'solo.floor-5');
assert.equal(calls[0].userId, 'progress-http-user');

const unlocked = await http.handle(
  request('POST', JSON.stringify({ achievement_key: 'solo.floor-10' }), { authorization: 'Bearer valid' }),
  '/v1/lost-sizzler/achievements'
);
assert.equal(unlocked.statusCode, 200);
assert.equal(unlocked.body.achievement.achievement_key, 'solo.floor-10');

const collection = await http.handle(
  request('GET', undefined, { authorization: 'Bearer valid' }),
  '/v1/lost-sizzler/collection'
);
assert.equal(collection.statusCode, 200);
assert.equal(collection.body.collection.revision, 1);

const pushed = await http.handle(
  request('PUT', JSON.stringify({ expected_revision: 1, payload: { unlocked: ['disk-1', 'disk-2'] } }), { authorization: 'Bearer valid' }),
  '/v1/lost-sizzler/collection'
);
assert.equal(pushed.statusCode, 200);
assert.equal(pushed.body.collection.revision, 2);

const conflict = await http.handle(
  request('PUT', JSON.stringify({ expected_revision: 99, payload: {} }), { authorization: 'Bearer valid' }),
  '/v1/lost-sizzler/collection'
);
assert.equal(conflict.statusCode, 409);
assert.equal(conflict.body.error, 'collection_revision_conflict');

const methodNotAllowed = await http.handle(
  request('DELETE', undefined, { authorization: 'Bearer valid' }),
  '/v1/lost-sizzler/collection'
);
assert.equal(methodNotAllowed.statusCode, 405);
assert.equal(methodNotAllowed.headers.allow, 'GET, PUT, OPTIONS');

console.log('Lost Sizzler progress HTTP contract passed: authenticated achievement and collection routes preserve identity and revision conflicts.');
