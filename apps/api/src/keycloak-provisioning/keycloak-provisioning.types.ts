import { UserAccountStatusDto } from '../user-accounts/dto/user-account-status.dto';

/**
 * A `UserAccount` row as the provisioning flow needs to see it.
 *
 * A narrow projection, not the full domain record: provisioning only cares about
 * the identity linkage, so it cannot accidentally mutate a lifecycle field.
 */
export type LinkedAccount = {
  id: string;
  personId: string;
  externalAuthId: string | null;
  username: string | null;
  email: string | null;
  status: UserAccountStatusDto;
  /**
   * Person display name, carried here so a Keycloak user can be created with a
   * human-readable name without the provisioning service reaching into the
   * person domain for every call.
   */
  fullName: string;
};

/**
 * Persistence port for the Keycloak linkage.
 *
 * Kept separate from `UserAccountsRepository` because the linkage must be a
 * compare-and-set: two concurrent provisioning attempts must not each believe
 * they wrote the subject, and a retry must not overwrite a newer link.
 */
export type SetExternalAuthIdResult = {
  account: LinkedAccount;
  /** `false` when the stored value already equaled the requested one. */
  changed: boolean;
};

export interface KeycloakLinkRepository {
  findById(userAccountId: string): Promise<LinkedAccount | null>;
  findByPersonId(personId: string): Promise<LinkedAccount | null>;
  findByExternalAuthId(externalAuthId: string): Promise<LinkedAccount | null>;
  /**
   * Sets `externalAuthId` only when the stored value still equals
   * `expectedCurrent`. Returns `null` when somebody else changed it first, which
   * the caller reports as a conflict instead of silently overwriting.
   */
  setExternalAuthId(
    userAccountId: string,
    externalAuthId: string,
    expectedCurrent: string | null,
  ): Promise<SetExternalAuthIdResult | null>;
}
