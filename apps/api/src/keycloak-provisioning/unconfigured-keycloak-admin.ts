import { Logger } from '@nestjs/common';
import {
  CreateKeycloakUserInput,
  KeycloakAdminError,
  KeycloakAdminPort,
  KeycloakAdminUser,
  ResetKeycloakPasswordInput,
  UpdateKeycloakUserInput,
} from './keycloak-admin.port';

/**
 * Null object for the "provisioning is not configured" case.
 *
 * Every method rejects with a clear reason. This is deliberately not a silent
 * no-op: reporting success without creating a Keycloak user would tell an
 * operator an account is ready to log in when it is not, and the failure would
 * surface much later as a support ticket.
 */
export class UnconfiguredKeycloakAdmin implements KeycloakAdminPort {
  private readonly logger = new Logger('KeycloakAdmin');

  isConfigured(): boolean {
    return false;
  }

  private fail(): never {
    this.logger.warn(
      'Rejected a Keycloak provisioning request: not configured',
    );
    throw new KeycloakAdminError(
      'UNAVAILABLE',
      'Keycloak user provisioning is not configured. Set KEYCLOAK_ADMIN_BASE_URL, KEYCLOAK_ADMIN_REALM and service credentials.',
    );
  }

  async findUserByUsername(): Promise<KeycloakAdminUser | null> {
    return this.fail();
  }

  async findUsersByEmail(): Promise<KeycloakAdminUser[]> {
    return this.fail();
  }

  async getUser(): Promise<KeycloakAdminUser | null> {
    return this.fail();
  }

  async createUser(): Promise<KeycloakAdminUser> {
    return this.fail();
  }

  async updateUser(): Promise<void> {
    return this.fail();
  }

  async deleteUser(): Promise<void> {
    return this.fail();
  }

  async resetPassword(): Promise<void> {
    return this.fail();
  }
}

export type {
  CreateKeycloakUserInput,
  KeycloakAdminUser,
  ResetKeycloakPasswordInput,
  UpdateKeycloakUserInput,
};
