import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { AUDIT_ACTIONS, AUDIT_RESOURCE_TYPES } from '../audit/audit-actions';
import { AuditService } from '../audit/audit.service';
import { PersonsService } from '../persons/persons.service';
import {
  KeycloakProvisioningOperationResponseDto,
  KeycloakProvisioningStatusResponseDto,
} from './dto/keycloak-provisioning-response.dto';
import {
  KEYCLOAK_PROVISIONING_SUMMARY,
  KeycloakProvisioningActionDto,
  KeycloakProvisioningStatusDto,
} from './dto/keycloak-provisioning-status.dto';
import { SetKeycloakPasswordDto } from './dto/set-keycloak-password.dto';
import { SetKeycloakUserStatusDto } from './dto/set-keycloak-user-status.dto';
import {
  KeycloakAdminError,
  KeycloakAdminPort,
  KeycloakAdminUser,
  KEYCLOAK_ADMIN,
} from './keycloak-admin.port';
import { KEYCLOAK_LINK_REPOSITORY } from './keycloak-link.repository';
import {
  KeycloakLinkRepository,
  LinkedAccount,
} from './keycloak-provisioning.types';

/**
 * Orchestrates Keycloak user provisioning for an LMS `UserAccount`.
 *
 * ### Ordering
 *
 * The Keycloak call always happens *before* the LMS write. If Keycloak fails, no
 * link is stored, so the account stays honest (`NOT_PROVISIONED`) instead of
 * pointing at a subject that does not exist. If the LMS write then fails, a
 * Keycloak user exists without a link — which the very next attempt detects by
 * username and adopts, rather than creating a duplicate.
 *
 * ### Idempotency
 *
 * `provision` re-checks the stored link and the username at the start, so
 * repeating a successful call is a no-op that re-uses the existing user, and a
 * partially-failed attempt is healed on retry via adoption.
 *
 * ### Authorization
 *
 * Only identity lives here. Roles, permissions and scopes are never written to
 * Keycloak; they stay in the LMS (Permission + Scope). The service never stores a
 * password: it forwards it to Keycloak once and records only that the password
 * changed.
 */
@Injectable()
export class KeycloakProvisioningService {
  private readonly logger = new Logger(KeycloakProvisioningService.name);

  constructor(
    @Inject(KEYCLOAK_ADMIN) private readonly keycloak: KeycloakAdminPort,
    @Inject(KEYCLOAK_LINK_REPOSITORY)
    private readonly links: KeycloakLinkRepository,
    private readonly persons: PersonsService,
    private readonly audit: AuditService,
  ) {}

  /** Read-only status for one person's account. */
  async getStatus(
    personId: string,
  ): Promise<KeycloakProvisioningStatusResponseDto> {
    const account = await this.requireAccount(personId);
    return this.describe(account);
  }

  /** Read-only status resolved from a `UserAccount` id. */
  async getStatusByAccountId(
    userAccountId: string,
  ): Promise<KeycloakProvisioningStatusResponseDto> {
    const account = await this.links.findById(userAccountId);
    if (!account) {
      throw new NotFoundException(`User account ${userAccountId} not found`);
    }
    return this.describe(account);
  }

  /**
   * Creates the Keycloak user (or adopts an existing same-username user) and
   * links it to the LMS account.
   */
  async provision(
    personId: string,
  ): Promise<KeycloakProvisioningOperationResponseDto> {
    const account = await this.requireAccount(personId);
    if (!this.keycloak.isConfigured()) {
      return this.notConfigured(account);
    }

    const username = this.resolveUsername(account);

    // Idempotent: already linked to a live user -> nothing to create.
    if (account.externalAuthId) {
      const linked = await this.safeGetUser(account.externalAuthId);
      if (linked) {
        return {
          success: true,
          provisioning: this.describeUser(account, linked),
          message: 'Akun sudah terhubung ke Keycloak.',
        };
      }
      // The stored subject is gone (deleted or recreated elsewhere). Fall through
      // and re-provision; the stale link is replaced by the new subject.
      this.logger.warn(
        `Re-provisioning account ${account.id}: stored Keycloak subject is gone`,
      );
    }

    // A same-username Keycloak user may exist from a partially-failed attempt.
    // Adopting it is what makes a retry idempotent and prevents a duplicate.
    const existing = await this.safeFindByUsername(username);
    if (existing && !(await this.isLinkedElsewhere(existing.id, account))) {
      return this.adopt(account, existing);
    }
    if (existing) {
      return this.failure(
        account,
        KeycloakProvisioningStatusDto.LINK_CONFLICT,
        'User Keycloak dengan username tersebut sudah terhubung ke UserAccount lain.',
      );
    }
    if (
      account.email &&
      (await this.hasEmailConflict(account.email, account))
    ) {
      return this.failure(
        account,
        KeycloakProvisioningStatusDto.LINK_CONFLICT,
        'Email tersebut sudah digunakan user Keycloak lain.',
      );
    }

    let created: KeycloakAdminUser;
    try {
      created = await this.keycloak.createUser({
        username,
        email: account.email,
        firstName: account.fullName,
        enabled: true,
      });
    } catch (error) {
      return this.handleKeycloakError(
        account,
        error,
        'Pembuatan user Keycloak gagal',
      );
    }

    return this.link(account, created, {
      action: AUDIT_ACTIONS.USER_ACCOUNT_KEYCLOAK_PROVISIONED,
      message: 'User Keycloak berhasil dibuat dan dihubungkan.',
      adopted: false,
    });
  }

  /**
   * Binds an *existing* same-username Keycloak user to the LMS account.
   *
   * This is the supported path for accounts such as `ui-pengajar-01102601` that
   * hold LMS role assignments but no identity link: no duplicate is created.
   */
  async linkExisting(
    personId: string,
  ): Promise<KeycloakProvisioningOperationResponseDto> {
    const account = await this.requireAccount(personId);
    if (!this.keycloak.isConfigured()) {
      return this.notConfigured(account);
    }

    const username = this.resolveUsername(account);
    const existing = await this.safeFindByUsername(username);
    if (!existing) {
      return this.failure(
        account,
        KeycloakProvisioningStatusDto.NOT_PROVISIONED,
        'Tidak ditemukan user Keycloak dengan username tersebut. Gunakan provisioning baru.',
      );
    }
    if (await this.isLinkedElsewhere(existing.id, account)) {
      return this.failure(
        account,
        KeycloakProvisioningStatusDto.LINK_CONFLICT,
        'User Keycloak tersebut sudah terhubung ke UserAccount lain.',
      );
    }
    return this.adopt(account, existing);
  }

  /**
   * Sets the Keycloak password.
   *
   * The password is a transient argument: it is forwarded to Keycloak and never
   * written to the LMS database or the audit trail. By default it is a one-time
   * credential (`temporary`), so the user must change it at first login.
   */
  async setPassword(
    personId: string,
    dto: SetKeycloakPasswordDto,
  ): Promise<KeycloakProvisioningOperationResponseDto> {
    const account = await this.requireAccount(personId);
    if (!this.keycloak.isConfigured()) {
      return this.notConfigured(account);
    }
    if (!dto.password) {
      throw new BadRequestException(
        'Password wajib diisi pada endpoint ini. Gunakan endpoint aktivasi untuk memicu email reset Keycloak.',
      );
    }
    const user = await this.requireLinkedUser(account);

    try {
      await this.keycloak.resetPassword(user.id, {
        password: dto.password,
        temporary: dto.temporary ?? true,
      });
    } catch (error) {
      return this.handleKeycloakError(
        account,
        error,
        'Pengaturan password Keycloak gagal',
      );
    }

    await this.audit.record({
      action: AUDIT_ACTIONS.USER_ACCOUNT_KEYCLOAK_PASSWORD_SET,
      resourceType: AUDIT_RESOURCE_TYPES.USER_ACCOUNT,
      resourceId: account.id,
      metadata: { temporary: dto.temporary ?? true, externalAuthId: user.id },
    });

    return this.success(
      account.id,
      (dto.temporary ?? true)
        ? 'Password awal disetel sebagai kredensial sementara. Pengguna wajib menggantinya saat login pertama.'
        : 'Password Keycloak diperbarui.',
    );
  }

  /**
   * Reports the activation state for the linked user.
   *
   * The LMS does not send email itself: Keycloak owns the activation/reset email
   * and its delivery guarantees. This endpoint therefore verifies the link and
   * answers the correct next state instead of pretending to have sent something.
   */
  async requestActivation(
    personId: string,
  ): Promise<KeycloakProvisioningOperationResponseDto> {
    const account = await this.requireAccount(personId);
    if (!this.keycloak.isConfigured()) {
      return this.notConfigured(account);
    }
    if (!account.externalAuthId) {
      return this.failure(
        account,
        KeycloakProvisioningStatusDto.NOT_PROVISIONED,
        'Akun belum terhubung ke Keycloak. Lakukan provisioning terlebih dahulu.',
      );
    }
    const user = await this.safeGetUser(account.externalAuthId);
    if (!user) {
      return this.failure(
        account,
        KeycloakProvisioningStatusDto.STALE_LINK,
        'Identitas Keycloak yang tersimpan tidak ditemukan lagi.',
      );
    }
    return {
      success: true,
      provisioning: this.describeUser(account, user),
      message:
        'Aktivasi Keycloak dikelola oleh Keycloak. Arahkan pengguna ke alur aktivasi/lupa password Keycloak.',
    };
  }

  /** Enables or disables the linked Keycloak login. */
  async setUserStatus(
    personId: string,
    dto: SetKeycloakUserStatusDto,
  ): Promise<KeycloakProvisioningOperationResponseDto> {
    const account = await this.requireAccount(personId);
    if (!this.keycloak.isConfigured()) {
      return this.notConfigured(account);
    }
    if (dto.enabled === undefined) {
      throw new BadRequestException('Field enabled wajib diisi.');
    }
    const user = await this.requireLinkedUser(account);

    try {
      await this.keycloak.updateUser(user.id, { enabled: dto.enabled });
    } catch (error) {
      return this.handleKeycloakError(
        account,
        error,
        'Perubahan status Keycloak gagal',
      );
    }

    await this.audit.record({
      action: AUDIT_ACTIONS.USER_ACCOUNT_KEYCLOAK_STATUS_CHANGED,
      resourceType: AUDIT_RESOURCE_TYPES.USER_ACCOUNT,
      resourceId: account.id,
      metadata: { enabled: dto.enabled, externalAuthId: user.id },
    });

    return this.success(
      account.id,
      dto.enabled
        ? 'Login Keycloak diaktifkan.'
        : 'Login Keycloak dinonaktifkan.',
    );
  }
  // ---------------------------------------------------------------------------
  // Internals
  // ---------------------------------------------------------------------------

  private async requireAccount(personId: string): Promise<LinkedAccount> {
    await this.persons.findPersonOrFail(personId);
    const account = await this.links.findByPersonId(personId);
    if (!account) {
      throw new NotFoundException(
        'Person belum memiliki UserAccount. Buat UserAccount terlebih dahulu pada tab Akun.',
      );
    }
    return account;
  }

  private async reload(userAccountId: string): Promise<LinkedAccount> {
    const account = await this.links.findById(userAccountId);
    if (!account) {
      throw new NotFoundException(`User account ${userAccountId} not found`);
    }
    return account;
  }

  private resolveUsername(account: LinkedAccount): string {
    const username = account.username?.trim();
    if (username) return username;
    if (account.email) return account.email.trim().toLowerCase();
    throw new BadRequestException(
      'UserAccount belum memiliki username atau email, sehingga Keycloak tidak dapat membuat identitas yang dapat dipetakan.',
    );
  }

  /** Enables the existing user when needed, then links it. */
  private async adopt(
    account: LinkedAccount,
    existing: KeycloakAdminUser,
  ): Promise<KeycloakProvisioningOperationResponseDto> {
    let user = existing;
    if (!existing.enabled) {
      try {
        await this.keycloak.updateUser(existing.id, { enabled: true });
        user = { ...existing, enabled: true };
      } catch (error) {
        return this.handleKeycloakError(
          account,
          error,
          'Aktivasi user Keycloak yang ada gagal',
        );
      }
    }
    return this.link(account, user, {
      action: AUDIT_ACTIONS.USER_ACCOUNT_KEYCLOAK_LINKED,
      message:
        'User Keycloak yang sudah ada berhasil dihubungkan tanpa membuat duplikat.',
      adopted: true,
    });
  }

  /**
   * Persists the link with a compare-and-set so a concurrent change is reported
   * as a conflict rather than silently overwritten.
   */
  private async link(
    account: LinkedAccount,
    keycloakUser: KeycloakAdminUser,
    options: { action: string; message: string; adopted: boolean },
  ): Promise<KeycloakProvisioningOperationResponseDto> {
    const linked = await this.links.setExternalAuthId(
      account.id,
      keycloakUser.id,
      account.externalAuthId,
    );

    if (!linked) {
      // The compare-and-set did not land. Three distinct situations must not be
      // collapsed into one, because the operator's next step differs for each.
      const current = await this.links.findById(account.id);

      // 1. Somebody wrote the very same subject between our read and our write:
      //    the effect we wanted already happened, so this is success.
      if (current?.externalAuthId === keycloakUser.id) {
        return {
          success: true,
          provisioning: this.describeUser(current, keycloakUser),
          message: 'Akun sudah terhubung ke Keycloak.',
          adoptedExisting: options.adopted,
        };
      }

      // 2. Somebody wrote a *different* subject: a real conflict. We refuse to
      //    overwrite it and leave their value untouched.
      if (current?.externalAuthId) {
        this.logger.warn(
          `Refused to overwrite the Keycloak link for account ${account.id}: changed concurrently`,
        );
        return this.failure(
          account,
          KeycloakProvisioningStatusDto.LINK_CONFLICT,
          'Identitas UserAccount berubah saat provisioning. Muat ulang lalu ulangi.',
        );
      }

      // 3. The stored link is still empty: the write itself failed (typically a
      //    transient database error). The Keycloak user exists but is unlinked.
      //    This is NOT a conflict, and it must not be hidden behind a re-read that
      //    cannot possibly observe the failure. Retrying adopts the same user.
      this.logger.warn(
        `LMS link write failed for account ${account.id}: Keycloak user ${keycloakUser.id} exists without a link`,
      );
      return {
        success: false,
        provisioning: this.adoptable(account, keycloakUser),
        message:
          'User Keycloak sudah ada, tetapi penulisan tautan ke database LMS gagal. Coba lagi untuk memakai user yang sama tanpa membuat duplikat.',
        adoptedExisting: false,
      };
    }

    if (linked.changed) {
      await this.audit.record({
        action: options.action,
        resourceType: AUDIT_RESOURCE_TYPES.USER_ACCOUNT,
        resourceId: account.id,
        before: { externalAuthId: account.externalAuthId },
        after: { externalAuthId: keycloakUser.id },
        metadata: {
          adopted: options.adopted,
          keycloakUsername: keycloakUser.username,
        },
      });
    }

    return {
      success: true,
      provisioning: this.describeUser(linked.account, keycloakUser),
      message: options.message,
      adoptedExisting: options.adopted,
    };
  }

  private async describe(
    account: LinkedAccount,
  ): Promise<KeycloakProvisioningStatusResponseDto> {
    if (!this.keycloak.isConfigured()) {
      return this.status(account, KeycloakProvisioningStatusDto.NOT_CONFIGURED);
    }

    if (!account.externalAuthId) {
      const username = account.username ?? account.email;
      if (!username) {
        return this.status(
          account,
          KeycloakProvisioningStatusDto.NOT_PROVISIONED,
        );
      }
      try {
        const existing = await this.keycloak.findUserByUsername(username);
        if (!existing) {
          return this.status(
            account,
            KeycloakProvisioningStatusDto.NOT_PROVISIONED,
          );
        }
        if (await this.isLinkedElsewhere(existing.id, account)) {
          return this.status(
            account,
            KeycloakProvisioningStatusDto.LINK_CONFLICT,
            { keycloakUsername: existing.username },
          );
        }
        return this.status(account, KeycloakProvisioningStatusDto.ADOPTABLE, {
          keycloakUsername: existing.username,
        });
      } catch (error) {
        return this.status(account, this.statusForError(error).status, {
          keycloakUsername: null,
        });
      }
    }

    const user = await this.safeGetUser(account.externalAuthId);
    if (!user) {
      return this.status(account, KeycloakProvisioningStatusDto.STALE_LINK);
    }
    return this.describeUser(account, user);
  }

  private describeUser(
    account: LinkedAccount,
    user: KeycloakAdminUser,
  ): KeycloakProvisioningStatusResponseDto {
    const mustSetPassword = user.requiredActions.includes('UPDATE_PASSWORD');
    if (!user.enabled) {
      return this.status(
        account,
        KeycloakProvisioningStatusDto.ACTIVATION_REQUIRED,
        {
          keycloakUsername: user.username,
          availableActions: [KeycloakProvisioningActionDto.ENABLE],
        },
      );
    }
    if (mustSetPassword) {
      return this.status(
        account,
        KeycloakProvisioningStatusDto.ACTIVATION_REQUIRED,
        {
          keycloakUsername: user.username,
          availableActions: [KeycloakProvisioningActionDto.SET_PASSWORD],
        },
      );
    }
    return this.status(account, KeycloakProvisioningStatusDto.READY, {
      keycloakUsername: user.username,
      availableActions: [KeycloakProvisioningActionDto.SET_PASSWORD],
    });
  }

  /**
   * The status for "a Keycloak user is known to exist but is not linked". Used
   * when the very operation that discovered the user failed to persist the link,
   * so the response states the *observed* fact instead of guessing NOT_PROVISIONED
   * (which would wrongly suggest nothing exists in Keycloak).
   */
  private adoptable(
    account: LinkedAccount,
    user: KeycloakAdminUser,
  ): KeycloakProvisioningStatusResponseDto {
    return this.status(account, KeycloakProvisioningStatusDto.ADOPTABLE, {
      keycloakUsername: user.username,
    });
  }

  private status(
    account: LinkedAccount,
    status: KeycloakProvisioningStatusDto,
    extras: {
      keycloakUsername?: string | null;
      availableActions?: KeycloakProvisioningActionDto[];
    } = {},
  ): KeycloakProvisioningStatusResponseDto {
    return {
      personId: account.personId,
      userAccountId: account.id,
      status,
      summary: KEYCLOAK_PROVISIONING_SUMMARY[status],
      readyToLogin: status === KeycloakProvisioningStatusDto.READY,
      availableActions: extras.availableActions ?? this.defaultActions(status),
      externalAuthId: account.externalAuthId,
      keycloakUsername: extras.keycloakUsername ?? account.username,
      provisioningConfigured: this.keycloak.isConfigured(),
    };
  }

  private defaultActions(
    status: KeycloakProvisioningStatusDto,
  ): KeycloakProvisioningActionDto[] {
    switch (status) {
      case KeycloakProvisioningStatusDto.NOT_PROVISIONED:
        return [KeycloakProvisioningActionDto.PROVISION];
      case KeycloakProvisioningStatusDto.ADOPTABLE:
        return [KeycloakProvisioningActionDto.LINK_EXISTING];
      case KeycloakProvisioningStatusDto.STALE_LINK:
        return [
          KeycloakProvisioningActionDto.LINK_EXISTING,
          KeycloakProvisioningActionDto.PROVISION,
        ];
      case KeycloakProvisioningStatusDto.ACTIVATION_REQUIRED:
        return [KeycloakProvisioningActionDto.SET_PASSWORD];
      case KeycloakProvisioningStatusDto.ERROR:
        return [KeycloakProvisioningActionDto.RETRY];
      case KeycloakProvisioningStatusDto.LINK_CONFLICT:
      case KeycloakProvisioningStatusDto.NOT_CONFIGURED:
      default:
        return [];
    }
  }

  private async isLinkedElsewhere(
    externalAuthId: string,
    account: LinkedAccount,
  ): Promise<boolean> {
    const linked = await this.links.findByExternalAuthId(externalAuthId);
    return Boolean(linked && linked.id !== account.id);
  }

  private async hasEmailConflict(
    email: string,
    account: LinkedAccount,
  ): Promise<boolean> {
    const matches = await this.keycloak.findUsersByEmail(email);
    return matches.some(
      (match) =>
        match.id !== account.externalAuthId &&
        (match.username === '' || match.username !== account.username),
    );
  }

  private async requireLinkedUser(
    account: LinkedAccount,
  ): Promise<KeycloakAdminUser> {
    if (!account.externalAuthId) {
      throw new BadRequestException(
        'Akun belum terhubung ke Keycloak. Lakukan provisioning terlebih dahulu.',
      );
    }
    const user = await this.safeGetUser(account.externalAuthId);
    if (!user) {
      throw new BadRequestException(
        'Identitas Keycloak yang tersimpan tidak ditemukan lagi. Lakukan provisioning ulang.',
      );
    }
    return user;
  }

  /**
   * Reads a user by subject without turning a transport failure into a
   * `null` that would be misinterpreted as "deleted".
   */
  private async safeGetUser(id: string): Promise<KeycloakAdminUser | null> {
    try {
      return await this.keycloak.getUser(id);
    } catch (error) {
      if (error instanceof KeycloakAdminError && error.kind === 'REJECTED') {
        return null;
      }
      throw error;
    }
  }

  private async safeFindByUsername(
    username: string,
  ): Promise<KeycloakAdminUser | null> {
    return await this.keycloak.findUserByUsername(username);
  }

  private statusForError(error: unknown): {
    status: KeycloakProvisioningStatusDto;
  } {
    if (error instanceof KeycloakAdminError) {
      return {
        status:
          error.kind === 'REJECTED' && error.status === 409
            ? KeycloakProvisioningStatusDto.LINK_CONFLICT
            : KeycloakProvisioningStatusDto.ERROR,
      };
    }
    throw error;
  }

  private async handleKeycloakError(
    account: LinkedAccount,
    error: unknown,
    context: string,
  ): Promise<KeycloakProvisioningOperationResponseDto> {
    if (!(error instanceof KeycloakAdminError)) throw error;
    this.logger.warn(`${context} for account ${account.id}: ${error.message}`);
    const { status } = this.statusForError(error);
    return this.failure(account, status, `${context}: ${error.message}`);
  }

  /**
   * A failure is reported with the *observed* status rather than a re-derived
   * one. A re-read can legitimately disagree with what the caller just learned —
   * an email conflict is not visible as a username conflict, and a redacted
   * transport failure is not visible as `ERROR`. Re-deriving there would downgrade
   * a real conflict to `NOT_PROVISIONED` and tell the operator to "start over"
   * when nothing about the account had changed.
   */
  private async failure(
    account: LinkedAccount,
    status: KeycloakProvisioningStatusDto,
    message: string,
  ): Promise<KeycloakProvisioningOperationResponseDto> {
    const provisioning =
      status === KeycloakProvisioningStatusDto.NOT_CONFIGURED ||
      !this.keycloak.isConfigured()
        ? this.status(account, KeycloakProvisioningStatusDto.NOT_CONFIGURED)
        : this.status(account, status);
    return { success: false, provisioning, message };
  }

  private async success(
    userAccountId: string,
    message: string,
  ): Promise<KeycloakProvisioningOperationResponseDto> {
    const account = await this.reload(userAccountId);
    if (!account.externalAuthId) {
      return {
        success: true,
        provisioning: await this.describe(account),
        message,
      };
    }
    const user = await this.safeGetUser(account.externalAuthId);
    return {
      success: true,
      provisioning: user
        ? this.describeUser(account, user)
        : await this.describe(account),
      message,
    };
  }

  private async notConfigured(
    account: LinkedAccount,
  ): Promise<KeycloakProvisioningOperationResponseDto> {
    return {
      success: false,
      provisioning: this.status(
        account,
        KeycloakProvisioningStatusDto.NOT_CONFIGURED,
      ),
      message:
        'Provisioning Keycloak belum dikonfigurasi pada API sehingga akun belum dapat dibuat.',
    };
  }
}
