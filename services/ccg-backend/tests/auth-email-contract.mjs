import assert from 'node:assert/strict';
import { createAuthEmailSender, createAuthRecoveryEmailSender } from '../src/auth-email.mjs';

function response(ok = true) {
  return { ok };
}

const calls = [];
const fetchImpl = async (url, options) => {
  calls.push({ url, options: structuredClone(options) });
  return response(true);
};

assert.throws(
  () => createAuthRecoveryEmailSender({
    apiKey: 'key',
    from: 'CCG <accounts@example.test>',
    recoveryUrl: 'http://example.test/reset',
    fetchImpl,
  }),
  /must be HTTPS/
);
assert.throws(
  () => createAuthRecoveryEmailSender({
    apiKey: 'key',
    from: 'CCG <accounts@example.test>',
    recoveryUrl: 'https://example.test/reset?token=preloaded',
    fetchImpl,
  }),
  /without query or fragment/
);

const recoverySender = createAuthRecoveryEmailSender({
  apiKey: 'resend-contract-key',
  from: 'CCG <accounts@example.test>',
  recoveryUrl: 'https://www.cheekycommodoregamer.co.uk/account/reset-password',
  fetchImpl,
});
await recoverySender.sendRecovery({
  email: 'player@example.test',
  token: 'abc_DEF-123<unsafe>',
  expires_at: '2030-01-01T00:30:00.000Z',
});
assert.equal(calls.length, 1);
assert.equal(calls[0].url, 'https://api.resend.com/emails');
assert.equal(calls[0].options.method, 'POST');
assert.equal(calls[0].options.headers.authorization, 'Bearer resend-contract-key');
const recoveryBody = JSON.parse(calls[0].options.body);
assert.equal(recoveryBody.from, 'CCG <accounts@example.test>');
assert.deepEqual(recoveryBody.to, ['player@example.test']);
assert.equal(recoveryBody.subject, 'Reset your Cheeky Commodore Gamer password');
assert.match(recoveryBody.text, /reset-password\?token=abc_DEF-123%3Cunsafe%3E/);
assert.doesNotMatch(recoveryBody.html, /<unsafe>/, 'Recovery token content must not be able to inject HTML.');
assert.match(recoveryBody.html, /abc_DEF-123%3Cunsafe%3E/);

const verifyCalls = [];
const verificationSender = createAuthEmailSender({
  apiKey: 'verify-key',
  from: 'CCG <accounts@example.test>',
  verifyUrl: 'https://www.cheekycommodoregamer.co.uk/account/verify-email',
  fetchImpl: async (url, options) => {
    verifyCalls.push({ url, options: structuredClone(options) });
    return response(true);
  },
});
await verificationSender.sendVerification({
  email: 'new@example.test',
  token: 'safe_verification_token',
  expiresAt: '2030-01-01T00:15:00.000Z',
});
assert.equal(verifyCalls.length, 1, 'Existing verification-email delivery must remain functional.');
assert.equal(JSON.parse(verifyCalls[0].options.body).subject, 'Confirm your Cheeky Commodore Gamer account');

const offlineSender = createAuthRecoveryEmailSender({
  apiKey: 'key',
  from: 'CCG <accounts@example.test>',
  recoveryUrl: 'https://www.cheekycommodoregamer.co.uk/account/reset-password',
  fetchImpl: async () => { throw new Error('offline'); },
});
await assert.rejects(
  () => offlineSender.sendRecovery({
    email: 'player@example.test',
    token: 'A'.repeat(43),
    expires_at: '2030-01-01T00:30:00.000Z',
  }),
  (error) => error?.code === 'recovery_email_unavailable' && error?.statusCode === 503
);

const rejectedSender = createAuthRecoveryEmailSender({
  apiKey: 'key',
  from: 'CCG <accounts@example.test>',
  recoveryUrl: 'https://www.cheekycommodoregamer.co.uk/account/reset-password',
  fetchImpl: async () => response(false),
});
await assert.rejects(
  () => rejectedSender.sendRecovery({
    email: 'player@example.test',
    token: 'B'.repeat(43),
    expires_at: '2030-01-01T00:30:00.000Z',
  }),
  (error) => error?.code === 'recovery_email_unavailable' && error?.statusCode === 503
);

console.log('CCG auth email contract passed: verification and recovery mail stay server-side, action URLs are HTTPS-only, reset tokens are URL/HTML safe and Resend failures fail closed.');
