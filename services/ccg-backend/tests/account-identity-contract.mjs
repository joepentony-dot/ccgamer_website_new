import assert from 'node:assert/strict';
import { createAccountStore } from '../src/account-store.mjs';
import { createCcgAuthProvider } from '../client/ccg-auth-provider.mjs';

const queries = [];
const database = {
  async query(sql, params) {
    queries.push({ sql, params });
    return {
      rows: [{
        user_id: 'user-1',
        email: 'Player@Example.test',
        email_confirmed_at: '2026-09-01T12:00:00.000Z',
        password_hash: '$2b$10$must-never-leave-the-store',
        source_app_metadata: { admin: true },
      }],
    };
  },
};

const accounts = createAccountStore(database);
const account = await accounts.getPublic(' user-1 ');
assert.deepEqual(account, {
  user_id: 'user-1',
  email: 'Player@Example.test',
  email_confirmed_at: '2026-09-01T12:00:00.000Z',
});
assert.equal(queries.length, 1);
assert.deepEqual(queries[0].params, ['user-1']);
assert.match(queries[0].sql, /select user_id, email, email_confirmed_at/i);
assert.doesNotMatch(queries[0].sql, /password_hash|source_app_metadata|source_user_metadata/i);
assert.equal(JSON.stringify(account).includes('must-never-leave-the-store'), false);
assert.equal(await accounts.getPublic(''), null, 'Blank ownership keys must fail locally without a database query.');
assert.equal(queries.length, 1);

const ccgClient = {
  async me() {
    return {
      ok: true,
      kind: 'success',
      status: 200,
      user_id: 'user-1',
      email: 'Player@Example.test',
      email_confirmed_at: '2026-09-01T12:00:00.000Z',
      profile: null,
    };
  },
  getAccessToken() {
    return 'access-token';
  },
  getUserId() {
    return 'user-1';
  },
};

const provider = createCcgAuthProvider({ provider: 'ccg', ccgClient });
const current = await provider.currentUser();
assert.equal(current.ok, true);
assert.equal(current.provider, 'ccg');
assert.deepEqual(current.user, {
  id: 'user-1',
  email: 'Player@Example.test',
  email_confirmed_at: '2026-09-01T12:00:00.000Z',
});
assert.equal(current.profile, null, 'Auth-only migrated users must remain valid without a fabricated profile.');

console.log('CCG account identity contract passed: current-user identity includes the safe account email projection, auth-only users remain valid, and credential/source metadata cannot escape through the public account store.');
