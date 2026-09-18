import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { AuditContextService } from './audit-context.service';
import {
  AuditLogListResponseDto,
  AuditLogResponseDto,
} from './dto/audit-log-response.dto';
import { ListAuditLogsQueryDto } from './dto/list-audit-logs-query.dto';
import { AUDIT_LOG_REPOSITORY } from './audit.repository';
import { redactAuditValue } from './audit-redaction';
import { AuditEntryRecord, AuditLogRepository } from './audit.types';

/**
 * What a domain service supplies when it records an audited action.
 *
 * The actor, IP address, and user agent are intentionally *absent*: they are
 * resolved from the request context so a caller cannot forget them, and cannot
 * forge them either. A domain service describes the change; the audit trail
 * attributes it.
 */
export type RecordAuditInput = {
  /** One of `AUDIT_ACTIONS`. Stored as-is so the vocabulary stays data. */
  action: string;
  /** One of `AUDIT_RESOURCE_TYPES`, or the owning table name in singular form. */
  resourceType: string;
  resourceId?: string | null;
  /**
   * Organization the change applies to, when the resource is organization-scoped.
   * Enables "what happened in this unit" queries without joining every domain.
   */
  organizationId?: string | null;
  /** State before the change. Redacted before it is persisted. */
  before?: unknown;
  /** State after the change. Redacted before it is persisted. */
  after?: unknown;
  /** Supplementary, non-secret context (reason, source, correlation id). */
  metadata?: unknown;
};

/**
 * Audit trail application service (TASK-006).
 *
 * Append and read only. There is no `updateAuditLog` and no `deleteAuditLog`,
 * and there never should be: the audit trail is only useful while it is
 * immutable, so mutability is not merely "not implemented" but absent from the
 * contract and blocked at the database by the migration's trigger.
 *
 * ### Failure semantics
 *
 * `record` propagates write failures. Swallowing them would produce a system that
 * performs sensitive mutations without a trail and gives no signal that it did —
 * the opposite of what an audit trail is for. A caller therefore fails its
 * mutation when the audit write fails, which is the fail-closed choice.
 *
 * ### Non-transactionality (known limitation)
 *
 * `record` runs after the audited mutation has been committed, so a crash in the
 * window between commit and audit write leaves an unaudited change. Making the
 * write atomic would require the audit insert to share the mutation's
 * transaction, which the current repository contracts do not expose
 * (`docs/06-database-standards.md` allows transactions for consistency
 * boundaries, but threading a transaction handle through every domain repository
 * is a cross-cutting refactor, not a TASK-006 decision). This is recorded as a
 * carried-forward risk rather than silently accepted, and it is the reason
 * `record` is called immediately after the mutation returns — the window is as
 * small as the current layering permits.
 */
@Injectable()
export class AuditService {
  constructor(
    @Inject(AUDIT_LOG_REPOSITORY)
    private readonly auditLogs: AuditLogRepository,
    private readonly context: AuditContextService,
  ) {}

  /**
   * Appends one entry to the audit trail.
   *
   * Redaction is applied here rather than in the repository so that *every*
   * caller — including a future one that bypasses a domain service — cannot store
   * a secret, and so the stored bytes are exactly what a reviewer would read.
   */
  async record(input: RecordAuditInput): Promise<AuditLogResponseDto> {
    const actor = this.context.getActor();
    const request = this.context.getRequestContext();

    const created = await this.auditLogs.append({
      actorUserAccountId: actor.userAccountId,
      action: input.action,
      resourceType: input.resourceType,
      resourceId: input.resourceId ?? null,
      organizationId: input.organizationId ?? null,
      before: redactAuditValue(input.before),
      after: redactAuditValue(input.after),
      metadata: redactAuditValue(input.metadata),
      ipAddress: request?.ipAddress ?? null,
      userAgent: request?.userAgent ?? null,
    });

    return toAuditLogResponse(created);
  }

  /**
   * Searches the audit trail.
   *
   * The `search` term and every filter are passed to the repository as a `where`
   * clause; no query text is ever interpreted as SQL.
   */
  async search(query: ListAuditLogsQueryDto): Promise<AuditLogListResponseDto> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const result = await this.auditLogs.search({
      actorUserAccountId: query.actorUserAccountId,
      action: query.action?.trim() || undefined,
      resourceType: query.resourceType?.trim() || undefined,
      resourceId: query.resourceId?.trim() || undefined,
      organizationId: query.organizationId,
      from: parseBoundary(query.from),
      to: parseBoundary(query.to),
      search: query.search?.trim() || undefined,
      page,
      limit,
    });

    return {
      data: result.data.map(toAuditLogResponse),
      page,
      limit,
      total: result.total,
    };
  }

  async findOne(id: string): Promise<AuditLogResponseDto> {
    const entry = await this.auditLogs.findById(id);
    if (!entry) throw new NotFoundException(`Audit log ${id} not found`);
    return toAuditLogResponse(entry);
  }
}

function parseBoundary(value?: string): Date | undefined {
  if (!value) return undefined;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

/**
 * Maps a stored entry to its response shape.
 *
 * Redaction is applied a second time on the read path. The write path already
 * guarantees clean bytes, but this is the only place that catches a payload
 * persisted by an earlier build, a manual migration, or a future caller that
 * writes through the repository directly. Belt and braces on an immutable table is
 * justified: a leak here cannot be corrected by an UPDATE afterwards.
 */
function toAuditLogResponse(entry: AuditEntryRecord): AuditLogResponseDto {
  return {
    id: entry.id,
    actorUserAccountId: entry.actorUserAccountId,
    action: entry.action,
    resourceType: entry.resourceType,
    resourceId: entry.resourceId,
    organizationId: entry.organizationId,
    before: redactAuditValue(entry.before),
    after: redactAuditValue(entry.after),
    metadata: redactAuditValue(entry.metadata),
    ipAddress: entry.ipAddress,
    userAgent: entry.userAgent,
    createdAt: entry.createdAt.toISOString(),
  };
}
