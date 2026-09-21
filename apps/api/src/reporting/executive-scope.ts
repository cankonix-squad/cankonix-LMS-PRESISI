import { ReportingScopeType } from '@prisma/client';
import type { ExecutiveMetricFilter } from './reporting.types';

/**
 * Executive grains the overview may be asked for (TASK-061).
 *
 * `NATIONAL` carries no id; the others name one. Declared here rather than
 * imported from the DTO so the pure scope algebra has no dependency on the HTTP
 * layer — the enum in `dto/` is the transport spelling of the same set, and a
 * test asserts the two have not drifted apart.
 */
export type ExecutiveOverviewScope =
  'NATIONAL' | 'ORGANIZATION' | 'PROGRAM' | 'BATCH';

/**
 * Executive scope algebra (TASK-061).
 *
 * ## Why this is a separate, pure module
 *
 * The spec is explicit: *"Scope resolver wajib. National vs institution access
 * melalui scope, bukan role string."* The dangerous version of that rule is one
 * where a controller decides how much to show by inspecting which roles the
 * caller holds — that is a check that silently rots every time a role is renamed
 * or a new one is added.
 *
 * So the reach of a report is computed here, from the **scopes attached to the
 * caller's permission grant**, and expressed as a plain data structure. Nothing
 * in this file asks what a role is called. The functions are pure, which is what
 * makes the access rules testable without a database or a guard.
 *
 * ## The one rule that matters
 *
 * An empty grant and an unrestricted grant are opposites, and confusing them is
 * a data leak:
 *
 * - **unrestricted** — the permission was granted with no scope boundary, so the
 *   caller sees every institution. This is national access.
 * - **no grant at all** — the caller holds nothing, so they see nothing.
 *
 * Every function below preserves that distinction rather than collapsing both
 * into "no restriction".
 */

/** How far a caller's grant reaches. */
export type ExecutiveAccessLevel = 'NATIONAL' | 'SCOPED';

/**
 * The shape of one effective permission, as the evaluator reports it.
 *
 * Declared structurally rather than imported from the authorization module so
 * the reporting domain depends on the *contract* it consumes, not on the module
 * that happens to produce it.
 */
export interface ScopeGrantSource {
  code: string;
  isUnrestricted: boolean;
  scopes: ReadonlyArray<{ scopeType: string; scopeId: string }>;
}

/**
 * A caller's reporting reach, in the vocabulary of the reporting scopes.
 *
 * Organization ids are expanded to include descendants before this is used,
 * because an institution grant covers the institutions below it.
 */
export interface ExecutiveScopeGrant {
  unrestricted: boolean;
  organizationIds: string[];
  programIds: string[];
  batchIds: string[];
  classIds: string[];
  classSubjectIds: string[];
}

/** An empty grant: the caller may see nothing. */
export function emptyExecutiveScopeGrant(): ExecutiveScopeGrant {
  return {
    unrestricted: false,
    organizationIds: [],
    programIds: [],
    batchIds: [],
    classIds: [],
    classSubjectIds: [],
  };
}

/**
 * Whether a granted permission code covers a requested one.
 *
 * Mirrors the wildcard semantics of `RoleAssignmentsService.matchPermissionPattern`:
 * `*` matches exactly one dot-separated segment, so `reporting.*.read` covers
 * `reporting.executive.read` but not `reporting.executive.detail.read`.
 *
 * Reimplemented rather than imported because the evaluator interface exposes only
 * a yes/no answer for a specific scope, and the resolver needs the scope *list*.
 * Both implementations must agree; the wildcard test in
 * `reporting-executive.test.cjs` pins the behaviour.
 */
export function matchesPermissionPattern(
  grantedCode: string,
  requestedCode: string,
): boolean {
  if (grantedCode === requestedCode) return true;
  if (!grantedCode.includes('*')) return false;

  const grantedSegments = grantedCode.split('.');
  const requestedSegments = requestedCode.split('.');
  if (grantedSegments.length !== requestedSegments.length) return false;

  for (let index = 0; index < grantedSegments.length; index += 1) {
    if (
      grantedSegments[index] !== '*' &&
      grantedSegments[index] !== requestedSegments[index]
    ) {
      return false;
    }
  }
  return true;
}

/**
 * Collects the reach of one permission out of a set of effective permissions.
 *
 * An unrestricted grant wins outright: listing individual scopes next to it
 * would imply a boundary that does not exist, and a later narrowing step could
 * then narrow something that was never bounded.
 */
export function collectExecutiveScopeGrant(
  permissions: readonly ScopeGrantSource[],
  permissionCode: string,
): ExecutiveScopeGrant {
  const grant = emptyExecutiveScopeGrant();

  for (const permission of permissions) {
    if (!matchesPermissionPattern(permission.code, permissionCode)) continue;

    if (permission.isUnrestricted) {
      grant.unrestricted = true;
      continue;
    }

    for (const scope of permission.scopes) {
      switch (scope.scopeType) {
        case 'ORGANIZATION':
          pushUnique(grant.organizationIds, scope.scopeId);
          break;
        case 'PROGRAM':
          pushUnique(grant.programIds, scope.scopeId);
          break;
        case 'BATCH':
          pushUnique(grant.batchIds, scope.scopeId);
          break;
        case 'CLASS':
          pushUnique(grant.classIds, scope.scopeId);
          break;
        case 'CLASS_SUBJECT':
          pushUnique(grant.classSubjectIds, scope.scopeId);
          break;
        default:
          // An authorization scope type with no reporting equivalent is not
          // silently widened into a broader grant: it simply contributes
          // nothing, and the caller keeps whatever else they hold.
          break;
      }
    }
  }

  // An unrestricted grant is returned as-is, not reset to an empty one. The
  // empty grant means "reaches nothing", so collapsing the two here would turn
  // the widest possible access into no access — a denial, but a wrong one, and
  // it would mask a real misconfiguration behind a plausible 403.
  return grant;
}

/**
 * Expands organization grants to include their descendants.
 *
 * Descendant access follows the organization hierarchy
 * (`docs/04-authorization-model.md`), so a grant on a parent institution reaches
 * the institutions beneath it. `descendantsOf` returns descendants *excluding*
 * the organization itself, so the organization is added back here.
 */
export function expandOrganizationDescendants(
  grant: ExecutiveScopeGrant,
  descendantsOf: (organizationId: string) => readonly string[],
): ExecutiveScopeGrant {
  if (grant.unrestricted) return grant;

  const expanded: string[] = [];
  for (const organizationId of grant.organizationIds) {
    pushUnique(expanded, organizationId);
    for (const descendant of descendantsOf(organizationId)) {
      pushUnique(expanded, descendant);
    }
  }

  return { ...grant, organizationIds: expanded };
}

/** Whether a grant reaches nothing at all. */
export function isEmptyExecutiveScopeGrant(
  grant: ExecutiveScopeGrant,
): boolean {
  if (grant.unrestricted) return false;
  return (
    grant.organizationIds.length === 0 &&
    grant.programIds.length === 0 &&
    grant.batchIds.length === 0 &&
    grant.classIds.length === 0 &&
    grant.classSubjectIds.length === 0
  );
}

export function executiveAccessLevel(
  grant: ExecutiveScopeGrant,
): ExecutiveAccessLevel {
  return grant.unrestricted ? 'NATIONAL' : 'SCOPED';
}

/**
 * Narrows a grant to a requested organization.
 *
 * Returns `null` when the request falls outside the grant. That is a denial, not
 * an empty result: answering `403` rather than an empty report tells the caller
 * their request was rejected, instead of letting them mistake "you may not see
 * this" for "there is nothing here".
 */
export function narrowToOrganization(
  grant: ExecutiveScopeGrant,
  organizationId: string,
): ExecutiveScopeGrant | null {
  if (grant.unrestricted) {
    return { ...emptyExecutiveScopeGrant(), organizationIds: [organizationId] };
  }
  if (!grant.organizationIds.includes(organizationId)) return null;

  // Narrowing to one organization drops the other axes: a program grant inside
  // the organization is still reachable through the organization predicate, and
  // keeping it would let a caller read a program that the narrowed organization
  // does not own.
  return { ...emptyExecutiveScopeGrant(), organizationIds: [organizationId] };
}

/** Narrows a grant to a requested program. */
export function narrowToProgram(
  grant: ExecutiveScopeGrant,
  programId: string,
): ExecutiveScopeGrant | null {
  if (grant.unrestricted) {
    return { ...emptyExecutiveScopeGrant(), programIds: [programId] };
  }
  if (!grant.programIds.includes(programId)) return null;
  return { ...emptyExecutiveScopeGrant(), programIds: [programId] };
}

/** Narrows a grant to a requested batch. */
export function narrowToBatch(
  grant: ExecutiveScopeGrant,
  batchId: string,
): ExecutiveScopeGrant | null {
  if (grant.unrestricted) {
    return { ...emptyExecutiveScopeGrant(), batchIds: [batchId] };
  }
  if (!grant.batchIds.includes(batchId)) return null;
  return { ...emptyExecutiveScopeGrant(), batchIds: [batchId] };
}

/**
 * Narrows a grant to whatever the request asked for.
 *
 * Returns `null` when the request falls outside the grant, which the caller
 * turns into a 403. Answering with an empty report instead would be worse: it
 * would make "you may not see this" indistinguishable from "there is nothing
 * here", and an executive looking at a silently empty dashboard has no way to
 * tell that they are pointed at the wrong institution.
 *
 * An unknown grain is denied rather than ignored. Ignoring it would mean a typo
 * in a query parameter quietly returns national figures.
 */
export function narrowExecutiveScope(
  grant: ExecutiveScopeGrant,
  scope: ExecutiveOverviewScope,
  scopeId: string | undefined,
): ExecutiveScopeGrant | null {
  if (scope === 'NATIONAL') {
    // A grain of NATIONAL carries no id; one supplied alongside it means the
    // caller is describing two different things, so the request is rejected
    // rather than half-honoured.
    return scopeId === undefined ? grant : null;
  }

  if (scopeId === undefined) return null;

  switch (scope) {
    case 'ORGANIZATION':
      return narrowToOrganization(grant, scopeId);
    case 'PROGRAM':
      return narrowToProgram(grant, scopeId);
    case 'BATCH':
      return narrowToBatch(grant, scopeId);
    default:
      return null;
  }
}

/**
 * Translates a grant into the predicate the read model is queried with.
 *
 * Unrestricted becomes `null` on every axis (no restriction). A scoped grant
 * becomes concrete id lists, and an axis the caller holds nothing on becomes an
 * empty list — which matches nothing, exactly as intended.
 */
export function toExecutiveMetricFilter(
  grant: ExecutiveScopeGrant,
  level: ReportingScopeType,
  period: { from: Date | null; to: Date | null },
): ExecutiveMetricFilter {
  if (grant.unrestricted) {
    return {
      level,
      organizationIds: null,
      programIds: null,
      batchIds: null,
      classIds: null,
      classSubjectIds: null,
      periodFrom: period.from,
      periodTo: period.to,
    };
  }

  return {
    level,
    organizationIds: grant.organizationIds,
    programIds: grant.programIds,
    batchIds: grant.batchIds,
    classIds: grant.classIds,
    classSubjectIds: grant.classSubjectIds,
    periodFrom: period.from,
    periodTo: period.to,
  };
}

function pushUnique(target: string[], value: string): void {
  if (!target.includes(value)) target.push(value);
}
