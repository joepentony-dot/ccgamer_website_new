function emailError(code, message = code) {
  const error = new Error(message);
  error.code = code;
  error.statusCode = 503;
  return error;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function parseActionUrl(value, label) {
  const parsed = new URL(value);
  if (parsed.protocol !== 'https:' || parsed.search || parsed.hash) {
    throw new Error(`${label} must be HTTPS without query or fragment.`);
  }
  return parsed;
}

async function sendResendEmail({ apiKey, from, to, subject, text, html, fetchImpl, failureCode }) {
  let response;
  try {
    response = await fetchImpl('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        authorization: `Bearer ${apiKey}`,
        'content-type': 'application/json',
        accept: 'application/json',
      },
      body: JSON.stringify({
        from,
        to: [to],
        subject,
        text,
        html,
      }),
    });
  } catch {
    throw emailError(failureCode);
  }
  if (!response.ok) throw emailError(failureCode);
  return Object.freeze({ sent: true });
}

export function createAuthEmailSender({ apiKey, from, verifyUrl, fetchImpl = globalThis.fetch } = {}) {
  if (!apiKey || !from || !verifyUrl) throw new Error('CCG auth email sender requires API key, from address and verification URL.');
  if (typeof fetchImpl !== 'function') throw new Error('CCG auth email sender requires fetch.');

  const parsedVerifyUrl = parseActionUrl(verifyUrl, 'CCG auth verification URL');

  return Object.freeze({
    async sendVerification({ email, token, expiresAt }) {
      const destination = String(email || '').trim();
      const rawToken = String(token || '').trim();
      if (!destination || !rawToken) throw new Error('Verification email requires destination and token.');
      const link = new URL(parsedVerifyUrl.toString());
      link.searchParams.set('token', rawToken);
      const expires = new Date(expiresAt);
      if (!Number.isFinite(expires.getTime())) throw new Error('Verification email requires a valid expiry.');

      const text = [
        'Confirm your Cheeky Commodore Gamer account',
        '',
        'Open this link to verify your email address:',
        link.toString(),
        '',
        `This verification link expires at ${expires.toISOString()}.`,
        '',
        'If you did not create this account, you can ignore this email.',
      ].join('\n');
      const html = `<p><strong>Confirm your Cheeky Commodore Gamer account</strong></p>` +
        `<p><a href="${escapeHtml(link.toString())}">Verify my email address</a></p>` +
        `<p>This verification link expires at ${escapeHtml(expires.toISOString())}.</p>` +
        '<p>If you did not create this account, you can ignore this email.</p>';

      return sendResendEmail({
        apiKey,
        from,
        to: destination,
        subject: 'Confirm your Cheeky Commodore Gamer account',
        text,
        html,
        fetchImpl,
        failureCode: 'verification_email_unavailable',
      });
    },
  });
}

export function createAuthRecoveryEmailSender({ apiKey, from, recoveryUrl, fetchImpl = globalThis.fetch } = {}) {
  if (!apiKey || !from || !recoveryUrl) throw new Error('CCG auth recovery email sender requires API key, from address and recovery URL.');
  if (typeof fetchImpl !== 'function') throw new Error('CCG auth recovery email sender requires fetch.');

  const parsedRecoveryUrl = parseActionUrl(recoveryUrl, 'CCG auth recovery URL');

  return Object.freeze({
    async sendRecovery({ email, token, expires_at: expiresAt }) {
      const destination = String(email || '').trim();
      const rawToken = String(token || '').trim();
      if (!destination || !rawToken) throw new Error('Recovery email requires destination and token.');
      const link = new URL(parsedRecoveryUrl.toString());
      link.searchParams.set('token', rawToken);
      const expires = new Date(expiresAt);
      if (!Number.isFinite(expires.getTime())) throw new Error('Recovery email requires a valid expiry.');

      const text = [
        'Reset your Cheeky Commodore Gamer password',
        '',
        'Open this link to choose a new password:',
        link.toString(),
        '',
        `This password reset link expires at ${expires.toISOString()}.`,
        '',
        'If you did not request a password reset, you can ignore this email.',
      ].join('\n');
      const html = `<p><strong>Reset your Cheeky Commodore Gamer password</strong></p>` +
        `<p><a href="${escapeHtml(link.toString())}">Choose a new password</a></p>` +
        `<p>This password reset link expires at ${escapeHtml(expires.toISOString())}.</p>` +
        '<p>If you did not request a password reset, you can ignore this email.</p>';

      return sendResendEmail({
        apiKey,
        from,
        to: destination,
        subject: 'Reset your Cheeky Commodore Gamer password',
        text,
        html,
        fetchImpl,
        failureCode: 'recovery_email_unavailable',
      });
    },
  });
}
