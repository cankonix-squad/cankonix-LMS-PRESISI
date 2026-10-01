import { Injectable, Logger } from '@nestjs/common';
import {
  CreateKeycloakUserInput,
  KeycloakAdminError,
  KeycloakAdminPort,
  KeycloakAdminUser,
  ResetKeycloakPasswordInput,
  UpdateKeycloakUserInput,
} from './keycloak-admin.port';
import { KeycloakAdminConfig } from './keycloak-admin.config';

type TokenResponse = {
  access_token?: string;
  expires_in?: number;
};

type KeycloakUserRepresentation = {
  id?: string;
  username?: string;
  email?: string;
  enabled?: boolean;
  requiredActions?: string[];
};

/** Refresh the service token this many seconds before it actually expires. */
const TOKEN_EXPIRY_SKEW_SECONDS = 30;

/**
 * Real Keycloak Admin API adapter.
 *
 * Uses the native `fetch` (Node 18+) and no SDK, mirroring the JWKS provider: the
 * project already validates JWTs with `node:crypto` and `fetch`, so adding a
 * large admin client dependency would be unjustified.
 *
 * Failure classification is deliberate and drives the caller's retry logic:
 * transport errors and 5xx become `UNAVAILABLE` (outcome unknown -> retry),
 * while 4xx become `REJECTED` (definitive -> do not retry blindly).
 */
@Injectable()
export class KeycloakAdminClient implements KeycloakAdminPort {
  private readonly logger = new Logger(KeycloakAdminClient.name);
  private token: string | null = null;
  private tokenExpiresAt = 0;
  private tokenInFlight: Promise<string> | null = null;

  constructor(private readonly config: KeycloakAdminConfig) {}

  isConfigured(): boolean {
    return true;
  }

  async findUserByUsername(
    username: string,
  ): Promise<KeycloakAdminUser | null> {
    const query = new URLSearchParams({ username, exact: 'true' });
    const users = await this.request<KeycloakUserRepresentation[]>(
      'GET',
      `/admin/realms/${encodeURIComponent(this.config.realm)}/users?${query}`,
    );
    const match = users.find((user) => user.username === username);
    return match ? toKeycloakUser(match) : null;
  }

  async findUsersByEmail(email: string): Promise<KeycloakAdminUser[]> {
    const query = new URLSearchParams({ email, exact: 'true' });
    const users = await this.request<KeycloakUserRepresentation[]>(
      'GET',
      `/admin/realms/${encodeURIComponent(this.config.realm)}/users?${query}`,
    );
    return users
      .filter(
        (user) => (user.email ?? '').toLowerCase() === email.toLowerCase(),
      )
      .map(toKeycloakUser);
  }

  async getUser(id: string): Promise<KeycloakAdminUser | null> {
    try {
      const user = await this.request<KeycloakUserRepresentation>(
        'GET',
        `/admin/realms/${encodeURIComponent(this.config.realm)}/users/${encodeURIComponent(id)}`,
      );
      return toKeycloakUser(user);
    } catch (error) {
      if (error instanceof KeycloakAdminError && error.status === 404)
        return null;
      throw error;
    }
  }

  async createUser(input: CreateKeycloakUserInput): Promise<KeycloakAdminUser> {
    const body: Record<string, unknown> = {
      username: input.username,
      enabled: input.enabled,
    };
    if (input.email) {
      body.email = input.email;
      // The account is considered verified because an administrator created it;
      // the user still has to set a password (a Keycloak required action).
      body.emailVerified = true;
    }
    if (input.firstName) body.firstName = input.firstName;
    if (input.lastName) body.lastName = input.lastName;

    const created = await this.request<KeycloakUserRepresentation>(
      'POST',
      `/admin/realms/${encodeURIComponent(this.config.realm)}/users`,
      body,
      { returnLocationId: true },
    );

    // Keycloak answers `201 Created` with the new id in the `Location` header and
    // an empty body, so the adapter resolves the entity it just created.
    const id = created?.id;
    if (!id) {
      throw new KeycloakAdminError(
        'REJECTED',
        'Keycloak created a user but returned no identifier',
      );
    }
    return {
      id,
      username: created.username ?? input.username,
      email: created.email ?? input.email ?? null,
      enabled: created.enabled ?? input.enabled,
      requiredActions: created.requiredActions ?? [],
    };
  }

  async updateUser(id: string, input: UpdateKeycloakUserInput): Promise<void> {
    const body: Record<string, unknown> = {};
    if (input.email !== undefined) {
      body.email = input.email;
      body.emailVerified = Boolean(input.email);
    }
    if (input.enabled !== undefined) body.enabled = input.enabled;
    if (input.firstName !== undefined) body.firstName = input.firstName;
    if (input.lastName !== undefined) body.lastName = input.lastName;
    if (Object.keys(body).length === 0) return;

    await this.request<void>(
      'PUT',
      `/admin/realms/${encodeURIComponent(this.config.realm)}/users/${encodeURIComponent(id)}`,
      body,
    );
  }

  async deleteUser(id: string): Promise<void> {
    await this.request<void>(
      'DELETE',
      `/admin/realms/${encodeURIComponent(this.config.realm)}/users/${encodeURIComponent(id)}`,
    );
  }

  async resetPassword(
    id: string,
    input: ResetKeycloakPasswordInput,
  ): Promise<void> {
    await this.request<void>(
      'PUT',
      `/admin/realms/${encodeURIComponent(this.config.realm)}/users/${encodeURIComponent(id)}/reset-password`,
      {
        type: 'password',
        value: input.password,
        temporary: input.temporary,
      },
    );
  }

  /**
   * Service access token.
   *
   * Cached until shortly before expiry and de-duplicated with a single in-flight
   * promise so concurrent provisioning requests do not each fetch a token.
   */
  private async getAccessToken(): Promise<string> {
    const now = Date.now();
    if (this.token && now < this.tokenExpiresAt) return this.token;

    this.tokenInFlight ??= this.requestAccessToken().finally(() => {
      this.tokenInFlight = null;
    });
    return this.tokenInFlight;
  }

  private async requestAccessToken(): Promise<string> {
    const {
      baseUrl,
      realm,
      clientId,
      clientSecret,
      adminUsername,
      adminPassword,
    } = this.config;
    const tokenUrl = `${baseUrl}/realms/${encodeURIComponent(realm)}/protocol/openid-connect/token`;

    const form = new URLSearchParams();
    if (clientId && clientSecret) {
      form.set('grant_type', 'client_credentials');
      form.set('client_id', clientId);
      form.set('client_secret', clientSecret);
    } else {
      form.set('grant_type', 'password');
      form.set('client_id', clientId || 'admin-cli');
      form.set('username', adminUsername ?? '');
      form.set('password', adminPassword ?? '');
    }

    const response = await this.fetchWithTimeout(tokenUrl, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: form.toString(),
    });

    if (!response) {
      throw new KeycloakAdminError(
        'UNAVAILABLE',
        'Keycloak token endpoint did not respond',
      );
    }
    if (!response.ok) {
      // A 400/401 on the token endpoint means the service credentials are wrong.
      // That is a configuration defect, but it is also transient-configurable, so
      // it is reported as REJECTED with the status for the audit trail.
      throw new KeycloakAdminError(
        response.status >= 500 ? 'UNAVAILABLE' : 'REJECTED',
        `Keycloak rejected the provisioning credentials (${response.status})`,
        response.status,
      );
    }

    const body = (await response.json()) as TokenResponse;
    if (!body.access_token) {
      throw new KeycloakAdminError(
        'UNAVAILABLE',
        'Keycloak token response contained no access token',
      );
    }

    this.token = body.access_token;
    this.tokenExpiresAt =
      Date.now() +
      Math.max((body.expires_in ?? 60) - TOKEN_EXPIRY_SKEW_SECONDS, 5) * 1000;
    return this.token;
  }

  private async request<T>(
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    path: string,
    body?: unknown,
    options: { returnLocationId?: boolean } = {},
  ): Promise<T> {
    const token = await this.getAccessToken();
    const response = await this.fetchWithTimeout(
      `${this.config.baseUrl}${path}`,
      {
        method,
        headers: {
          authorization: `Bearer ${token}`,
          ...(body === undefined ? {} : { 'content-type': 'application/json' }),
        },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      },
    );

    if (!response) {
      throw new KeycloakAdminError(
        'UNAVAILABLE',
        `Keycloak Admin API did not respond (${method} ${path})`,
      );
    }

    if (!response.ok) {
      const detail = await safeText(response);
      throw new KeycloakAdminError(
        response.status >= 500 ? 'UNAVAILABLE' : 'REJECTED',
        `Keycloak Admin API ${method} ${path} failed: ${response.status}${
          detail ? ` ${detail}` : ''
        }`,
        response.status,
      );
    }

    if (options.returnLocationId) {
      const location = response.headers.get('location') ?? '';
      const id = location.split('/').filter(Boolean).pop() ?? '';
      if (method === 'POST') {
        return { id: decodeURIComponent(id) } as T;
      }
    }

    if (response.status === 204) return undefined as T;
    const text = await response.text();
    if (!text) return undefined as T;
    try {
      return JSON.parse(text) as T;
    } catch {
      return undefined as T;
    }
  }

  /**
   * Performs a request with a hard timeout. Returns `null` on a transport failure
   * instead of throwing, so the caller can classify it as `UNAVAILABLE`.
   */
  private async fetchWithTimeout(
    url: string,
    init: RequestInit,
  ): Promise<Response | null> {
    const controller = new AbortController();
    const timer = setTimeout(
      () => controller.abort(),
      this.config.requestTimeoutMs,
    );
    try {
      return await fetch(url, { ...init, signal: controller.signal });
    } catch (error) {
      this.logger.warn(
        `Keycloak Admin API request failed: ${
          error instanceof Error ? error.message : 'unknown transport error'
        }`,
      );
      return null;
    } finally {
      clearTimeout(timer);
    }
  }
}

function toKeycloakUser(user: KeycloakUserRepresentation): KeycloakAdminUser {
  return {
    id: user.id ?? '',
    username: user.username ?? '',
    email: user.email ?? null,
    enabled: user.enabled !== false,
    requiredActions: user.requiredActions ?? [],
  };
}

async function safeText(response: Response): Promise<string> {
  try {
    return (await response.text()).slice(0, 300);
  } catch {
    return '';
  }
}
