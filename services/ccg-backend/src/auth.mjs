import { createRemoteJWKSet, jwtVerify } from 'jose';

function requireUrl(value, name) {
  let url;
  try {
    url = new URL(String(value || '').trim());
  } catch {
    throw new Error(`C64 Dungeon Carnage authentication requires valid ${name}.`);
  }
  if (!['https:', 'http:'].includes(url.protocol)) {
    throw new Error(`C64 Dungeon Carnage authentication ${name} must use HTTP or HTTPS.`);
  }
  return url;
}

function requireText(value, name) {
  const text = String(value || '').trim();
  if (!text) throw new Error(`C64 Dungeon Carnage authentication requires ${name}.`);
  return text;
}

export function createAuth(config = {}) {
  const issuer = requireText(config.jwtIssuer, 'JWT issuer');
  const audience = requireText(config.jwtAudience, 'JWT audience');
  const jwksUrl = requireUrl(config.jwtJwksUrl, 'JWT JWKS URL');
  const jwks = createRemoteJWKSet(jwksUrl);

  return Object.freeze({
    async verifyBearer(authorization) {
      if (!authorization?.startsWith('Bearer ')) {
        const error = new Error('Missing bearer token');
        error.statusCode = 401;
        throw error;
      }

      const token = authorization.slice('Bearer '.length).trim();
      if (!token) {
        const error = new Error('Missing bearer token');
        error.statusCode = 401;
        throw error;
      }

      try {
        const { payload } = await jwtVerify(token, jwks, { issuer, audience });
        if (typeof payload.sub !== 'string' || !payload.sub) throw new Error('Token is missing subject');
        return Object.freeze({ userId: payload.sub, claims: payload });
      } catch {
        const error = new Error('Invalid bearer token');
        error.statusCode = 401;
        throw error;
      }
    },
  });
}
