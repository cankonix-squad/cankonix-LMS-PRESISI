import { Inject, Injectable, Logger } from '@nestjs/common';
import { AUTH_CONFIG, AuthConfig } from './auth.config';

/** Subset of RFC 7517 fields the resource server relies on. */
export type JsonWebKey = {
  kid?: string;
  kty?: string;
  use?: string;
  alg?: string;
  n?: string;
  e?: string;
  x5c?: string[];
};

export type JwksDocument = {
  keys: JsonWebKey[];
};

export type JwksLookupOptions = {
  /**
   * Bypass the cache once. Used when a token references an unknown `kid`, which
   * is the normal shape of a key rotation.
   */
  forceRefresh?: boolean;
};

export interface JwksProvider {
  getKeys(options?: JwksLookupOptions): Promise<JsonWebKey[]>;
}

export const JWKS_PROVIDER = Symbol('JWKS_PROVIDER');

@Injectable()
export class KeycloakJwksProvider implements JwksProvider {
  private readonly logger = new Logger(KeycloakJwksProvider.name);
  private cachedKeys: JsonWebKey[] | null = null;
  private cacheExpiresAt = 0;
  private inFlight: Promise<JsonWebKey[]> | null = null;

  constructor(
    @Inject(AUTH_CONFIG) private readonly config: AuthConfig | null,
  ) {}

  async getKeys(options?: JwksLookupOptions): Promise<JsonWebKey[]> {
    const config = this.config;
    if (!config) {
      throw new Error('Authentication is not configured');
    }

    const now = Date.now();
    if (
      !options?.forceRefresh &&
      this.cachedKeys &&
      now < this.cacheExpiresAt
    ) {
      return this.cachedKeys;
    }

    this.inFlight ??= this.fetchKeys(config).finally(() => {
      this.inFlight = null;
    });

    try {
      return await this.inFlight;
    } catch (error) {
      // A failed rotation refresh must not destroy a still-valid cache entry.
      if (this.cachedKeys && now < this.cacheExpiresAt) {
        return this.cachedKeys;
      }
      throw error;
    }
  }

  private async fetchKeys(config: AuthConfig): Promise<JsonWebKey[]> {
    const response = await fetch(config.jwksUri, {
      headers: { accept: 'application/json' },
      signal: AbortSignal.timeout(config.jwksRequestTimeoutMs),
    });
    if (!response.ok) {
      throw new Error(
        `JWKS request to ${config.jwksUri} failed with status ${response.status}`,
      );
    }

    const document: unknown = await response.json();
    const keys = parseJwksDocument(document);
    if (keys.length === 0) {
      throw new Error(`JWKS document at ${config.jwksUri} has no keys`);
    }

    this.cachedKeys = keys;
    this.cacheExpiresAt = Date.now() + config.jwksCacheSeconds * 1000;
    this.logger.debug(
      `Loaded ${keys.length} signing key(s) from ${config.jwksUri}`,
    );
    return keys;
  }
}

function parseJwksDocument(document: unknown): JsonWebKey[] {
  if (typeof document !== 'object' || document === null) return [];
  const keys = (document as { keys?: unknown }).keys;
  if (!Array.isArray(keys)) return [];
  return keys.filter(
    (key): key is JsonWebKey => typeof key === 'object' && key !== null,
  );
}
