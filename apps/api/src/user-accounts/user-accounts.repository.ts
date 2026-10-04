import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  UserAccountCreateData,
  UserAccountListFilter,
  UserAccountListResult,
  UserAccountRecord,
  UserAccountUpdateData,
  UserAccountWithPersonRecord,
} from './user-account.types';

export const USER_ACCOUNTS_REPOSITORY = Symbol('USER_ACCOUNTS_REPOSITORY');

export interface UserAccountsRepository {
  create(data: UserAccountCreateData): Promise<UserAccountRecord>;
  findById(id: string): Promise<UserAccountRecord | null>;
  findByPersonId(personId: string): Promise<UserAccountRecord | null>;
  findByExternalAuthId(
    externalAuthId: string,
  ): Promise<UserAccountRecord | null>;
  list(filter: UserAccountListFilter): Promise<UserAccountListResult>;
  update(
    personId: string,
    data: UserAccountUpdateData,
  ): Promise<UserAccountRecord>;
  updateLastLoginAt(personId: string, at: Date): Promise<UserAccountRecord>;
}

@Injectable()
export class PrismaUserAccountsRepository implements UserAccountsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: UserAccountCreateData): Promise<UserAccountRecord> {
    return await this.prisma.userAccount.create({
      data: data as Prisma.UserAccountUncheckedCreateInput,
    });
  }

  async findById(id: string): Promise<UserAccountRecord | null> {
    return await this.prisma.userAccount.findUnique({ where: { id } });
  }

  async findByPersonId(personId: string): Promise<UserAccountRecord | null> {
    return await this.prisma.userAccount.findUnique({ where: { personId } });
  }

  async findByExternalAuthId(
    externalAuthId: string,
  ): Promise<UserAccountRecord | null> {
    return await this.prisma.userAccount.findUnique({
      where: { externalAuthId },
    });
  }

  /**
   * Account directory, newest account first.
   *
   * `search` intentionally spans both sides of the relation: the page is a list
   * of *people who can log in*, so an operator typing a name would otherwise get
   * no result from a name that is visible in the very same row.
   */
  async list(filter: UserAccountListFilter): Promise<UserAccountListResult> {
    const where: Prisma.UserAccountWhereInput = {
      status: filter.status,
      OR: filter.search
        ? [
            { username: { contains: filter.search, mode: 'insensitive' } },
            { email: { contains: filter.search, mode: 'insensitive' } },
            {
              person: {
                fullName: { contains: filter.search, mode: 'insensitive' },
              },
            },
            {
              person: {
                personnelNumber: {
                  contains: filter.search,
                  mode: 'insensitive',
                },
              },
            },
          ]
        : undefined,
    };
    const [data, total] = await this.prisma.$transaction([
      this.prisma.userAccount.findMany({
        where,
        include: { person: true },
        orderBy: [{ createdAt: 'desc' }],
        skip: (filter.page - 1) * filter.limit,
        take: filter.limit,
      }),
      this.prisma.userAccount.count({ where }),
    ]);
    return {
      data: data as UserAccountWithPersonRecord[],
      total,
    };
  }

  async update(
    personId: string,
    data: UserAccountUpdateData,
  ): Promise<UserAccountRecord> {
    return await this.prisma.userAccount.update({
      where: { personId },
      data: data as Prisma.UserAccountUncheckedUpdateInput,
    });
  }

  async updateLastLoginAt(
    personId: string,
    at: Date,
  ): Promise<UserAccountRecord> {
    return await this.prisma.userAccount.update({
      where: { personId },
      data: { lastLoginAt: at },
    });
  }
}
