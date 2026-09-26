import { randomBytes } from 'node:crypto';

const PILOT_PATH = '/staging-auth-pilot';
const EXPECTED_HOST = 'staging-auth.cheekycommodoregamer.co.uk';

function normalizedHost(request) {
  return String(request?.headers?.host || '')
    .trim()
    .toLowerCase()
    .replace(/:\d+$/, '');
}

function writeHtml(response, statusCode, body, headers = {}) {
  const payload = Buffer.from(String(body || ''), 'utf8');
  response.writeHead(statusCode, {
    'content-type': 'text/html; charset=utf-8',
    'content-length': payload.length,
    'cache-control': 'no-store',
    'x-content-type-options': 'nosniff',
    'x-frame-options': 'DENY',
    'referrer-policy': 'no-referrer',
    'x-robots-tag': 'noindex, nofollow, noarchive',
    'permissions-policy': 'camera=(), microphone=(), geolocation=()',
    'cross-origin-opener-policy': 'same-origin',
    'cross-origin-resource-policy': 'same-origin',
    ...headers,
  });
  response.end(payload);
}

function pilotHtml(nonce) {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>CCG Staging Authentication Check</title>
  <style nonce="${nonce}">
    :root { color-scheme: dark; font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
    body { margin: 0; background: #0b0d12; color: #eef2f7; }
    main { width: min(760px, calc(100% - 32px)); margin: 48px auto; }
    section { background: #151922; border: 1px solid #2a3140; border-radius: 14px; padding: 24px; }
    h1 { margin-top: 0; font-size: 1.65rem; }
    p { line-height: 1.55; color: #c7ced9; }
    label { display: block; margin: 16px 0 6px; font-weight: 700; }
    input { box-sizing: border-box; width: 100%; padding: 12px; border: 1px solid #414b5f; border-radius: 8px; background: #0f131a; color: #fff; font: inherit; }
    button { margin-top: 20px; padding: 12px 18px; border: 0; border-radius: 8px; font: inherit; font-weight: 800; cursor: pointer; }
    button:disabled { opacity: .55; cursor: wait; }
    #results { margin: 24px 0 0; padding-left: 24px; }
    #results li { margin: 9px 0; line-height: 1.45; }
    .pass { color: #a8f0bd; }
    .fail { color: #ffb3b3; }
    .note { color: #d8dce5; }
    code { overflow-wrap: anywhere; }
  </style>
</head>
<body>
  <main>
    <section>
      <h1>CCG staging authentication check</h1>
      <p>This page is enabled only on the CCG staging backend. Your password is sent only to the same-origin staging login endpoint and is not written to browser storage or displayed in the results.</p>
      <p>The check performs authentication-session changes only. Cloud-save and Weekly Vault checks are read-only: it does not upload a save, start a Weekly Vault attempt, or finish one.</p>
      <form id="pilot-form" autocomplete="on">
        <label for="pilot-email">Existing account email</label>
        <input id="pilot-email" name="email" type="email" autocomplete="username" required>
        <label for="pilot-password">Existing account password</label>
        <input id="pilot-password" name="password" type="password" autocomplete="current-password" required>
        <button id="pilot-run" type="submit">Run staging check</button>
      </form>
      <ol id="results" aria-live="polite"></ol>
    </section>
  </main>
  <script nonce="${nonce}">
    (() => {
      'use strict';

      const form = document.getElementById('pilot-form');
      const emailInput = document.getElementById('pilot-email');
      const passwordInput = document.getElementById('pilot-password');
      const button = document.getElementById('pilot-run');
      const results = document.getElementById('results');

      function addResult(kind, message) {
        const item = document.createElement('li');
        item.className = kind;
        item.textContent = message;
        results.appendChild(item);
      }

      async function requestJson(path, { method = 'GET', token = '', body } = {}) {
        const headers = { accept: 'application/json' };
        if (token) headers.authorization = 'Bearer ' + token;
        if (body !== undefined) headers['content-type'] = 'application/json';
        const response = await fetch(path, {
          method,
          headers,
          credentials: 'include',
          cache: 'no-store',
          body: body === undefined ? undefined : JSON.stringify(body),
        });
        let payload = null;
        try {
          payload = await response.json();
        } catch {
          payload = null;
        }
        return { status: response.status, payload };
      }

      function requireStatus(label, result, expected = 200) {
        if (result.status !== expected) {
          const code = result.payload && typeof result.payload.error === 'string'
            ? ' (' + result.payload.error + ')'
            : '';
          throw new Error(label + ' returned HTTP ' + result.status + code);
        }
      }

      form.addEventListener('submit', async (event) => {
        event.preventDefault();
        results.replaceChildren();
        button.disabled = true;

        let oldToken = '';
        let newToken = '';
        let loginUserId = '';
        let loginCompleted = false;

        try {
          const email = emailInput.value.trim();
          let password = passwordInput.value;
          if (!email || !password) throw new Error('Enter the existing account email and password.');

          addResult('note', 'Checking migrated bcrypt login...');
          const login = await requestJson('/v1/auth/login', {
            method: 'POST',
            body: { email, password },
          });
          password = '';
          passwordInput.value = '';
          requireStatus('Login', login);
          oldToken = String(login.payload?.access_token || '');
          loginUserId = String(login.payload?.user_id || '');
          if (!oldToken || !loginUserId) throw new Error('Login response did not contain the expected session fields.');
          loginCompleted = true;
          addResult('pass', 'PASS — existing migrated account login succeeded.');

          const firstMe = await requestJson('/v1/me', { token: oldToken });
          requireStatus('/v1/me after login', firstMe);
          if (String(firstMe.payload?.user_id || '') !== loginUserId) throw new Error('/v1/me returned a different user id from login.');
          addResult('pass', 'PASS — /v1/me matched the logged-in account.');

          const cloudSave = await requestJson('/v1/lost-sizzler/cloud-save', { token: oldToken });
          requireStatus('Cloud-save read', cloudSave);
          addResult('pass', cloudSave.payload?.save ? 'PASS — authenticated cloud-save read succeeded and this account has a save.' : 'PASS — authenticated cloud-save read succeeded; this account has no save record.');

          const weeklyStatus = await requestJson('/v1/lost-sizzler/weekly-vault', {
            method: 'POST',
            token: oldToken,
            body: { action: 'status' },
          });
          requireStatus('Weekly Vault status read', weeklyStatus);
          addResult('pass', 'PASS — authenticated Weekly Vault status read succeeded.');

          const weeklyGhost = await requestJson('/v1/lost-sizzler/weekly-vault', {
            method: 'POST',
            token: oldToken,
            body: { action: 'ghost' },
          });
          if (weeklyGhost.status === 200) {
            addResult('pass', 'PASS — authenticated Weekly Vault ghost read succeeded.');
          } else if (weeklyGhost.status === 403 || weeklyGhost.status === 409) {
            addResult('note', 'NOTE — Weekly Vault ghost read reached the authenticated account boundary, but this account does not currently have a usable Weekly Vault profile.');
          } else {
            requireStatus('Weekly Vault ghost read', weeklyGhost);
          }

          const refresh = await requestJson('/v1/auth/refresh', { method: 'POST' });
          requireStatus('Refresh', refresh);
          newToken = String(refresh.payload?.access_token || '');
          if (!newToken || newToken === oldToken) throw new Error('Refresh did not rotate the access token.');
          addResult('pass', 'PASS — refresh-cookie rotation succeeded.');

          const oldTokenAfterRefresh = await requestJson('/v1/me', { token: oldToken });
          requireStatus('Old access token after refresh', oldTokenAfterRefresh, 401);
          addResult('pass', 'PASS — the pre-refresh access token was revoked with its old session.');

          const secondMe = await requestJson('/v1/me', { token: newToken });
          requireStatus('/v1/me after refresh', secondMe);
          if (String(secondMe.payload?.user_id || '') !== loginUserId) throw new Error('/v1/me changed account identity after refresh.');
          addResult('pass', 'PASS — the rotated access token remains valid for the same account.');

          const logout = await requestJson('/v1/auth/logout', { method: 'POST' });
          requireStatus('Logout', logout);
          if (logout.payload?.revoked !== true) throw new Error('Logout did not report the active refresh session as revoked.');
          loginCompleted = false;
          addResult('pass', 'PASS — logout revoked the active refresh session.');

          const newTokenAfterLogout = await requestJson('/v1/me', { token: newToken });
          requireStatus('Access token after logout', newTokenAfterLogout, 401);
          addResult('pass', 'PASS — the access token was rejected after logout.');

          const refreshAfterLogout = await requestJson('/v1/auth/refresh', { method: 'POST' });
          requireStatus('Refresh after logout', refreshAfterLogout, 401);
          addResult('pass', 'PASS — the cleared/revoked refresh session cannot be reused.');

          addResult('pass', 'STAGING AUTH CHECK PASSED. No cloud-save or Weekly Vault write was performed.');
        } catch (error) {
          addResult('fail', 'FAIL — ' + (error?.message || 'Unknown staging test error.'));
        } finally {
          passwordInput.value = '';
          oldToken = '';
          newToken = '';
          loginUserId = '';
          if (loginCompleted) {
            try {
              await requestJson('/v1/auth/logout', { method: 'POST' });
            } catch {
              // Best-effort cleanup only. The page never persists the access token.
            }
          }
          button.disabled = false;
        }
      });
    })();
  </script>
</body>
</html>`;
}

export function readStagingBrowserPilotEnabled(rawValue, authMode) {
  const value = String(rawValue || '').trim().toLowerCase();
  if (!value || value === 'false') return false;
  if (value !== 'true') throw new Error('Invalid CCG_STAGING_BROWSER_PILOT_ENABLED: expected true or false.');
  if (authMode !== 'local') throw new Error('CCG_STAGING_BROWSER_PILOT_ENABLED requires CCG_AUTH_MODE=local.');
  return true;
}

export function createStagingBrowserPilot({ enabled = false } = {}) {
  if (!enabled) return null;

  return Object.freeze({
    handles(method, pathname) {
      return method === 'GET' && pathname === PILOT_PATH;
    },

    handle(request, response) {
      if (normalizedHost(request) !== EXPECTED_HOST) {
        writeHtml(response, 404, '<!doctype html><title>Not found</title><p>Not found.</p>');
        return;
      }

      const nonce = randomBytes(18).toString('base64');
      writeHtml(response, 200, pilotHtml(nonce), {
        'content-security-policy': `default-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'; connect-src 'self'; img-src 'self'; style-src 'nonce-${nonce}'; script-src 'nonce-${nonce}'`,
      });
    },
  });
}
