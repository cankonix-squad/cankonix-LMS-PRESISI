import { Injectable } from '@nestjs/common';
import { PersonRecord } from '../persons/person.types';
import { PersonsService } from '../persons/persons.service';
import { UserAccountRecord } from '../user-accounts/user-account.types';
import { UserAccountsService } from '../user-accounts/user-accounts.service';

/**
 * Port used by authentication to read the identity data it needs.
 *
 * Keeping it narrow means the guard never depends on the persons or
 * user-accounts modules directly, and tests can substitute a fake without a
 * database.
 */
export interface AuthIdentityResolver {
  /** Maps the identity provider subject (`UserAccount.externalAuthId`). */
  findAccountByExternalAuthId(
    externalAuthId: string,
  ): Promise<UserAccountRecord | null>;
  findPersonById(id: string): Promise<PersonRecord | null>;
  /** Records that a valid token was presented for this person's account. */
  touchLastLoginAt(personId: string, at: Date): Promise<void>;
}

export const AUTH_IDENTITY_RESOLVER = Symbol('AUTH_IDENTITY_RESOLVER');

/**
 * Maps the Keycloak `sub` claim onto `UserAccount.externalAuthId` and joins the
 * owning `Person`. Both modules are consumed through their services, so this
 * module never reaches into another module's persistence.
 */
@Injectable()
export class KeycloakIdentityResolver implements AuthIdentityResolver {
  constructor(
    private readonly accounts: UserAccountsService,
    private readonly persons: PersonsService,
  ) {}

  findAccountByExternalAuthId(
    externalAuthId: string,
  ): Promise<UserAccountRecord | null> {
    return this.accounts.findAccountByExternalAuthId(externalAuthId);
  }

  findPersonById(id: string): Promise<PersonRecord | null> {
    return this.persons.findPersonById(id);
  }

  async touchLastLoginAt(personId: string, at: Date): Promise<void> {
    await this.accounts.touchLastLoginAt(personId, at);
  }
}
