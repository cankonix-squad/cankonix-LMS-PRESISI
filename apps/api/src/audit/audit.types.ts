/**
 * Who performed an audited action.
 *
 * Deliberately minimal: only the account id is recorded, exactly as the TASK-006
 * data model specifies. Denormalized copies of the actor's name or status are
 * *not* stored, because the spec lists `metadata` for supplementary context and
 * `docs/06-database-standards.md` warns against using JSONB to paper over
 * relational fields. A reader who needs the current name joins `user_accounts`;
 * the audit entry's job is to record that this account acted, not to snapshot an
 * account record that the account module owns.
 *
 * `userAccountId` is `null` for system/background actions, which is meaningful:
 * it distinguishes "no signed-in user" from "an unknown user".
 */
export type AuditActor = {
  /** `UserAccount.id` of the caller, or `null` for system/background actions. */
  userAccountId: string | null;
};

/** Request-level provenance of an audited action. */
export type AuditRequestContext = {
  /** Peer address as observed by the API. */
  ipAddress: string | null;
  userAgent: string | null;
};

/**
 * One audit entry as stored.
 *
 * `notRecorded` is not a column: it marks the sentinel used when an actor is
 * unknown, so callers never see a half-populated snapshot.
 */
export type AuditEntryRecord = {
  id: string;
  actorUserAccountId: string | null;
  action: string;
  resourceType: string;
  resourceId: string | null;
  organizationId: string | null;
  before: unknown;
  after: unknown;
  metadata: unknown;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: Date;
};

export type AuditEntryCreateData = {
  actorUserAccountId: string | null;
  action: string;
  resourceType: string;
  resourceId: string | null;
  organizationId: string | null;
  before: unknown;
  after: unknown;
  metadata: unknown;
  ipAddress: string | null;
  userAgent: string | null;
};

export type AuditLogListFilter = {
  actorUserAccountId?: string;
  action?: string;
  resourceType?: string;
  resourceId?: string;
  organizationId?: string;
  from?: Date;
  to?: Date;
  search?: string;
  page: number;
  limit: number;
};

export type AuditLogListResult = {
  data: AuditEntryRecord[];
  total: number;
};

/**
 * Repository contract for the audit trail.
 *
 * There is intentionally no `update` and no `delete`: immutability is a property
 * of this interface, not a convention that a future caller could forget. The
 * migration backs the same guarantee with a database trigger.
 */
export interface AuditLogRepository {
  /** Appends one entry. The stored value is returned for assertions/logging. */
  append(data: AuditEntryCreateData): Promise<AuditEntryRecord>;
  search(filter: AuditLogListFilter): Promise<AuditLogListResult>;
  findById(id: string): Promise<AuditEntryRecord | null>;
}
