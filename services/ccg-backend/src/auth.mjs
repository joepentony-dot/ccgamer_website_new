import { createRemoteJWKSet, jwtVerify } from 'jose';

export function createAuth(config) {
  const jwks = createRemoteJWKSet(new URL(config.jwtJwksUrl));

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
        const { payload } = await jwtVerify(token, jwks, {
          issuer: config.jwtIssuer,
          audience: config.jwtAudience,
        });
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
