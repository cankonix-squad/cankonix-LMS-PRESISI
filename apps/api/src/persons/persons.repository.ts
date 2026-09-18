import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  PersonCreateData,
  PersonListFilter,
  PersonListResult,
  PersonOrganizationCreateData,
  PersonOrganizationRecord,
  PersonRecord,
  PersonUpdateData,
} from './person.types';

export const PERSONS_REPOSITORY = Symbol('PERSONS_REPOSITORY');

export interface PersonsRepository {
  /**
   * Runs `work` inside a single database transaction so that multi-step writes
   * such as primary placement handover either fully apply or fully roll back.
   */
  withTransaction<T>(
    work: (repository: PersonsRepository) => Promise<T>,
  ): Promise<T>;
  create(data: PersonCreateData): Promise<PersonRecord>;
  findById(id: string): Promise<PersonRecord | null>;
  findByPersonnelNumber(personnelNumber: string): Promise<PersonRecord | null>;
  list(filter: PersonListFilter): Promise<PersonListResult>;
  update(id: string, data: PersonUpdateData): Promise<PersonRecord>;
  createPlacement(
    data: PersonOrganizationCreateData,
  ): Promise<PersonOrganizationRecord>;
  findPlacementById(id: string): Promise<PersonOrganizationRecord | null>;
  findPlacementsByPerson(personId: string): Promise<PersonOrganizationRecord[]>;
  findActivePrimaryPlacements(
    personId: string,
  ): Promise<PersonOrganizationRecord[]>;
  endPlacement(id: string, endDate: Date): Promise<PersonOrganizationRecord>;
}

@Injectable()
export class PrismaPersonsRepository implements PersonsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async withTransaction<T>(
    work: (repository: PersonsRepository) => Promise<T>,
  ): Promise<T> {
    return await this.prisma.$transaction((transaction) =>
      work(
        // A Prisma transaction client exposes the same model delegates used by
        // this repository; only the transaction control methods differ.
        new PrismaPersonsRepository(transaction as unknown as PrismaService),
      ),
    );
  }

  async create(data: PersonCreateData): Promise<PersonRecord> {
    return await this.prisma.person.create({
      data: data as Prisma.PersonUncheckedCreateInput,
    });
  }

  async findById(id: string): Promise<PersonRecord | null> {
    return await this.prisma.person.findUnique({ where: { id } });
  }

  async findByPersonnelNumber(
    personnelNumber: string,
  ): Promise<PersonRecord | null> {
    return await this.prisma.person.findUnique({ where: { personnelNumber } });
  }

  async list(filter: PersonListFilter): Promise<PersonListResult> {
    const where: Prisma.PersonWhereInput = {
      status: filter.status,
      OR: filter.search
        ? [
            {
              personnelNumber: { contains: filter.search, mode: 'insensitive' },
            },
            { fullName: { contains: filter.search, mode: 'insensitive' } },
          ]
        : undefined,
    };
    const [data, total] = await this.prisma.$transaction([
      this.prisma.person.findMany({
        where,
        orderBy: [{ personnelNumber: 'asc' }],
        skip: (filter.page - 1) * filter.limit,
        take: filter.limit,
      }),
      this.prisma.person.count({ where }),
    ]);
    return { data, total };
  }

  async update(id: string, data: PersonUpdateData): Promise<PersonRecord> {
    return await this.prisma.person.update({
      where: { id },
      data: data as Prisma.PersonUncheckedUpdateInput,
    });
  }

  async createPlacement(
    data: PersonOrganizationCreateData,
  ): Promise<PersonOrganizationRecord> {
    return await this.prisma.personOrganization.create({
      data: data as Prisma.PersonOrganizationUncheckedCreateInput,
    });
  }

  async findPlacementById(
    id: string,
  ): Promise<PersonOrganizationRecord | null> {
    return await this.prisma.personOrganization.findUnique({ where: { id } });
  }

  async findPlacementsByPerson(
    personId: string,
  ): Promise<PersonOrganizationRecord[]> {
    return await this.prisma.personOrganization.findMany({
      where: { personId },
      orderBy: [{ startDate: 'desc' }, { createdAt: 'desc' }],
    });
  }

  async findActivePrimaryPlacements(
    personId: string,
  ): Promise<PersonOrganizationRecord[]> {
    return await this.prisma.personOrganization.findMany({
      where: { personId, isPrimary: true, endDate: null },
      orderBy: [{ startDate: 'asc' }],
    });
  }

  async endPlacement(
    id: string,
    endDate: Date,
  ): Promise<PersonOrganizationRecord> {
    return await this.prisma.personOrganization.update({
      where: { id },
      data: { endDate },
    });
  }
}
