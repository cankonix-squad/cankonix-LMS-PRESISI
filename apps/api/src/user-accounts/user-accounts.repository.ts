import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  UserAccountCreateData,
  UserAccountRecord,
  UserAccountUpdateData,
} from './user-account.types';

export const USER_ACCOUNTS_REPOSITORY = Symbol('USER_ACCOUNTS_REPOSITORY');

export interface UserAccountsRepository {
  create(data: UserAccountCreateData): Promise<UserAccountRecord>;
  findById(id: string): Promise<UserAccountRecord | null>;
  findByPersonId(personId: string): Promise<UserAccountRecord | null>;
  findByExternalAuthId(
    externalAuthId: string,
  ): Promise<UserAccountRecord | null>;
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
