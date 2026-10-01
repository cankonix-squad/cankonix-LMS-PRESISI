import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  KeycloakLinkRepository,
  LinkedAccount,
  SetExternalAuthIdResult,
} from './keycloak-provisioning.types';

export const KEYCLOAK_LINK_REPOSITORY = Symbol('KEYCLOAK_LINK_REPOSITORY');

@Injectable()
export class PrismaKeycloakLinkRepository implements KeycloakLinkRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(userAccountId: string): Promise<LinkedAccount | null> {
    const row = await this.prisma.userAccount.findUnique({
      where: { id: userAccountId },
      select: ACCOUNT_SELECT,
    });
    return row ? toLinkedAccount(row) : null;
  }

  async findByPersonId(personId: string): Promise<LinkedAccount | null> {
    const row = await this.prisma.userAccount.findUnique({
      where: { personId },
      select: ACCOUNT_SELECT,
    });
    return row ? toLinkedAccount(row) : null;
  }

  async findByExternalAuthId(
    externalAuthId: string,
  ): Promise<LinkedAccount | null> {
    const row = await this.prisma.userAccount.findUnique({
      where: { externalAuthId },
      select: ACCOUNT_SELECT,
    });
    return row ? toLinkedAccount(row) : null;
  }

  /**
   * Compare-and-set on `externalAuthId`.
   *
   * `updateMany` is used on purpose: its `where` can carry the expected current
   * value, so a lost race surfaces as `count === 0` rather than as a blind
   * overwrite. Without that, a retry could replace a subject an operator had
   * corrected in the meantime. Prisma maps `null` to `IS NULL`, so adopting an
   * account that currently has no link works through the same statement.
   */
  async setExternalAuthId(
    userAccountId: string,
    externalAuthId: string,
    expectedCurrent: string | null,
  ): Promise<SetExternalAuthIdResult | null> {
    const before = await this.findById(userAccountId);
    if (!before) return null;
    if (before.externalAuthId === externalAuthId) {
      return { account: before, changed: false };
    }

    const result = await this.prisma.userAccount.updateMany({
      where: { id: userAccountId, externalAuthId: expectedCurrent },
      data: { externalAuthId },
    });
    if (result.count === 0) return null;

    const account = await this.findById(userAccountId);
    return account ? { account, changed: true } : null;
  }
}

const ACCOUNT_SELECT = {
  id: true,
  personId: true,
  externalAuthId: true,
  username: true,
  email: true,
  status: true,
  person: { select: { fullName: true } },
} satisfies Prisma.UserAccountSelect;

type AccountRow = Prisma.UserAccountGetPayload<{
  select: typeof ACCOUNT_SELECT;
}>;

function toLinkedAccount(row: AccountRow): LinkedAccount {
  return {
    id: row.id,
    personId: row.personId,
    externalAuthId: row.externalAuthId,
    username: row.username,
    email: row.email,
    status: row.status,
    fullName: row.person.fullName,
  };
}
