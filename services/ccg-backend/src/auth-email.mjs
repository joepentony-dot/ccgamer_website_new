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

export function createAuthEmailSender({ apiKey, from, verifyUrl, fetchImpl = globalThis.fetch } = {}) {
  if (!apiKey || !from || !verifyUrl) throw new Error('CCG auth email sender requires API key, from address and verification URL.');
  if (typeof fetchImpl !== 'function') throw new Error('CCG auth email sender requires fetch.');

  const parsedVerifyUrl = new URL(verifyUrl);
  if (parsedVerifyUrl.protocol !== 'https:' || parsedVerifyUrl.search || parsedVerifyUrl.hash) {
    throw new Error('CCG auth verification URL must be HTTPS without query or fragment.');
  }

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
            to: [destination],
            subject: 'Confirm your Cheeky Commodore Gamer account',
            text,
            html,
          }),
        });
      } catch {
        throw emailError('verification_email_unavailable');
      }
      if (!response.ok) throw emailError('verification_email_unavailable');
      return Object.freeze({ sent: true });
    },
  });
}
