import assert from 'node:assert/strict';
import {
  createStagingBrowserPilot,
  readStagingBrowserPilotEnabled,
} from '../src/staging-browser-pilot.mjs';

function responseCapture() {
  return {
    statusCode: null,
    headers: null,
    body: '',
    writeHead(statusCode, headers) {
      this.statusCode = statusCode;
      this.headers = headers;
    },
    end(chunk = '') {
      this.body += Buffer.isBuffer(chunk) ? chunk.toString('utf8') : String(chunk || '');
    },
  };
}

assert.equal(readStagingBrowserPilotEnabled('', 'local'), false);
assert.equal(readStagingBrowserPilotEnabled('false', 'local'), false);
assert.equal(readStagingBrowserPilotEnabled('TRUE', 'local'), true);
assert.throws(
  () => readStagingBrowserPilotEnabled('1', 'local'),
  /expected true or false/,
  'The staging pilot gate must reject ambiguous boolean values.'
);
assert.throws(
  () => readStagingBrowserPilotEnabled('true', 'external'),
  /requires CCG_AUTH_MODE=local/,
  'The staging browser pilot must not run against external authentication mode.'
);
assert.equal(createStagingBrowserPilot({ enabled: false }), null, 'The browser pilot must fail closed when disabled.');

const pilot = createStagingBrowserPilot({ enabled: true });
assert.equal(pilot.handles('GET', '/staging-auth-pilot'), true);
assert.equal(pilot.handles('POST', '/staging-auth-pilot'), false);
assert.equal(pilot.handles('GET', '/anything-else'), false);

const wrongHost = responseCapture();
pilot.handle({ headers: { host: 'ccg-backend-staging.onrender.com' } }, wrongHost);
assert.equal(wrongHost.statusCode, 404, 'The pilot must not render on the raw onrender.com hostname.');
assert.match(wrongHost.headers['x-robots-tag'], /noindex/);

const response = responseCapture();
pilot.handle({ headers: { host: 'staging-auth.cheekycommodoregamer.co.uk' } }, response);
assert.equal(response.statusCode, 200);
assert.equal(response.headers['cache-control'], 'no-store');
assert.equal(response.headers['x-frame-options'], 'DENY');
assert.equal(response.headers['referrer-policy'], 'no-referrer');
assert.match(response.headers['x-robots-tag'], /noindex/);
assert.match(response.headers['content-security-policy'], /default-src 'none'/);
assert.match(response.headers['content-security-policy'], /connect-src 'self'/);
assert.doesNotMatch(response.headers['content-security-policy'], /unsafe-inline/);

assert.match(response.body, /type="password"/);
assert.match(response.body, /autocomplete="current-password"/);
assert.match(response.body, /credentials: 'include'/);
assert.match(response.body, /\/v1\/auth\/login/);
assert.match(response.body, /\/v1\/auth\/refresh/);
assert.match(response.body, /\/v1\/auth\/logout/);
assert.match(response.body, /\/v1\/me/);
assert.match(response.body, /\/v1\/lost-sizzler\/cloud-save/);
assert.match(response.body, /\/v1\/lost-sizzler\/weekly-vault/);
assert.match(response.body, /body: \{ action: 'status' \}/);
assert.match(response.body, /body: \{ action: 'ghost' \}/);
assert.doesNotMatch(response.body, /method: 'PUT'/, 'The staging pilot must not write cloud saves.');
assert.doesNotMatch(response.body, /body: \{ action: 'start'/, 'The staging pilot must not start Weekly Vault attempts.');
assert.doesNotMatch(response.body, /body: \{ action: 'finish'/, 'The staging pilot must not finish Weekly Vault attempts.');
assert.doesNotMatch(response.body, /localStorage/);
assert.doesNotMatch(response.body, /sessionStorage/);
assert.doesNotMatch(response.body, /document\.cookie/);

console.log('CCG staging browser pilot contract passed for fail-closed enablement, custom-host isolation, no-store browser handling, session rotation/revocation checks, and read-only Lost Sizzler owner checks.');
