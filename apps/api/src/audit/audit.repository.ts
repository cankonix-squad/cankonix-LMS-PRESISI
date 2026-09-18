import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  AuditEntryCreateData,
  AuditEntryRecord,
  AuditLogListFilter,
  AuditLogListResult,
  AuditLogRepository,
} from './audit.types';

export const AUDIT_LOG_REPOSITORY = Symbol('AUDIT_LOG_REPOSITORY');

/**
 * Prisma-backed audit trail storage.
 *
 * Implements `append` and read operations only. The absence of `update` and
 * `delete` is the point: `docs/06-database-standards.md` treats this table as
 * preserved history, and the migration installs a trigger so the same guarantee
 * holds against raw SQL.
 */
@Injectable()
export class PrismaAuditLogRepository implements AuditLogRepository {
  constructor(private readonly prisma: PrismaService) {}

  async append(data: AuditEntryCreateData): Promise<AuditEntryRecord> {
    return await this.prisma.auditLog.create({
      data: {
        actorUserAccountId: data.actorUserAccountId,
        action: data.action,
        resourceType: data.resourceType,
        resourceId: data.resourceId,
        organizationId: data.organizationId,
        before: toJsonInput(data.before),
        after: toJsonInput(data.after),
        metadata: toJsonInput(data.metadata),
        ipAddress: data.ipAddress,
        userAgent: data.userAgent,
      },
    });
  }

  async findById(id: string): Promise<AuditEntryRecord | null> {
    return await this.prisma.auditLog.findUnique({ where: { id } });
  }

  async search(filter: AuditLogListFilter): Promise<AuditLogListResult> {
    const where: Prisma.AuditLogWhereInput = {
      actorUserAccountId: filter.actorUserAccountId,
      action: filter.action,
      resourceType: filter.resourceType,
      resourceId: filter.resourceId,
      organizationId: filter.organizationId,
      createdAt: buildDateRange(filter.from, filter.to),
      OR: filter.search
        ? [
            { action: { contains: filter.search, mode: 'insensitive' } },
            { resourceType: { contains: filter.search, mode: 'insensitive' } },
            { resourceId: { contains: filter.search, mode: 'insensitive' } },
          ]
        : undefined,
    };

    // Newest first: an audit trail is read backwards from the present. The `id`
    // tiebreak keeps pagination stable when entries share a timestamp, which is
    // common because `created_at` has millisecond resolution.
    const [data, total] = await this.prisma.$transaction([
      this.prisma.auditLog.findMany({
        where,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip: (filter.page - 1) * filter.limit,
        take: filter.limit,
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return { data, total };
  }
}

/**
 * Normalizes a snapshot into a Prisma JSON input.
 *
 * `Prisma.JsonNull` is deliberately not used: the column stays SQL `NULL` when
 * there is no snapshot, which is distinguishable from a deliberate JSON `null`
 * written by `JSON.stringify(null)`. Writing `undefined` would be a type error,
 * and writing the literal object would store the string `"undefined"`.
 */
function toJsonInput(value: unknown): Prisma.InputJsonValue | undefined {
  if (value === null || value === undefined) return undefined;
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

function buildDateRange(
  from?: Date,
  to?: Date,
): Prisma.DateTimeFilter | undefined {
  if (!from && !to) return undefined;
  return {
    gte: from,
    lte: to,
  };
}
