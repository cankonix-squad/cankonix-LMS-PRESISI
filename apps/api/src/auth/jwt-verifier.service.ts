import { Inject, Injectable, Logger } from '@nestjs/common';
import { createPublicKey, createVerify, type KeyObject } from 'node:crypto';
import { AUTH_CONFIG, AuthConfig } from './auth.config';
import { AuthClaims } from './auth.types';
import { JWKS_PROVIDER, JsonWebKey, JwksProvider } from './jwks.provider';

/** Raised for any rejected token. Callers must not surface the reason to clients. */
export class TokenValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TokenValidationError';
  }
}

const SIGNATURE_ALGORITHMS: Record<string, string> = {
  RS256: 'RSA-SHA256',
  RS384: 'RSA-SHA384',
  RS512: 'RSA-SHA512',
};

type JwtHeader = {
  alg?: unknown;
  kid?: unknown;
  typ?: unknown;
};

type JwtPayload = {
  sub?: unknown;
  iss?: unknown;
  aud?: unknown;
  exp?: unknown;
  nbf?: unknown;
  iat?: unknown;
};

@Injectable()
export class JwtVerifier {
  private readonly logger = new Logger(JwtVerifier.name);

  constructor(
    @Inject(AUTH_CONFIG) private readonly config: AuthConfig | null,
    @Inject(JWKS_PROVIDER) private readonly jwks: JwksProvider,
  ) {}

  async verify(token: string): Promise<AuthClaims> {
    const config = this.config;
    if (!config) {
      throw new TokenValidationError('Authentication is not configured');
    }

    const segments = token.split('.');
    if (segments.length !== 3) {
      throw new TokenValidationError('Token is not a compact JWS');
    }
    const [encodedHeader, encodedPayload, encodedSignature] = segments;
    if (!encodedHeader || !encodedPayload || !encodedSignature) {
      throw new TokenValidationError('Token is not a compact JWS');
    }

    const header = decodeJsonSegment<JwtHeader>(encodedHeader, 'header');
    const payload = decodeJsonSegment<JwtPayload>(encodedPayload, 'payload');

    const algorithm = readAlgorithm(header);
    const key = await this.resolveSigningKey(header, algorithm);
    verifySignature(
      algorithm,
      key,
      `${encodedHeader}.${encodedPayload}`,
      encodedSignature,
    );

    return validateClaims(payload, config);
  }

  private async resolveSigningKey(
    header: JwtHeader,
    algorithm: string,
  ): Promise<KeyObject> {
    const kid = typeof header.kid === 'string' ? header.kid : '';
    if (!kid) {
      throw new TokenValidationError(
        'Token header is missing a key identifier',
      );
    }

    let keys = await this.jwks.getKeys();
    let jwk = findKey(keys, kid);
    if (!jwk) {
      // A previously unseen `kid` usually means the identity provider rotated keys.
      keys = await this.jwks.getKeys({ forceRefresh: true });
      jwk = findKey(keys, kid);
    }
    if (!jwk) {
      throw new TokenValidationError(`No signing key matches kid ${kid}`);
    }
    if (jwk.alg && jwk.alg !== algorithm) {
      throw new TokenValidationError(
        'Signing key algorithm does not match the token',
      );
    }

    try {
      return createPublicKey({ key: jwk, format: 'jwk' });
    } catch (error) {
      this.logger.warn(
        `Signing key ${kid} could not be imported: ${String(error)}`,
      );
      throw new TokenValidationError('Signing key could not be imported');
    }
  }
}

function validateClaims(payload: JwtPayload, config: AuthConfig): AuthClaims {
  const subject = typeof payload.sub === 'string' ? payload.sub.trim() : '';
  if (!subject) {
    throw new TokenValidationError('Token subject is missing');
  }

  if (typeof payload.iss !== 'string' || payload.iss !== config.issuer) {
    throw new TokenValidationError('Token issuer is not trusted');
  }

  const audience = readAudience(payload.aud);
  if (!audience.includes(config.audience)) {
    throw new TokenValidationError('Token audience is not accepted');
  }

  const now = Math.floor(Date.now() / 1000);
  const skew = config.clockSkewSeconds;

  const expiresAt = readNumericDate(payload.exp, 'exp');
  if (expiresAt === null) {
    throw new TokenValidationError('Token is missing an expiry');
  }
  if (expiresAt + skew <= now) {
    throw new TokenValidationError('Token has expired');
  }

  const notBefore = readNumericDate(payload.nbf, 'nbf');
  if (notBefore !== null && notBefore - skew > now) {
    throw new TokenValidationError('Token is not valid yet');
  }

  const issuedAt = readNumericDate(payload.iat, 'iat');
  if (issuedAt !== null && issuedAt - skew > now) {
    throw new TokenValidationError('Token was issued in the future');
  }

  return {
    subject,
    issuer: payload.iss,
    audience,
    expiresAt,
    notBefore,
    issuedAt,
  };
}

function readAlgorithm(header: JwtHeader): string {
  const algorithm = typeof header.alg === 'string' ? header.alg : '';
  // Rejecting `none` and the HMAC family prevents algorithm-confusion attacks
  // where a symmetric secret would be accepted as a public key.
  if (!Object.hasOwn(SIGNATURE_ALGORITHMS, algorithm)) {
    throw new TokenValidationError(
      `Unsupported token algorithm: ${algorithm || 'missing'}`,
    );
  }
  return algorithm;
}

function verifySignature(
  algorithm: string,
  key: KeyObject,
  signingInput: string,
  encodedSignature: string,
): void {
  const nodeAlgorithm = SIGNATURE_ALGORITHMS[algorithm];
  if (!nodeAlgorithm) {
    throw new TokenValidationError(`Unsupported token algorithm: ${algorithm}`);
  }

  const verifier = createVerify(nodeAlgorithm);
  verifier.update(signingInput);
  verifier.end();

  if (!verifier.verify(key, Buffer.from(encodedSignature, 'base64url'))) {
    throw new TokenValidationError('Token signature is invalid');
  }
}

function findKey(keys: JsonWebKey[], kid: string): JsonWebKey | undefined {
  return keys.find(
    (key) =>
      key.kid === kid &&
      (key.kty === undefined || key.kty === 'RSA') &&
      (key.use === undefined || key.use === 'sig'),
  );
}

function readAudience(value: unknown): string[] {
  if (typeof value === 'string') return [value];
  if (Array.isArray(value)) {
    return value.filter((entry): entry is string => typeof entry === 'string');
  }
  return [];
}

function readNumericDate(value: unknown, name: string): number | null {
  if (value === undefined || value === null) return null;
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new TokenValidationError(`Token claim ${name} is not a numeric date`);
  }
  return value;
}

function decodeJsonSegment<T>(segment: string, name: string): T {
  let decoded: string;
  try {
    decoded = Buffer.from(segment, 'base64url').toString('utf8');
  } catch {
    throw new TokenValidationError(`Token ${name} is not valid base64url`);
  }

  try {
    const parsed: unknown = JSON.parse(decoded);
    if (
      typeof parsed !== 'object' ||
      parsed === null ||
      Array.isArray(parsed)
    ) {
      throw new TokenValidationError(`Token ${name} is not a JSON object`);
    }
    return parsed as T;
  } catch (error) {
    if (error instanceof TokenValidationError) throw error;
    throw new TokenValidationError(`Token ${name} is not valid JSON`);
  }
}
