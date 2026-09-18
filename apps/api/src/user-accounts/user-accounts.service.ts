import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AUDIT_ACTIONS, AUDIT_RESOURCE_TYPES } from '../audit/audit-actions';
import { AuditService } from '../audit/audit.service';
import { PersonsService } from '../persons/persons.service';
import { CreateUserAccountDto } from './dto/create-user-account.dto';
import { UpdateUserAccountDto } from './dto/update-user-account.dto';
import { UserAccountResponseDto } from './dto/user-account-response.dto';
import { UserAccountStatusDto } from './dto/user-account-status.dto';
import { UserAccountRecord, UserAccountUpdateData } from './user-account.types';
import {
  USER_ACCOUNTS_REPOSITORY,
  UserAccountsRepository,
} from './user-accounts.repository';

@Injectable()
export class UserAccountsService {
  constructor(
    @Inject(USER_ACCOUNTS_REPOSITORY)
    private readonly accounts: UserAccountsRepository,
    private readonly persons: PersonsService,
    private readonly audit: AuditService,
  ) {}

  async create(
    personId: string,
    dto: CreateUserAccountDto,
  ): Promise<UserAccountResponseDto> {
    await this.persons.findPersonOrFail(personId);
    const existing = await this.accounts.findByPersonId(personId);
    if (existing) {
      throw new ConflictException('Person already has a user account');
    }

    const externalAuthId = dto.externalAuthId?.trim() || null;
    if (externalAuthId) {
      await this.ensureExternalAuthIdAvailable(externalAuthId);
    }

    const created = await this.accounts.create({
      personId,
      externalAuthId,
      username: dto.username?.trim() || null,
      email: dto.email?.trim().toLowerCase() || null,
      status: dto.status ?? UserAccountStatusDto.ACTIVE,
    });

    await this.audit.record({
      action: AUDIT_ACTIONS.USER_ACCOUNT_CREATED,
      resourceType: AUDIT_RESOURCE_TYPES.USER_ACCOUNT,
      resourceId: created.id,
      after: userAccountSnapshot(created),
    });

    return toUserAccountResponse(created);
  }

  async findByPerson(personId: string): Promise<UserAccountResponseDto> {
    await this.persons.findPersonOrFail(personId);
    const account = await this.accounts.findByPersonId(personId);
    if (!account) throw new NotFoundException('User account not found');
    return toUserAccountResponse(account);
  }

  async findOne(id: string): Promise<UserAccountResponseDto> {
    const account = await this.accounts.findById(id);
    if (!account) throw new NotFoundException(`User account ${id} not found`);
    return toUserAccountResponse(account);
  }

  /**
   * Used by authentication to map an identity provider subject onto an account.
   * Returns `null` rather than throwing: a legitimate token for an unlinked
   * subject is an authorization outcome, not a missing-resource error.
   */
  findAccountByExternalAuthId(
    externalAuthId: string,
  ): Promise<UserAccountRecord | null> {
    return this.accounts.findByExternalAuthId(externalAuthId);
  }

  /**
   * Records when a valid token was presented. `lastLoginAt` is intentionally the
   * only authentication-related field the LMS stores; credentials never live here.
   */
  async touchLastLoginAt(personId: string, at: Date): Promise<void> {
    await this.accounts.updateLastLoginAt(personId, at);
  }

  async update(
    personId: string,
    dto: UpdateUserAccountDto,
  ): Promise<UserAccountResponseDto> {
    await this.persons.findPersonOrFail(personId);
    const account = await this.accounts.findByPersonId(personId);
    if (!account) throw new NotFoundException('User account not found');

    const data: UserAccountUpdateData = {};
    if (dto.externalAuthId !== undefined) {
      const externalAuthId = dto.externalAuthId?.trim() || null;
      if (externalAuthId) {
        await this.ensureExternalAuthIdAvailable(externalAuthId, personId);
      }
      data.externalAuthId = externalAuthId;
    }
    if (dto.username !== undefined) {
      data.username = dto.username?.trim() || null;
    }
    if (dto.email !== undefined) {
      data.email = dto.email?.trim().toLowerCase() || null;
    }
    if (dto.status !== undefined) data.status = dto.status;

    const updated = await this.accounts.update(personId, data);

    // Account status is part of identity lifecycle: suspending an account is an
    // access decision, so the entry captures both the status transition and the
    // external auth link that was assigned.
    await this.audit.record({
      action: AUDIT_ACTIONS.USER_ACCOUNT_UPDATED,
      resourceType: AUDIT_RESOURCE_TYPES.USER_ACCOUNT,
      resourceId: updated.id,
      before: userAccountSnapshot(account),
      after: userAccountSnapshot(updated),
      metadata: { changedFields: Object.keys(data).sort() },
    });

    return toUserAccountResponse(updated);
  }

  private async ensureExternalAuthIdAvailable(
    externalAuthId: string,
    currentPersonId?: string,
  ): Promise<void> {
    const linked = await this.accounts.findByExternalAuthId(externalAuthId);
    if (linked && linked.personId !== currentPersonId) {
      throw new ConflictException(
        'External auth identifier is already linked to another account',
      );
    }
  }
}

function toUserAccountResponse(
  account: UserAccountRecord,
): UserAccountResponseDto {
  return {
    id: account.id,
    personId: account.personId,
    externalAuthId: account.externalAuthId,
    username: account.username,
    email: account.email,
    status: account.status,
    lastLoginAt: account.lastLoginAt ? account.lastLoginAt.toISOString() : null,
    createdAt: account.createdAt.toISOString(),
    updatedAt: account.updatedAt.toISOString(),
  };
}

/**
 * Audit snapshot of a user account.
 *
 * `externalAuthId` is an identity-provider subject, not a credential: it is an
 * opaque reference that the audit trail needs in order to reconstruct which
 * Keycloak account was linked. Credentials are never stored on this record, so
 * there is nothing else to redact here — the generic redaction pass still runs
 * over the snapshot in case a future field is added.
 */
function userAccountSnapshot(
  account: UserAccountRecord,
): Record<string, unknown> {
  return {
    id: account.id,
    personId: account.personId,
    externalAuthId: account.externalAuthId,
    username: account.username,
    email: account.email,
    status: account.status,
  };
}
