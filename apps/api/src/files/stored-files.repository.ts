import { Injectable } from '@nestjs/common';
import { Prisma, StoredFileStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  StoredFileCreateData,
  StoredFileListFilter,
  StoredFileListResult,
  StoredFileRecord,
  StoredFileUpdateData,
} from './stored-file.types';

export const STORED_FILES_REPOSITORY = Symbol('STORED_FILES_REPOSITORY');

export interface StoredFilesRepository {
  create(data: StoredFileCreateData): Promise<StoredFileRecord>;
  findById(id: string): Promise<StoredFileRecord | null>;
  findByObjectKey(objectKey: string): Promise<StoredFileRecord | null>;
  list(filter: StoredFileListFilter): Promise<StoredFileListResult>;
  update(id: string, data: StoredFileUpdateData): Promise<StoredFileRecord>;
  /** Counts non-archived files of a namespace, used for operational reporting. */
  countByNamespace(namespace: string): Promise<number>;
}

@Injectable()
export class PrismaStoredFilesRepository implements StoredFilesRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: StoredFileCreateData): Promise<StoredFileRecord> {
    return await this.prisma.storedFile.create({
      data: data as Prisma.StoredFileUncheckedCreateInput,
    });
  }

  async findById(id: string): Promise<StoredFileRecord | null> {
    return await this.prisma.storedFile.findUnique({ where: { id } });
  }

  async findByObjectKey(objectKey: string): Promise<StoredFileRecord | null> {
    return await this.prisma.storedFile.findUnique({ where: { objectKey } });
  }

  async list(filter: StoredFileListFilter): Promise<StoredFileListResult> {
    const where: Prisma.StoredFileWhereInput = {
      namespace: filter.namespace,
      ownerUserId: filter.ownerUserId,
      status: filter.status as StoredFileStatus | undefined,
      ...(filter.search
        ? { originalName: { contains: filter.search, mode: 'insensitive' } }
        : {}),
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.storedFile.findMany({
        where,
        orderBy: [{ createdAt: 'desc' }],
        skip: (filter.page - 1) * filter.limit,
        take: filter.limit,
      }),
      this.prisma.storedFile.count({ where }),
    ]);

    return { data, total };
  }

  async update(
    id: string,
    data: StoredFileUpdateData,
  ): Promise<StoredFileRecord> {
    return await this.prisma.storedFile.update({
      where: { id },
      data: data as Prisma.StoredFileUncheckedUpdateInput,
    });
  }

  async countByNamespace(namespace: string): Promise<number> {
    return await this.prisma.storedFile.count({
      where: { namespace, status: { not: 'ARCHIVED' } },
    });
  }
}
